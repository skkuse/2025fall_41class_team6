// src/pages/MainPage.tsx
import React, { useState, useRef, useEffect } from 'react';
import './MainPage.css';

// 컴포넌트 임포트
import { Sidebar } from '../components/layout/Sidebar';
import { AiSummaryPanel } from '../components/panels/AiSummaryPanel';
import { MapPanel } from '../components/panels/MapPanel';
import { PlaceListPanel } from '../components/panels/PlaceListPanel';
import { Modal } from '../components/common/Modal';
import { KakaoMapViewer } from '../components/map/KakaoMapViewer';

// 훅 & 타입 & API
import { useRecommendation } from '../hooks/useRecommendation';
import { useChatStore } from '../hooks/useChatStore';
import { Place, SavedPlace, Category } from '../types';
import { fetchRoute, RouteResponse, RouteMode, RouteSummary } from '../api/routeApi';

// 개별 경로 저장용 타입 (PlaceListPanel의 RouteCard와 동일 구조)
interface RouteEntry {
  id: string;
  startPlaceId: string;
  endPlaceId: string;
  mode: RouteMode;
  summary: RouteSummary;
  path: { lat: number; lng: number }[];
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
}

/**
 * 프론트 전용 고유 장소 키
 *  - 백엔드/AI에서 오는 place.id 가 중복될 수 있으므로
 *    id + 위도 + 경도 기반으로 한 번만 생성해서 끝까지 사용
 */
const makePlaceKey = (place: Place): string => {
  const baseId = place.id ?? 'noid';
  return `${baseId}_${place.latitude}_${place.longitude}`;
};

const MainPage: React.FC = () => {
  // 1. 훅 초기화
  const { isLoading, searchPlaces } = useRecommendation();
  const chatStore = useChatStore();

  // 2. UI 상태
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  // 3. 데이터 상태
  const [displayedPlaces, setDisplayedPlaces] = useState<Place[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);

  // 4. 길찾기 상태
  const [routeStartId, setRouteStartId] = useState<string | null>(null);
  const [routeEndId, setRouteEndId] = useState<string | null>(null);
  const [routeResult, setRouteResult] = useState<RouteResponse | null>(null);
  const [routeMode, setRouteMode] = useState<RouteMode>('car');
  const [routes, setRoutes] = useState<RouteEntry[]>([]);
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null);

  // 5. AiSummary vs Info 패널 가로 비율 (드래그로 조절)
  const [centerWidth, setCenterWidth] = useState<number>(55); // 기본: 왼쪽 55%, 오른쪽 45%
  const [isResizing, setIsResizing] = useState(false);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  // 전역 마우스 드래그 이벤트
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!bodyRef.current) return;
      const rect = bodyRef.current.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      let newPercent = (relativeX / rect.width) * 100;

      // 너무 극단적인 비율 방지
      if (newPercent < 25) newPercent = 25;
      if (newPercent > 75) newPercent = 75;

      setCenterWidth(newPercent);
    };

    const handleMouseUp = () => setIsResizing(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsResizing(true);
  };

  // --- 헬퍼: ID 기반 Place 찾기 ---
  const getPlaceById = (id: string | null): Place | null => {
    if (!id) return null;

    const inDisplay = displayedPlaces.find((p) => p.id === id);
    if (inDisplay) return inDisplay;

    const inSaved = savedPlaces.find((sp) => sp.placeId === id);
    return inSaved ? inSaved.place : null;
  };

  // --- 검색 & 채팅 ---

  const handleSearch = async (query: string) => {
    chatStore.addMessage({ role: 'user', text: query });
    const currentHistory = [...chatStore.currentMessages];

    const result = await searchPlaces(query, currentHistory);

    if (result) {
      chatStore.addMessage({
        role: 'assistant',
        text: result.summary,
        places: result.places,
      });
    } else {
      chatStore.addMessage({
        role: 'assistant',
        text: '죄송합니다. 오류가 발생했습니다.',
      });
    }
  };

  const handleNewChat = () => {
    chatStore.startNewChat();
    setIsInfoPanelOpen(false);
    setDisplayedPlaces([]);
    setSelectedPlaceId(null);
    setRouteResult(null);
    setRouteStartId(null);
    setRouteEndId(null);
    setRoutes([]);
    setActiveRouteId(null);
  };

  // --- 장소 표시/선택/삭제 ---

  const handleApplyPlaces = (places: Place[]) => {
    const normalizedNew = places.map((p) => ({
      ...p,
      id: makePlaceKey(p),
    }));

    setDisplayedPlaces((prev) => {
      const existingIds = new Set(prev.map((p) => p.id));
      const onlyNew = normalizedNew.filter((p) => !existingIds.has(p.id));
      return [...prev, ...onlyNew];
    });

    if (normalizedNew.length > 0) {
      setSelectedPlaceId(normalizedNew[0].id);
    }

    setIsInfoPanelOpen(true);

    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleRemovePlace = (placeId: string) => {
    setDisplayedPlaces((prev) => prev.filter((p) => p.id !== placeId));
    if (selectedPlaceId === placeId) setSelectedPlaceId(null);
  };

  const handleSelectPlace = (id: string) => {
    setSelectedPlaceId(id);
  };

  // --- 저장(북마크) 관리 ---

  const handleSavePlace = (place: Place, category: Category) => {
    const placeKey = place.id; // 이미 makePlaceKey 로 정규화된 상태

    setSavedPlaces((prev) => {
      const exists = prev.some(
        (sp) => sp.placeId === placeKey && sp.category === category,
      );
      if (exists) return prev;

      return [
        ...prev,
        {
          placeId: placeKey,
          place: { ...place },
          category,
          savedAt: Date.now(),
        },
      ];
    });
  };

  const handleRemoveSavedPlace = (placeId: string, category: Category) => {
    setSavedPlaces((prev) =>
      prev.filter(
        (sp) => !(sp.placeId === placeId && sp.category === category),
      ),
    );

    if (routeStartId && routeStartId === placeId) {
      setRouteStartId(null);
      setRouteResult(null);
      setActiveRouteId(null);
    }
    if (routeEndId && routeEndId === placeId) {
      setRouteEndId(null);
      setRouteResult(null);
      setActiveRouteId(null);
    }
  };

  // --- 길찾기 ---

  const requestRoute = async (
    startId: string,
    endId: string,
    mode: RouteMode,
  ) => {
    const start = getPlaceById(startId);
    const end = getPlaceById(endId);

    if (!start || !end) return;

    try {
      console.log(
        `[MainPage] 경로 탐색 요청: ${start.name} -> ${end.name} (${mode})`,
      );
      const result = await fetchRoute(mode, start, end);

      const routeResponse: RouteResponse = {
        path: result.path,
        summary: result.summary,
      };
      setRouteResult(routeResponse);

      setRoutes((prev) => {
        const id = `${start.id}-${end.id}-${mode}`;

        const baseEntry: RouteEntry = {
          id,
          startPlaceId: start.id,
          endPlaceId: end.id,
          mode,
          summary: result.summary,
          path: result.path,
          startLat: start.latitude,
          startLng: start.longitude,
          endLat: end.latitude,
          endLng: end.longitude,
        };

        const filtered = prev.filter(
          (r) =>
            !(
              r.startPlaceId === baseEntry.startPlaceId &&
              r.endPlaceId === baseEntry.endPlaceId &&
              r.mode === mode
            ),
        );

        return [...filtered, baseEntry];
      });

      setActiveRouteId(`${start.id}-${end.id}-${mode}`);
      setRouteStartId(null);
      setRouteEndId(null);
    } catch (error) {
      console.error('경로 탐색 실패:', error);
      alert('경로를 찾을 수 없습니다.');
    }
  };

  const handleSetRouteStart = (placeId: string, category: Category) => {
    setRouteStartId(placeId);
    if (routeEndId && placeId !== routeEndId) {
      requestRoute(placeId, routeEndId, routeMode);
    }
  };

  const handleSetRouteEnd = (placeId: string, category: Category) => {
    setRouteEndId(placeId);
    if (routeStartId && routeStartId !== placeId) {
      requestRoute(routeStartId, placeId, routeMode);
    }
  };

  const handleChangeRouteMode = (mode: RouteMode) => {
    setRouteMode(mode);
    if (routeStartId && routeEndId) {
      requestRoute(routeStartId, routeEndId, mode);
    }
  };

  // --- 경로 삭제 & 선택 ---

  const handleRemoveRoute = (routeId: string) => {
    setRoutes((prev) => prev.filter((r) => r.id !== routeId));
    if (activeRouteId === routeId) {
      setActiveRouteId(null);
      setRouteResult(null);
    }
  };

  const handleSelectRoute = (routeId: string) => {
    const target = routes.find((r) => r.id === routeId);
    if (!target) return;

    setActiveRouteId(routeId);
    setRouteResult({
      path: target.path,
      summary: target.summary,
    });
  };

  // --- UI 토글 ---
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeInfoPanel = () => setIsInfoPanelOpen(false);

  return (
    <div className="main-container">
      {/* 좌측 사이드바 */}
      <Sidebar
        isOpen={isSidebarOpen}
        sessions={chatStore.sessions}
        currentSessionId={chatStore.currentSessionId}
        onNewChat={handleNewChat}
        onSelectChat={(id) => {
          chatStore.selectSession(id);
        }}
        onDeleteChat={chatStore.deleteSession}
      />

      {/* 중앙(AI) + 우측(지도/리스트) 전체 래퍼 */}
      <div
        ref={bodyRef}
        style={{
          display: 'flex',
          flex: 1,
          height: '100%',
          overflow: 'hidden',
        }}
      >
        {/* 중앙 AI 패널 */}
        <div
          className="center-panel"
          style={
            isInfoPanelOpen
              ? {
                  flexBasis: `${centerWidth}%`,
                  flexShrink: 0,
                  flexGrow: 0,
                  minWidth: 0,
                }
              : {
                  flex: 1,
                  flexBasis: 'auto',
                  minWidth: 0,
                }
          }
        >
          <AiSummaryPanel
            messages={chatStore.currentMessages}
            onSearch={handleSearch}
            onApplyPlaces={handleApplyPlaces}
            isLoading={isLoading}
            onToggleSidebar={toggleSidebar}
          />
        </div>

        {/* 가운데 리사이즈 바 (info 패널 열려 있을 때만 표시) */}
        {isInfoPanelOpen && (
          <div
            onMouseDown={handleDragStart}
            style={{
              width: '6px',
              cursor: 'col-resize',
              backgroundColor: isResizing ? '#f97373' : '#e5e7eb',
              alignSelf: 'stretch',
              flexShrink: 0,
            }}
            title="패널 너비 조절"
          />
        )}

        {/* 우측 정보 패널 */}
        {isInfoPanelOpen && (
          <div
            className="info-panel-wrapper open"
            style={{
              flexBasis: `${100 - centerWidth}%`,
              flexShrink: 0,
              flexGrow: 0,
              display: 'flex',
              width: 'auto',
              maxWidth: '100%',
              minWidth: 0,
            }}
          >
            <div
              className="info-panel-content"
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                height: '100%',
                minWidth: 0,
              }}
            >
              {/* 헤더 */}
              <div className="info-header">
                <span style={{ fontWeight: 'bold', color: '#334155' }}>
                  지도 & 상세정보
                </span>
                <button
                  className="close-btn"
                  onClick={closeInfoPanel}
                  title="패널 닫기"
                >
                  ✖
                </button>
              </div>

              {/* 상단: 지도 */}
              <div
                className="right-top-panel"
                style={{ width: '100%', minWidth: 0 }}
              >
                <MapPanel
                  places={displayedPlaces}
                  selectedPlaceId={selectedPlaceId}
                  onSelectPlace={handleSelectPlace}
                  routePath={routeResult?.path}
                  savedPlaces={savedPlaces}
                  routeStartId={routeStartId}
                  routeEndId={routeEndId}
                  onSavePlace={handleSavePlace}
                  onRemoveSavedPlace={handleRemoveSavedPlace}
                  onSetRouteStart={handleSetRouteStart}
                  onSetRouteEnd={handleSetRouteEnd}
                  onExpand={() => setIsMapModalOpen(true)}
                />
              </div>

              {/* 하단: 리스트 */}
              <div
                className="right-bottom-panel"
                style={{ width: '100%', minWidth: 0 }}
              >
                <PlaceListPanel
                  places={displayedPlaces}
                  savedPlaces={savedPlaces}
                  selectedPlaceId={selectedPlaceId}
                  onSelectPlace={handleSelectPlace}
                  onRemovePlace={handleRemovePlace}
                  routeMode={routeMode}
                  routes={routes}
                  onChangeRouteMode={handleChangeRouteMode}
                  onRemoveRoute={handleRemoveRoute}
                  onSelectRoute={handleSelectRoute}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 지도 확장 모달 */}
      <Modal isOpen={isMapModalOpen} onClose={() => setIsMapModalOpen(false)}>
        <div style={{ width: '100%', height: '100%' }}>
          <KakaoMapViewer
            places={displayedPlaces}
            selectedPlaceId={selectedPlaceId}
            onSelectPlace={handleSelectPlace}
            routePath={routeResult?.path}
            savedPlaces={savedPlaces}
            routeStartId={routeStartId}
            routeEndId={routeEndId}
            onSavePlace={handleSavePlace}
            onRemoveSavedPlace={handleRemoveSavedPlace}
            onSetRouteStart={handleSetRouteStart}
            onSetRouteEnd={handleSetRouteEnd}
          />
        </div>
      </Modal>
    </div>
  );
};

export default MainPage;

