package com.skku.swe_project.place.service;

import com.skku.swe_project.facade.service.KakaoMapService;
import com.skku.swe_project.place.domain.Place;
import com.skku.swe_project.place.dto.PlaceDto;
import com.skku.swe_project.place.repository.PlaceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SpotService {

    private final PlaceRepository placeRepository;
    private final KakaoMapService kakaoMapService;

    public List<PlaceDto> findSpots(String location) {
        // 1. 카카오 API로 좌표 구하기
        KakaoMapService.CoordinateDto coordinate = kakaoMapService.searchCoordinate(location);

        // 2. 좌표를 못 찾았으면 -> 빈 리스트
        if (coordinate == null) {
            return List.of();
        }

        // 2. 진짜 좌표로 DB 검색
        // ⭐️ 핵심 변경 1: 5개(limit)만 가져오지 말고, 넉넉하게 20~30개를 가져옵니다.
        List<Place> places = placeRepository.findPlacesByLocation(
                coordinate.getLongitude(),
                coordinate.getLatitude(),
                2000, // 반경 2km
                30    // ⭐️ limit를 5 -> 30으로 늘림 (풀을 넓게 잡음)
        );

        // ⭐️ 핵심 변경 2: 가져온 리스트를 무작위로 섞습니다.
        Collections.shuffle(places);

        // ⭐️ 핵심 변경 3: 섞은 것 중에서 앞에서부터 5개만 자릅니다.
        // (장소가 30개보다 적을 수도 있으니 Math.min 사용)
        int pickCount = Math.min(places.size(), 5);
        List<Place> randomPicks = places.subList(0, pickCount);

        // 4. DTO 변환
        return randomPicks.stream().map(this::convertToDto).collect(Collectors.toList());
    }

    private PlaceDto convertToDto(Place place) {
        return PlaceDto.builder()
                .id(place.getId())
                .name(place.getName())
                .address(place.getAddress())
                .latitude(place.getLatitude())
                .longitude(place.getLongitude())
                .category(place.getCategory())
                // ✨ 여기가 핵심! Float -> Double 변환 ✨
                // DB에 값이 없으면(null이면) 0.0으로 처리, 있으면 Double로 변환
                .rating(place.getRating() != null ? place.getRating().doubleValue() : 0.0)

                .reviewSummary(place.getReviewSummary())
                .imageUrls(place.getImageUrls() != null ? place.getImageUrls() : new ArrayList<>())
                .build();
    }
}
