package com.skku.swe_project.facade.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor // 기본 생성자 (필수)
@AllArgsConstructor // 모든 필드를 넣는 생성자
public class IntentResultDto {

    // 사용자 질문의 의도 (예: "SPOT", "FOOD", "COURSE")
    private String intent;

    // 추출된 지역 명 (예: "강남역", "홍대") - 없으면 null일 수 있음
    private String location;
}