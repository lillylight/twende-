'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-[#1A1A1A]',
              'placeholder:text-gray-400',
              'transition-colors duration-150',
              'focus:border-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20',
              'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-60',
              icon && 'pl-10',
              error && 'border-[#E24B4A] focus:border-[#E24B4A] focus:ring-[#E24B4A]/20',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-sm text-[#E24B4A]">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
