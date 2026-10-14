import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AdminUser } from '../types/index';
import { loginAdminApi } from '../services/api';

interface AdminState {
  token: string | null;
  admin: AdminUser | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  loginError: string | null;

  login: (identifier: string, pass: string, backendUrl?: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set, get) => ({
      token: null,
      admin: null,
      isLoggedIn: false,
      isLoading: false,
      loginError: null,

      login: async (identifier: string, pass: string, backendUrl?: string) => {
        set({ isLoading: true, loginError: null });

        const result = await loginAdminApi(identifier, pass, backendUrl);

        if (result.success && result.token && result.admin) {
          set({
            token: result.token,
            admin: result.admin,
            isLoggedIn: true,
            isLoading: false,
            loginError: null,
          });
          return true;
        } else {
          set({
            isLoading: false,
            loginError: result.error || 'Authentication failed.',
            isLoggedIn: false,
          });
          return false;
        }
      },

      logout: () => {
        set({
          token: null,
          admin: null,
          isLoggedIn: false,
          loginError: null,
        });
      },

      clearError: () => {
        set({ loginError: null });
      },
    }),
    {
      name: 'gemini-admin-session-v1',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
