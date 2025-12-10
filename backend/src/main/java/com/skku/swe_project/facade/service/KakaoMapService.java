package com.skku.swe_project.facade.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Slf4j
@Service
@RequiredArgsConstructor
public class KakaoMapService {

    @Value("${kakao.api.key}")
    private String kakaoApiKey;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String KAKAO_API_URL = "https://dapi.kakao.com/v2/local/search/keyword.json?query=";

    public CoordinateDto searchCoordinate(String locationName) {
        try {
            // 1. 헤더 설정 (인증키)
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "KakaoAK " + kakaoApiKey);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            // 2. 요청 보내기
            String url = KAKAO_API_URL + locationName;
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);

            // 3. JSON 파싱
            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode documents = root.path("documents");

            if (documents.size() > 0) {
                JsonNode firstResult = documents.get(0);
                double x = firstResult.get("x").asDouble(); // 경도 (Longitude)
                double y = firstResult.get("y").asDouble(); // 위도 (Latitude)

                log.info("📍 카카오 검색 성공: {} -> {}, {}", locationName, y, x);
                return new CoordinateDto(y, x);
            }

        } catch (Exception e) {
            log.error("❌ 카카오맵 검색 실패: {}", locationName, e);
        }

        // 검색 실패 시 null 리턴
        return null;
    }

    // 내부에서만 쓸 간단한 DTO
    @lombok.Getter
    @lombok.AllArgsConstructor
    public static class CoordinateDto {
        private Double latitude;  // 위도 (y)
        private Double longitude; // 경도 (x)
    }
}
