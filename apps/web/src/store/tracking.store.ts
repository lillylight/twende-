'use client';

import { create } from 'zustand';
import type {
  GPSPosition,
  Journey,
  Route,
  TrackingUpdate,
  ApiResponse,
  JourneyStatus,
} from '@/types';
import { useAuthStore } from './auth.store';

// ─── Types ──────────────────────────────────────────────────────────────────

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

interface TrackingState {
  position: GPSPosition | null;
  journey: Journey | null;
  route: Route | null;
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  lastUpdate: TrackingUpdate | null;
  error: string | null;
}

interface TrackingActions {
  connectToJourney: (journeyId: string) => void;
  disconnect: () => void;
  updatePosition: (position: GPSPosition) => void;
  setJourney: (journey: Journey) => void;
  setRoute: (route: Route) => void;
}

export type TrackingStore = TrackingState & TrackingActions;

// ─── Internal Connection State ──────────────────────────────────────────────

let ws: WebSocket | null = null;
let pollingInterval: ReturnType<typeof setInterval> | null = null;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY = 1000;
let activeJourneyId: string | null = null;

function getReconnectDelay(): number {
  // Exponential backoff with jitter, capped at 30 seconds
  const delay = Math.min(BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts), 30_000);
  return delay + Math.random() * 1000;
}

function cleanupConnection(): void {
  if (ws) {
    ws.onopen = null;
    ws.onmessage = null;
    ws.onerror = null;
    ws.onclose = null;
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close();
    }
    ws = null;
  }

  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }

  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  reconnectAttempts = 0;
  activeJourneyId = null;
}

function startPollingFallback(journeyId: string): void {
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }

  const poll = async () => {
    try {
      const token = useAuthStore.getState().accessToken;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`/api/tracking/journey/${journeyId}`, { headers });

      if (!response.ok) return;

      const result: ApiResponse<TrackingUpdate> = await response.json();
      const update = result.data;

      useTrackingStore.setState({
        position: update.position,
        lastUpdate: update,
        isConnected: true,
        connectionStatus: 'connected',
      });
    } catch {
      // Silently continue polling on error
    }
  };

  // Poll immediately, then every 5 seconds
  poll();
  pollingInterval = setInterval(poll, 5000);
}

// ─── Store ──────────────────────────────────────────────────────────────────

export const useTrackingStore = create<TrackingStore>()((set, get) => ({
  // State
  position: null,
  journey: null,
  route: null,
  isConnected: false,
  connectionStatus: 'disconnected',
  lastUpdate: null,
  error: null,

  // Actions
  connectToJourney: (journeyId: string) => {
    // Clean up any existing connection
    cleanupConnection();
    activeJourneyId = journeyId;

    set({
      connectionStatus: 'connecting',
      error: null,
      isConnected: false,
    });

    const token = useAuthStore.getState().accessToken;

    // Determine WebSocket URL
    const protocol =
      typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = typeof window !== 'undefined' ? window.location.host : 'localhost:3000';
    const wsUrl = `${protocol}//${host}/api/tracking/ws?journeyId=${journeyId}${token ? `&token=${token}` : ''}`;

    try {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        if (activeJourneyId !== journeyId) return;
        reconnectAttempts = 0;
        set({
          isConnected: true,
          connectionStatus: 'connected',
          error: null,
        });

        // Stop polling fallback if WebSocket connected
        if (pollingInterval) {
          clearInterval(pollingInterval);
          pollingInterval = null;
        }
      };

      ws.onmessage = (event: MessageEvent) => {
        if (activeJourneyId !== journeyId) return;

        try {
          const update: TrackingUpdate = JSON.parse(event.data);

          set({
            position: update.position,
            lastUpdate: update,
          });

          // Update journey status if it changed
          const currentJourney = get().journey;
          if (currentJourney && update.status !== currentJourney.status) {
            set({
              journey: {
                ...currentJourney,
                status: update.status as JourneyStatus,
                currentLat: update.position.lat,
                currentLng: update.position.lng,
                currentSpeed: update.position.speed,
                currentPassengerCount: update.passengerCount,
              },
            });
          }
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onerror = () => {
        if (activeJourneyId !== journeyId) return;

        set({ connectionStatus: 'error' });

        // Fall back to polling
        startPollingFallback(journeyId);
      };

      ws.onclose = () => {
        if (activeJourneyId !== journeyId) return;

        set({ isConnected: false });

        // Attempt reconnection if not intentionally disconnected
        if (activeJourneyId && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          set({ connectionStatus: 'reconnecting' });
          reconnectAttempts++;

          reconnectTimeout = setTimeout(() => {
            if (activeJourneyId === journeyId) {
              get().connectToJourney(journeyId);
            }
          }, getReconnectDelay());
        } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          // Max reconnect attempts reached, fall back to polling
          set({
            connectionStatus: 'error',
            error: 'WebSocket connection failed, using polling fallback',
          });
          startPollingFallback(journeyId);
        }
      };
    } catch {
      // WebSocket constructor failed (e.g., invalid URL, SSR) -- fall back to polling
      set({
        connectionStatus: 'connected',
        error: null,
      });
      startPollingFallback(journeyId);
    }
  },

  disconnect: () => {
    cleanupConnection();
    set({
      isConnected: false,
      connectionStatus: 'disconnected',
      position: null,
      lastUpdate: null,
      error: null,
    });
  },

  updatePosition: (position: GPSPosition) => {
    set({ position });
  },

  setJourney: (journey: Journey) => {
    set({ journey, route: journey.route ?? get().route });
  },

  setRoute: (route: Route) => {
    set({ route });
  },
}));
