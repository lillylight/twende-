'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  toast: (t: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
}

// ─── Context ────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

// ─── Provider ───────────────────────────────────────────────────────────────

let toastCounter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (t: Omit<Toast, 'id'>) => {
      const id = `toast-${++toastCounter}`;
      const newToast: Toast = { ...t, id };
      setToasts((prev) => [...prev, newToast]);

      const duration = t.duration ?? 5000;
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toasts, toast: addToast, dismiss }}>
      {children}
      {mounted &&
        createPortal(<ToastContainer toasts={toasts} onDismiss={dismiss} />, document.body)}
    </ToastContext.Provider>
  );
}

// ─── Toast Container ────────────────────────────────────────────────────────

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

// ─── Toast Item ─────────────────────────────────────────────────────────────

const iconMap: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
  error: <XCircle className="h-5 w-5 text-[#E24B4A]" />,
  warning: <AlertTriangle className="h-5 w-5 text-[#EF9F27]" />,
  info: <Info className="h-5 w-5 text-sky-500" />,
};

const borderColorMap: Record<ToastType, string> = {
  success: 'border-l-emerald-500',
  error: 'border-l-[#E24B4A]',
  warning: 'border-l-[#EF9F27]',
  info: 'border-l-sky-500',
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  return (
    <div
      role="alert"
      className={cn(
        'flex w-80 items-start gap-3 rounded-lg border border-gray-200 border-l-4 bg-white p-4 shadow-lg',
        'animate-in slide-in-from-right fade-in duration-300',
        borderColorMap[toast.type]
      )}
    >
      <div className="flex-shrink-0 pt-0.5">{iconMap[toast.type]}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[#1A1A1A]">{toast.title}</p>
        {toast.description && <p className="mt-0.5 text-sm text-gray-500">{toast.description}</p>}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="flex-shrink-0 rounded p-0.5 text-gray-400 transition-colors hover:text-gray-600"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
