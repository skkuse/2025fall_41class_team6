import React, { useEffect, useRef, useState } from 'react';
import { Place, SavedPlace, Category } from '../../types';
import { RouteMode, RouteSummary } from '../../api/routeApi';
import './PanelStyles.css';

interface RouteCard {
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

interface Props {
  places: Place[];
  savedPlaces: SavedPlace[];
  selectedPlaceId: string | null;
  onSelectPlace: (id: string) => void;
  onRemovePlace: (id: string) => void;

  routeMode: RouteMode;
  routes: RouteCard[];
  onChangeRouteMode: (mode: RouteMode) => void;

  onRemoveRoute: (routeId: string) => void;
  onSelectRoute: (routeId: string) => void;
}

export const PlaceListPanel: React.FC<Props> = ({
  places,
  savedPlaces,
  selectedPlaceId,
  onSelectPlace,
  onRemovePlace,
  routeMode,
  routes,
  onChangeRouteMode,
  onRemoveRoute,
  onSelectRoute,
}) => {
  const itemRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [activeTab, setActiveTab] =
    useState<'recommended' | 'saved' | 'route'>('recommended');

  // 선택된 카드로 스크롤
  useEffect(() => {
    if (!selectedPlaceId) return;
    if (activeTab === 'route') return;
    const el = itemRefs.current[selectedPlaceId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedPlaceId, activeTab]);

  const listToRender =
    activeTab === 'recommended'
      ? places
      : savedPlaces.map((sp) => sp.place);

  const isRouteTab = activeTab === 'route';

  const findPlace = (placeId: string): Place | null => {
    const inPlaces = places.find((p) => p.id === placeId);
    if (inPlaces) return inPlaces;
    const saved = savedPlaces.find((sp) => sp.placeId === placeId);
    return saved ? saved.place : null;
  };

  const getSavedInfo = (placeId: string) => {
    const saved = savedPlaces.find((p) => p.placeId === placeId);
    if (!saved) return null;

    const listSameCategory = savedPlaces.filter(
      (p) => p.category === saved.category,
    );
    const idx = listSameCategory.findIndex((p) => p.placeId === placeId);

    const colorMap: Record<Category, string> = {
      restaurant: '#ef4444',
      cafe: '#22c55e',
      spot: '#3b82f6',
    };

    const labelMap: Record<Category, string> = {
      restaurant: '음식점',
      cafe: '카페',
      spot: '장소',
    };

    const emojiMap: Record<Category, string> = {
      restaurant: '🍽',
      cafe: '☕',
      spot: '📍',
    };

    return {
      category: saved.category,
      order: idx + 1,
      color: colorMap[saved.category],
      labelShort: `${labelMap[saved.category]} ${idx + 1}`,
      labelWithEmoji: `${emojiMap[saved.category]} ${
        labelMap[saved.category]
      } ${idx + 1}`,
    };
  };

  const buildRouteSentence = (summary: RouteSummary): string => {
    const info: any = summary;

    const distanceText: string | undefined =
      info.distanceText ??
      (typeof info.distanceKm === 'number'
        ? `${info.distanceKm.toFixed(1)} km`
        : typeof info.distance === 'number'
        ? `${(info.distance / 1000).toFixed(1)} km`
        : undefined);

    const durationText: string | undefined =
      info.durationText ??
      (typeof info.durationMin === 'number'
        ? `${Math.round(info.durationMin)}분`
        : typeof info.duration === 'number'
        ? `${Math.round(info.duration / 60)}분`
        : undefined);

    const stepCount: number | undefined = Array.isArray(info.steps)
      ? info.steps.length
      : Array.isArray(info.legs?.[0]?.steps)
      ? info.legs[0].steps.length
      : undefined;

    const parts: string[] = [];
    if (durationText) parts.push(`${durationText} 정도 소요`);
    if (distanceText) parts.push(`${distanceText} 이동`);

    if (!parts.length) return '경로 요약 정보를 불러왔습니다.';
    const base = parts.join(' · ');
    if (stepCount && stepCount > 1) {
      return `${base} · 총 ${stepCount}단계 경로`;
    }
    return base;
  };

  const renderRouteModeButtons = () => {
    const pillStyle = (mode: RouteMode) => ({
      padding: '6px 12px',
      borderRadius: '999px',
      border: routeMode === mode ? '1px solid #e11d48' : '1px solid #e5e7eb',
      backgroundColor: routeMode === mode ? '#fdf2f8' : 'white',
      fontSize: '0.8rem',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center' as const,
      gap: '4px',
    });

    return (
      <div
        style={{
          marginBottom: '12px',
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
          이동 수단 선택
        </span>
        <button
          type="button"
          onClick={() => onChangeRouteMode('car' as RouteMode)}
          style={pillStyle('car' as RouteMode)}
        >
          🚗 <span>자동차 (내부 지도)</span>
        </button>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: '0.75rem',
            color: '#9ca3af',
          }}
        >
          현재:{' '}
          <strong style={{ color: '#e11d48' }}>
            {routeMode === 'car' ? '자동차' : String(routeMode)}
          </strong>
        </span>
      </div>
    );
  };

  const openKakaoRoute = (mode: 'walk' | 'traffic', route: RouteCard) => {
    const startPlace = findPlace(route.startPlaceId);
    const endPlace = findPlace(route.endPlaceId);

    const startName = startPlace?.name ?? '출발지';
    const endName = endPlace?.name ?? '도착지';

    const url =
      `https://map.kakao.com/link/by/${mode}/` +
      `${encodeURIComponent(startName)},${route.startLat},${route.startLng}/` +
      `${encodeURIComponent(endName)},${route.endLat},${route.endLng}`;

    window.open(url, '_blank');
  };

  return (
    <div
      className="panel-container"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
      }}
    >
      {/* 탭 헤더 */}
      <div
        className="panel-header"
        style={{
          padding: 0,
          display: 'flex',
          background: 'white',
          borderBottom: '1px solid #fce7f3',
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => setActiveTab('recommended')}
          style={{
            flex: 1,
            padding: '12px 0',
            border: 'none',
            borderBottom:
              activeTab === 'recommended'
                ? '3px solid #e11d48'
                : '3px solid transparent',
            background: 'transparent',
            color: activeTab === 'recommended' ? '#e11d48' : '#9ca3af',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          추천 ({places.length})
        </button>
        <button
          onClick={() => setActiveTab('saved')}
          style={{
            flex: 1,
            padding: '12px 0',
            border: 'none',
            borderBottom:
              activeTab === 'saved'
                ? '3px solid #e11d48'
                : '3px solid transparent',
            background: 'transparent',
            color: activeTab === 'saved' ? '#e11d48' : '#9ca3af',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          저장 ({savedPlaces.length})
        </button>
        <button
          onClick={() => setActiveTab('route')}
          style={{
            flex: 1,
            padding: '12px 0',
            border: 'none',
            borderBottom:
              activeTab === 'route'
                ? '3px solid #e11d48'
                : '3px solid transparent',
            background: 'transparent',
            color: activeTab === 'route' ? '#e11d48' : '#9ca3af',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          경로 안내 ({routes.length})
        </button>
      </div>

      {/* 내용 영역 */}
      <div
        className="panel-body"
        style={{
          backgroundColor: '#fff',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          flex: 1,
          overflowY: 'auto',
          minWidth: 0,
        }}
      >
        {isRouteTab ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {renderRouteModeButtons()}

            {routes.length === 0 ? (
              <div
                className="empty-text"
                style={{
                  borderRadius: '12px',
                  border: '1px dashed #e5e7eb',
                  padding: '12px',
                  fontSize: '0.85rem',
                  color: '#6b7280',
                  textAlign: 'center',
                  backgroundColor: '#f9fafb',
                }}
              >
                아직 저장된 경로가 없습니다.
                <br />
                지도의 저장된 마커에서 출발지/도착지를 설정해 보세요.
              </div>
            ) : (
              routes.map((route, idx) => {
                const startPlace = findPlace(route.startPlaceId);
                const endPlace = findPlace(route.endPlaceId);
                const startInfo = getSavedInfo(route.startPlaceId);
                const endInfo = getSavedInfo(route.endPlaceId);

                const startLabel = startPlace
                  ? `${startPlace.name}${
                      startInfo ? ` (${startInfo.labelShort})` : ''
                    }`
                  : '알 수 없는 출발지';

                const endLabel = endPlace
                  ? `${endPlace.name}${
                      endInfo ? ` (${endInfo.labelShort})` : ''
                    }`
                  : '알 수 없는 도착지';

                const modeLabel =
                  route.mode === 'walk'
                    ? '도보'
                    : route.mode === 'car'
                    ? '자동차'
                    : String(route.mode);

                return (
                  <div
                    key={route.id}
                    onClick={() => onSelectRoute(route.id)}
                    style={{
                      borderRadius: '14px',
                      border: '1px solid #fee2e2',
                      padding: '12px 14px',
                      background:
                        'linear-gradient(135deg, #fff1f2 0%, #f9fafb 100%)',
                      boxShadow: '0 2px 6px rgba(248, 113, 113, 0.18)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      position: 'relative',
                      cursor: 'pointer',
                    }}
                  >
                    {/* 경로 삭제 버튼 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveRoute(route.id);
                      }}
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        background: 'none',
                        border: 'none',
                        color: '#9ca3af',
                        fontSize: '1.1rem',
                        cursor: 'pointer',
                        padding: '4px',
                        lineHeight: 1,
                      }}
                      title="이 경로 삭제"
                    >
                      ✖
                    </button>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '0.9rem',
                          color: '#374151',
                        }}
                      >
                        <span
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: '999px',
                            backgroundColor: '#f97373',
                            color: 'white',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                          }}
                        >
                          {idx + 1}
                        </span>
                        <span style={{ fontWeight: 600 }}>{startLabel}</span>
                        <span
                          style={{
                            fontSize: '0.8rem',
                            color: '#9ca3af',
                            margin: '0 4px',
                          }}
                        >
                          →
                        </span>
                        <span style={{ fontWeight: 600 }}>{endLabel}</span>
                      </div>

                      <span
                        style={{
                          padding: '4px 8px',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          border: '1px solid #fecaca',
                          backgroundColor: '#fef2f2',
                          color: '#b91c1c',
                        }}
                      >
                        {modeLabel} 경로
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: '0.85rem',
                        color: '#7f1d1d',
                        marginTop: '2px',
                      }}
                    >
                      {buildRouteSentence(route.summary)}
                    </div>

                    {/* Kakao Map 외부 길찾기 버튼들 */}
                    <div
                      style={{
                        display: 'flex',
                        gap: '8px',
                        marginTop: '6px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openKakaoRoute('walk', route);
                        }}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '999px',
                          border: '1px solid #d1d5db',
                          backgroundColor: 'white',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        🚶 카카오맵 도보 길찾기
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openKakaoRoute('traffic', route);
                        }}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '999px',
                          border: '1px solid #d1d5db',
                          backgroundColor: 'white',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        🚌 카카오맵 대중교통 길찾기
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          // 추천 / 저장 탭
          <>
            {listToRender.length === 0 ? (
              <div
                className="empty-text"
                style={{
                  borderRadius: '12px',
                  border: '1px dashed #e5e7eb',
                  padding: '12px',
                  fontSize: '0.85rem',
                  color: '#6b7280',
                  textAlign: 'center',
                  backgroundColor: '#f9fafb',
                }}
              >
                {activeTab === 'recommended'
                  ? '추천 목록이 비어있습니다.'
                  : '저장된 장소가 없습니다.'}
              </div>
            ) : (
              listToRender.map((place) => {
                const isSelected = selectedPlaceId === place.id;
                return (
                  <div
                    key={place.id}
                    ref={(el) => {
                      itemRefs.current[place.id] = el;
                    }}
                    onClick={() => onSelectPlace(place.id)}
                    style={{
                      backgroundColor: isSelected ? '#fff1f2' : 'white',
                      borderColor: isSelected ? '#fb7185' : '#f3f4f6',
                      borderWidth: isSelected ? '2px' : '1px',
                      borderStyle: 'solid',
                      borderRadius: '12px',
                      marginBottom: '12px',
                      cursor: 'pointer',
                      position: 'relative',
                      padding: '16px',
                      boxShadow: isSelected
                        ? '0 4px 12px rgba(251, 113, 133, 0.2)'
                        : '0 1px 2px rgba(0,0,0,0.05)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {/* 삭제 버튼 (추천 탭에서만) */}
                    {activeTab === 'recommended' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemovePlace(place.id);
                        }}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          background: 'none',
                          border: 'none',
                          color: '#9ca3af',
                          fontSize: '1.1rem',
                          cursor: 'pointer',
                          padding: '4px',
                          lineHeight: 1,
                        }}
                        title="목록에서 제거"
                      >
                        ✖
                      </button>
                    )}

                    <div
                      style={{
                        marginBottom: '6px',
                        paddingRight: '24px',
                      }}
                    >
                      <strong
                        style={{
                          fontSize: '1rem',
                          color: '#1f2937',
                        }}
                      >
                        {place.name}
                      </strong>
                      <span
                        style={{
                          marginLeft: '8px',
                          backgroundColor: '#fff1f2',
                          color: '#e11d48',
                          padding: '2px 6px',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          fontWeight: 'bold',
                        }}
                      >
                        ★{' '}
                        {place.rating
                          ? Number(place.rating).toFixed(1)
                          : '0.0'}
                      </span>
                    </div>

                    <p
                      style={{
                        fontSize: '0.85rem',
                        color: '#6b7280',
                        marginBottom: '8px',
                      }}
                    >
                      {place.address}
                    </p>
                    <div
                      style={{
                        backgroundColor: isSelected ? 'white' : '#f9fafb',
                        padding: '8px',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        color: '#4b5563',
                      }}
                    >
                      💡 {place.reviewSummary}
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}
      </div>
    </div>
  );
};
