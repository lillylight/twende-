'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import type { TrackingUpdate } from '@/types';

// ─── Types ──────────────────────────────────────────────────────────────────

interface UseWebSocketOptions {
  /** Journey ID to track */
  journeyId: string | null;
  /** Callback invoked on each tracking update */
  onMessage?: (update: TrackingUpdate) => void;
  /** Whether to automatically connect (default: true) */
  enabled?: boolean;
  /** Polling interval in ms for the HTTP fallback (default: 5000) */
  pollInterval?: number;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  send: (data: unknown) => void;
  disconnect: () => void;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useWebSocket({
  journeyId,
  onMessage,
  enabled = true,
  pollInterval = 5000,
}: UseWebSocketOptions): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const onMessageRef = useRef(onMessage);
  const isUsingPollingRef = useRef(false);

  // Keep callback ref up to date without triggering reconnection
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const cleanup = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.onclose = null;
      if (
        wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING
      ) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }

    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    if (reconnectRef.current) {
      clearTimeout(reconnectRef.current);
      reconnectRef.current = null;
    }

    isUsingPollingRef.current = false;
    reconnectAttemptsRef.current = 0;
    setIsConnected(false);
  }, []);

  const startPolling = useCallback(
    (jId: string) => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }

      isUsingPollingRef.current = true;

      const poll = async () => {
        try {
          const token = useAuthStore.getState().accessToken;
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          if (token) {
            headers.Authorization = `Bearer ${token}`;
          }

          const response = await fetch(`/api/tracking/journey/${jId}`, {
            headers,
          });

          if (!response.ok) return;

          const result = await response.json();
          const update: TrackingUpdate = result.data;

          setIsConnected(true);
          onMessageRef.current?.(update);
        } catch {
          // Continue polling silently
        }
      };

      poll();
      pollingRef.current = setInterval(poll, pollInterval);
    },
    [pollInterval]
  );

  const connect = useCallback(
    (jId: string) => {
      const token = useAuthStore.getState().accessToken;
      const protocol =
        typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = typeof window !== 'undefined' ? window.location.host : 'localhost:3000';
      const wsUrl = `${protocol}//${host}/api/tracking/ws?journeyId=${jId}${token ? `&token=${token}` : ''}`;

      try {
        const socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
          reconnectAttemptsRef.current = 0;
          setIsConnected(true);

          // Stop polling if it was running as fallback
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
            isUsingPollingRef.current = false;
          }
        };

        socket.onmessage = (event: MessageEvent) => {
          try {
            const update: TrackingUpdate = JSON.parse(event.data);
            onMessageRef.current?.(update);
          } catch {
            // Ignore malformed messages
          }
        };

        socket.onerror = () => {
          // Immediately fall back to polling
          if (!isUsingPollingRef.current) {
            startPolling(jId);
          }
        };

        socket.onclose = () => {
          setIsConnected(isUsingPollingRef.current);

          if (reconnectAttemptsRef.current < 5) {
            reconnectAttemptsRef.current++;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30_000);

            reconnectRef.current = setTimeout(() => {
              connect(jId);
            }, delay);
          } else if (!isUsingPollingRef.current) {
            // After 5 failed WebSocket reconnects, stay on polling
            startPolling(jId);
          }
        };
      } catch {
        // WebSocket constructor failed, use polling
        startPolling(jId);
      }
    },
    [startPolling]
  );

  // Main effect: connect/disconnect based on journeyId
  useEffect(() => {
    if (!enabled || !journeyId) {
      cleanup();
      return;
    }

    connect(journeyId);

    return () => {
      cleanup();
    };
  }, [journeyId, enabled, connect, cleanup]);

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  const disconnect = useCallback(() => {
    cleanup();
  }, [cleanup]);

  return {
    isConnected,
    send,
    disconnect,
  };
}
