package com.skku.swe_project.facade.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RecommendationRequest {

    private String query;       // 사용자 질문
    private List<Message> history; // 대화 기록 리스트

    // history 리스트 안에 들어갈 객체 정의
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Message {
        private String role;    // "user" 또는 "assistant"
        private String content; // 대화 내용
    }
}