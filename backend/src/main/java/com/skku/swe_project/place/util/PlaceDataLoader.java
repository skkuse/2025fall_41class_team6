package com.skku.swe_project.place.util;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.skku.swe_project.place.domain.Place;
import com.skku.swe_project.place.repository.PlaceRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class PlaceDataLoader implements CommandLineRunner {

    private final PlaceRepository placeRepository;
    private final ObjectMapper objectMapper;

    @Override
    public void run(String... args) throws Exception {
        // 1. DB에 데이터가 이미 있는지 확인 (중복 적재 방지)
        if (placeRepository.count() > 0) {
            log.info("✅ DB에 데이터가 이미 존재합니다. (총 {}개) -> 초기화 스킵!", placeRepository.count());
            return;
        }

        log.info("🚀 로컬 DB가 비어있습니다. 데이터 적재를 시작합니다... (final_data_with_reviews.json)");

        // 2. JSON 파일 읽기 (파일명 정확히 확인!)
        ClassPathResource resource = new ClassPathResource("final_data_with_reviews.json");

        if (!resource.exists()) {
            log.error("❌ resources 폴더에 'final_data_with_reviews.json' 파일이 없습니다!");
            return;
        }

        try (InputStream inputStream = resource.getInputStream()) {
            // JSON 파싱
            List<PlaceJsonDto> jsonList = objectMapper.readValue(inputStream, new TypeReference<List<PlaceJsonDto>>() {});

            // Entity 변환
            List<Place> places = jsonList.stream().map(dto -> Place.builder()
                    .name(dto.getName())
                    .category(dto.getCategory())
                    .address(dto.getAddress())
                    .latitude(dto.getLatitude())
                    .longitude(dto.getLongitude())

                    // ✅ 누락되었던 필드들 챙기기
                    .rating(dto.getRating())               // 별점
                    .reviewSummary(dto.getReviewSummary()) // 리뷰 요약
                    .imageUrl(dto.getImageUrl())           // 대표 이미지
                    .imageUrls(dto.getImageUrls())         // 이미지 리스트 (중요!)

                    .kakaoId(dto.getKakaoId())
                    .serialNumber(dto.getSerialNumber())
                    .build()
            ).collect(Collectors.toList());

            // 3. DB 저장
            placeRepository.saveAll(places);
            log.info("🎉 데이터 적재 완료! 총 {}개의 장소가 DB에 저장되었습니다.", places.size());

        } catch (Exception e) {
            log.error("❌ 데이터 적재 중 에러 발생: ", e);
        }
    }

    // JSON 파일과 매핑될 임시 DTO 클래스
    @Data
    static class PlaceJsonDto {
        private String name;
        private String category;
        private String address;
        private Double latitude;
        private Double longitude;
        private Float rating;
        private String reviewSummary;

        // JSON의 "imageUrls" (리스트)
        private List<String> imageUrls;

        // JSON의 "image_url" (대표 이미지)
        @JsonProperty("image_url")
        private String imageUrl;

        @JsonProperty("kakao_id")
        private String kakaoId;

        @JsonProperty("serial_number")
        private String serialNumber;

    }
}