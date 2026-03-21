'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<string, string> = {
  primary:
    'bg-[#0F6E56] text-white hover:bg-[#0b5a46] active:bg-[#094a39] focus-visible:ring-[#0F6E56]',
  secondary:
    'border-2 border-[#0F6E56] text-[#0F6E56] bg-transparent hover:bg-[#0F6E56]/5 active:bg-[#0F6E56]/10 focus-visible:ring-[#0F6E56]',
  danger:
    'bg-[#E24B4A] text-white hover:bg-[#cc3d3c] active:bg-[#b83332] focus-visible:ring-[#E24B4A]',
  ghost:
    'bg-transparent text-[#1A1A1A] hover:bg-gray-100 active:bg-gray-200 focus-visible:ring-gray-400',
};

const sizeStyles: Record<string, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-md gap-1.5',
  md: 'px-4 py-2 text-sm rounded-lg gap-2',
  lg: 'px-6 py-3 text-base rounded-lg gap-2.5',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'primary', size = 'md', loading = false, disabled, className, children, ...props },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:pointer-events-none',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
