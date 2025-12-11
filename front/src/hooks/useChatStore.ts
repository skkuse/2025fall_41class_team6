import { useState, useEffect, useRef } from 'react';
import { ChatSession, ChatMessage } from '../types';

const STORAGE_KEY = 'someplace_chat_sessions';

export const useChatStore = () => {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

    // ★ 핵심 수정: 상태의 즉시성을 보장하기 위해 Ref 사용
    // (handleSearch 같은 비동기 함수 안에서도 항상 최신 ID를 참조하기 위함)
    const sessionRef = useRef<string | null>(null);

    // 1. 초기 로드
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setSessions(parsed);
                if (parsed.length > 0) {
                    const lastId = parsed[0].id;
                    setCurrentSessionId(lastId);
                    sessionRef.current = lastId; // Ref도 동기화
                }
            } catch (e) {
                console.error('Failed to load chat history', e);
            }
        }
    }, []);

    // 2. 세션 변경 시 자동 저장
    useEffect(() => {
        if (sessions.length > 0) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
        }
    }, [sessions]);

    // 3. currentSessionId 변경 시 Ref 동기화
    useEffect(() => {
        sessionRef.current = currentSessionId;
    }, [currentSessionId]);

    // --- 액션 ---

    const startNewChat = () => {
        setCurrentSessionId(null);
        sessionRef.current = null; // ★ Ref도 즉시 초기화
    };

    const selectSession = (id: string) => {
        setCurrentSessionId(id);
        sessionRef.current = id; // ★ Ref도 즉시 변경
    };

    const addMessage = (message: ChatMessage) => {
        setSessions((prev) => {
            const now = Date.now();

            // ★ 핵심: useState의 currentSessionId 대신 실시간 Ref 값 사용
            const activeId = sessionRef.current;

            // 1. 활성화된 세션이 있는 경우 (Ref 기준)
            if (activeId) {
                return prev.map((session) =>
                    session.id === activeId
                        ? {
                            ...session,
                            messages: [...session.messages, message],
                            lastUpdatedAt: now
                        }
                        : session
                ).sort((a, b) => b.lastUpdatedAt - a.lastUpdatedAt);
            }

            // 2. 활성화된 세션이 없는 경우 -> 새 세션 생성
            else {
                const newId = crypto.randomUUID();
                const newSession: ChatSession = {
                    id: newId,
                    title: message.text.length > 15 ? message.text.slice(0, 15) + '...' : message.text,
                    messages: [
                        { role: 'assistant', text: "안녕하세요! 설레는 데이트를 위한 장소를 추천해 드릴게요. \n원하시는 지역이나 분위기를 말씀해주세요! 💕" },
                        message
                    ],
                    createdAt: now,
                    lastUpdatedAt: now,
                };

                // ★ 중요: 생성 즉시 Ref와 State를 모두 업데이트하여
                // 이어지는 AI 답변(addMessage)이 이 ID를 볼 수 있게 함
                sessionRef.current = newId;
                setCurrentSessionId(newId);

                return [newSession, ...prev];
            }
        });
    };

    const deleteSession = (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setSessions((prev) => {
            const next = prev.filter((s) => s.id !== id);
            if (currentSessionId === id) {
                setCurrentSessionId(null);
                sessionRef.current = null;
            }
            if (next.length === 0) {
                localStorage.removeItem(STORAGE_KEY);
            }
            return next;
        });
    };

    // 렌더링용 메시지 목록 계산
    const currentMessages = currentSessionId
        ? sessions.find((s) => s.id === currentSessionId)?.messages || []
        : [{ role: 'assistant', text: "안녕하세요! 설레는 데이트를 위한 장소를 추천해 드릴게요. \n원하시는 지역이나 분위기를 말씀해주세요! 💕" } as ChatMessage];

    return {
        sessions,
        currentSessionId,
        currentMessages,
        startNewChat,
        selectSession,
        addMessage,
        deleteSession
    };
};