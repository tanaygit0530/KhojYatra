import { create } from 'zustand';

interface SessionState {
  sessionId: string;
  userId: string | null;
  userRole: 'traveler' | 'provider' | 'admin' | null;
  initializeSession: () => string;
  setAuthUser: (userId: string, role: 'traveler' | 'provider' | 'admin') => void;
  clearAuth: () => void;
}

const STORAGE_KEY = 'khojyatra_session_id';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const useSessionStore = create<SessionState>((set) => ({
  sessionId: '',
  userId: null,
  userRole: null,

  initializeSession: () => {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = generateUUID();
      localStorage.setItem(STORAGE_KEY, id);
    }
    set({ sessionId: id });
    return id;
  },

  setAuthUser: (userId, userRole) => {
    set({ userId, userRole });
  },

  clearAuth: () => {
    set({ userId: null, userRole: null });
  }
}));
