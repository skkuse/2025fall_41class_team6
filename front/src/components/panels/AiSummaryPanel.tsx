import React, { useEffect, useRef } from 'react';
import './PanelStyles.css';
import { SearchBar } from '../search/SearchBar';
import { ChatMessage, Place } from '../../types';
import { PlaceCarousel } from '../chat/PlaceCarousel';

interface Props {
    messages: ChatMessage[];
    onSearch: (query: string) => void;
    onApplyPlaces: (places: Place[]) => void; // 장소 배열 추가 핸들러
    isLoading: boolean;
    onToggleSidebar: () => void; // ★ 누락되었던 사이드바 토글 핸들러 복구
}

export const AiSummaryPanel: React.FC<Props> = ({
                                                    messages,
                                                    onSearch,
                                                    onApplyPlaces,
                                                    isLoading,
                                                    onToggleSidebar
                                                }) => {
    const bodyRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (bodyRef.current) {
            bodyRef.current.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [messages, isLoading]);

    return (
        <div className="panel-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', border: 'none', borderRadius: 0, boxShadow: 'none' }}>

            {/* 헤더 */}
            <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}>
                {/* ★ 사이드바 토글(햄버거) 버튼 */}
                <button
                    onClick={onToggleSidebar}
                    style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: '1.5rem', marginRight: '16px', color: '#64748b',
                        padding: '4px', display: 'flex', alignItems: 'center'
                    }}
                    title="사이드바 열기/닫기"
                >
                    ☰
                </button>
                <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#e11d48' }}>SomePlace AI</span>
            </div>

            {/* 채팅 내용 */}
            <div
                className="panel-body"
                ref={bodyRef}
                style={{
                    backgroundColor: '#fff',
                    flex: 1,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '24px',
                    padding: '20px 10%',
                    minHeight: 0
                }}
            >
                {messages.map((msg, index) => {
                    const isUser = msg.role === 'user';
                    return (
                        <div key={index} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
                            {/* 말풍선 */}
                            <div style={{
                                backgroundColor: isUser ? '#f1f5f9' : 'transparent',
                                color: '#334155',
                                padding: isUser ? '12px 20px' : '0',
                                borderRadius: '24px',
                                maxWidth: '85%',
                                lineHeight: '1.7',
                                whiteSpace: 'pre-wrap',
                                fontSize: '1rem'
                            }}>
                                {!isUser && <div style={{ marginBottom: '8px', fontWeight: 'bold', color: '#e11d48' }}>✨ 답변</div>}
                                {msg.text}
                            </div>

                            {/* 캐러셀 및 버튼 */}
                            {!isUser && msg.places && msg.places.length > 0 && (
                                <div style={{ width: '100%', marginTop: '16px' }}>
                                    {/* 1. 장소 캐러셀 */}
                                    <PlaceCarousel
                                        places={msg.places}
                                        // 카드 개별 클릭 시 해당 장소 하나만 추가
                                        onSelect={(place) => onApplyPlaces([place])}
                                    />

                                    {/* 2. [모두 지도에 표시] 버튼 */}
                                    <button
                                        onClick={() => onApplyPlaces(msg.places!)}
                                        style={{
                                            width: '100%',
                                            marginTop: '12px',
                                            padding: '12px',
                                            backgroundColor: 'white',
                                            border: '1px solid #e11d48',
                                            borderRadius: '12px',
                                            color: '#e11d48',
                                            fontWeight: 'bold',
                                            fontSize: '0.95rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            transition: 'all 0.2s',
                                            boxShadow: '0 2px 4px rgba(225, 29, 72, 0.1)'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fff1f2'}
                                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                    >
                                        <span>🗺️</span> 이 장소들 모두 지도에 표시하기
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}

                {isLoading && (
                    <div style={{ alignSelf: 'flex-start', padding: '10px' }}>
                        <span className="animate-pulse" style={{ color: '#e11d48' }}>● ● ●</span>
                    </div>
                )}
            </div>

            {/* 입력창 */}
            <div style={{ padding: '20px 10%', backgroundColor: 'white' }}>
                <SearchBar onSearch={onSearch} isLoading={isLoading} />
                <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '0.75rem', color: '#94a3b8' }}>
                    AI는 실수를 할 수 있습니다. 중요한 정보는 확인해 주세요.
                </div>
            </div>
        </div>
    );
};