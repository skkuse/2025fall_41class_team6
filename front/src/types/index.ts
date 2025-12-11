export interface Place {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  category: string;
  rating: number;
  reviewSummary: string;
  imageUrls: string[];
}

// ★ 신규: 장소들의 집합인 '코스' 정의
export interface Course {
  id: string;
  title: string; // 예: "로맨틱 야경 코스"
  description: string; // 예: "연인과 함께하기 좋은..."
  places: Place[];
}

export interface RecommendationResponse {
  summary: string;
  places: Place[];
  //courses: Course[]; // ★ 변경: 단순 places 배열 -> 코스 배열
}

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  places?: Place[];
  //courses?: Course[]; // ★ 추가: 이 메시지에 딸린 추천 코스들
}

export type Category = "restaurant" | "cafe" | "spot";
// 음식점 / 카페 / 가볼만한 곳

export interface SavedPlace {
  placeId: string; // Place.id
  place: Place;
  category: Category;
}

// ★ 신규: 채팅 세션 (대화방) 타입
export interface ChatSession {
    id: string;
    title: string; // 채팅방 제목 (첫 번째 질문 내용 등)
    messages: ChatMessage[];
    createdAt: number; // 생성 시간 (정렬용)
    lastUpdatedAt: number; // 마지막 활동 시간
}
