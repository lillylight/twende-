'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import type { UserRole } from '@/types';

// ─── Configuration ──────────────────────────────────────────────────────────

const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/'];
const ROLE_HOME_PATHS: Record<UserRole, string> = {
  PASSENGER: '/dashboard',
  DRIVER: '/driver/dashboard',
  OPERATOR: '/operator/dashboard',
  RTSA_OFFICER: '/rtsa/dashboard',
  ADMIN: '/admin/dashboard',
};

// ─── Hook ───────────────────────────────────────────────────────────────────

interface UseAuthOptions {
  /** If true, redirect unauthenticated users to /login */
  requireAuth?: boolean;
  /** If set, redirect users who do not have one of these roles */
  requiredRoles?: UserRole[];
  /** If true, redirect authenticated users away from auth pages */
  redirectIfAuthenticated?: boolean;
}

export function useAuth(options: UseAuthOptions = {}) {
  const { requireAuth = false, requiredRoles, redirectIfAuthenticated = false } = options;

  const router = useRouter();
  const pathname = usePathname();

  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);
  const register = useAuthStore((s) => s.register);
  const clearError = useAuthStore((s) => s.clearError);

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (isLoading) return;

    if (requireAuth && !isAuthenticated) {
      const returnUrl = encodeURIComponent(pathname);
      router.replace(`/login?returnUrl=${returnUrl}`);
      return;
    }

    // Redirect authenticated users away from login/register pages
    if (redirectIfAuthenticated && isAuthenticated && user) {
      const isPublicAuth = pathname === '/login' || pathname === '/register';
      if (isPublicAuth) {
        const homePath = ROLE_HOME_PATHS[user.role] ?? '/dashboard';
        router.replace(homePath);
        return;
      }
    }

    // Role-based access control
    if (requiredRoles && isAuthenticated && user) {
      if (!requiredRoles.includes(user.role)) {
        const homePath = ROLE_HOME_PATHS[user.role] ?? '/dashboard';
        router.replace(homePath);
      }
    }
  }, [
    isAuthenticated,
    isLoading,
    requireAuth,
    requiredRoles,
    redirectIfAuthenticated,
    user,
    pathname,
    router,
  ]);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout: handleLogout,
    register,
    clearError,
    isPublicPath: PUBLIC_PATHS.includes(pathname),
  };
}
