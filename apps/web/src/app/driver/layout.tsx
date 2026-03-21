'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/hooks/use-auth';
import { UserRole } from '@/types';

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, isAuthenticated, logout } = useAuth({
    requireAuth: true,
    requiredRoles: [UserRole.DRIVER],
  });

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="xl" />
          <p className="text-sm text-gray-500">Verifying driver access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user || user.role !== UserRole.DRIVER) {
    return null;
  }

  return (
    <div className="flex min-h-dvh flex-col bg-gray-50">
      <Navbar
        userRole={UserRole.DRIVER}
        userName={`${user.firstName} ${user.lastName}`}
        avatarUrl={user.avatarUrl}
        currentPath={pathname}
        onLogout={logout}
      />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
