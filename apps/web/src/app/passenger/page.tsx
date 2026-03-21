'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BookingCard } from '@/components/booking-card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { useAuthStore } from '@/store/auth.store';
import { useToast } from '@/components/ui/toast';
import type { Booking } from '@/types';
import { BookingStatus, PaymentStatus } from '@/types';
import { Search, MapPin, Calendar, Ticket, Navigation, ArrowRight, Bus, Clock } from 'lucide-react';

const CITIES = ['Lusaka', 'Kitwe', 'Ndola', 'Livingstone', 'Kabwe', 'Chipata', 'Kasama', 'Solwezi'];

export default function PassengerDashboard() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const { toast } = useToast();

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

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
      if (!res.ok) throw new Error('Failed to fetch bookings');
      const data = await res.json();
      setBookings(data.data ?? []);
    } catch {
      toast({
        type: 'error',
        title: 'Error',
        description: 'Could not load your bookings',
      });
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!from || !to) {
      toast({
        type: 'warning',
        title: 'Missing Fields',
        description: 'Please select departure and destination',
      });
      return;
    }
    const params = new URLSearchParams({ from, to });
    if (date) params.set('date', date);
    router.push(`/passenger/search?${params.toString()}`);
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

  const upcomingBookings = bookings.filter(
    (b) =>
      b.status === BookingStatus.CONFIRMED ||
      b.status === BookingStatus.PENDING ||
      b.status === BookingStatus.CHECKED_IN
  );

  const recentBookings = bookings.filter(
    (b) => b.status === BookingStatus.COMPLETED || b.status === BookingStatus.CANCELLED
  );

  const firstName = user?.firstName ?? 'Traveller';

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-[#1A1A1A]">Welcome back, {firstName}</h1>
        <p className="mt-1 text-gray-500">Where are you headed today?</p>
      </div>

      {/* Quick Search */}
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">From</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <select
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-[#1A1A1A] focus:border-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20"
                  >
                    <option value="">Select city</option>
                    {CITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">To</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <select
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-[#1A1A1A] focus:border-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20"
                  >
                    <option value="">Select city</option>
                    {CITIES.filter((c) => c !== from).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-[#1A1A1A] focus:border-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20"
                  />
                </div>
              </div>
            </div>
            <Button type="submit" size="lg" className="w-full sm:w-auto">
              <Search className="h-4 w-4" />
              Search Journeys
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-4">
        <button
          onClick={() => router.push('/passenger/search')}
          className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0F6E56]/10">
            <Bus className="h-6 w-6 text-[#0F6E56]" />
          </div>
          <span className="text-sm font-medium text-[#1A1A1A]">Book Trip</span>
        </button>
        <button
          onClick={() => router.push('/passenger/bookings')}
          className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EF9F27]/10">
            <Ticket className="h-6 w-6 text-[#EF9F27]" />
          </div>
          <span className="text-sm font-medium text-[#1A1A1A]">My Bookings</span>
        </button>
        <button
          onClick={() => {
            if (upcomingBookings[0]) {
              router.push(`/passenger/tracking/${upcomingBookings[0].journeyId}`);
            } else {
              toast({
                type: 'info',
                title: 'No Active Trip',
                description: 'Book a journey first to track a bus',
              });
            }
          }}
          className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0F6E56]/10">
            <Navigation className="h-6 w-6 text-[#0F6E56]" />
          </div>
          <span className="text-sm font-medium text-[#1A1A1A]">Track Bus</span>
        </button>
      </div>

      {/* Upcoming Bookings */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#1A1A1A]">Upcoming Bookings</h2>
          {upcomingBookings.length > 0 && (
            <button
              onClick={() => router.push('/passenger/bookings')}
              className="flex items-center gap-1 text-sm font-medium text-[#0F6E56] hover:underline"
            >
              View all <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : upcomingBookings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-12 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                <Ticket className="h-7 w-7 text-gray-400" />
              </div>
              <p className="mb-1 font-medium text-[#1A1A1A]">No upcoming bookings</p>
              <p className="mb-4 text-sm text-gray-500">
                Search for a journey and book your next trip
              </p>
              <Button variant="primary" size="sm" onClick={() => router.push('/passenger/search')}>
                <Search className="h-4 w-4" />
                Find a Journey
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {upcomingBookings.slice(0, 3).map((booking) => (
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
                ).toLocaleTimeString('en-ZM', { hour: '2-digit', minute: '2-digit' })}
                seatNumber={booking.seatNumber}
                status={booking.status}
                paymentStatus={booking.paymentStatus}
                fareZmw={booking.fareZmw}
                journeyId={booking.journeyId}
                onCancel={handleCancel}
                cancelLoading={cancellingId === booking.id}
              />
            ))}
          </div>
        )}
      </section>

      {/* Recent Trips */}
      {recentBookings.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-[#1A1A1A]">Recent Trips</h2>
          <div className="space-y-4">
            {recentBookings.slice(0, 3).map((booking) => (
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
                ).toLocaleTimeString('en-ZM', { hour: '2-digit', minute: '2-digit' })}
                seatNumber={booking.seatNumber}
                status={booking.status}
                paymentStatus={booking.paymentStatus}
                fareZmw={booking.fareZmw}
                journeyId={booking.journeyId}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
