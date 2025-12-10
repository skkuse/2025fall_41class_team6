package com.skku.swe_project.facade.dto; // 패키지명은 본인 프로젝트에 맞게 수정

import com.skku.swe_project.place.dto.PlaceDto;
import lombok.*;

import java.util.List;

@Getter
@Setter
@Builder
@AllArgsConstructor // ★ 모든 필드를 받는 생성자 생성 (public)
@NoArgsConstructor  // ★ 빈 생성자 생성 (public)
public class RecommendationResponse {
    private String message;         // 명세서: "Success message"
    private String summary;         // 명세서: "LLM generated summary"
    private List<PlaceDto> places;  // 명세서: "List of recommended places"
}