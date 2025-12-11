// src/components/chat/CourseCarousel.tsx
import React, { useRef } from 'react';
import { Course } from '../../types';
import './CourseCarousel.css';

interface Props {
    courses: Course[];
    onApply: (course: Course) => void;
}

export const CourseCarousel: React.FC<Props> = ({ courses, onApply }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    // 스크롤 핸들러 (좌우 이동)
    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const { current } = scrollRef;
            const scrollAmount = 260; // 카드 너비 + 간격 정도

            current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    return (
        <div className="carousel-wrapper">
            {/* 왼쪽 화살표 버튼 */}
            <button
                className="nav-btn left"
                onClick={() => scroll('left')}
                aria-label="이전 코스"
            >
                ‹
            </button>

            {/* 스크롤 영역 */}
            <div className="carousel-container" ref={scrollRef}>
                {courses.map((course) => (
                    <div key={course.id} className="course-card">
                        <h3 className="course-title">{course.title}</h3>
                        <p className="course-desc">{course.description}</p>

                        <div className="place-badges">
                            {course.places.map((p, i) => (
                                <span key={p.id} className="place-badge">
                  {i + 1}. {p.name}
                </span>
                            ))}
                        </div>

                        <button className="apply-btn" onClick={() => onApply(course)}>
                            지도에 적용하기 👉
                        </button>
                    </div>
                ))}
            </div>

            {/* 오른쪽 화살표 버튼 */}
            <button
                className="nav-btn right"
                onClick={() => scroll('right')}
                aria-label="다음 코스"
            >
                ›
            </button>
        </div>
    );
};