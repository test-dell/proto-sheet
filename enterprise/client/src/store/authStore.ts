import { create } from 'zustand';
import type { User } from '../types';
import { api, setAccessToken } from '../api/client';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;

  login: (empCode: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  error: null,

  login: async (empCode, password) => {
    set({ isLoading: true, error: null });
    try {
      const result = await api.login(empCode, password);
      setAccessToken(result.accessToken);
      set({ user: result.user, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      await api.logout();
    } catch {
      // Logout even if API call fails
    }
    setAccessToken(null);
    set({ user: null });
  },

  checkAuth: async () => {
    try {
      const result = await api.getMe();
      set({ user: result.user, isLoading: false });
    } catch {
      setAccessToken(null);
      set({ user: null, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
