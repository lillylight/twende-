'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export interface SOSButtonProps {
  journeyId: string;
  className?: string;
}

type SOSState = 'idle' | 'confirming' | 'sending' | 'sent' | 'error';

export function SOSButton({ journeyId, className }: SOSButtonProps) {
  const [state, setState] = useState<SOSState>('idle');

  const handleTrigger = () => {
    setState('confirming');
  };

  const handleConfirm = async () => {
    setState('sending');
    try {
      const res = await fetch(`/api/sos/${journeyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('SOS request failed');
      setState('sent');
      // Auto-reset after 5 seconds
      setTimeout(() => setState('idle'), 5000);
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  };

  const handleCancel = () => {
    setState('idle');
  };

  return (
    <>
      {/* SOS Button */}
      <button
        onClick={handleTrigger}
        disabled={state === 'sending' || state === 'sent'}
        className={cn(
          'relative flex h-20 w-20 items-center justify-center rounded-full bg-[#E24B4A] text-white shadow-lg transition-transform',
          'hover:scale-105 active:scale-95',
          'disabled:opacity-70 disabled:hover:scale-100',
          // Pulsing animation
          state === 'idle' && 'animate-pulse-sos',
          className
        )}
        aria-label="Emergency SOS"
      >
        {/* Outer pulse ring */}
        {state === 'idle' && (
          <span className="absolute inset-0 animate-ping rounded-full bg-[#E24B4A] opacity-20" />
        )}

        {state === 'sent' ? (
          <CheckCircle2 className="h-8 w-8" />
        ) : (
          <span className="relative z-10 text-lg font-extrabold tracking-wider">SOS</span>
        )}
      </button>

      {/* Confirmation Modal */}
      <Modal
        open={state === 'confirming' || state === 'sending'}
        onClose={handleCancel}
        title="Emergency SOS"
      >
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-8 w-8 text-[#E24B4A]" />
          </div>
          <p className="mb-2 text-base font-semibold text-[#1A1A1A]">Send Emergency Alert?</p>
          <p className="mb-6 text-sm text-gray-500">
            This will immediately alert RTSA and emergency services with your current location. Only
            use in a genuine emergency.
          </p>
          <div className="flex w-full gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={handleCancel}
              disabled={state === 'sending'}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={handleConfirm}
              loading={state === 'sending'}
            >
              Send SOS
            </Button>
          </div>
        </div>
      </Modal>

      {/* Sent confirmation */}
      {state === 'sent' && (
        <div className="mt-2 text-center text-sm font-medium text-emerald-600">
          SOS Sent - Help is on the way
        </div>
      )}

      {/* Error */}
      {state === 'error' && (
        <div className="mt-2 text-center text-sm font-medium text-[#E24B4A]">
          Failed to send - Try again
        </div>
      )}
    </>
  );
}
