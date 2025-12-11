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
    public IntentResultDto analyzeUserQuery(String userQuery, List<RecommendationRequest.Message> history) {

        // 1-1. 대화 기록 변환 (기존 코드 동일)
        StringBuilder conversationHistory = new StringBuilder();
        if (history != null && !history.isEmpty()) {
            conversationHistory.append("[이전 대화 내용]\n");
            for (RecommendationRequest.Message msg : history) {
                String speaker = "user".equals(msg.getRole()) ? "사용자" : "AI";
                conversationHistory.append(String.format("- %s: %s\n", speaker, msg.getContent()));
            }
            conversationHistory.append("\n");
        }

        // 1-2. 🚨 [수정 핵심] 프롬프트를 강력하게 변경!
        // - "JSON만 출력해"라고 영어/한글로 강조
        // - 예시를 명확하게 줌
        String prompt = """
                You are an intent analysis AI. Analyze the user's request and return the result in JSON format only.
                Do not include any explanations, markdown code blocks, or extra text. Just the JSON object.
                
                %s
                [Current User Input]: "%s"
                
                [Analysis Rules]
                1. intent:
                   - If user wants to eat/drink (restaurant, cafe, bar) -> "FOOD"
                   - If user wants to visit/play (attraction, park, activity) -> "SPOT"
                   - If user wants both, or asks for a 'course' -> "COURSE"
                   - If unsure -> "COURSE"
                
                2. location:
                   - Extract the specific location name (e.g., 'Gangnam', 'Hongdae', 'Seongsu').
                   - ⭐ IMPORTANT: If the current input has no location, look at [이전 대화 내용] to find the most recent location.
                   - If no location is found in context, set it to null.
                
                [Output Format Example]
                {"intent": "COURSE", "location": "강남"}
                OR
                {"intent": "FOOD", "location": null}
                """.formatted(conversationHistory.toString(), userQuery);

        // 1-3. GPT 호출
        String jsonResponse = callGpt(prompt);

        try {
            // 🚨 [수정] JSON 파싱 강화
            // GPT가 가끔 ```json ... ``` 또는 그냥 텍스트를 섞어 보낼 때 순수 JSON만 발라내기
            int firstBrace = jsonResponse.indexOf("{");
            int lastBrace = jsonResponse.lastIndexOf("}");

            if (firstBrace != -1 && lastBrace != -1) {
                // { 부터 } 까지만 잘라냄
                jsonResponse = jsonResponse.substring(firstBrace, lastBrace + 1);
            } else {
                // JSON 형식이 아예 없으면 기본값 리턴
                log.warn("GPT 응답에 JSON이 없습니다. 원본: {}", jsonResponse);
                return new IntentResultDto("COURSE", null);
            }

            return objectMapper.readValue(jsonResponse, IntentResultDto.class);

        } catch (Exception e) {
            log.error("JSON 파싱 실패. 응답값: {}", jsonResponse, e);
            // 파싱 실패 시 안전하게 기본값 반환
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