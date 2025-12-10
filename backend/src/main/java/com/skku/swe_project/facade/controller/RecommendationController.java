package com.skku.swe_project.facade.controller;

import com.skku.swe_project.facade.dto.RecommendationRequest;
import com.skku.swe_project.facade.dto.RecommendationResponse;
import com.skku.swe_project.facade.service.DateCourseService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;

@Slf4j
@RestController
@RequestMapping("/api") // ✅ 1. 프론트엔드 baseURL에 맞춰 변경
@RequiredArgsConstructor
public class RecommendationController {

    private final DateCourseService dateCourseService;

    @PostMapping("/recommend")
    public ResponseEntity<RecommendationResponse> getRecommendations(@RequestBody RecommendationRequest request) {
        log.info("📩 요청 도착 - Query: {}", request.getQuery());

        try {
            // ✅ [수정] query와 history를 둘 다 서비스로 전달합니다!
            // (request.getHistory()가 null이면 빈 리스트를 넘기도록 처리하면 더 안전합니다)
            RecommendationResponse response = dateCourseService.recommend(
                    request.getQuery(),
                    request.getHistory() // 리스트 전달
            );

            response.setMessage("SUCCESS");
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            // 5. 에러 처리 (기존 로직 유지)
            log.error("❌ 추천 서비스 에러 발생: ", e);

            RecommendationResponse errorResponse = new RecommendationResponse();
            errorResponse.setMessage("FAIL");
            errorResponse.setPlaces(Collections.emptyList());
            errorResponse.setSummary("서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");

            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }
}