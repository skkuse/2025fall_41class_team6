package com.skku.swe_project.food.service;

import com.skku.swe_project.facade.service.OpenAiService;
import com.skku.swe_project.place.dto.PlaceDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class GooglePlacesService {

    @Value("${google.api.key}")
    private String googleApiKey;

    private final OpenAiService openAiService;
    private final RestTemplate restTemplate = new RestTemplate();

    public List<PlaceDto> enrichAndSortByRating(List<PlaceDto> places) {

        if (googleApiKey == null || googleApiKey.isBlank()) {
            log.warn("⚠️ Google API 키가 없습니다");
            return places;
        }

        if (places == null || places.isEmpty()) {
            return places;
        }

        // 1단계: rating / reviewCount만 보강
        List<PlaceDto> rated = places.parallelStream()
                .map(this::enrichRatingOnly)
                .toList();

        // 2단계: 평점 내림차순 정렬
        List<PlaceDto> sorted = new ArrayList<>(rated);
        sorted.sort((a, b) -> Double.compare(
                b.getRating() != null ? b.getRating() : 0.0,
                a.getRating() != null ? a.getRating() : 0.0));

        // 3단계: 상위 5개에 대해서만 리뷰 + 사진 + AI 요약 적용
        int topN = Math.min(5, sorted.size());
        for (int i = 0; i < topN; i++) {
            sorted.set(i, enrichTopPlaceWithReviewsAndPhotos(sorted.get(i)));
        }

        return sorted;
    }

    private PlaceDto enrichRatingOnly(PlaceDto place) {
        try {
            String query = place.getName() + " " +
                    Optional.ofNullable(place.getAddress()).orElse("");

            String tsUrl = "https://maps.googleapis.com/maps/api/place/textsearch/json"
                    + "?query={query}&key={key}";

            ResponseEntity<Map> tsResp =
                    restTemplate.getForEntity(tsUrl, Map.class, query, googleApiKey);
            Map<String, Object> body = tsResp.getBody();
            if (body == null) return place;

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> results =
                    (List<Map<String, Object>>) body.get("results");

            if (results == null || results.isEmpty()) return place;

            Map<String, Object> best = results.get(0);
            String placeId = (String) best.get("place_id");
            if (placeId == null) return place;

            String detailsUrl = "https://maps.googleapis.com/maps/api/place/details/json"
                    + "?place_id={id}&fields=rating,user_ratings_total&key={key}";

            ResponseEntity<Map> dResp =
                    restTemplate.getForEntity(detailsUrl, Map.class, placeId, googleApiKey);
            Map<String, Object> dBody = dResp.getBody();
            if (dBody == null) return place;

            @SuppressWarnings("unchecked")
            Map<String, Object> result = (Map<String, Object>) dBody.get("result");
            if (result == null) return place;

            Double rating = result.get("rating") != null
                    ? ((Number) result.get("rating")).doubleValue()
                    : place.getRating();

            return PlaceDto.builder()
                    .id(place.getId())
                    .name(place.getName())
                    .address(place.getAddress())
                    .latitude(place.getLatitude())
                    .longitude(place.getLongitude())
                    .category(place.getCategory())
                    .rating(rating)
                    // **평점 붙이지 않음**
                    .reviewSummary("")
                    .imageUrls(place.getImageUrls())
                    .build();

        } catch (Exception e) {
            log.warn("rating only enrich 실패: {}", place.getName(), e);
            return place;
        }
    }

    private PlaceDto enrichTopPlaceWithReviewsAndPhotos(PlaceDto place) {

        try {
            String query = place.getName() + " " +
                    Optional.ofNullable(place.getAddress()).orElse("");

            String tsUrl = "https://maps.googleapis.com/maps/api/place/textsearch/json"
                    + "?query={query}&key={key}";

            ResponseEntity<Map> tsResp =
                    restTemplate.getForEntity(tsUrl, Map.class, query, googleApiKey);
            Map<String, Object> tsBody = tsResp.getBody();
            if (tsBody == null) return place;

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> results =
                    (List<Map<String, Object>>) tsBody.get("results");
            if (results == null || results.isEmpty()) return place;

            Map<String, Object> best = results.get(0);
            String placeId = (String) best.get("place_id");
            if (placeId == null) return place;

            String detailsUrl = "https://maps.googleapis.com/maps/api/place/details/json"
                    + "?place_id={id}&fields=rating,reviews,photos&key={key}";

            ResponseEntity<Map> dResp =
                    restTemplate.getForEntity(detailsUrl, Map.class, placeId, googleApiKey);
            Map<String, Object> dBody = dResp.getBody();
            if (dBody == null) return place;

            @SuppressWarnings("unchecked")
            Map<String, Object> result = (Map<String, Object>) dBody.get("result");
            if (result == null) return place;

            Double rating = result.get("rating") != null
                    ? ((Number) result.get("rating")).doubleValue()
                    : place.getRating();

            // 리뷰 최대 3개 수집
            List<String> reviewTexts = new ArrayList<>();
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> reviews =
                    (List<Map<String, Object>>) result.get("reviews");

            if (reviews != null) {
                for (Map<String, Object> rv : reviews) {
                    Object txt = rv.get("text");
                    if (txt instanceof String text && !text.isBlank()) {
                        reviewTexts.add(text);
                        if (reviewTexts.size() >= 4) break;
                    }
                }
            }

            // AI 요약
            String aiSummary = null;
            if (!reviewTexts.isEmpty()) {
                aiSummary = openAiService.summarizeReviews(place.getName(), reviewTexts);
            }

            // 📌 리뷰 요약만 사용 (평점 등 추가 문구 제거)
            String summary = (aiSummary != null) ? aiSummary : "";

            // 이미지 URL 최대 3개
            List<String> urls = new ArrayList<>();
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> photos =
                    (List<Map<String, Object>>) result.get("photos");

            if (photos != null) {
                for (int i = 0; i < Math.min(3, photos.size()); i++) {
                    String ref = (String) photos.get(i).get("photo_reference");
                    if (ref != null) {
                        urls.add(
                                "https://maps.googleapis.com/maps/api/place/photo"
                                        + "?maxwidth=800"
                                        + "&photo_reference=" + URLEncoder.encode(ref, StandardCharsets.UTF_8)
                                        + "&key=" + googleApiKey
                        );
                    }
                }
            }

            return PlaceDto.builder()
                    .id(place.getId())
                    .name(place.getName())
                    .address(place.getAddress())
                    .latitude(place.getLatitude())
                    .longitude(place.getLongitude())
                    .category(place.getCategory())
                    .rating(rating)
                    .reviewSummary(summary)
                    .imageUrls(urls)
                    .build();

        } catch (Exception e) {
            log.warn("리뷰/사진 enrich 실패: {}", place.getName(), e);
            return place;
        }
    }
}
