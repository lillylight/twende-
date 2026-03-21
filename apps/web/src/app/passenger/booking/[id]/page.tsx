'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SeatMap } from '@/components/seat-map';
import { Spinner } from '@/components/ui/spinner';
import { useAuthStore } from '@/store/auth.store';
import { useToast } from '@/components/ui/toast';
import { formatCurrency } from '@/lib/utils';
import { PaymentMethod } from '@/types';
import type { Journey } from '@/types';
import {
  MapPin,
  Clock,
  Users,
  Building2,
  ArrowRight,
  CreditCard,
  Phone,
  CheckCircle2,
  Navigation,
  Smartphone,
  ShieldCheck,
  Copy,
  QrCode,
  ChevronLeft,
} from 'lucide-react';

type BookingStep = 1 | 2 | 3 | 4 | 5;

interface PaymentOption {
  method: PaymentMethod;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    method: PaymentMethod.AIRTEL_MONEY,
    label: 'Airtel Money',
    icon: <Smartphone className="h-5 w-5 text-[#E24B4A]" />,
    description: 'Pay via Airtel Money',
  },
  {
    method: PaymentMethod.MTN_MOMO,
    label: 'MTN MoMo',
    icon: <Smartphone className="h-5 w-5 text-[#EF9F27]" />,
    description: 'Pay via MTN Mobile Money',
  },
  {
    method: PaymentMethod.ZAMTEL_KWACHA,
    label: 'Zamtel Kwacha',
    icon: <Smartphone className="h-5 w-5 text-[#0F6E56]" />,
    description: 'Pay via Zamtel Kwacha',
  },
  {
    method: PaymentMethod.CASH,
    label: 'Pay at Terminal',
    icon: <CreditCard className="h-5 w-5 text-gray-600" />,
    description: 'Pay cash at the bus terminal',
  },
];

const STEP_LABELS = [
  'Journey Details',
  'Select Seat',
  'Payment Method',
  'Confirm Payment',
  'Booking Confirmed',
];

export default function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: journeyId } = use(params);
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const { toast } = useToast();

  const [step, setStep] = useState<BookingStep>(1);
  const [journey, setJourney] = useState<Journey | null>(null);
  const [takenSeats, setTakenSeats] = useState<number[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [paymentPhone, setPaymentPhone] = useState(user?.phone ?? '');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bookingReference, setBookingReference] = useState<string>('');
  const [bookingId, setBookingId] = useState<string>('');

  useEffect(() => {
    fetchJourneyDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journeyId]);

  async function fetchJourneyDetails() {
    setLoading(true);
    try {
      // Fetch journey details
      const res = await fetch(`/api/journeys/${journeyId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) throw new Error('Failed to fetch journey details');
      const data = await res.json();
      setJourney(data.data);

      // Fetch seat availability
      const seatsRes = await fetch(`/api/journeys/${journeyId}/seats`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (seatsRes.ok) {
        const seatsData = await seatsRes.json();
        setTakenSeats(seatsData.data?.takenSeats ?? []);
      }
    } catch {
      toast({
        type: 'error',
        title: 'Error',
        description: 'Could not load journey details',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmBooking() {
    if (!selectedSeat || !paymentMethod) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          journeyId,
          seatNumber: String(selectedSeat),
          paymentMethod,
          paymentPhone: paymentMethod !== PaymentMethod.CASH ? paymentPhone : undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData?.error?.message ?? 'Booking failed');
      }

      const data = await res.json();
      setBookingReference(data.data?.bookingReference ?? 'ZP-XXXXXX');
      setBookingId(data.data?.id ?? '');
      setStep(5);
      toast({ type: 'success', title: 'Booking Confirmed!' });
    } catch (err) {
      toast({
        type: 'error',
        title: 'Booking Failed',
        description: err instanceof Error ? err.message : 'Please try again',
      });
    } finally {
      setSubmitting(false);
    }
  }

  function copyReference() {
    navigator.clipboard.writeText(bookingReference);
    toast({
      type: 'success',
      title: 'Copied!',
      description: 'Booking reference copied to clipboard',
    });
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Spinner size="lg" />
        <p className="mt-4 text-sm text-gray-500">Loading journey details...</p>
      </div>
    );
  }

  if (!journey) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-16 text-center">
          <p className="mb-4 text-lg font-semibold text-[#1A1A1A]">Journey Not Found</p>
          <Button onClick={() => router.push('/passenger/search')}>Back to Search</Button>
        </CardContent>
      </Card>
    );
  }

  const fare = journey.route?.baseFareZmw ?? 0;
  const origin = journey.route?.origin ?? 'Origin';
  const destination = journey.route?.destination ?? 'Destination';
  const operatorName = journey.vehicle?.operator?.companyName ?? 'Operator';
  const departureTime = new Date(journey.scheduledDeparture).toLocaleTimeString('en-ZM', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const departureDate = new Date(journey.scheduledDeparture).toLocaleDateString('en-ZM', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const totalSeats = journey.maxCapacity || 48;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      {step < 5 && (
        <button
          onClick={() => {
            if (step === 1) router.back();
            else setStep((s) => (s - 1) as BookingStep);
          }}
          className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-[#1A1A1A]"
        >
          <ChevronLeft className="h-4 w-4" />
          {step === 1 ? 'Back to Results' : 'Previous Step'}
        </button>
      )}

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {STEP_LABELS.map((label, i) => (
          <React.Fragment key={i}>
            <div className="flex items-center gap-1.5">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                  i + 1 === step
                    ? 'bg-[#0F6E56] text-white'
                    : i + 1 < step
                      ? 'bg-[#0F6E56]/20 text-[#0F6E56]'
                      : 'bg-gray-100 text-gray-400'
                }`}
              >
                {i + 1 < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={`hidden text-xs sm:inline ${
                  i + 1 === step ? 'font-semibold text-[#1A1A1A]' : 'text-gray-400'
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div className={`h-px flex-1 ${i + 1 < step ? 'bg-[#0F6E56]' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Journey Details */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Journey Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Operator Info */}
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#0F6E56]/10">
                <Building2 className="h-6 w-6 text-[#0F6E56]" />
              </div>
              <div>
                <p className="font-semibold text-[#1A1A1A]">{operatorName}</p>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <ShieldCheck className="h-3 w-3" />
                  RTSA Verified Operator
                </div>
              </div>
            </div>

            {/* Route */}
            <div className="flex items-center gap-4 rounded-lg bg-[#F8FAF9] p-4">
              <div className="text-center">
                <p className="text-xl font-bold text-[#1A1A1A]">{departureTime}</p>
                <p className="text-sm text-gray-500">{origin}</p>
              </div>
              <div className="flex flex-1 items-center gap-2">
                <div className="h-px flex-1 bg-gray-300" />
                <ArrowRight className="h-4 w-4 text-gray-400" />
                <div className="h-px flex-1 bg-gray-300" />
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-[#1A1A1A]">
                  {new Date(journey.scheduledArrival).toLocaleTimeString('en-ZM', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                <p className="text-sm text-gray-500">{destination}</p>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg border border-gray-200 p-3 text-center">
                <Clock className="mx-auto mb-1 h-5 w-5 text-gray-400" />
                <p className="text-xs text-gray-500">Date</p>
                <p className="text-sm font-semibold">{departureDate}</p>
              </div>
              <div className="rounded-lg border border-gray-200 p-3 text-center">
                <Users className="mx-auto mb-1 h-5 w-5 text-gray-400" />
                <p className="text-xs text-gray-500">Available Seats</p>
                <p className="text-sm font-semibold">{totalSeats - takenSeats.length}</p>
              </div>
              <div className="rounded-lg border border-gray-200 p-3 text-center">
                <MapPin className="mx-auto mb-1 h-5 w-5 text-gray-400" />
                <p className="text-xs text-gray-500">Distance</p>
                <p className="text-sm font-semibold">
                  {journey.route?.distanceKm ? `${Math.round(journey.route.distanceKm)} km` : 'N/A'}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 p-3 text-center">
                <CreditCard className="mx-auto mb-1 h-5 w-5 text-gray-400" />
                <p className="text-xs text-gray-500">Fare</p>
                <p className="text-lg font-bold text-[#0F6E56]">{formatCurrency(fare)}</p>
              </div>
            </div>

            <Button size="lg" className="w-full" onClick={() => setStep(2)}>
              Select Your Seat
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Seat Selection */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Your Seat</CardTitle>
            <p className="text-sm text-gray-500">
              {origin} &rarr; {destination} &middot; {departureDate} at {departureTime}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <SeatMap
              totalSeats={totalSeats}
              takenSeats={takenSeats}
              selectedSeat={selectedSeat}
              onSelect={setSelectedSeat}
            />

            {selectedSeat && (
              <div className="flex items-center justify-between rounded-lg bg-[#0F6E56]/5 p-4">
                <div>
                  <p className="text-sm text-gray-500">Selected Seat</p>
                  <p className="text-lg font-bold text-[#0F6E56]">Seat {selectedSeat}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Fare</p>
                  <p className="text-lg font-bold text-[#0F6E56]">{formatCurrency(fare)}</p>
                </div>
              </div>
            )}

            <Button
              size="lg"
              className="w-full"
              disabled={!selectedSeat}
              onClick={() => setStep(3)}
            >
              Continue to Payment
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Payment Method */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Method</CardTitle>
            <p className="text-sm text-gray-500">Choose how to pay {formatCurrency(fare)}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {PAYMENT_OPTIONS.map((opt) => (
              <button
                key={opt.method}
                onClick={() => setPaymentMethod(opt.method)}
                className={`flex w-full items-center gap-4 rounded-lg border-2 p-4 text-left transition-colors ${
                  paymentMethod === opt.method
                    ? 'border-[#0F6E56] bg-[#0F6E56]/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50">
                  {opt.icon}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-[#1A1A1A]">{opt.label}</p>
                  <p className="text-sm text-gray-500">{opt.description}</p>
                </div>
                {paymentMethod === opt.method && (
                  <CheckCircle2 className="h-5 w-5 text-[#0F6E56]" />
                )}
              </button>
            ))}

            <Button
              size="lg"
              className="w-full"
              disabled={!paymentMethod}
              onClick={() => setStep(4)}
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Confirm Payment */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Confirm & Pay</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary */}
            <div className="space-y-3 rounded-lg bg-[#F8FAF9] p-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Route</span>
                <span className="font-medium">
                  {origin} &rarr; {destination}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Date & Time</span>
                <span className="font-medium">
                  {departureDate} at {departureTime}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Operator</span>
                <span className="font-medium">{operatorName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Seat</span>
                <span className="font-medium">Seat {selectedSeat}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Payment</span>
                <span className="font-medium">
                  {PAYMENT_OPTIONS.find((o) => o.method === paymentMethod)?.label}
                </span>
              </div>
              <hr className="border-gray-200" />
              <div className="flex justify-between">
                <span className="font-semibold text-[#1A1A1A]">Total</span>
                <span className="text-xl font-bold text-[#0F6E56]">{formatCurrency(fare)}</span>
              </div>
            </div>

            {/* Phone Number for Mobile Money */}
            {paymentMethod !== PaymentMethod.CASH && (
              <Input
                label="Payment Phone Number"
                type="tel"
                placeholder="+260 97 1234567"
                icon={<Phone className="h-4 w-4" />}
                value={paymentPhone}
                onChange={(e) => setPaymentPhone(e.target.value)}
              />
            )}

            <Button
              size="lg"
              className="w-full"
              loading={submitting}
              onClick={handleConfirmBooking}
            >
              {paymentMethod === PaymentMethod.CASH
                ? 'Confirm Booking'
                : `Pay ${formatCurrency(fare)}`}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Confirmation */}
      {step === 5 && (
        <Card>
          <CardContent className="flex flex-col items-center py-10 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#0F6E56]/10">
              <CheckCircle2 className="h-10 w-10 text-[#0F6E56]" />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-[#1A1A1A]">Booking Confirmed!</h2>
            <p className="mb-6 text-gray-500">
              Your seat has been reserved. Show your booking reference at the terminal.
            </p>

            {/* Reference */}
            <div className="mb-6 rounded-lg border-2 border-dashed border-[#0F6E56]/30 bg-[#0F6E56]/5 px-8 py-4">
              <p className="text-xs uppercase text-gray-500">Booking Reference</p>
              <div className="flex items-center gap-2">
                <p className="font-mono text-3xl font-bold text-[#0F6E56]">{bookingReference}</p>
                <button
                  onClick={copyReference}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  aria-label="Copy reference"
                >
                  <Copy className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* QR Code Placeholder */}
            <div className="mb-6 flex h-32 w-32 items-center justify-center rounded-xl border border-gray-200 bg-gray-50">
              <QrCode className="h-16 w-16 text-gray-300" />
            </div>

            {/* Details */}
            <div className="mb-6 w-full max-w-sm space-y-2 text-left text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Route</span>
                <span className="font-medium">
                  {origin} &rarr; {destination}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date</span>
                <span className="font-medium">{departureDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Departure</span>
                <span className="font-medium">{departureTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Seat</span>
                <span className="font-medium">Seat {selectedSeat}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Fare</span>
                <span className="font-bold text-[#0F6E56]">{formatCurrency(fare)}</span>
              </div>
            </div>

            <div className="flex w-full max-w-sm flex-col gap-3">
              <Button
                size="lg"
                className="w-full"
                onClick={() => router.push(`/passenger/tracking/${journeyId}`)}
              >
                <Navigation className="h-4 w-4" />
                Track Your Bus
              </Button>
              <Button
                variant="secondary"
                size="lg"
                className="w-full"
                onClick={() => router.push('/passenger/bookings')}
              >
                View My Bookings
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
