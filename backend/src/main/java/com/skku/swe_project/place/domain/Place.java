package com.skku.swe_project.place.domain;

import com.skku.swe_project.place.util.StringListConverter;
import jakarta.persistence.*;
import lombok.*;

import java.util.List;

@Entity
@Table(name = "places") // 1. 테이블 이름 'places'로 지정 (중요!)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Place {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "kakao_id", unique = true)
    private String kakaoId;

    @Column(name = "serial_number")
    private String serialNumber;

    @Column(nullable = false)
    private String name;

    private String category;

    private String address;

    // 2. DB 컬럼명(review_summary)과 매핑
    @Column(name = "review_summary", columnDefinition = "TEXT")
    private String reviewSummary;

    private Double latitude;

    private Double longitude;

    private Float rating;

    // 3. DB 컬럼명(image_url)과 매핑 (대표 이미지)
    @Column(name = "image_url")
    private String imageUrl;

    // 4. DB 컬럼명(image_urls)과 매핑 (이미지 리스트 JSON)
    // DB에는 JSON으로 저장되지만, 자바에서는 일단 String으로 받아서 처리하는 게 에러가 적습니다.
    // ✨ 여기가 핵심! String -> List<String>으로 변경 ✨
    @Column(name = "image_urls", columnDefinition = "json")
    @Convert(converter = StringListConverter.class) // 컨버터 연결
    private List<String> imageUrls;

    // ❌ description 필드는 DB에 없으므로 삭제했습니다!
}