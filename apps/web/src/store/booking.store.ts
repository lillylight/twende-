'use client';

import { create } from 'zustand';
import type {
  Booking,
  JourneySearchResult,
  PaymentMethod,
  ApiResponse,
  PaginatedResponse,
  RouteSearchParams,
} from '@/types';
import { useAuthStore } from './auth.store';

// ─── Types ──────────────────────────────────────────────────────────────────

interface BookingState {
  bookings: Booking[];
  currentBooking: Booking | null;
  searchResults: JourneySearchResult[];
  isSearching: boolean;
  isLoading: boolean;
  selectedSeat: string | null;
  searchParams: RouteSearchParams;
  error: string | null;
}

interface BookingActions {
  searchJourneys: (from: string, to: string, date: string) => Promise<void>;
  createBooking: (
    journeyId: string,
    seatNumber: string,
    paymentMethod: PaymentMethod
  ) => Promise<Booking>;
  cancelBooking: (reference: string) => Promise<void>;
  fetchMyBookings: () => Promise<void>;
  selectSeat: (seatNumber: string | null) => void;
  setSearchParams: (params: Partial<RouteSearchParams>) => void;
  clearSearchResults: () => void;
  clearError: () => void;
}

export type BookingStore = BookingState & BookingActions;

// ─── Helpers ────────────────────────────────────────────────────────────────

function getAuthHeader(): Record<string, string> {
  const token = useAuthStore.getState().accessToken;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

async function authenticatedRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
      ...options.headers,
    },
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    // If 401, try refreshing the token and retry once
    if (response.status === 401) {
      const refreshed = await useAuthStore.getState().refreshAuth();
      if (refreshed) {
        const retryResponse = await fetch(url, {
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader(),
            ...options.headers,
          },
          ...options,
        });
        const retryData = await retryResponse.json();
        if (!retryResponse.ok) {
          throw new Error(retryData?.error?.message ?? retryData?.message ?? 'Request failed');
        }
        return retryData as T;
      }
    }
    throw new Error(data?.error?.message ?? data?.message ?? 'Request failed');
  }

  return data as T;
}

// ─── Store ──────────────────────────────────────────────────────────────────

export const useBookingStore = create<BookingStore>()((set, get) => ({
  // State
  bookings: [],
  currentBooking: null,
  searchResults: [],
  isSearching: false,
  isLoading: false,
  selectedSeat: null,
  searchParams: {},
  error: null,

  // Actions
  searchJourneys: async (from: string, to: string, date: string) => {
    set({ isSearching: true, error: null, searchResults: [] });

    try {
      const params = new URLSearchParams({
        origin: from,
        destination: to,
        date,
      });

      const currentParams = get().searchParams;
      if (currentParams.passengers) {
        params.set('passengers', String(currentParams.passengers));
      }
      if (currentParams.page) {
        params.set('page', String(currentParams.page));
      }
      if (currentParams.pageSize) {
        params.set('pageSize', String(currentParams.pageSize));
      }

      const result = await authenticatedRequest<PaginatedResponse<JourneySearchResult>>(
        `/api/journeys/search?${params.toString()}`
      );

      set({
        searchResults: result.data,
        isSearching: false,
        searchParams: { ...get().searchParams, origin: from, destination: to, date },
      });
    } catch (err) {
      set({
        isSearching: false,
        error: err instanceof Error ? err.message : 'Search failed',
      });
      throw err;
    }
  },

  createBooking: async (journeyId: string, seatNumber: string, paymentMethod: PaymentMethod) => {
    set({ isLoading: true, error: null });

    try {
      const result = await authenticatedRequest<ApiResponse<Booking>>('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          journeyId,
          seatNumber,
          paymentMethod,
        }),
      });

      const booking = result.data;

      set((state) => ({
        currentBooking: booking,
        bookings: [booking, ...state.bookings],
        isLoading: false,
        selectedSeat: null,
      }));

      return booking;
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Booking failed',
      });
      throw err;
    }
  },

  cancelBooking: async (reference: string) => {
    set({ isLoading: true, error: null });

    try {
      await authenticatedRequest<ApiResponse<void>>(`/api/bookings/${reference}/cancel`, {
        method: 'POST',
      });

      set((state) => ({
        bookings: state.bookings.map((b) =>
          b.bookingReference === reference ? { ...b, status: 'CANCELLED' as Booking['status'] } : b
        ),
        currentBooking:
          state.currentBooking?.bookingReference === reference
            ? { ...state.currentBooking, status: 'CANCELLED' as Booking['status'] }
            : state.currentBooking,
        isLoading: false,
      }));
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Cancellation failed',
      });
      throw err;
    }
  },

  fetchMyBookings: async () => {
    set({ isLoading: true, error: null });

    try {
      const result = await authenticatedRequest<PaginatedResponse<Booking>>('/api/bookings/my');

      set({
        bookings: result.data,
        isLoading: false,
      });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch bookings',
      });
      throw err;
    }
  },

  selectSeat: (seatNumber: string | null) => {
    set({ selectedSeat: seatNumber });
  },

  setSearchParams: (params: Partial<RouteSearchParams>) => {
    set((state) => ({
      searchParams: { ...state.searchParams, ...params },
    }));
  },

  clearSearchResults: () => {
    set({ searchResults: [], selectedSeat: null });
  },

  clearError: () => {
    set({ error: null });
  },
}));
