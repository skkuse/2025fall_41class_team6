import { useState } from 'react';
import { getRecommendation } from '../api/recommendationApi'; // 실제 API
import { getMockRecommendation } from '../api/mockRecommendationApi'; // (테스트용)
import { ChatMessage } from '../types';

export const useRecommendation = () => {
    const [isLoading, setIsLoading] = useState(false);

    // searchPlaces가 이제 전체 메시지 목록(fullHistory)을 인자로 받음
    const searchPlaces = async (query: string, fullHistory: ChatMessage[]) => {
        if (!query.trim()) return null;

        setIsLoading(true);

        try {
            // --- ★ 효율성 로직 시작 ---

            // 1. 데이터 다이어트: 무거운 images, places 정보 제거하고 role, text만 추출
            const simpleHistory = fullHistory.map(msg => ({
                role: msg.role,
                content: msg.text
            }));

            // 2. 개수 제한 (Sliding Window): 최근 10개 메시지만 남기기
            // (너무 옛날 대화는 AI가 까먹어도 됨 + 토큰 비용 절약)
            const recentHistory = simpleHistory.slice(-10);

            // --- ★ 효율성 로직 끝 ---

            // 백엔드로 전송 (현재 질문 + 정제된 과거 기록)
            const result = await getRecommendation(query, recentHistory);
            //console.log(query);
            //console.log(recentHistory);
            //const result = await getMockRecommendation(query, recentHistory);


            return result;
        } catch (err: any) {
            console.error(err);
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    return { isLoading, searchPlaces };
};