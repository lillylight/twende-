'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Bus,
  Truck,
  Users,
  BarChart3,
  Tag,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Loader2,
} from 'lucide-react';

interface NavLink {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const NAV_LINKS: NavLink[] = [
  {
    label: 'Dashboard',
    href: '/operator',
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    label: 'Journeys',
    href: '/operator/journeys',
    icon: <Bus className="h-5 w-5" />,
  },
  {
    label: 'Vehicles',
    href: '/operator/vehicles',
    icon: <Truck className="h-5 w-5" />,
  },
  {
    label: 'Drivers',
    href: '/operator/drivers',
    icon: <Users className="h-5 w-5" />,
  },
  {
    label: 'Analytics',
    href: '/operator/analytics',
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    label: 'Promo Codes',
    href: '/operator/promo-codes',
    icon: <Tag className="h-5 w-5" />,
  },
];

export default function OperatorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading, isAuthenticated, logout } = useAuth({
    requireAuth: true,
    requiredRoles: ['OPERATOR' as never],
  });
  const [collapsed, setCollapsed] = useState(false);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={cn(
          'sticky top-0 flex h-screen flex-col border-r border-gray-200 bg-white transition-all duration-200',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        {/* Brand */}
        <div className="flex h-16 items-center border-b border-gray-100 px-4">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white font-bold text-sm">
                T
              </div>
              <span className="text-lg font-bold text-gray-900">Twende</span>
            </div>
          )}
          {collapsed && (
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white font-bold text-sm">
              T
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-2 py-4">
          {NAV_LINKS.map((link) => {
            const isActive =
              link.href === '/operator' ? pathname === '/operator' : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                title={collapsed ? link.label : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-teal-50 text-teal-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                  collapsed && 'justify-center px-2'
                )}
              >
                <div className="flex-shrink-0">{link.icon}</div>
                {!collapsed && <span className="flex-1">{link.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-100 p-2 space-y-1">
          <button
            onClick={logout}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-red-50 hover:text-red-600',
              collapsed && 'justify-center px-2'
            )}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
          <button
            onClick={() => setCollapsed((prev) => !prev)}
            className="flex w-full items-center justify-center rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1600px] p-6">{children}</div>
      </main>
    </div>
  );
}
