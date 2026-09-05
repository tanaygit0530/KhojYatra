import { create } from 'zustand';

interface SessionState {
  sessionId: string;
  userId: string | null;
  userRole: 'traveler' | 'provider' | 'admin' | null;
  savedExperienceIds: string[];
  initializeSession: () => string;
  setAuthUser: (userId: string, role: 'traveler' | 'provider' | 'admin') => void;
  clearAuth: () => void;
  toggleSaveExperience: (id: string) => void;
  resetSession: () => string;
}

const STORAGE_KEY = 'khojyatra_session_id';
const SAVED_KEY = 'khojyatra_saved_ids';

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

function getStoredSavedIds(): string[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    return raw ? JSON.parse(raw) : ['e1111111-1111-4111-8111-111111111111', 'e2222222-2222-4222-8222-222222222222'];
  } catch {
    return ['e1111111-1111-4111-8111-111111111111', 'e2222222-2222-4222-8222-222222222222'];
  }
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessionId: '',
  userId: null,
  userRole: null,
  savedExperienceIds: getStoredSavedIds(),

  initializeSession: () => {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = generateUUID();
      localStorage.setItem(STORAGE_KEY, id);
    }
    set({ sessionId: id, savedExperienceIds: getStoredSavedIds() });
    return id;
  },

  resetSession: () => {
    const newId = generateUUID();
    localStorage.setItem(STORAGE_KEY, newId);
    set({ sessionId: newId });
    return newId;
  },

  setAuthUser: (userId, userRole) => {
    set({ userId, userRole });
  },

  clearAuth: () => {
    set({ userId: null, userRole: null });
  },

  toggleSaveExperience: (id: string) => {
    const current = get().savedExperienceIds;
    const exists = current.includes(id);
    const updated = exists ? current.filter((x) => x !== id) : [...current, id];
    localStorage.setItem(SAVED_KEY, JSON.stringify(updated));
    set({ savedExperienceIds: updated });
  }
}));
