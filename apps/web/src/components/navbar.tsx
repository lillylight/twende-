'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { UserRole } from '@/types';
import {
  Menu,
  X,
  Search,
  Ticket,
  User,
  LayoutDashboard,
  Bus,
  History,
  Shield,
  Building2,
  Bell,
  MapPin,
  Settings,
  LogOut,
  ChevronDown,
} from 'lucide-react';

interface NavLink {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const NAV_LINKS: Record<UserRole, NavLink[]> = {
  [UserRole.PASSENGER]: [
    { label: 'Search', href: '/search', icon: <Search className="h-4 w-4" /> },
    { label: 'My Bookings', href: '/bookings', icon: <Ticket className="h-4 w-4" /> },
    { label: 'Profile', href: '/profile', icon: <User className="h-4 w-4" /> },
  ],
  [UserRole.DRIVER]: [
    {
      label: 'Dashboard',
      href: '/driver/dashboard',
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    { label: 'Journey', href: '/driver/journey', icon: <Bus className="h-4 w-4" /> },
    { label: 'History', href: '/driver/history', icon: <History className="h-4 w-4" /> },
  ],
  [UserRole.RTSA_OFFICER]: [
    { label: 'Fleet', href: '/rtsa/fleet', icon: <Bus className="h-4 w-4" /> },
    { label: 'Operators', href: '/rtsa/operators', icon: <Building2 className="h-4 w-4" /> },
    { label: 'Alerts', href: '/rtsa/alerts', icon: <Bell className="h-4 w-4" /> },
  ],
  [UserRole.OPERATOR]: [
    {
      label: 'Dashboard',
      href: '/operator/dashboard',
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    { label: 'Fleet', href: '/operator/fleet', icon: <Bus className="h-4 w-4" /> },
    { label: 'Routes', href: '/operator/routes', icon: <MapPin className="h-4 w-4" /> },
  ],
  [UserRole.ADMIN]: [
    { label: 'Dashboard', href: '/admin/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: 'Settings', href: '/admin/settings', icon: <Settings className="h-4 w-4" /> },
  ],
};

export interface NavbarProps {
  userRole: UserRole;
  userName: string;
  avatarUrl?: string | null;
  currentPath?: string;
  onLogout: () => void;
}

export function Navbar({ userRole, userName, avatarUrl, currentPath, onLogout }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const links = NAV_LINKS[userRole] ?? [];

  return (
    <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2">
          <Shield className="h-7 w-7 text-[#0F6E56]" />
          <span className="text-xl font-bold text-[#1A1A1A]">
            Zed<span className="text-[#0F6E56]">Pulse</span>
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                currentPath === link.href
                  ? 'bg-[#0F6E56]/10 text-[#0F6E56]'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-[#1A1A1A]'
              )}
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right side: user dropdown + mobile toggle */}
        <div className="flex items-center gap-3">
          {/* User dropdown (desktop) */}
          <div className="relative hidden md:block">
            <button
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-gray-100"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={userName} className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0F6E56] text-sm font-medium text-white">
                  {userName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-sm font-medium text-[#1A1A1A]">{userName}</span>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>

            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                <div className="absolute right-0 z-20 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  <Link
                    href="/profile"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                  <Link
                    href="/settings"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                  <hr className="my-1 border-gray-100" />
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      onLogout();
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[#E24B4A] hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen((prev) => !prev)}
            className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 md:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-gray-200 bg-white md:hidden">
          <div className="space-y-1 px-4 py-3">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  currentPath === link.href
                    ? 'bg-[#0F6E56]/10 text-[#0F6E56]'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
            <hr className="my-2 border-gray-100" />
            <div className="flex items-center gap-3 px-3 py-2">
              {avatarUrl ? (
                <img src={avatarUrl} alt={userName} className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0F6E56] text-sm font-medium text-white">
                  {userName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-sm font-medium text-[#1A1A1A]">{userName}</span>
            </div>
            <button
              onClick={() => {
                setMobileOpen(false);
                onLogout();
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#E24B4A] hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
