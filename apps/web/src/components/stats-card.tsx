import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

export interface StatsCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  change?: number; // percentage, positive = up, negative = down
  className?: string;
}

export function StatsCard({ icon, title, value, change, className }: StatsCardProps) {
  const isPositive = change !== undefined && change >= 0;
  const isNegative = change !== undefined && change < 0;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0F6E56]/10 text-[#0F6E56]">
            {icon}
          </div>
          {change !== undefined && (
            <div
              className={cn(
                'flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold',
                isPositive && 'bg-emerald-50 text-emerald-600',
                isNegative && 'bg-red-50 text-[#E24B4A]'
              )}
            >
              {isPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {Math.abs(change).toFixed(1)}%
            </div>
          )}
        </div>
        <div className="mt-3">
          <p className="text-sm text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-[#1A1A1A]">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
