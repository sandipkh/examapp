import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { User } from "../types";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  needsProfileSetup: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setNeedsProfileSetup: (value: boolean) => void;
  updateUser: (user: Partial<User>) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      needsProfileSetup: false,
      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true }),
      setNeedsProfileSetup: (value) => set({ needsProfileSetup: value }),
      updateUser: (partial) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : null,
        })),
      clearAuth: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          needsProfileSetup: false,
        }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
