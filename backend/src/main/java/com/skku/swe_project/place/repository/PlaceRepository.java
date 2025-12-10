package com.skku.swe_project.place.repository;

import com.skku.swe_project.place.domain.Place;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PlaceRepository extends JpaRepository<Place, Long> {

    // 1. 기본 기능: save(), saveAll(), findAll(), findById() 등은
    // JpaRepository가 알아서 만들어주므로 따로 안 적어도 됩니다. (개꿀!)

    // ========================================================================
    // 2. 핵심 기능: 내 위치(경도, 위도) 기준 반경 N 미터 이내 장소 찾기 (공간 쿼리)
    // ========================================================================
    // MySQL 8.0의 ST_Distance_Sphere 함수를 사용해서 지구 곡면 거리를 계산합니다.
    // :radius 단위는 '미터(m)'입니다. (예: 2000 = 2km)

    @Query(value = """
        SELECT * FROM places 
        WHERE ST_Distance_Sphere(POINT(longitude, latitude), POINT(:userLng, :userLat)) <= :radius
        ORDER BY ST_Distance_Sphere(POINT(longitude, latitude), POINT(:userLng, :userLat)) ASC
        LIMIT :limitCount
        """, nativeQuery = true)
    List<Place> findPlacesByLocation(
            @Param("userLng") double userLng,   // 내 경도 (x)
            @Param("userLat") double userLat,   // 내 위도 (y)
            @Param("radius") int radius,        // 검색 반경 (미터)
            @Param("limitCount") int limitCount // 몇 개 가져올지
    );

    // (심화) 나중에 카테고리별로 필터링할 때 쓸 쿼리 (예: 명소만, 식당만)
    @Query(value = """
        SELECT * FROM place 
        WHERE ST_Distance_Sphere(POINT(longitude, latitude), POINT(:userLng, :userLat)) <= :radius
          AND category = :category
        ORDER BY ST_Distance_Sphere(POINT(longitude, latitude), POINT(:userLng, :userLat)) ASC
        LIMIT :limitCount
        """, nativeQuery = true)
    List<Place> findPlacesByLocationAndCategory(
            @Param("userLng") double userLng,
            @Param("userLat") double userLat,
            @Param("radius") int radius,
            @Param("category") String category,
            @Param("limitCount") int limitCount
    );
}