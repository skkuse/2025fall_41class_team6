package com.skku.swe_project.food.service;

import com.skku.swe_project.facade.service.OpenAiService; // ✅ [추가]
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

    // ✅ [추가] OpenAI로 “검색 키워드” 정규화(일반화)
    private final OpenAiService openAiService;

    /**
     * Kakao Local + Google Places 평점 정보를 이용해
     * 상위 5개 장소 리스트를 반환 (업종은 originalQuery 기반)
     */
    public List<PlaceDto> findRestaurants(String location,
                                          String originalQuery) {

        // ✅ 업종/요리/테마를 반영한 "Kakao 검색용" keyword 생성
        String keyword = buildKakaoKeyword(location, originalQuery);

        if (keyword == null || keyword.isBlank()) {
            log.warn("🍜 FoodService: 검색 키워드 생성 실패. location='{}', originalQuery='{}'",
                    location, originalQuery);
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

        } catch (Exception e) {
            log.error("❌ FoodService: Kakao Local API 호출 중 예외 발생. keyword={}", keyword, e);
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

        // 2차: Google Places 평점 보강 + 정렬
        List<PlaceDto> enriched = googlePlacesService.enrichAndSortByRating(kakaoPlaces);

        if (enriched.isEmpty()) {
            return Collections.emptyList();
        }

        // 3차: Top5 추출
        int limit = Math.min(5, enriched.size());
        return new ArrayList<>(enriched.subList(0, limit));
    }

    // =====================================================
    // ✅ [핵심 수정] OpenAI로 “Kakao 검색용 키워드”를 뽑아서 일반화
    // =====================================================
    private String buildKakaoKeyword(String location, String originalQuery) {
        String query = (originalQuery != null) ? originalQuery.trim() : "";
        String loc = (location != null) ? location.trim() : "";

        if (query.isBlank() && loc.isBlank()) return null;

        // 1) 먼저 OpenAI에게 “Kakao에 넣을 짧은 검색어”로 정규화시키기
        //    - 예: "서울 분위기 좋은 파스타집 추천" -> "서울 파스타"
        //    - 예: "용산구 데이트하기 좋은 이자카야" -> "용산구 이자카야"
        try {
            String aiKeyword = openAiService.generateKakaoSearchKeyword(loc, query);
            if (aiKeyword != null && !aiKeyword.isBlank()) {
                return aiKeyword;
            }
        } catch (Exception e) {
            log.warn("⚠️ FoodService: OpenAI keyword 생성 실패. fallback 사용. {}", e.getMessage());
        }

        // 2) fallback(기존 규칙기반) - OpenAI 실패 시만 사용
        String type;
        if (containsAny(query, "카페", "커피", "디저트", "베이커리", "브런치")) {
            type = "카페";
        } else if (containsAny(query, "술집", "주점", "호프", "바", "이자카야", "포차", "와인")) {
            type = "술집";
        } else {
            type = "맛집";
        }

        if (!loc.isBlank()) return loc + " " + type;
        if (!query.isBlank()) return query;
        return null;
    }

    private boolean containsAny(String text, String... keywords) {
        if (text == null) return false;
        for (String k : keywords) {
            if (text.contains(k)) return true;
        }
        return false;
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
                    .id(null)
                    .name(name)
                    .address(finalAddress)
                    .latitude(latitude)
                    .longitude(longitude)
                    .category(category)
                    .rating(0.0)
                    .reviewSummary(finalAddress)
                    .imageUrls(new ArrayList<>())
                    .build();
        } catch (Exception e) {
            log.error("❌ FoodService: Kakao document 파싱 실패. doc={}", doc, e);
            return null;
        }
    }
}
