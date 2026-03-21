'use client';

import { useState, useCallback, useRef } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

interface UseToastReturn {
  toasts: Toast[];
  addToast: (type: ToastType, message: string, duration?: number) => string;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

// ─── Default Durations ──────────────────────────────────────────────────────

const DEFAULT_DURATIONS: Record<ToastType, number> = {
  success: 4000,
  error: 6000,
  warning: 5000,
  info: 4000,
};

// ─── ID Generator ───────────────────────────────────────────────────────────

let toastCounter = 0;

function generateId(): string {
  toastCounter++;
  return `toast-${Date.now()}-${toastCounter}`;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useToast(): UseToastReturn {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));

    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string, duration?: number): string => {
      const id = generateId();
      const resolvedDuration = duration ?? DEFAULT_DURATIONS[type];

      const toast: Toast = {
        id,
        type,
        message,
        duration: resolvedDuration,
      };

      setToasts((prev) => [...prev, toast]);

      // Auto-remove after duration
      if (resolvedDuration > 0) {
        const timer = setTimeout(() => {
          removeToast(id);
        }, resolvedDuration);
        timersRef.current.set(id, timer);
      }

      return id;
    },
    [removeToast]
  );

  const clearAll = useCallback(() => {
    // Clear all active timers
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
    setToasts([]);
  }, []);

  return {
    toasts,
    addToast,
    removeToast,
    clearAll,
  };
}
