'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Users, ArrowRight, Building2, ShieldCheck } from 'lucide-react';

export interface JourneyCardProps {
  id: string;
  operatorName: string;
  operatorLogoUrl?: string | null;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  fareZmw: number;
  availableSeats: number;
  complianceScore: number;
  onBook: (journeyId: string) => void;
  bookingLoading?: boolean;
  className?: string;
}

function getComplianceBadge(score: number): {
  label: string;
  variant: 'success' | 'warning' | 'danger';
} {
  if (score >= 80) return { label: `${score}% Safe`, variant: 'success' };
  if (score >= 50) return { label: `${score}% Fair`, variant: 'warning' };
  return { label: `${score}% Risk`, variant: 'danger' };
}

export function JourneyCard({
  id,
  operatorName,
  operatorLogoUrl,
  origin,
  destination,
  departureTime,
  arrivalTime,
  fareZmw,
  availableSeats,
  complianceScore,
  onBook,
  bookingLoading,
  className,
}: JourneyCardProps) {
  const compliance = getComplianceBadge(complianceScore);

  return (
    <Card className={cn('overflow-hidden transition-shadow hover:shadow-md', className)}>
      <CardContent className="p-5">
        {/* Operator row */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {operatorLogoUrl ? (
              <img
                src={operatorLogoUrl}
                alt={operatorName}
                className="h-10 w-10 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0F6E56]/10">
                <Building2 className="h-5 w-5 text-[#0F6E56]" />
              </div>
            )}
            <div>
              <p className="font-semibold text-[#1A1A1A]">{operatorName}</p>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <ShieldCheck className="h-3 w-3" />
                <Badge variant={compliance.variant} className="text-[10px]">
                  {compliance.label}
                </Badge>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-[#0F6E56]">{formatCurrency(fareZmw)}</p>
          </div>
        </div>

        {/* Route + times */}
        <div className="mb-4 flex items-center gap-3">
          <div className="text-center">
            <p className="text-lg font-bold text-[#1A1A1A]">{departureTime}</p>
            <p className="text-sm text-gray-500">{origin}</p>
          </div>

          <div className="flex flex-1 items-center gap-2 px-2">
            <div className="h-px flex-1 bg-gray-300" />
            <ArrowRight className="h-4 w-4 flex-shrink-0 text-gray-400" />
            <div className="h-px flex-1 bg-gray-300" />
          </div>

          <div className="text-center">
            <p className="text-lg font-bold text-[#1A1A1A]">{arrivalTime}</p>
            <p className="text-sm text-gray-500">{destination}</p>
          </div>
        </div>

        {/* Bottom row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {availableSeats} seat{availableSeats !== 1 ? 's' : ''} left
            </span>
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={() => onBook(id)}
            loading={bookingLoading}
            disabled={availableSeats === 0}
          >
            {availableSeats === 0 ? 'Full' : 'Book Now'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
