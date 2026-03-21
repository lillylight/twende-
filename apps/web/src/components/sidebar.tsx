'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  Bus,
  Building2,
  Bell,
  MapPin,
  Settings,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
} from 'lucide-react';

interface SidebarLink {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

const SIDEBAR_LINKS: SidebarLink[] = [
  {
    label: 'Dashboard',
    href: '/rtsa/dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    label: 'Fleet Overview',
    href: '/rtsa/fleet',
    icon: <Bus className="h-5 w-5" />,
  },
  {
    label: 'Operators',
    href: '/rtsa/operators',
    icon: <Building2 className="h-5 w-5" />,
  },
  {
    label: 'Alerts',
    href: '/rtsa/alerts',
    icon: <Bell className="h-5 w-5" />,
  },
  {
    label: 'Routes',
    href: '/rtsa/routes',
    icon: <MapPin className="h-5 w-5" />,
  },
  {
    label: 'Settings',
    href: '/rtsa/settings',
    icon: <Settings className="h-5 w-5" />,
  },
];

export interface SidebarProps {
  currentPath?: string;
  alertCount?: number;
}

export function Sidebar({ currentPath, alertCount }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const links = SIDEBAR_LINKS.map((link) =>
    link.label === 'Alerts' && alertCount ? { ...link, badge: alertCount } : link
  );

  return (
    <aside
      className={cn(
        'sticky top-16 flex h-[calc(100vh-4rem)] flex-col border-r border-gray-200 bg-white transition-all duration-200',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Links */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {links.map((link) => {
          const isActive = currentPath === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              title={collapsed ? link.label : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[#0F6E56]/10 text-[#0F6E56]'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-[#1A1A1A]',
                collapsed && 'justify-center px-2'
              )}
            >
              <div className="relative flex-shrink-0">
                {link.icon}
                {link.badge && link.badge > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#E24B4A] text-[10px] font-bold text-white">
                    {link.badge > 99 ? '99+' : link.badge}
                  </span>
                )}
              </div>
              {!collapsed && <span className="flex-1">{link.label}</span>}
              {!collapsed && link.badge && link.badge > 0 && (
                <span className="rounded-full bg-[#E24B4A]/10 px-2 py-0.5 text-xs font-semibold text-[#E24B4A]">
                  {link.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-gray-100 p-2">
        <button
          onClick={() => setCollapsed((prev) => !prev)}
          className="flex w-full items-center justify-center rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>
    </aside>
  );
}
