package com.skku.swe_project.food.service;

import com.skku.swe_project.place.dto.PlaceDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class FoodService {

    @Value("${kakao.api.key}")
    private String kakaoApiKey;

    private final RestTemplate restTemplate = new RestTemplate();
    private final GooglePlacesService googlePlacesService;

    /**
     * Kakao Local + Google Places 평점 정보를 이용해
     * 상위 5개 맛집 리스트를 반환 (사진 다운로드는 하지 않음).
     */
    public List<PlaceDto> findRestaurants(String location,
                                          String originalQuery) {

        String keyword;
        if (location != null && !location.isBlank()) {
            keyword = location + " 맛집";
        } else if (originalQuery != null && !originalQuery.isBlank()) {
            keyword = originalQuery;
        } else {
            log.warn("🍜 FoodService: location과 originalQuery가 모두 비어 있습니다. 빈 결과 반환.");
            return Collections.emptyList();
        }

        log.info("🍜 FoodService: Kakao Local 검색 시작. keyword='{}', location='{}'",
                keyword, location);

        String url = "https://dapi.kakao.com/v2/local/search/keyword.json"
                + "?query={query}&size={size}&sort={sort}";

        Map<String, Object> uriVars = new HashMap<>();
        uriVars.put("query", keyword);
        uriVars.put("size", 15);
        uriVars.put("sort", "accuracy");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "KakaoAK " + kakaoApiKey);

        HttpEntity<Void> entity = new HttpEntity<>(headers);

        Map<String, Object> body;

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    entity,
                    Map.class,
                    uriVars
            );

            log.info("🍜 FoodService: Kakao Local 응답 status={}", response.getStatusCode());
            body = response.getBody();
            log.info("🍜 FoodService: Kakao Local 응답 body={}", body);

        } catch (Exception e) {
            log.error("❌ FoodService: Kakao Local API 호출 중 예외 발생. url={}", url, e);
            return Collections.emptyList();
        }

        if (body == null || !body.containsKey("documents")) {
            log.warn("⚠️ FoodService: Kakao Local 응답에 documents가 없습니다. body={}", body);
            return Collections.emptyList();
        }

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> documents =
                (List<Map<String, Object>>) body.get("documents");

        if (documents == null || documents.isEmpty()) {
            log.warn("⚠️ FoodService: Kakao Local documents 비어 있음. keyword='{}'", keyword);
            return Collections.emptyList();
        }

        // 1차: Kakao 결과 → PlaceDto 변환
        List<PlaceDto> kakaoPlaces = new ArrayList<>();
        for (Map<String, Object> doc : documents) {
            PlaceDto dto = convertKakaoDocToPlaceDto(doc);
            if (dto != null) {
                kakaoPlaces.add(dto);
            }
        }
        log.info("🍜 FoodService: Kakao 변환 후 개수 = {}", kakaoPlaces.size());

        if (kakaoPlaces.isEmpty()) {
            return Collections.emptyList();
        }

        // 2차: Google Places 평점/리뷰만 보강 + 평점 정렬 (병렬 처리)
        List<PlaceDto> enriched = googlePlacesService.enrichAndSortByRating(kakaoPlaces);
        log.info("🍜 FoodService: Google Places 평점 보강 후 개수 = {}", enriched.size());

        if (enriched.isEmpty()) {
            return Collections.emptyList();
        }

        // 3차: Top5 추출
        int limit = Math.min(5, enriched.size());
        return new ArrayList<>(enriched.subList(0, limit));
    }

    /**
     * Kakao Local document 하나를 PlaceDto로 변환
     */
    private PlaceDto convertKakaoDocToPlaceDto(Map<String, Object> doc) {
        try {
            String name = (String) doc.getOrDefault("place_name", "");
            String roadAddress = (String) doc.getOrDefault("road_address_name", "");
            String address = (String) doc.getOrDefault("address_name", "");
            String categoryName = (String) doc.getOrDefault("category_name", "");
            String x = (String) doc.getOrDefault("x", null); // 경도
            String y = (String) doc.getOrDefault("y", null); // 위도

            Double longitude = (x != null && !x.isBlank()) ? Double.parseDouble(x) : null;
            Double latitude = (y != null && !y.isBlank()) ? Double.parseDouble(y) : null;

            String finalAddress = (roadAddress != null && !roadAddress.isBlank())
                    ? roadAddress
                    : address;

            String category = categoryName;
            if (categoryName != null && categoryName.contains(">")) {
                String[] parts = categoryName.split(">");
                category = parts[parts.length - 1].trim();
            }

            return PlaceDto.builder()
                    .id(null)                      // 외부 API 결과라 DB id 없음
                    .name(name)
                    .address(finalAddress)
                    .latitude(latitude)
                    .longitude(longitude)
                    .category(category)
                    .rating(0.0)                   // 초기값, 나중에 Google에서 보강
                    .reviewSummary(finalAddress)
                    .imageUrls(new ArrayList<>())  // 나중에 사진 파일 경로를 넣기 위해 가변 리스트
                    .build();
        } catch (Exception e) {
            log.error("❌ FoodService: Kakao document 파싱 실패. doc={}", doc, e);
            return null;
        }
    }
}
