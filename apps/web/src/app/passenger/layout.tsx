'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { useAuth } from '@/hooks/use-auth';
import { UserRole } from '@/types';
import { Spinner } from '@/components/ui/spinner';

export default function PassengerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth({
    requireAuth: true,
    requiredRoles: [UserRole.PASSENGER],
  });

  if (isLoading || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F8FAF9]">
        <Spinner size="xl" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#F8FAF9]">
      <Navbar
        userRole={UserRole.PASSENGER}
        userName={`${user.firstName} ${user.lastName}`}
        avatarUrl={user.avatarUrl}
        currentPath={pathname}
        onLogout={logout}
      />
      <main className="mx-auto max-w-7xl px-4 py-6 pb-24 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
