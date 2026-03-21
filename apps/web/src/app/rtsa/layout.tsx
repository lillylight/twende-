'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';

export default function RTSALayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar currentPath={pathname} />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1600px] p-6">{children}</div>
      </main>
    </div>
  );
}
