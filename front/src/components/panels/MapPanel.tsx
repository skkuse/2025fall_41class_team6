import React from 'react';
import { KakaoMapViewer } from '../map/KakaoMapViewer';
import { Place, SavedPlace, Category } from '../../types';
import './PanelStyles.css';

interface Props {
  places: Place[];
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

  // 확장 버튼 핸들러
  onExpand?: () => void;
}

export const MapPanel: React.FC<Props> = (props) => {
  return (
    <div
      className="panel-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        minWidth: 0,
      }}
    >
      <div
        className="panel-header"
        style={{ backgroundColor: '#1f2937', flexShrink: 0 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🗺️ 지도 보기</span>
          <small style={{ color: '#9ca3af', fontWeight: 'normal' }}>
            KakaoMap API
          </small>
        </div>

        {/* 확장 버튼 */}
        {props.onExpand && (
          <button
            onClick={props.onExpand}
            style={{
              background: 'transparent',
              border: '1px solid #4b5563',
              color: '#d1d5db',
              borderRadius: '4px',
              cursor: 'pointer',
              padding: '2px 6px',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.2s',
            }}
            title="크게 보기"
          >
            ⤢ 확대
          </button>
        )}
      </div>

      <div
        className="panel-body"
        style={{
          padding: 0,
          position: 'relative',
          flex: 1,
          width: '100%',
          minWidth: 0,
        }}
      >
        <KakaoMapViewer {...props} />
      </div>
    </div>
  );
};
