import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  role: string | null;
  name: string | null;
  isAuthenticated: boolean;
  login: (token: string, role: string, name: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      role: null,
      name: null,
      isAuthenticated: false,
      login: (token, role, name) => set({ token, role, name, isAuthenticated: true }),
      logout: () => set({ token: null, role: null, name: null, isAuthenticated: false }),
    }),
    { name: 'admin-auth' }
  )
);
