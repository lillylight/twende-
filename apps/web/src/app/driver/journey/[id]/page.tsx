'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { SpeedGauge } from '@/components/speed-gauge';
import { SOSButton } from '@/components/sos-button';
import { useAuthStore } from '@/store/auth.store';
import { useToast } from '@/hooks/use-toast';
import {
  Play,
  Square,
  MapPin,
  Clock,
  Bus,
  Users,
  Wifi,
  WifiOff,
  Navigation,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  CheckCircle2,
  Circle,
  User,
  ChevronDown,
  ChevronUp,
  Radio,
  ArrowRight,
} from 'lucide-react';
import type { Journey, Booking, ApiResponse } from '@/types';

// ─── Types ──────────────────────────────────────────────────────────────────

type TrackingStatus = 'idle' | 'starting' | 'active' | 'stopping' | 'ended';
type GPSStatus = 'sending' | 'buffered' | 'error' | 'idle';

interface SimulatedPosition {
  lat: number;
  lng: number;
  speed: number;
  heading: number;
}

// ─── Route simulation waypoints (Lusaka to Kafue corridor) ──────────────

const SIMULATION_WAYPOINTS: { lat: number; lng: number }[] = [
  { lat: -15.3875, lng: 28.3228 },
  { lat: -15.395, lng: 28.318 },
  { lat: -15.41, lng: 28.312 },
  { lat: -15.43, lng: 28.305 },
  { lat: -15.45, lng: 28.298 },
  { lat: -15.47, lng: 28.29 },
  { lat: -15.49, lng: 28.282 },
  { lat: -15.51, lng: 28.275 },
  { lat: -15.53, lng: 28.268 },
  { lat: -15.55, lng: 28.26 },
  { lat: -15.57, lng: 28.253 },
  { lat: -15.59, lng: 28.246 },
  { lat: -15.61, lng: 28.239 },
  { lat: -15.63, lng: 28.232 },
  { lat: -15.65, lng: 28.225 },
  { lat: -15.67, lng: 28.218 },
  { lat: -15.69, lng: 28.211 },
  { lat: -15.71, lng: 28.204 },
  { lat: -15.73, lng: 28.197 },
  { lat: -15.75, lng: 28.19 },
];

function interpolatePosition(waypointIndex: number, progress: number): SimulatedPosition {
  const totalWaypoints = SIMULATION_WAYPOINTS.length;
  const idx = waypointIndex % totalWaypoints;
  const nextIdx = (idx + 1) % totalWaypoints;

  const current = SIMULATION_WAYPOINTS[idx];
  const next = SIMULATION_WAYPOINTS[nextIdx];

  const lat = current.lat + (next.lat - current.lat) * progress;
  const lng = current.lng + (next.lng - current.lng) * progress;

  const dlat = next.lat - current.lat;
  const dlng = next.lng - current.lng;
  const heading = (Math.atan2(dlng, dlat) * 180) / Math.PI;

  // Simulate speed variation: 60-110 km/h with occasional bursts
  const baseSpeed = 75 + Math.sin(waypointIndex * 0.7) * 20;
  const jitter = (Math.random() - 0.5) * 15;
  const speed = Math.max(40, Math.min(130, baseSpeed + jitter));

  return { lat, lng, speed, heading: (heading + 360) % 360 };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-ZM', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ActiveJourneyPage() {
  const params = useParams();
  const router = useRouter();
  const journeyId = params.id as string;

  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const { addToast } = useToast();

  // Journey data
  const [journey, setJourney] = useState<Journey | null>(null);
  const [passengers, setPassengers] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tracking state
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>('idle');
  const [gpsStatus, setGpsStatus] = useState<GPSStatus>('idle');
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [currentPosition, setCurrentPosition] = useState<SimulatedPosition | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [positionsSent, setPositionsSent] = useState(0);

  // Simulation
  const [simulateGps, setSimulateGps] = useState(false);
  const simulationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waypointIndexRef = useRef(0);
  const progressRef = useRef(0);
  const positionBufferRef = useRef<SimulatedPosition[]>([]);

  // Passenger list expand
  const [passengersExpanded, setPassengersExpanded] = useState(false);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };

  // ─── Fetch journey data ─────────────────────────────────────────────────

  const fetchJourney = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [journeyRes, seatsRes] = await Promise.allSettled([
        fetch(`/api/tracking/journey/${journeyId}`, { headers }),
        fetch(`/api/journeys/${journeyId}/seats`, { headers }),
      ]);

      if (journeyRes.status === 'fulfilled' && journeyRes.value.ok) {
        const data = await journeyRes.value.json();
        const journeyData = data.data?.journey ?? data.data ?? data;
        setJourney(journeyData);

        if (journeyData.status === 'IN_TRANSIT' || journeyData.status === 'BOARDING') {
          setTrackingStatus('active');
        }
        if (journeyData.status === 'COMPLETED' || journeyData.status === 'ARRIVED') {
          setTrackingStatus('ended');
        }
      } else {
        throw new Error('Failed to load journey details');
      }

      if (seatsRes.status === 'fulfilled' && seatsRes.value.ok) {
        const data = await seatsRes.value.json();
        setPassengers(data.data ?? data.bookings ?? []);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load journey';
      setError(message);
      addToast('error', message);
    } finally {
      setIsLoading(false);
    }
  }, [journeyId, accessToken]);

  useEffect(() => {
    fetchJourney();
  }, [fetchJourney]);

  // ─── Online/offline detection ───────────────────────────────────────────

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ─── Send position to API ──────────────────────────────────────────────

  const sendPosition = useCallback(
    async (position: SimulatedPosition) => {
      if (!isOnline) {
        positionBufferRef.current.push(position);
        setGpsStatus('buffered');
        return;
      }

      try {
        // Flush buffer first
        if (positionBufferRef.current.length > 0) {
          const buffered = [...positionBufferRef.current];
          positionBufferRef.current = [];

          await fetch('/api/tracking/positions/bulk', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              journeyId,
              positions: buffered.map((p) => ({
                lat: p.lat,
                lng: p.lng,
                speed: p.speed,
                heading: p.heading,
                accuracy: 10,
                timestamp: new Date().toISOString(),
              })),
            }),
          });
        }

        const res = await fetch('/api/tracking/position', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            journeyId,
            lat: position.lat,
            lng: position.lng,
            speed: position.speed,
            heading: position.heading,
            accuracy: 10,
            timestamp: new Date().toISOString(),
          }),
        });

        if (res.ok) {
          setGpsStatus('sending');
          setPositionsSent((prev) => prev + 1);
        } else {
          setGpsStatus('error');
        }
      } catch {
        positionBufferRef.current.push(position);
        setGpsStatus('error');
      }
    },
    [isOnline, journeyId, accessToken]
  );

  // ─── GPS Simulation ────────────────────────────────────────────────────

  useEffect(() => {
    if (simulateGps && trackingStatus === 'active') {
      simulationRef.current = setInterval(() => {
        progressRef.current += 0.2;
        if (progressRef.current >= 1) {
          progressRef.current = 0;
          waypointIndexRef.current += 1;
        }

        const position = interpolatePosition(waypointIndexRef.current, progressRef.current);

        setCurrentPosition(position);
        setCurrentSpeed(position.speed);
        sendPosition(position);
      }, 5000);

      // Send initial position immediately
      const initialPos = interpolatePosition(waypointIndexRef.current, progressRef.current);
      setCurrentPosition(initialPos);
      setCurrentSpeed(initialPos.speed);
      sendPosition(initialPos);

      return () => {
        if (simulationRef.current) {
          clearInterval(simulationRef.current);
          simulationRef.current = null;
        }
      };
    } else {
      if (simulationRef.current) {
        clearInterval(simulationRef.current);
        simulationRef.current = null;
      }
    }
  }, [simulateGps, trackingStatus, sendPosition]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (simulationRef.current) {
        clearInterval(simulationRef.current);
      }
    };
  }, []);

  // ─── Start Tracking ────────────────────────────────────────────────────

  const handleStartTracking = async () => {
    setTrackingStatus('starting');
    try {
      const res = await fetch('/api/tracking/start', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          journeyId,
          driverId: user?.id,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? 'Failed to start tracking');
      }

      setTrackingStatus('active');
      setGpsStatus('idle');
      addToast('success', 'Journey tracking started. GPS updates will be sent every 5 seconds.');

      // Refresh journey data
      fetchJourney();
    } catch (err) {
      setTrackingStatus('idle');
      const message = err instanceof Error ? err.message : 'Failed to start tracking';
      addToast('error', message);
    }
  };

  // ─── End Journey ───────────────────────────────────────────────────────

  const handleEndJourney = async () => {
    setTrackingStatus('stopping');
    setSimulateGps(false);

    try {
      const res = await fetch('/api/tracking/end', {
        method: 'POST',
        headers,
        body: JSON.stringify({ journeyId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? 'Failed to end journey');
      }

      setTrackingStatus('ended');
      setCurrentSpeed(0);
      setGpsStatus('idle');
      addToast('success', 'Journey completed successfully.');
    } catch (err) {
      setTrackingStatus('active');
      const message = err instanceof Error ? err.message : 'Failed to end journey';
      addToast('error', message);
    }
  };

  // ─── Speed warning logic ──────────────────────────────────────────────

  const speedWarning =
    currentSpeed > 120
      ? {
          level: 'critical' as const,
          message: 'DANGER: Exceeding 120 km/h! Slow down immediately.',
        }
      : currentSpeed > 100
        ? {
            level: 'warning' as const,
            message: 'Warning: Speed exceeds 100 km/h. Please reduce speed.',
          }
        : null;

  // ─── Loading state ────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-gray-500">Loading journey details...</p>
        </div>
      </div>
    );
  }

  if (error && !journey) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="flex flex-col items-center py-8 text-center">
            <AlertTriangle className="mb-3 h-12 w-12 text-[#E24B4A]" />
            <p className="text-lg font-semibold text-[#1A1A1A]">Journey Not Found</p>
            <p className="mt-1 text-sm text-gray-500">{error}</p>
            <Button variant="primary" className="mt-4" onClick={() => router.push('/driver')}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const bookedCount = passengers.filter(
    (p) => p.status === 'CONFIRMED' || p.status === 'CHECKED_IN'
  ).length;
  const checkedInCount = passengers.filter((p) => p.status === 'CHECKED_IN').length;

  return (
    <div className="space-y-4">
      {/* Speed Warning Banner */}
      {speedWarning && trackingStatus === 'active' && (
        <div
          className={`flex items-center gap-3 rounded-lg px-4 py-3 ${
            speedWarning.level === 'critical'
              ? 'border-2 border-[#E24B4A] bg-red-50 text-[#E24B4A]'
              : 'border-2 border-[#EF9F27] bg-amber-50 text-amber-800'
          }`}
        >
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-semibold">{speedWarning.message}</p>
          <span className="ml-auto text-lg font-bold">{Math.round(currentSpeed)} km/h</span>
        </div>
      )}

      {/* Connection Status Bar */}
      <div className="flex items-center justify-between rounded-lg bg-white px-4 py-2 shadow-sm">
        <div className="flex items-center gap-4">
          {/* Online/Offline */}
          <div className="flex items-center gap-1.5">
            {isOnline ? (
              <Wifi className="h-4 w-4 text-emerald-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-[#E24B4A]" />
            )}
            <span
              className={`text-xs font-medium ${isOnline ? 'text-emerald-600' : 'text-[#E24B4A]'}`}
            >
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          {/* GPS Status */}
          {trackingStatus === 'active' && (
            <div className="flex items-center gap-1.5">
              <Radio
                className={`h-4 w-4 ${
                  gpsStatus === 'sending'
                    ? 'text-emerald-500'
                    : gpsStatus === 'buffered'
                      ? 'text-[#EF9F27]'
                      : gpsStatus === 'error'
                        ? 'text-[#E24B4A]'
                        : 'text-gray-400'
                }`}
              />
              <span className="text-xs text-gray-600">
                GPS:{' '}
                {gpsStatus === 'sending'
                  ? 'Sending'
                  : gpsStatus === 'buffered'
                    ? `Buffered (${positionBufferRef.current.length})`
                    : gpsStatus === 'error'
                      ? 'Error'
                      : 'Idle'}
              </span>
            </div>
          )}

          {/* Positions sent counter */}
          {positionsSent > 0 && (
            <span className="text-xs text-gray-400">{positionsSent} positions sent</span>
          )}
        </div>

        {/* Simulate GPS Toggle */}
        {trackingStatus === 'active' && (
          <button
            onClick={() => setSimulateGps((prev) => !prev)}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100"
          >
            {simulateGps ? (
              <ToggleRight className="h-5 w-5 text-[#0F6E56]" />
            ) : (
              <ToggleLeft className="h-5 w-5 text-gray-400" />
            )}
            Simulate GPS
          </button>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left Column: Speed Gauge + Controls */}
        <div className="flex flex-col items-center gap-4 lg:col-span-1">
          {/* Speed Gauge */}
          <Card className="w-full">
            <CardContent className="flex flex-col items-center py-6">
              <SpeedGauge currentSpeed={currentSpeed} speedLimit={100} maxSpeed={160} />

              {/* Tracking Controls */}
              <div className="mt-6 flex w-full flex-col gap-3">
                {trackingStatus === 'idle' && (
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full"
                    onClick={handleStartTracking}
                  >
                    <Play className="h-5 w-5" />
                    Start Tracking
                  </Button>
                )}

                {trackingStatus === 'starting' && (
                  <Button variant="primary" size="lg" className="w-full" disabled loading>
                    Starting Tracking...
                  </Button>
                )}

                {trackingStatus === 'active' && (
                  <Button variant="danger" size="lg" className="w-full" onClick={handleEndJourney}>
                    <Square className="h-5 w-5" />
                    End Journey
                  </Button>
                )}

                {trackingStatus === 'stopping' && (
                  <Button variant="danger" size="lg" className="w-full" disabled loading>
                    Ending Journey...
                  </Button>
                )}

                {trackingStatus === 'ended' && (
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2 text-emerald-600">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-medium">Journey Completed</span>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => router.push('/driver')}>
                      Back to Dashboard
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* SOS Button */}
          {trackingStatus === 'active' && (
            <Card className="w-full">
              <CardContent className="flex flex-col items-center py-6">
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                  Emergency
                </p>
                <SOSButton journeyId={journeyId} />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Journey Info + Passengers */}
        <div className="space-y-4 lg:col-span-2">
          {/* Journey Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Journey Information</CardTitle>
                <Badge
                  variant={
                    journey?.status === 'IN_TRANSIT'
                      ? 'success'
                      : journey?.status === 'SCHEDULED'
                        ? 'info'
                        : journey?.status === 'COMPLETED'
                          ? 'default'
                          : 'warning'
                  }
                >
                  {journey?.status?.replace('_', ' ') ?? 'Unknown'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Route */}
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#0F6E56]" />
                  <div>
                    <p className="text-xs font-medium uppercase text-gray-500">Route</p>
                    <p className="mt-0.5 text-sm font-semibold text-[#1A1A1A]">
                      {journey?.route?.origin ?? 'Origin'}{' '}
                      <ArrowRight className="inline h-3 w-3 text-gray-400" />{' '}
                      {journey?.route?.destination ?? 'Destination'}
                    </p>
                    {journey?.route?.distanceKm && (
                      <p className="text-xs text-gray-500">{journey.route.distanceKm} km</p>
                    )}
                  </div>
                </div>

                {/* Departure Time */}
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0 text-[#EF9F27]" />
                  <div>
                    <p className="text-xs font-medium uppercase text-gray-500">Departure</p>
                    <p className="mt-0.5 text-sm font-semibold text-[#1A1A1A]">
                      {journey?.scheduledDeparture
                        ? formatTime(journey.scheduledDeparture as unknown as string)
                        : 'TBD'}
                    </p>
                    {journey?.actualDeparture && (
                      <p className="text-xs text-gray-500">
                        Actual: {formatTime(journey.actualDeparture as unknown as string)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Vehicle */}
                <div className="flex items-start gap-3">
                  <Bus className="mt-0.5 h-5 w-5 shrink-0 text-[#0F6E56]" />
                  <div>
                    <p className="text-xs font-medium uppercase text-gray-500">Bus</p>
                    <p className="mt-0.5 text-sm font-semibold text-[#1A1A1A]">
                      {journey?.vehicle?.registrationPlate ?? 'Not Assigned'}
                    </p>
                    {journey?.vehicle && (
                      <p className="text-xs text-gray-500">
                        {journey.vehicle.make} {journey.vehicle.model}
                      </p>
                    )}
                  </div>
                </div>

                {/* Passengers */}
                <div className="flex items-start gap-3">
                  <Users className="mt-0.5 h-5 w-5 shrink-0 text-[#EF9F27]" />
                  <div>
                    <p className="text-xs font-medium uppercase text-gray-500">Passengers</p>
                    <p className="mt-0.5 text-sm font-semibold text-[#1A1A1A]">
                      {bookedCount} booked / {journey?.maxCapacity ?? 0} seats
                    </p>
                    <p className="text-xs text-gray-500">{checkedInCount} checked in</p>
                  </div>
                </div>
              </div>

              {/* Current Position (if tracking) */}
              {currentPosition && trackingStatus === 'active' && (
                <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-[#0F6E56]" />
                    <span className="text-xs font-medium text-gray-600">Current Position</span>
                  </div>
                  <p className="mt-1 font-mono text-xs text-gray-500">
                    {currentPosition.lat.toFixed(6)}, {currentPosition.lng.toFixed(6)} | Heading:{' '}
                    {Math.round(currentPosition.heading)}&deg; | Speed:{' '}
                    {Math.round(currentPosition.speed)} km/h
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Passenger Manifest */}
          <Card>
            <CardHeader>
              <button
                onClick={() => setPassengersExpanded((prev) => !prev)}
                className="flex w-full items-center justify-between"
              >
                <CardTitle>Passenger Manifest ({passengers.length})</CardTitle>
                {passengersExpanded ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </CardHeader>
            {passengersExpanded && (
              <CardContent>
                {passengers.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-center">
                    <Users className="mb-2 h-8 w-8 text-gray-300" />
                    <p className="text-sm text-gray-500">No passengers booked yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Table header */}
                    <div className="hidden grid-cols-5 gap-2 border-b border-gray-100 pb-2 text-xs font-medium uppercase text-gray-500 sm:grid">
                      <span>Passenger</span>
                      <span>Seat</span>
                      <span>Boarding Point</span>
                      <span>Alighting</span>
                      <span>Status</span>
                    </div>

                    {passengers.map((booking) => (
                      <div
                        key={booking.id}
                        className="grid grid-cols-1 gap-1 rounded-lg border border-gray-100 p-3 sm:grid-cols-5 sm:items-center sm:gap-2 sm:p-2"
                      >
                        {/* Name */}
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 shrink-0 text-gray-400" />
                          <span className="text-sm font-medium text-[#1A1A1A]">
                            {booking.passenger?.user?.firstName ?? 'Passenger'}{' '}
                            {booking.passenger?.user?.lastName ?? ''}
                          </span>
                        </div>

                        {/* Seat */}
                        <div className="flex items-center gap-1 sm:justify-start">
                          <span className="text-xs text-gray-500 sm:hidden">Seat: </span>
                          <Badge variant="default">{booking.seatNumber ?? 'N/A'}</Badge>
                        </div>

                        {/* Boarding Point */}
                        <div className="text-xs text-gray-600 sm:text-sm">
                          <span className="text-gray-500 sm:hidden">From: </span>
                          {booking.boardingPoint}
                        </div>

                        {/* Alighting Point */}
                        <div className="text-xs text-gray-600 sm:text-sm">
                          <span className="text-gray-500 sm:hidden">To: </span>
                          {booking.alightingPoint}
                        </div>

                        {/* Boarding Status */}
                        <div>
                          {booking.status === 'CHECKED_IN' ? (
                            <Badge variant="success">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Boarded
                            </Badge>
                          ) : booking.status === 'CONFIRMED' ? (
                            <Badge variant="warning">
                              <Circle className="mr-1 h-3 w-3" />
                              Awaiting
                            </Badge>
                          ) : booking.status === 'CANCELLED' ? (
                            <Badge variant="danger">Cancelled</Badge>
                          ) : (
                            <Badge variant="default">{booking.status}</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
