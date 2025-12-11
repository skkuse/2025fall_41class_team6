//package com.skku.swe_project.place.util;
//
//import com.fasterxml.jackson.annotation.JsonProperty;
//import com.fasterxml.jackson.core.type.TypeReference;
//import com.fasterxml.jackson.databind.ObjectMapper;
//import com.skku.swe_project.place.domain.Place;
//import com.skku.swe_project.place.repository.PlaceRepository;
//import lombok.Data;
//import lombok.RequiredArgsConstructor;
//import lombok.extern.slf4j.Slf4j;
//import org.springframework.boot.CommandLineRunner;
//import org.springframework.core.io.ClassPathResource;
//import org.springframework.stereotype.Component;
//
//import java.io.InputStream;
//import java.util.*;
//import java.util.stream.Collectors;
//
//@Slf4j
//@Component
//@RequiredArgsConstructor
//public class PlaceDataLoader implements CommandLineRunner {
//
//    private final PlaceRepository placeRepository;
//    private final ObjectMapper objectMapper;
//
//    @Override
//    public void run(String... args) throws Exception {
//        // 1. DB에 데이터가 이미 있는지 확인
//        if (placeRepository.count() > 0) {
//            log.info("✅ DB에 데이터가 이미 존재합니다. (총 {}개) -> 초기화 스킵!", placeRepository.count());
//            return;
//        }
//
//        log.info("🚀 로컬 DB가 비어있습니다. 데이터 적재를 시작합니다... (final_data_with_reviews.json)");
//
//        ClassPathResource resource = new ClassPathResource("final_data_with_reviews.json");
//        if (!resource.exists()) {
//            log.error("❌ resources 폴더에 'final_data_with_reviews.json' 파일이 없습니다!");
//            return;
//        }
//
//        try (InputStream inputStream = resource.getInputStream()) {
//            List<PlaceJsonDto> jsonList = objectMapper.readValue(inputStream, new TypeReference<List<PlaceJsonDto>>() {});
//
//            // ⭐️ 핵심 변경: 중복 제거 로직 추가!
//            // kakaoId가 같은 게 있으면 하나만 남깁니다.
//            Map<String, PlaceJsonDto> uniqueMap = new HashMap<>();
//            for (PlaceJsonDto dto : jsonList) {
//                // kakaoId가 없으면 serialNumber나 name으로 대체 가능하지만, 일단 kakaoId 기준
//                String key = dto.getKakaoId();
//                if (key != null) {
//                    uniqueMap.putIfAbsent(key, dto);
//                }
//            }
//
//            List<PlaceJsonDto> uniqueList = new ArrayList<>(uniqueMap.values());
//            log.info("🔍 원본 {}개 중 중복 제거 후 {}개 데이터 준비 완료", jsonList.size(), uniqueList.size());
//
//            // Entity 변환
//            List<Place> places = uniqueList.stream().map(dto -> Place.builder()
//                    .name(dto.getName())
//                    .category(dto.getCategory())
//                    .address(dto.getAddress())
//                    .latitude(dto.getLatitude())
//                    .longitude(dto.getLongitude())
//                    .rating(dto.getRating())
//                    .reviewSummary(dto.getReviewSummary())
//                    .imageUrl(dto.getImageUrl())
//                    .imageUrls(dto.getImageUrls())
//                    .kakaoId(dto.getKakaoId())
//                    .serialNumber(dto.getSerialNumber())
//                    .build()
//            ).collect(Collectors.toList());
//
//            // DB 저장
//            placeRepository.saveAll(places);
//            log.info("🎉 데이터 적재 완료! 총 {}개의 장소가 DB에 저장되었습니다.", places.size());
//
//        } catch (Exception e) {
//            log.error("❌ 데이터 적재 중 에러 발생: ", e);
//        }
//    }
//
//    @Data
//    static class PlaceJsonDto {
//        private String name;
//        private String category;
//        private String address;
//        private Double latitude;
//        private Double longitude;
//        private Float rating;
//        private String reviewSummary;
//        private List<String> imageUrls;
//        @JsonProperty("image_url")
//        private String imageUrl;
//        @JsonProperty("kakao_id")
//        private String kakaoId;
//        @JsonProperty("serial_number")
//        private String serialNumber;
//    }
//}