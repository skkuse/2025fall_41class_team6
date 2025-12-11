// src/components/chat/PlaceCard.tsx
import React, { useState } from 'react';
import { Place } from '../../types';
import './PlaceCarousel.css';

interface Props {
    place: Place;
    onSelect: (place: Place) => void;
}

export const PlaceCard: React.FC<Props> = ({ place, onSelect }) => {
    const [imgIndex, setImgIndex] = useState(0);
    const images = place.imageUrls || [];
    const totalImages = images.length;

    const nextImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (totalImages > 0) {
            setImgIndex((prev) => (prev + 1) % totalImages);
        }
    };

    const prevImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (totalImages > 0) {
            setImgIndex((prev) => (prev - 1 + totalImages) % totalImages);
        }
    };

    // 이미지별 클래스 결정 함수 (prev, active, next, hidden)
    const getImageClass = (index: number) => {
        if (index === imgIndex) return 'active';

        // 3장 이상일 때 순환 구조 처리
        const prevIndex = (imgIndex - 1 + totalImages) % totalImages;
        const nextIndex = (imgIndex + 1) % totalImages;

        if (index === prevIndex) return 'prev';
        if (index === nextIndex) return 'next';

        return 'hidden';
    };

    return (
        <div className="place-card">
            {/* 이미지 슬라이더 영역 */}
            <div className="card-image-wrapper">
                {images.length > 0 ? (
                    images.map((url, idx) => (
                        <img
                            key={idx}
                            src={url}
                            alt={`${place.name} ${idx + 1}`}
                            className={`slider-image ${getImageClass(idx)}`}
                        />
                    ))
                ) : (
                    <img
                        src="https://via.placeholder.com/300x200?text=No+Image"
                        alt="No Image"
                        className="slider-image active"
                    />
                )}

                <span className="card-category">{place.category}</span>

                {/* 네비게이션 (2장 이상일 때만) */}
                {totalImages > 1 && (
                    <>
                        <button className="img-nav-btn prev" onClick={prevImage}>‹</button>
                        <button className="img-nav-btn next" onClick={nextImage}>›</button>

                        <div className="img-dots">
                            {images.map((_, idx) => (
                                <span
                                    key={idx}
                                    className={`dot ${idx === imgIndex ? 'active' : ''}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setImgIndex(idx);
                                    }}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>

            <div className="card-content">
                <div className="card-header">
                    <h3 className="card-title">{place.name}</h3>
                    <span className="card-rating">
                        ★ {place.rating ? Number(place.rating).toFixed(1) : "0.0"}
                    </span>
                </div>
                <p className="card-review">{place.reviewSummary}</p>
                <button className="action-btn" onClick={() => onSelect(place)}>
                    지도에서 보기 📍
                </button>
            </div>
        </div>
    );
};