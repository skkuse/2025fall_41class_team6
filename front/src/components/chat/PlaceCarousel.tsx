// src/components/chat/PlaceCarousel.tsx
import React, { useRef } from 'react';
import { Place } from '../../types';
import { PlaceCard } from './PlaceCard';
import './PlaceCarousel.css';

interface Props {
    places: Place[];
    onSelect: (place: Place) => void;
}

export const PlaceCarousel: React.FC<Props> = ({ places, onSelect }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    // 캐러셀 전체 좌우 스크롤 핸들러
    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            // 카드 너비(220px) + 간격(16px) = 약 240px 만큼 이동
            const scrollAmount = 240;

            scrollRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    return (
        <div className="carousel-wrapper">
            {/* 전체 리스트 왼쪽 이동 버튼 */}
            <button
                className="nav-btn left"
                onClick={() => scroll('left')}
                aria-label="이전 장소들 보기"
            >
                ‹
            </button>

            {/* 스크롤 영역 */}
            <div className="carousel-container" ref={scrollRef}>
                {places.map((place) => (
                    <PlaceCard
                        key={place.id}
                        place={place}
                        onSelect={onSelect}
                    />
                ))}
            </div>

            {/* 전체 리스트 오른쪽 이동 버튼 */}
            <button
                className="nav-btn right"
                onClick={() => scroll('right')}
                aria-label="다음 장소들 보기"
            >
                ›
            </button>
        </div>
    );
};