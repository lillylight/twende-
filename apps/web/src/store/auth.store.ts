'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, UserRole, ApiResponse, LoginResponse, AuthTokens } from '@/types';

// ─── Types ──────────────────────────────────────────────────────────────────

interface AuthState {
  user: Omit<User, 'passwordHash'> | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (phone: string, password: string) => Promise<void>;
  register: (phone: string, name: string, password: string, role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<boolean>;
  setUser: (user: Omit<User, 'passwordHash'>) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearError: () => void;
}

export type AuthStore = AuthState & AuthActions;

// ─── Helpers ────────────────────────────────────────────────────────────────

const API_BASE = '/api/auth';

let refreshPromise: Promise<boolean> | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleRefresh(expiresIn: number, refreshFn: () => Promise<boolean>): void {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
  }
  // Refresh 60 seconds before expiry, minimum 10 seconds
  const delay = Math.max((expiresIn - 60) * 1000, 10_000);
  refreshTimer = setTimeout(() => {
    refreshFn();
  }, delay);
}

function clearRefreshTimer(): void {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message ?? data?.message ?? 'Request failed');
  }

  return data as T;
}

// ─── Store ──────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      login: async (phone: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          const result = await apiRequest<ApiResponse<LoginResponse>>(`${API_BASE}/login`, {
            method: 'POST',
            body: JSON.stringify({ phone, password }),
          });

          const { user, tokens } = result.data;

          set({
            user,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          scheduleRefresh(tokens.expiresIn, get().refreshAuth);
        } catch (err) {
          set({
            isLoading: false,
            error: err instanceof Error ? err.message : 'Login failed',
            isAuthenticated: false,
          });
          throw err;
        }
      },

      register: async (phone: string, name: string, password: string, role: UserRole) => {
        set({ isLoading: true, error: null });

        try {
          const [firstName, ...rest] = name.trim().split(/\s+/);
          const lastName = rest.join(' ') || firstName;

          const result = await apiRequest<ApiResponse<LoginResponse>>(`${API_BASE}/register`, {
            method: 'POST',
            body: JSON.stringify({
              phone,
              firstName,
              lastName,
              password,
              role,
            }),
          });

          const { user, tokens } = result.data;

          set({
            user,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          scheduleRefresh(tokens.expiresIn, get().refreshAuth);
        } catch (err) {
          set({
            isLoading: false,
            error: err instanceof Error ? err.message : 'Registration failed',
            isAuthenticated: false,
          });
          throw err;
        }
      },

      logout: async () => {
        const { accessToken } = get();

        clearRefreshTimer();

        try {
          if (accessToken) {
            await fetch(`${API_BASE}/logout`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            });
          }
        } catch {
          // Ignore logout API errors -- clear local state regardless
        }

        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      },

      refreshAuth: async () => {
        // Deduplicate concurrent refresh calls
        if (refreshPromise) {
          return refreshPromise;
        }

        const { refreshToken: currentRefreshToken } = get();

        if (!currentRefreshToken) {
          get().logout();
          return false;
        }

        refreshPromise = (async () => {
          try {
            const result = await apiRequest<ApiResponse<AuthTokens>>(`${API_BASE}/refresh`, {
              method: 'POST',
              body: JSON.stringify({
                refreshToken: currentRefreshToken,
              }),
            });

            const tokens = result.data;

            set({
              accessToken: tokens.accessToken,
              refreshToken: tokens.refreshToken,
            });

            scheduleRefresh(tokens.expiresIn, get().refreshAuth);

            return true;
          } catch {
            // Refresh failed -- force logout
            get().logout();
            return false;
          } finally {
            refreshPromise = null;
          }
        })();

        return refreshPromise;
      },

      setUser: (user) => {
        set({ user, isAuthenticated: true });
      },

      setTokens: (accessToken, refreshToken) => {
        set({ accessToken, refreshToken, isAuthenticated: true });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'twende-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => {
        return (state) => {
          // After rehydrating from localStorage, schedule a token refresh
          if (state?.isAuthenticated && state.refreshToken) {
            // Refresh immediately on rehydrate to validate the token
            setTimeout(() => {
              state.refreshAuth();
            }, 0);
          }
        };
      },
    }
  )
);
