// src/api/routeApi.ts
import { Place } from "../types";

export type RouteMode = "car" | "transit" | "walk";

export interface RouteSummary {
  distance: number; // m
  duration: number; // sec
}

export interface RouteResponse {
  path: { lat: number; lng: number }[];
  summary: RouteSummary;
}

// ✅ .env 에서 카카오 REST 키 읽기
// .env: REACT_APP_KAKAO_REST_KEY=실제_32자리_REST_키
const KAKAO_REST_KEY = "60c581a747cd015eccd6d3d8af509c58";

if (!KAKAO_REST_KEY) {
  console.warn(
    "[routeApi] REACT_APP_KAKAO_REST_KEY 가 설정되어 있지 않습니다. .env 파일을 확인하세요."
  );
}

const KAKAO_DIRECTIONS_URL =
  "https://apis-navi.kakaomobility.com/v1/directions";

export async function fetchRoute(
  mode: RouteMode,
  origin: Place,
  dest: Place
): Promise<RouteResponse> {
  console.log("[fetchRoute] mode, origin, dest:", { mode, origin, dest });

  const url = new URL(KAKAO_DIRECTIONS_URL);
  // Kakao: origin,destination = "x,y" = "lng,lat"
  url.searchParams.set("origin", `${origin.longitude},${origin.latitude}`);
  url.searchParams.set("destination", `${dest.longitude},${dest.latitude}`);
  url.searchParams.set("priority", "RECOMMEND");

  console.log("[fetchRoute] 요청 URL:", url.toString());

  if (!KAKAO_REST_KEY) {
    throw new Error("KAKAO REST KEY 가 설정되어 있지 않습니다. (.env 확인)");
  }

  const resp = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `KakaoAK ${KAKAO_REST_KEY}`,
      "Content-Type": "application/json",
    },
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error(
      "[fetchRoute] 응답 에러 상태:",
      resp.status,
      text.slice(0, 300)
    );
    throw new Error(
      `route api error: HTTP ${resp.status}\n${text.slice(0, 200)}`
    );
  }

  const contentType = resp.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await resp.text();
    console.error("[fetchRoute] JSON 아님, 받은 내용:", text.slice(0, 300));
    throw new Error(
      `route api error: JSON 이 아닌 응답을 받았습니다.\ncontent-type: ${contentType}\nbody: ${text.slice(
        0,
        200
      )}`
    );
  }

  const data: any = await resp.json();
  console.log("[fetchRoute] Kakao 응답 JSON:", data);

  const firstRoute = data.routes?.[0];
  if (!firstRoute) {
    throw new Error("경로를 찾지 못했습니다. (routes[0] 없음)");
  }

  const path: { lat: number; lng: number }[] = [];

  // routes[0].sections[].roads[].vertexes: [x1, y1, x2, y2, ...] (lng, lat)
  firstRoute.sections?.forEach((section: any) => {
    section.roads?.forEach((road: any) => {
      const vertexes: number[] = road.vertexes ?? [];
      for (let i = 0; i < vertexes.length; i += 2) {
        const x = vertexes[i];
        const y = vertexes[i + 1];
        if (typeof x === "number" && typeof y === "number") {
          path.push({ lat: y, lng: x });
        }
      }
    });
  });

  console.log("[fetchRoute] 최종 path length:", path.length);

  const kakaoSummary = firstRoute.summary;
  const distance = kakaoSummary.distance as number; // m
  let duration = kakaoSummary.duration as number; // sec (차량 기준)

  // ✅ 모드별로 duration 재계산 (distance 는 그대로 사용)
  if (mode === "walk") {
    // 보행 속도 약 4.5 km/h ≈ 1.25 m/s
    const walkSpeed = 1.25;
    duration = distance / walkSpeed;
  } else if (mode === "transit") {
    // 대중교통 평균 속도 대략 20 km/h ≈ 5.6 m/s (임의 근사)
    const transitSpeed = 5.6;
    duration = distance / transitSpeed;
  } else {
    // car 인 경우: Kakao 가 준 duration 그대로 사용
  }

  return {
    path,
    summary: {
      distance,
      duration,
    },
  };
}
