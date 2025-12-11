// src/components/layout/Sidebar.tsx
import React from 'react';
import { ChatSession } from '../../types';
import './Sidebar.css';

interface Props {
    isOpen: boolean;
    sessions: ChatSession[];
    currentSessionId: string | null;
    onNewChat: () => void;
    onSelectChat: (id: string) => void;
    onDeleteChat: (id: string, e: React.MouseEvent) => void;
}

export const Sidebar: React.FC<Props> = ({
                                             isOpen,
                                             sessions,
                                             currentSessionId,
                                             onNewChat,
                                             onSelectChat,
                                             onDeleteChat
                                         }) => {
    return (
        <div className={`sidebar-container ${isOpen ? 'open' : 'closed'}`}>
            <div className="sidebar-header">
                <button className="new-chat-btn" onClick={onNewChat}>
                    <span style={{ marginRight: '8px', fontSize: '1.2rem' }}>+</span> 새로운 대화
                </button>
            </div>

            <div className="sidebar-content">
                <div className="section-label">최근 활동</div>
                {sessions.length === 0 ? (
                    <div style={{ padding: '20px 12px', color: '#94a3b8', fontSize: '0.85rem' }}>
                        아직 대화 기록이 없습니다.
                    </div>
                ) : (
                    <ul className="chat-list">
                        {sessions.map((session) => (
                            <li
                                key={session.id}
                                className={`chat-item ${currentSessionId === session.id ? 'active' : ''}`}
                                onClick={() => onSelectChat(session.id)}
                            >
                                <span className="chat-icon">💬</span>
                                <span className="chat-title">{session.title}</span>

                                {/* 삭제 버튼 (호버 시 표시 등 CSS 처리 필요, 여기선 단순 구현) */}
                                <button
                                    className="delete-chat-btn"
                                    onClick={(e) => onDeleteChat(session.id, e)}
                                    title="대화 삭제"
                                >
                                    ×
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="sidebar-footer">
                <button className="footer-item">⚙️ 설정</button>
                <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '4px' }}>v1.2.0</div>
            </div>
        </div>
    );
};