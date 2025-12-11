import axios from 'axios';
import { RecommendationResponse, Place } from '../types';

// --- 1. 백엔드 데이터 타입 정의 (DTO) ---
// 백엔드 개발자가 알려준 JSON 구조와 일치해야 합니다.
interface BackendPlace {
    id: number;           // 백엔드는 숫자 ID
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    category: string;     // 대문자 (ATTRACTION 등)
    rating: number;
    reviewSummary: string;
    imageUrls: string[];
}

interface BackendResponse {
    message: string;
    places: BackendPlace[];
    summary: string;      // JSON 문자열 ("{\n ... }")
}

// --- 2. 헬퍼 함수: 데이터 변환기 (Adapter) ---

// 카테고리 변환 (백엔드 대문자 -> 프론트엔드 소문자)
const mapCategory = (backendCategory: string): string => {
    const cat = backendCategory.toUpperCase();
    if (cat === 'RESTAURANT') return 'restaurant';
    if (cat === 'CAFE') return 'cafe';
    if (cat === 'ATTRACTION') return 'spot';
    return 'etc';
};

// 요약 텍스트 파싱 (JSON 문자열 -> 줄글 변환)
const parseSummary = (jsonString: string): string => {
    try {
        const parsed = JSON.parse(jsonString);
        const comments = parsed["추천 멘트"];

        if (Array.isArray(comments)) {
            return comments.map((item: any) =>
                `✨ **${item["장소"]}**\n${item["추천 멘트"]}`
            ).join("\n\n");
        }
        return "추천 장소를 확인해보세요!";
    } catch (e) {
        console.warn("Summary parsing failed:", e);
        // JSON 형식이 아니거나 파싱 실패 시, 문자열 그대로 보여주거나 기본 메시지
        return "AI 요약 정보를 불러오는 중입니다.";
    }
};

// --- 3. Axios 인스턴스 설정 ---
const apiClient = axios.create({
    // 백엔드 서버 주소 (환경변수 없으면 로컬호스트 기본값)
    baseURL: 'https://some-place.onrender.com/' ,
    timeout: 30000, // 30초 대기
    headers: {
        'Content-Type': 'application/json',
    }
});

export interface SimpleMessage {
    role: 'user' | 'assistant';
    content: string;
}

// --- 4. 실제 API 호출 함수 ---

export const getRecommendation = async (
    query: string,
    history: SimpleMessage[]
): Promise<RecommendationResponse> => {

    console.log(`[API Request] Query: "${query}"`);

    try {
        // 실제 서버로 POST 요청 전송
        const response = await apiClient.post<BackendResponse>('/api/recommend', {
            query,
            history
        });

        const backendData = response.data;
        console.log("[API Response] Raw Data:", backendData);

        // ★ 데이터 변환 (Backend -> Frontend)
        const adaptedPlaces: Place[] = backendData.places.map((p) => ({
            id: String(p.id), // number -> string 변환
            name: p.name,
            address: p.address || "주소 정보 없음",
            latitude: p.latitude,
            longitude: p.longitude,
            category: mapCategory(p.category), // 카테고리 매핑
            rating: p.rating === 0.0 ? 4.5 : p.rating, // 0.0점이면 4.5점으로 보정 (선택사항)
            reviewSummary: p.reviewSummary || "AI가 추천하는 장소입니다.",
            imageUrls: p.imageUrls && p.imageUrls.length > 0
                ? p.imageUrls
                : ["https://via.placeholder.com/300x200?text=No+Image"] // 이미지 없으면 기본 이미지
        }));

        //const adaptedSummary = parseSummary(backendData.summary);
        const adaptedSummary = backendData.summary;

        return {
            summary: adaptedSummary,
            places: adaptedPlaces
        };

    } catch (error) {
        console.error("[API Error] 요청 실패:", error);
        // 에러를 던져서 UI에서 처리하게 함 (MainPage의 try-catch)
        throw error;
    }
};