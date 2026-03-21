import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  formatDistanceToNow,
  differenceInSeconds,
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
} from 'date-fns';

/**
 * Merge Tailwind CSS classes with clsx, resolving conflicts via tailwind-merge.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format a Zambian phone number into the standard +260 XXXXXXXXX format.
 * Accepts inputs like: 0971234567, 971234567, +260971234567, 260971234567
 */
export function formatZambianPhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-()]+/g, '');

  if (/^\+260\d{9}$/.test(cleaned)) {
    return cleaned;
  }

  if (/^260\d{9}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  if (/^0\d{9}$/.test(cleaned)) {
    return `+260${cleaned.slice(1)}`;
  }

  if (/^\d{9}$/.test(cleaned)) {
    return `+260${cleaned}`;
  }

  return cleaned;
}

/**
 * Format an amount in Zambian Kwacha (ZMW).
 * Outputs like: K 125.00, K 1,250.50
 */
export function formatCurrency(
  amount: number,
  options?: { showSymbol?: boolean; decimals?: number }
): string {
  const { showSymbol = true, decimals = 2 } = options ?? {};

  const formatted = new Intl.NumberFormat('en-ZM', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);

  return showSymbol ? `K ${formatted}` : formatted;
}

/**
 * Generate a unique booking reference in the format ZP-XXXXXX
 * where X is an alphanumeric character (uppercase + digits).
 */
export function generateBookingReference(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let reference = '';
  const bytes = new Uint8Array(6);

  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  for (let i = 0; i < 6; i++) {
    reference += chars[bytes[i] % chars.length];
  }

  return `ZP-${reference}`;
}

/**
 * Calculate the distance between two geographic coordinates using the Haversine formula.
 * Returns the distance in kilometers.
 */
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const EARTH_RADIUS_KM = 6371;

  const toRad = (deg: number): number => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

/**
 * Format a date into a human-readable relative time string.
 * Examples: "just now", "2 minutes ago", "3 hours ago", "yesterday"
 */
export function formatRelativeTime(date: Date | string): string {
  const target = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();

  const seconds = differenceInSeconds(now, target);

  if (seconds < 10) {
    return 'just now';
  }

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = differenceInMinutes(now, target);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = differenceInHours(now, target);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = differenceInDays(now, target);
  if (days === 1) {
    return 'yesterday';
  }

  if (days < 7) {
    return `${days}d ago`;
  }

  return formatDistanceToNow(target, { addSuffix: true });
}

/**
 * Truncate a string to the given max length, adding an ellipsis if truncated.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 1).trimEnd() + '\u2026';
}

/**
 * Convert degrees to a compass bearing string (N, NE, E, SE, S, SW, W, NW).
 */
export function degreesToCompass(degrees: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const normalized = ((degrees % 360) + 360) % 360;
  const index = Math.round(normalized / 45) % 8;
  return directions[index];
}

/**
 * Format a duration in minutes into a human-readable string.
 * Examples: "45 min", "1h 30min", "2h"
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remaining = Math.round(minutes % 60);

  if (remaining === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remaining}min`;
}

/**
 * Format a distance in kilometers into a human-readable string.
 * Distances under 1 km are shown in meters.
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }

  if (km < 10) {
    return `${km.toFixed(1)} km`;
  }

  return `${Math.round(km)} km`;
}

/**
 * Detect the mobile money provider from a Zambian phone number.
 * Returns the provider name or null if unrecognized.
 */
export function detectMobileMoneyProvider(phone: string): 'MTN' | 'Airtel' | 'Zamtel' | null {
  const formatted = formatZambianPhone(phone);
  const subscriber = formatted.replace('+260', '');

  if (/^(96|76)\d{7}$/.test(subscriber)) return 'MTN';
  if (/^(97|77)\d{7}$/.test(subscriber)) return 'Airtel';
  if (/^(95|75)\d{7}$/.test(subscriber)) return 'Zamtel';

  return null;
}

/**
 * Sleep for a given number of milliseconds. Useful for retry delays, animations, etc.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
