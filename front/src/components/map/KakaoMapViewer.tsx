// src/components/map/KakaoMapViewer.tsx
import React, { useEffect, useState, useRef } from 'react';
import {
  Map,
  MapMarker,
  useKakaoLoader,
  Polyline,
  CustomOverlayMap,
} from 'react-kakao-maps-sdk';
import { Place, SavedPlace, Category } from '../../types';

interface Props {
  places?: Place[];
  selectedPlaceId: string | null;
  onSelectPlace: (id: string) => void;

  routePath?: { lat: number; lng: number }[];

  savedPlaces: SavedPlace[];
  routeStartId: string | null;
  routeEndId: string | null;
  onSavePlace: (place: Place, category: Category) => void;
  onRemoveSavedPlace: (placeId: string, category: Category) => void;
  onSetRouteStart: (placeId: string, category: Category) => void;
  onSetRouteEnd: (placeId: string, category: Category) => void;
}

const createMarkerSvg = (color: string, label: string) => {
  const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32">
        <circle cx="16" cy="16" r="14" fill="${color}" />
        <text x="16" y="21" text-anchor="middle" font-size="14" fill="#ffffff" font-weight="bold">
          ${label}
        </text>
      </svg>
    `;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

export const KakaoMapViewer: React.FC<Props> = ({
  places = [],
  selectedPlaceId,
  onSelectPlace,
  routePath = [],
  savedPlaces,
  routeStartId,
  routeEndId,
  onSavePlace,
  onRemoveSavedPlace,
  onSetRouteStart,
  onSetRouteEnd,
}) => {
  const [loading, error] = useKakaoLoader({
    appkey: process.env.REACT_APP_KAKAO_JS_KEY ?? '',
    libraries: ['services', 'clusterer'],
  });

  const defaultCenter = { lat: 37.5326, lng: 127.024612 };
  const [center, setCenter] = useState(defaultCenter);

  const mapRef = useRef<kakao.maps.Map | null>(null);

  // ✅ 각 마커에 대한 로컬 선택 상태
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);

  // 선택된 placeId가 바뀌면 해당 장소로 센터 이동
  useEffect(() => {
    if (!selectedPlaceId || places.length === 0) return;
    const p = places.find((pl) => pl.id === selectedPlaceId);
    if (!p) return;

    setCenter({ lat: p.latitude, lng: p.longitude });
  }, [selectedPlaceId, places]);

  // places 전체가 바뀌면 bounds 재설정
  useEffect(() => {
    if (places.length === 0 || !mapRef.current) return;

    const bounds = new kakao.maps.LatLngBounds();
    places.forEach((p) => {
      bounds.extend(new kakao.maps.LatLng(p.latitude, p.longitude));
    });

    mapRef.current.setBounds(bounds);
  }, [places]);

  // 저장된 장소 정보 (카테고리, 순번, 색상)
  const getSavedInfo = (placeId: string) => {
    const saved = savedPlaces.find((p) => p.placeId === placeId);
    if (!saved) return null;

    const list = savedPlaces.filter((p) => p.category === saved.category);
    const idx = list.findIndex((p) => p.placeId === placeId);

    const colorMap: Record<Category, string> = {
      restaurant: '#ef4444',
      cafe: '#22c55e',
      spot: '#3b82f6',
    };

    return {
      category: saved.category,
      order: idx + 1,
      color: colorMap[saved.category],
    };
  };

  if (loading)
    return (
      <div style={{ width: '100%', height: '100%', background: '#f3f4f6' }}>
        로딩 중…
      </div>
    );
  if (error)
    return (
      <div style={{ width: '100%', height: '100%', background: '#fee2e2' }}>
        지도 에러
      </div>
    );

  return (
    <Map
      center={center}
      style={{ width: '100%', height: '100%' }}
      level={3}
      onCreate={(map) => (mapRef.current = map)}
    >
      {places.map((place, index) => {
        const saved = getSavedInfo(place.id);

        // 마커/오버레이 고유 ID
        const markerId = `${place.id}-${index}`;
        const markerKey = `${markerId}-${saved ? 'saved' : 'normal'}`;

        const img = saved
          ? {
              src: createMarkerSvg(saved.color, String(saved.order)),
              size: { width: 32, height: 32 },
              options: { offset: { x: 16, y: 32 } },
            }
          : undefined;

        return (
          <React.Fragment key={markerKey}>
            <MapMarker
              key={markerKey}
              position={{ lat: place.latitude, lng: place.longitude }}
              onClick={() => {
                onSelectPlace(place.id);
                setActiveMarkerId((prev) =>
                  prev === markerId ? null : markerId,
                );
              }}
              clickable={true}
              image={img}
            />

            {activeMarkerId === markerId && (
              <CustomOverlayMap
                position={{ lat: place.latitude, lng: place.longitude }}
                yAnchor={1.1}
                xAnchor={0.5}
              >
                <div
                  style={{
                    background: 'white',
                    padding: 8,
                    borderRadius: 8,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                    minWidth: 140,
                    fontSize: 12,
                  }}
                >
                  {!saved ? (
                    <>
                      <div style={{ fontWeight: 600 }}>카테고리 선택</div>
                      <button
                        onClick={() => {
                          onSavePlace(place, 'restaurant');
                          setActiveMarkerId(null);
                        }}
                      >
                        🍽 음식점
                      </button>
                      <button
                        onClick={() => {
                          onSavePlace(place, 'cafe');
                          setActiveMarkerId(null);
                        }}
                      >
                        ☕ 카페
                      </button>
                      <button
                        onClick={() => {
                          onSavePlace(place, 'spot');
                          setActiveMarkerId(null);
                        }}
                      >
                        📍 가볼만한 곳
                      </button>
                    </>
                  ) : (
                    <>
                      <div style={{ fontWeight: 600 }}>{place.name}</div>
                      <button
                        onClick={() => {
                          onSetRouteStart(place.id, saved.category);
                          setActiveMarkerId(null);
                        }}
                      >
                        🚩 출발지로 설정
                      </button>
                      <button
                        onClick={() => {
                          onSetRouteEnd(place.id, saved.category);
                          setActiveMarkerId(null);
                        }}
                      >
                        🏁 도착지로 설정
                      </button>
                      <button
                        onClick={() => {
                          onRemoveSavedPlace(place.id, saved.category);
                          setActiveMarkerId(null);
                        }}
                        style={{ color: '#b91c1c' }}
                      >
                        ❌ 목록에서 제거
                      </button>
                    </>
                  )}
                </div>
              </CustomOverlayMap>
            )}
          </React.Fragment>
        );
      })}

      {/* 경로 Polyline */}
      {routePath?.length > 0 && (
        <Polyline
          path={routePath}
          strokeWeight={5}
          strokeColor="#ff0000"
          strokeOpacity={0.85}
        />
      )}
    </Map>
  );
};
