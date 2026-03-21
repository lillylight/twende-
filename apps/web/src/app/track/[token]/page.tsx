'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { TrackingMap, TrackingPosition, TrackingWaypoint } from '@/components/tracking-map';
import { SpeedGauge } from '@/components/speed-gauge';
import { SOSButton } from '@/components/sos-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  MapPin,
  Clock,
  Gauge,
  Share2,
  CheckCircle2,
  AlertTriangle,
  Bus,
  Navigation,
  Copy,
  XCircle,
} from 'lucide-react';

interface TrackingData {
  journeyId: string;
  operatorName: string;
  route: {
    origin: string;
    destination: string;
  };
  status: string;
  position: TrackingPosition;
  waypoints: TrackingWaypoint[];
  driverName: string;
  registrationPlate: string;
  currentSpeed: number;
  speedLimit: number;
  etaMinutes: number | null;
  nearestTown: string | null;
  completedAt: string | null;
}

type PageState = 'loading' | 'tracking' | 'completed' | 'not_found' | 'error';

export default function PublicTrackingPage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<TrackingData | null>(null);
  const [pageState, setPageState] = useState<PageState>('loading');
  const [copied, setCopied] = useState(false);

  const fetchTracking = useCallback(async () => {
    try {
      const res = await fetch(`/api/tracking/public/${token}`);

      if (res.status === 404) {
        setPageState('not_found');
        return;
      }

      if (!res.ok) {
        setPageState('error');
        return;
      }

      const json = await res.json();
      const trackingData: TrackingData = json.data ?? json;
      setData(trackingData);

      if (trackingData.status === 'COMPLETED' || trackingData.status === 'ARRIVED') {
        setPageState('completed');
      } else {
        setPageState('tracking');
      }
    } catch {
      if (pageState === 'loading') {
        setPageState('error');
      }
    }
  }, [token, pageState]);

  // Initial fetch and polling every 5 seconds
  useEffect(() => {
    fetchTracking();
    const interval = setInterval(fetchTracking, 5000);
    return () => clearInterval(interval);
  }, [fetchTracking]);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isOverSpeed = data !== null && data.currentSpeed > (data.speedLimit ?? 110);

  // ─── Loading state ──────────────────────────────────────────────
  if (pageState === 'loading') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900">
        <Spinner size="lg" />
        <p className="mt-4 text-sm text-gray-400">Loading tracking data...</p>
        <PoweredByBranding />
      </div>
    );
  }

  // ─── Not found state ────────────────────────────────────────────
  if (pageState === 'not_found') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 px-4">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-900/30">
            <XCircle className="h-10 w-10 text-[#E24B4A]" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-white">Journey Not Found</h1>
          <p className="mt-2 max-w-sm text-gray-400">
            This tracking link is invalid or has expired. Please check with the passenger or
            operator for an updated link.
          </p>
        </div>
        <PoweredByBranding />
      </div>
    );
  }

  // ─── Error state ────────────────────────────────────────────────
  if (pageState === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 px-4">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-900/30">
            <AlertTriangle className="h-10 w-10 text-[#EF9F27]" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-white">Connection Error</h1>
          <p className="mt-2 max-w-sm text-gray-400">
            Unable to connect to tracking services. Please check your internet connection and try
            again.
          </p>
          <Button
            variant="primary"
            className="mt-6"
            onClick={() => {
              setPageState('loading');
              fetchTracking();
            }}
          >
            Retry
          </Button>
        </div>
        <PoweredByBranding />
      </div>
    );
  }

  // ─── Completed state ────────────────────────────────────────────
  if (pageState === 'completed' && data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 px-4">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-900/30">
            <CheckCircle2 className="h-10 w-10 text-emerald-400" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-white">Journey Completed</h1>
          <p className="mt-2 max-w-sm text-gray-400">
            The bus has arrived at{' '}
            <span className="font-medium text-white">{data.route.destination}</span>.
          </p>
          <div className="mt-6 rounded-xl border border-gray-700 bg-gray-800 p-4">
            <div className="flex items-center gap-3">
              <Bus className="h-5 w-5 text-[#0F6E56]" />
              <div className="text-left">
                <p className="font-medium text-white">{data.operatorName}</p>
                <p className="text-sm text-gray-400">
                  {data.route.origin} &rarr; {data.route.destination}
                </p>
              </div>
            </div>
          </div>
        </div>
        <PoweredByBranding />
      </div>
    );
  }

  // ─── Active tracking state ──────────────────────────────────────
  if (!data) return null;

  return (
    <div className="relative flex min-h-screen flex-col bg-gray-900">
      {/* Full-screen map */}
      <div className="flex-1">
        <TrackingMap
          position={data.position}
          waypoints={data.waypoints}
          journeyInfo={{
            operatorName: data.operatorName,
            registrationPlate: data.registrationPlate,
            etaMinutes: data.etaMinutes,
            driverName: data.driverName,
          }}
          className="h-full w-full"
        />
      </div>

      {/* Top overlay card */}
      <div className="absolute left-4 right-4 top-4 z-10">
        <div className="rounded-xl border border-gray-700/50 bg-gray-900/90 p-4 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0F6E56]/20">
                <Bus className="h-5 w-5 text-[#0F6E56]" />
              </div>
              <div>
                <p className="font-semibold text-white">{data.operatorName}</p>
                <p className="text-sm text-gray-400">
                  {data.route.origin} &rarr; {data.route.destination}
                </p>
              </div>
            </div>
            <Badge
              variant={
                data.status === 'IN_TRANSIT'
                  ? 'success'
                  : data.status === 'DELAYED'
                    ? 'warning'
                    : data.status === 'BOARDING'
                      ? 'info'
                      : 'default'
              }
            >
              {data.status.replace(/_/g, ' ')}
            </Badge>
          </div>
        </div>
      </div>

      {/* Bottom info panel */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <div className="rounded-t-2xl border-t border-gray-700/50 bg-gray-900/95 px-4 pb-6 pt-4 shadow-2xl backdrop-blur-md">
          {/* Info row */}
          <div className="grid grid-cols-3 gap-4">
            {/* Speed */}
            <div className="flex items-center gap-3 rounded-lg bg-gray-800 p-3">
              <Gauge className={`h-5 w-5 ${isOverSpeed ? 'text-[#E24B4A]' : 'text-[#0F6E56]'}`} />
              <div>
                <p className="text-xs text-gray-400">Speed</p>
                <p className={`text-lg font-bold ${isOverSpeed ? 'text-[#E24B4A]' : 'text-white'}`}>
                  {Math.round(data.currentSpeed)} km/h
                </p>
              </div>
              {isOverSpeed && (
                <div className="ml-auto">
                  <span className="animate-pulse rounded-full bg-[#E24B4A]/20 px-2 py-0.5 text-xs font-semibold text-[#E24B4A]">
                    OVER LIMIT
                  </span>
                </div>
              )}
            </div>

            {/* ETA */}
            <div className="flex items-center gap-3 rounded-lg bg-gray-800 p-3">
              <Clock className="h-5 w-5 text-[#0F6E56]" />
              <div>
                <p className="text-xs text-gray-400">ETA</p>
                <p className="text-lg font-bold text-white">
                  {data.etaMinutes !== null
                    ? data.etaMinutes < 60
                      ? `${data.etaMinutes} min`
                      : `${Math.floor(data.etaMinutes / 60)}h ${data.etaMinutes % 60}m`
                    : 'Calculating...'}
                </p>
              </div>
            </div>

            {/* Nearest town */}
            <div className="flex items-center gap-3 rounded-lg bg-gray-800 p-3">
              <Navigation className="h-5 w-5 text-[#0F6E56]" />
              <div>
                <p className="text-xs text-gray-400">Nearest Town</p>
                <p className="truncate text-sm font-semibold text-white">
                  {data.nearestTown ?? 'Unknown'}
                </p>
              </div>
            </div>
          </div>

          {/* Speed warning bar */}
          {isOverSpeed && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#E24B4A]/10 p-3">
              <AlertTriangle className="h-5 w-5 text-[#E24B4A]" />
              <p className="text-sm font-medium text-[#E24B4A]">
                This vehicle is exceeding the speed limit of {data.speedLimit} km/h
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-4 flex items-center justify-between">
            {/* SOS button */}
            <SOSButton journeyId={data.journeyId} />

            {/* Share button */}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleShare}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4" />
                  Share Tracking Link
                </>
              )}
            </Button>
          </div>

          {/* Powered by branding */}
          <div className="mt-4 flex items-center justify-center gap-1.5">
            <span className="text-xs text-gray-500">Powered by</span>
            <span className="text-xs font-bold text-[#0F6E56]">ZedPulse</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Powered By Branding ───────────────────────────────────────── */

function PoweredByBranding() {
  return (
    <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-1.5">
      <span className="text-xs text-gray-500">Powered by</span>
      <span className="text-xs font-bold text-[#0F6E56]">ZedPulse</span>
    </div>
  );
}
