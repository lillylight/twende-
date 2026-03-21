'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { TrackingMap } from '@/components/tracking-map';
import { SOSButton } from '@/components/sos-button';
import { SpeedGauge } from '@/components/speed-gauge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useWebSocket } from '@/hooks/use-websocket';
import { useAuthStore } from '@/store/auth.store';
import { useToast } from '@/components/ui/toast';
import type { TrackingUpdate, Journey } from '@/types';
import { JourneyStatus } from '@/types';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Share2,
  AlertTriangle,
  Building2,
  Navigation,
  ChevronUp,
  ChevronDown,
  Wifi,
  WifiOff,
  Copy,
} from 'lucide-react';

const STATUS_BADGE: Record<
  string,
  { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' }
> = {
  [JourneyStatus.SCHEDULED]: { label: 'Scheduled', variant: 'default' },
  [JourneyStatus.BOARDING]: { label: 'Boarding', variant: 'info' },
  [JourneyStatus.IN_TRANSIT]: { label: 'In Transit', variant: 'success' },
  [JourneyStatus.DELAYED]: { label: 'Delayed', variant: 'warning' },
  [JourneyStatus.ARRIVED]: { label: 'Arrived', variant: 'success' },
  [JourneyStatus.COMPLETED]: { label: 'Completed', variant: 'default' },
  [JourneyStatus.CANCELLED]: { label: 'Cancelled', variant: 'danger' },
};

export default function TrackingPage({ params }: { params: Promise<{ journeyId: string }> }) {
  const { journeyId } = use(params);
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const { toast } = useToast();

  const [journey, setJourney] = useState<Journey | null>(null);
  const [loading, setLoading] = useState(true);
  const [position, setPosition] = useState({
    lat: -15.3875,
    lng: 28.3228,
    heading: 0,
    speed: 0,
  });
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [nearestStop, setNearestStop] = useState<string | null>(null);
  const [journeyStatus, setJourneyStatus] = useState<string>(JourneyStatus.SCHEDULED);
  const [panelOpen, setPanelOpen] = useState(true);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);

  const handleTrackingUpdate = useCallback((update: TrackingUpdate) => {
    setPosition({
      lat: update.position.lat,
      lng: update.position.lng,
      heading: update.position.heading ?? 0,
      speed: update.position.speed ?? 0,
    });
    setEtaMinutes(update.etaMinutes);
    setNearestStop(update.nextStop);
    setJourneyStatus(update.status);
  }, []);

  const { isConnected } = useWebSocket({
    journeyId,
    onMessage: handleTrackingUpdate,
    enabled: true,
  });

  useEffect(() => {
    fetchJourney();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journeyId]);

  async function fetchJourney() {
    setLoading(true);
    try {
      const res = await fetch(`/api/journeys/${journeyId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error('Failed to fetch journey');
      const data = await res.json();
      const j = data.data as Journey;
      setJourney(j);
      setJourneyStatus(j.status);

      if (j.currentLat && j.currentLng) {
        setPosition({
          lat: j.currentLat,
          lng: j.currentLng,
          heading: j.headingDegrees ?? 0,
          speed: j.currentSpeed ?? 0,
        });
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

  async function handleShare() {
    setShareLoading(true);
    try {
      const res = await fetch(`/api/tracking/share/${journeyId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error('Failed to create share link');
      const data = await res.json();
      const token = data.data?.token ?? data.data?.shareToken ?? '';
      const link = `${window.location.origin}/track/public/${token}`;
      setShareLink(link);
      await navigator.clipboard.writeText(link);
      toast({
        type: 'success',
        title: 'Link Copied!',
        description: 'Share this link so others can track your journey',
      });
    } catch {
      toast({
        type: 'error',
        title: 'Error',
        description: 'Could not generate share link',
      });
    } finally {
      setShareLoading(false);
    }
  }

  const isOverSpeed = position.speed > 120;
  const origin = journey?.route?.origin ?? 'Origin';
  const destination = journey?.route?.destination ?? 'Destination';
  const operatorName = journey?.vehicle?.operator?.companyName ?? 'Operator';
  const registrationPlate = journey?.vehicle?.registrationPlate ?? 'ABC 1234';
  const driverName = journey?.driver?.user
    ? `${journey.driver.user.firstName} ${journey.driver.user.lastName}`
    : 'Driver';
  const statusInfo = STATUS_BADGE[journeyStatus] ?? STATUS_BADGE[JourneyStatus.SCHEDULED];

  const waypoints =
    journey?.route?.waypoints?.map((wp) => ({
      lat: wp.lat,
      lng: wp.lng,
      name: wp.name,
    })) ?? [];

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div
      className="-mx-4 -mt-6 flex flex-col sm:-mx-6 lg:-mx-8"
      style={{ height: 'calc(100dvh - 4rem)' }}
    >
      {/* Speed Warning Banner */}
      {isOverSpeed && (
        <div className="flex items-center gap-2 bg-[#E24B4A] px-4 py-2 text-sm font-medium text-white">
          <AlertTriangle className="h-4 w-4 animate-pulse" />
          Speed Warning: Bus exceeding 120 km/h ({Math.round(position.speed)} km/h)
        </div>
      )}

      {/* Top Info Bar */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-[#1A1A1A]"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#1A1A1A]">{operatorName}</span>
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
            </div>
            <p className="flex items-center gap-1 text-sm text-gray-500">
              <MapPin className="h-3 w-3" />
              {origin} &rarr; {destination}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Wifi className="h-4 w-4 text-[#0F6E56]" />
          ) : (
            <WifiOff className="h-4 w-4 text-gray-400" />
          )}
          <Button variant="secondary" size="sm" loading={shareLoading} onClick={handleShare}>
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline">Share</span>
          </Button>
        </div>
      </div>

      {/* Map */}
      <div className="relative flex-1">
        <TrackingMap
          position={position}
          waypoints={waypoints}
          journeyInfo={{
            operatorName,
            registrationPlate,
            etaMinutes,
            driverName,
          }}
          className="h-full w-full"
        />

        {/* SOS Button - Bottom Right */}
        <div className="absolute bottom-4 right-4 z-10">
          <SOSButton journeyId={journeyId} />
        </div>
      </div>

      {/* Bottom Panel */}
      <div
        className={`border-t border-gray-200 bg-white transition-all duration-300 ${
          panelOpen ? 'max-h-80' : 'max-h-14'
        }`}
      >
        {/* Toggle */}
        <button
          onClick={() => setPanelOpen(!panelOpen)}
          className="flex w-full items-center justify-center py-2 text-gray-400 hover:text-gray-600"
        >
          {panelOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
        </button>

        {panelOpen && (
          <div className="flex flex-col items-center gap-4 px-4 pb-4 sm:flex-row sm:items-start sm:justify-around">
            {/* Speed Gauge */}
            <SpeedGauge
              currentSpeed={position.speed}
              speedLimit={110}
              className="scale-75 sm:scale-100"
            />

            {/* Info Panel */}
            <div className="flex flex-col gap-3 text-center sm:text-left">
              {/* ETA */}
              <div className="rounded-lg bg-[#0F6E56]/5 px-4 py-3">
                <p className="text-xs uppercase text-gray-500">Estimated Arrival</p>
                <p className="text-2xl font-bold text-[#0F6E56]">
                  {etaMinutes !== null
                    ? etaMinutes < 60
                      ? `${etaMinutes} min`
                      : `${Math.floor(etaMinutes / 60)}h ${etaMinutes % 60}m`
                    : 'Calculating...'}
                </p>
              </div>

              {/* Nearest Stop */}
              <div>
                <p className="text-xs uppercase text-gray-500">Nearest Town</p>
                <p className="flex items-center justify-center gap-1 font-semibold text-[#1A1A1A] sm:justify-start">
                  <Navigation className="h-4 w-4 text-[#0F6E56]" />
                  {nearestStop ?? 'En route'}
                </p>
              </div>

              {/* Vehicle Info */}
              <div>
                <p className="text-xs uppercase text-gray-500">Vehicle</p>
                <p className="text-sm font-medium text-[#1A1A1A]">
                  {registrationPlate} &middot; {driverName}
                </p>
              </div>

              {/* Share Link */}
              {shareLink && (
                <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <p className="flex-1 truncate text-xs text-gray-500">{shareLink}</p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(shareLink);
                      toast({ type: 'info', title: 'Copied!' });
                    }}
                    className="text-gray-400 hover:text-[#0F6E56]"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
