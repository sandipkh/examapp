import { create } from "zustand";

interface SessionState {
  currentSessionId: number | null;
  currentQuestionIndex: number;
  totalQuestions: number;
  sessionType: string | null;
  startSession: (
    sessionId: number,
    sessionType: string,
    totalQuestions: number
  ) => void;
  incrementQuestion: () => void;
  endSession: () => void;
}

export const useSessionStore = create<SessionState>()((set) => ({
  currentSessionId: null,
  currentQuestionIndex: 0,
  totalQuestions: 0,
  sessionType: null,
  startSession: (sessionId, sessionType, totalQuestions) =>
    set({
      currentSessionId: sessionId,
      currentQuestionIndex: 0,
      totalQuestions,
      sessionType,
    }),
  incrementQuestion: () =>
    set((state) => ({
      currentQuestionIndex: state.currentQuestionIndex + 1,
    })),
  endSession: () =>
    set({
      currentSessionId: null,
      currentQuestionIndex: 0,
      totalQuestions: 0,
      sessionType: null,
    }),
}));
