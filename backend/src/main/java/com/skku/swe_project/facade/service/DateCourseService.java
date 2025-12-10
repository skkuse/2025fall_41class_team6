package com.skku.swe_project.facade.service;

import com.skku.swe_project.facade.dto.IntentResultDto;
import com.skku.swe_project.facade.dto.RecommendationRequest;
import com.skku.swe_project.facade.dto.RecommendationResponse;
import com.skku.swe_project.food.service.FoodService;
import com.skku.swe_project.place.dto.PlaceDto;
import com.skku.swe_project.place.service.SpotService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class DateCourseService {

    private final OpenAiService openAiService;
    private final SpotService spotService;
    private final FoodService foodService;

    // ✅ [변경 1] 파라미터에 'List<RecommendationRequest.Message> history' 추가
    public RecommendationResponse recommend(String query, List<RecommendationRequest.Message> history) {

        // ✅ [변경 2] history가 null일 경우 안전하게 빈 리스트로 처리
        if (history == null) {
            history = Collections.emptyList();
        }

        // 1. 의도/위치 분석 (AI에게 이전 대화 기록(history)도 같이 전달!)
        // ⚠️ 주의: OpenAiService의 analyzeUserQuery 메서드도 파라미터를 받도록 수정해야 빨간 줄이 안 뜹니다.
        IntentResultDto result = openAiService.analyzeUserQuery(query, history);

        String rawIntent = result.getIntent();
        String location = result.getLocation();

        String intent = (rawIntent == null || rawIntent.isBlank())
                ? "COURSE"
                : rawIntent.trim().toUpperCase();

        log.info("💬 DateCourseService: query='{}', intent='{}', location='{}', historySize={}",
                query, intent, location, history.size());

        // 2. 위치 없으면 입구 컷
        if (location == null || location.isBlank()) {
            return RecommendationResponse.builder()
                    .summary("데이트 코스를 짜드릴까요? \n어느 지역(예: 강남역, 홍대)에서 만나시는지 알려주세요!")
                    .places(Collections.emptyList())
                    .build();
        }

        List<PlaceDto> spots = new ArrayList<>();
        List<PlaceDto> foods = new ArrayList<>();

        // 3. 의도별 서비스 호출 분리

        // 👉 SPOT: 명소만 (DB 기반)
        if ("SPOT".equals(intent)) {
            spots = spotService.findSpots(location);
        }

        // 👉 FOOD: 맛집만 (Kakao + Google)
        if ("FOOD".equals(intent)) {
            foods = foodService.findRestaurants(location, query);
        }

        // 👉 COURSE: "데이트 코스"는 **명소(DB)**만 사용하고,
        //    추가로 외부 맛집 검색(FoodService)은 하지 않음.
        if ("COURSE".equals(intent)) {
            spots = spotService.findSpots(location);
            // foods 는 비워둠 -> 명소 기반 코스로만 구성
        }

        // 4-1. 순수 FOOD 모드: 맛집 리스트 + 맛집 전용 리포트
        if ("FOOD".equals(intent)) {
            if (foods.isEmpty()) {
                return RecommendationResponse.builder()
                        .summary("해당 지역에서 적절한 맛집을 찾지 못했어요 ㅠㅠ")
                        .places(Collections.emptyList())
                        .build();
            }

            String report = openAiService.makeFoodMarkdownReport(query, foods);

            return RecommendationResponse.builder()
                    .summary(report)
                    .places(foods)
                    .build();
        }

        // 4-2. SPOT / COURSE 모드: 명소 기반 코스 요약
        if (spots.isEmpty() && foods.isEmpty()) {
            return RecommendationResponse.builder()
                    .summary("죄송해요, 그 지역 정보는 아직 부족하네요 ㅠㅠ")
                    .places(Collections.emptyList())
                    .build();
        }

        String summary = openAiService.makeCourseSummary(spots, foods);

        List<PlaceDto> allPlaces = new ArrayList<>();
        allPlaces.addAll(foods);  // SPOT 모드에서는 비어 있고,
        allPlaces.addAll(spots);  // COURSE/ SPOT 에서는 명소들이 들어감

        return RecommendationResponse.builder()
                .summary(summary)
                .places(allPlaces)
                .build();
    }
}
