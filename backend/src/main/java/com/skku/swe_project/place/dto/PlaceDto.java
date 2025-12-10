package com.skku.swe_project.place.dto;

import lombok.Builder;
import lombok.Getter;
import java.util.List;

@Getter
@Builder
public class PlaceDto {
    private Long id;                // 명세서: id
    private String name;            // 명세서: name
    private String address;         // 명세서: address (DB에 없으면 description이나 빈값 넣기)
    private Double latitude;        // 명세서: latitude
    private Double longitude;       // 명세서: longitude
    private String category;        // 명세서: category
    private Double rating;          // 명세서: rating
    private String reviewSummary;   // 명세서: reviewSummary
    private List<String> imageUrls; // 명세서: imageUrls (여러 장 가능)
}