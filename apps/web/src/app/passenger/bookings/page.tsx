'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { BookingCard } from '@/components/booking-card';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/auth.store';
import { useToast } from '@/components/ui/toast';
import { BookingStatus, PaymentStatus } from '@/types';
import type { Booking } from '@/types';
import { formatCurrency } from '@/lib/utils';
import {
  Ticket,
  Search,
  Calendar,
  MapPin,
  Clock,
  Armchair,
  Hash,
  Navigation,
  X,
} from 'lucide-react';

type TabKey = 'upcoming' | 'completed' | 'cancelled';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

export default function BookingsPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const { toast } = useToast();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('upcoming');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);

  useEffect(() => {
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchBookings() {
    setLoading(true);
    try {
      const res = await fetch('/api/bookings', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setBookings(data.data ?? []);
    } catch {
      toast({
        type: 'error',
        title: 'Error',
        description: 'Could not load bookings',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(id: string) {
    setCancellingId(id);
    try {
      const booking = bookings.find((b) => b.id === id);
      if (!booking) return;
      const res = await fetch(`/api/bookings/${booking.bookingReference}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error('Cancel failed');
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: BookingStatus.CANCELLED } : b))
      );
      toast({ type: 'success', title: 'Booking cancelled' });
    } catch {
      toast({
        type: 'error',
        title: 'Error',
        description: 'Could not cancel booking',
      });
    } finally {
      setCancellingId(null);
    }
  }

  const categorized = useMemo(() => {
    const upcoming: Booking[] = [];
    const completed: Booking[] = [];
    const cancelled: Booking[] = [];

    bookings.forEach((b) => {
      switch (b.status) {
        case BookingStatus.PENDING:
        case BookingStatus.CONFIRMED:
        case BookingStatus.CHECKED_IN:
          upcoming.push(b);
          break;
        case BookingStatus.COMPLETED:
          completed.push(b);
          break;
        case BookingStatus.CANCELLED:
        case BookingStatus.REFUNDED:
        case BookingStatus.NO_SHOW:
          cancelled.push(b);
          break;
      }
    });

    return { upcoming, completed, cancelled };
  }, [bookings]);

  const currentList = categorized[activeTab];

  function renderEmptyState(tab: TabKey) {
    const messages: Record<TabKey, { icon: React.ReactNode; title: string; desc: string }> = {
      upcoming: {
        icon: <Ticket className="h-8 w-8 text-gray-400" />,
        title: 'No upcoming bookings',
        desc: 'Search for a journey and book your next trip',
      },
      completed: {
        icon: <Calendar className="h-8 w-8 text-gray-400" />,
        title: 'No completed trips',
        desc: 'Your completed trips will appear here',
      },
      cancelled: {
        icon: <X className="h-8 w-8 text-gray-400" />,
        title: 'No cancelled bookings',
        desc: 'Cancelled bookings will appear here',
      },
    };

    const m = messages[tab];
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-16 text-center">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            {m.icon}
          </div>
          <p className="mb-1 font-medium text-[#1A1A1A]">{m.title}</p>
          <p className="mb-4 text-sm text-gray-500">{m.desc}</p>
          {tab === 'upcoming' && (
            <Button size="sm" onClick={() => router.push('/passenger/search')}>
              <Search className="h-4 w-4" />
              Find a Journey
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#1A1A1A]">My Bookings</h1>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
        {TABS.map((tab) => {
          const count = categorized[tab.key].length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-[#0F6E56] text-white'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-[#1A1A1A]'
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-xs font-semibold ${
                    activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : currentList.length === 0 ? (
        renderEmptyState(activeTab)
      ) : (
        <div className="space-y-4">
          {currentList.map((booking) => (
            <BookingCard
              key={booking.id}
              id={booking.id}
              bookingReference={booking.bookingReference}
              routeOrigin={booking.boardingPoint}
              routeDestination={booking.alightingPoint}
              operatorName={booking.journey?.vehicle?.operator?.companyName ?? 'Operator'}
              date={new Date(
                booking.journey?.scheduledDeparture ?? booking.createdAt
              ).toLocaleDateString('en-ZM')}
              time={new Date(
                booking.journey?.scheduledDeparture ?? booking.createdAt
              ).toLocaleTimeString('en-ZM', {
                hour: '2-digit',
                minute: '2-digit',
              })}
              seatNumber={booking.seatNumber}
              status={booking.status}
              paymentStatus={booking.paymentStatus}
              fareZmw={booking.fareZmw}
              journeyId={booking.journeyId}
              onCancel={activeTab === 'upcoming' ? handleCancel : undefined}
              cancelLoading={cancellingId === booking.id}
            />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <Modal open={!!detailBooking} onClose={() => setDetailBooking(null)} title="Booking Details">
        {detailBooking && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-gray-400" />
              <span className="font-mono font-semibold">{detailBooking.bookingReference}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[#0F6E56]" />
              <span>
                {detailBooking.boardingPoint} &rarr; {detailBooking.alightingPoint}
              </span>
            </div>
            {detailBooking.seatNumber && (
              <div className="flex items-center gap-2">
                <Armchair className="h-4 w-4 text-gray-400" />
                <span>Seat {detailBooking.seatNumber}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#0F6E56]">
                {formatCurrency(detailBooking.fareZmw)}
              </span>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                size="sm"
                onClick={() => {
                  router.push(`/passenger/tracking/${detailBooking.journeyId}`);
                  setDetailBooking(null);
                }}
              >
                <Navigation className="h-4 w-4" />
                Track
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
