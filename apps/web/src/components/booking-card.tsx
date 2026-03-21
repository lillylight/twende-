'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import { BookingStatus, PaymentStatus } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Calendar, Clock, Armchair, Navigation, X as XIcon, Hash } from 'lucide-react';

export interface BookingCardProps {
  id: string;
  bookingReference: string;
  routeOrigin: string;
  routeDestination: string;
  operatorName: string;
  date: string;
  time: string;
  seatNumber: string | null;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  fareZmw: number;
  journeyId: string;
  onCancel?: (id: string) => void;
  cancelLoading?: boolean;
}

const bookingStatusBadge: Record<
  BookingStatus,
  { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' }
> = {
  [BookingStatus.PENDING]: { label: 'Pending', variant: 'warning' },
  [BookingStatus.CONFIRMED]: { label: 'Confirmed', variant: 'success' },
  [BookingStatus.CHECKED_IN]: { label: 'Checked In', variant: 'info' },
  [BookingStatus.COMPLETED]: { label: 'Completed', variant: 'default' },
  [BookingStatus.CANCELLED]: { label: 'Cancelled', variant: 'danger' },
  [BookingStatus.NO_SHOW]: { label: 'No Show', variant: 'danger' },
  [BookingStatus.REFUNDED]: { label: 'Refunded', variant: 'default' },
};

const paymentStatusBadge: Record<
  PaymentStatus,
  { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' }
> = {
  [PaymentStatus.PENDING]: { label: 'Unpaid', variant: 'warning' },
  [PaymentStatus.PROCESSING]: { label: 'Processing', variant: 'info' },
  [PaymentStatus.COMPLETED]: { label: 'Paid', variant: 'success' },
  [PaymentStatus.FAILED]: { label: 'Failed', variant: 'danger' },
  [PaymentStatus.REFUNDED]: { label: 'Refunded', variant: 'default' },
  [PaymentStatus.EXPIRED]: { label: 'Expired', variant: 'danger' },
};

const CANCELLABLE = new Set<BookingStatus>([BookingStatus.PENDING, BookingStatus.CONFIRMED]);

export function BookingCard({
  id,
  bookingReference,
  routeOrigin,
  routeDestination,
  operatorName,
  date,
  time,
  seatNumber,
  status,
  paymentStatus,
  fareZmw,
  journeyId,
  onCancel,
  cancelLoading,
}: BookingCardProps) {
  const bStatus = bookingStatusBadge[status];
  const pStatus = paymentStatusBadge[paymentStatus];
  const canCancel = CANCELLABLE.has(status);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Top accent bar */}
        <div className="h-1 bg-[#0F6E56]" />

        <div className="p-5">
          {/* Header: reference + badges */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Hash className="h-3.5 w-3.5" />
              <span className="font-mono font-medium">{bookingReference}</span>
            </div>
            <div className="flex gap-2">
              <Badge variant={bStatus.variant}>{bStatus.label}</Badge>
              <Badge variant={pStatus.variant}>{pStatus.label}</Badge>
            </div>
          </div>

          {/* Route */}
          <div className="mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4 flex-shrink-0 text-[#0F6E56]" />
            <span className="font-semibold text-[#1A1A1A]">{routeOrigin}</span>
            <span className="text-gray-400">&rarr;</span>
            <span className="font-semibold text-[#1A1A1A]">{routeDestination}</span>
          </div>

          {/* Operator */}
          <p className="mb-3 text-sm text-gray-500">{operatorName}</p>

          {/* Details grid */}
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <Calendar className="h-3.5 w-3.5 text-gray-400" />
              {date}
            </div>
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <Clock className="h-3.5 w-3.5 text-gray-400" />
              {time}
            </div>
            {seatNumber && (
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <Armchair className="h-3.5 w-3.5 text-gray-400" />
                Seat {seatNumber}
              </div>
            )}
            <div className="text-sm font-semibold text-[#1A1A1A]">{formatCurrency(fareZmw)}</div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Link href={`/track/${journeyId}`}>
              <Button variant="primary" size="sm">
                <Navigation className="h-4 w-4" />
                Track
              </Button>
            </Link>
            {canCancel && onCancel && (
              <Button
                variant="danger"
                size="sm"
                loading={cancelLoading}
                onClick={() => onCancel(id)}
              >
                <XIcon className="h-4 w-4" />
                Cancel
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
