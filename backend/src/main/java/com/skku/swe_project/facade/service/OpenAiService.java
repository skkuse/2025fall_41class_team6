package com.skku.swe_project.facade.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.skku.swe_project.facade.dto.IntentResultDto;
import com.skku.swe_project.facade.dto.RecommendationRequest; // ✅ [추가] Message 클래스 사용
import com.skku.swe_project.place.dto.PlaceDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class OpenAiService {

    @Value("${openai.api.key}")
    private String apiKey;

    @Value("${openai.api.url}")
    private String apiUrl;

    @Value("${openai.api.model}")
    private String model;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    // 1. 사용자 의도 파악 (FOOD / SPOT / COURSE + location)
    // ✅ [수정] history 파라미터 추가
    public IntentResultDto analyzeUserQuery(String userQuery, List<RecommendationRequest.Message> history) {

        // 1-1. 대화 기록(history)을 프롬프트용 문자열로 변환
        StringBuilder conversationHistory = new StringBuilder();
        if (history != null && !history.isEmpty()) {
            conversationHistory.append("[이전 대화 내용]\n");
            for (RecommendationRequest.Message msg : history) {
                // role이 "user"면 사용자, "assistant"면 AI
                String speaker = "user".equals(msg.getRole()) ? "사용자" : "AI";
                conversationHistory.append(String.format("- %s: %s\n", speaker, msg.getContent()));
            }
            conversationHistory.append("\n");
        }

        // 1-2. 프롬프트 구성 (이전 대화를 참고해서 의도와 장소를 파악하도록 지시)
        String prompt = """
                너는 데이트 장소 추천 전문가야. 사용자의 질문을 분석해서 JSON 형식으로 답해줘.
                
                %s
                [현재 사용자 질문]: "%s"
                                
                [분석 규칙]
                1. intent: 
                   - '맛집', '술집', '카페' 등 먹는 곳을 원하면 FOOD
                   - '명소', '놀거리', '산책', '관광지'를 원하면 SPOT
                   - 둘 다 원하거나 '데이트 코스'를 짜달라고 하면 COURSE
                   - 분류하기 애매하면 COURSE
                2. location: 
                   - 사용자가 언급한 지역명(예: 강남역, 홍대, 부산 등).
                   - ⭐ 중요: 만약 현재 질문에 지역명이 없다면, [이전 대화 내용]에서 가장 최근에 언급된 지역을 찾아서 적어줘.
                   - 그래도 없으면 null.
                                
                [응답 형식(JSON 만 출력)]:
                {"intent": "...", "location": "..."}
                """.formatted(conversationHistory.toString(), userQuery);

        // 1-3. GPT 호출
        String jsonResponse = callGpt(prompt);

        try {
            // JSON 포맷팅 제거 (Markdown 코드블록 제거)
            if (jsonResponse.contains("```json")) {
                jsonResponse = jsonResponse.replace("```json", "")
                        .replace("```", "")
                        .trim();
            } else if (jsonResponse.contains("```")) {
                jsonResponse = jsonResponse.replace("```", "").trim();
            }

            return objectMapper.readValue(jsonResponse, IntentResultDto.class);
        } catch (Exception e) {
            log.error("JSON 파싱 실패: {}", jsonResponse, e);
            return new IntentResultDto("COURSE", null);
        }
    }

    // 2. 데이트 코스 요약 멘트 (명소 + 맛집 공용)
    // (이 메서드는 크게 수정할 필요 없으나, 원하면 history를 추가해서 문맥을 더 살릴 수 있음)
    public String makeCourseSummary(List<PlaceDto> spots, List<PlaceDto> foods) {
        StringBuilder info = new StringBuilder();

        if (!spots.isEmpty()) {
            info.append("=== 추천 명소 ===\n");
            for (PlaceDto p : spots) {
                info.append(String.format("- %s (카테고리: %s, 위치: %s)\n",
                        p.getName(), p.getCategory(), p.getAddress()));
            }
        }

        if (!foods.isEmpty()) {
            info.append("\n=== 추천 맛집 ===\n");
            for (PlaceDto f : foods) {
                String summaryPart = (f.getReviewSummary() != null && !f.getReviewSummary().isBlank())
                        ? f.getReviewSummary()
                        : (f.getAddress() != null ? f.getAddress() : "");
                info.append(String.format("- %s : %s\n", f.getName(), summaryPart));
            }
        }

        String prompt = """
                너는 친절한 데이트 코치야. 아래 장소 목록을 보고 자연스러운 데이트 코스 추천 멘트를 작성해줘.
                가게/명소 이름과 특징을 언급하면서 3~4문장 정도로 설레게 말해줘. 하트 이모티콘도 적절히 사용해줘.
                                
                [장소 목록]
                %s
                """.formatted(info.toString());

        return callGpt(prompt);
    }

    // 3. 맛집 전용 Markdown 리포트 (FOOD 모드)
    public String makeFoodMarkdownReport(String userQuery, List<PlaceDto> foods) {

        StringBuilder context = new StringBuilder();
        int idx = 1;
        for (PlaceDto p : foods) {
            context.append(String.format(
                    "%d. 이름: %s, 카테고리: %s, 주소: %s, 평점: %s\n",
                    idx++,
                    p.getName(),
                    p.getCategory(),
                    p.getAddress(),
                    p.getRating() != null ? p.getRating() : "N/A"
            ));
        }

        String prompt = """
                너는 '썸플레이스(Someplace)'의 수다쟁이 맛집 에디터야.
                                
                [사용자 요청]
                %s
                                
                [선정된 맛집 Top 정보]
                %s
                                
                위 식당들에 대해, 아래 형식으로 재밌는 추천 리포트를 작성해줘.
                                
                형식:
                💌 썸플레이스 추천 리포트 (Review Pick 5)
                                
                1. [식당이름] ([카테고리])
                   - 📍 [주소]
                   - ⭐ 평점/리뷰 수 한 줄 요약
                   - 💡 3~4줄 정도의 추천 코멘트 (맛, 분위기, 가성비, 데이트/모임용도 등)
                                
                2. ...
                                
                규칙:
                - 각 식당당 코멘트는 3~4줄 정도로 적당히.
                - 말투는 친근하고 TMT 느낌으로 오바하는 개쩌는 말투로.
                """.formatted(userQuery, context.toString());

        return callGpt(prompt);
    }

    // 4. 리뷰 요약
    public String summarizeReviews(String placeName, List<String> reviews) {
        if (reviews == null || reviews.isEmpty()) return null;

        StringBuilder reviewBlock = new StringBuilder();
        int idx = 1;
        for (String r : reviews) {
            reviewBlock.append(idx++).append(". ").append(r).append("\n\n");
        }

        String prompt = """
                너는 한국 맛집 리뷰를 요약하는 에디터야.
                이 식당의 특징을 1~2문장으로 한국어로 요약해줘.
                
                [식당 이름]: %s
                [리뷰 모음]: %s
                """.formatted(placeName, reviewBlock.toString());

        return callGpt(prompt);
    }

    // GPT 공통 호출
    private String callGpt(String prompt) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", model);
            requestBody.put("messages", List.of(
                    Map.of("role", "system", "content", "You are a helpful assistant."),
                    Map.of("role", "user", "content", prompt)
            ));
            requestBody.put("temperature", 0.7);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(apiUrl, entity, Map.class);

            Map<String, Object> body = response.getBody();
            if (body == null) return "AI 응답 오류";

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> choices = (List<Map<String, Object>>) body.get("choices");
            if (choices == null || choices.isEmpty()) return "AI 응답 오류";

            @SuppressWarnings("unchecked")
            Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
            return (String) message.get("content");

        } catch (Exception e) {
            log.error("GPT 호출 에러", e);
            return "죄송해요, AI가 잠시 휴식 중이에요 ㅠㅠ";
        }
    }
}