'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StatsCard } from '@/components/stats-card';
import { LiveFleetMap, BusPosition } from '@/components/live-fleet-map';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertType, AlertSeverity } from '@/types';
import { formatRelativeTime } from '@/lib/utils';
import {
  Bus,
  Users,
  AlertTriangle,
  ShieldCheck,
  X,
  MapPin,
  Gauge,
  User,
  Clock,
  ChevronRight,
} from 'lucide-react';

interface FleetData {
  stats: {
    activeBuses: number;
    activeBusesChange: number;
    totalPassengersToday: number;
    passengersChange: number;
    alertsToday: number;
    alertsChange: number;
    avgComplianceScore: number;
    complianceChange: number;
  };
  buses: BusPosition[];
  journeys: Record<
    string,
    {
      operatorName: string;
      route: string;
      speed: number;
      driverName: string;
      eta: string;
      registrationPlate: string;
      passengers: number;
      capacity: number;
      status: string;
    }
  >;
}

interface AlertTicker {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  operatorName: string;
  createdAt: string;
}

export default function RTSADashboard() {
  const [fleetData, setFleetData] = useState<FleetData | null>(null);
  const [alerts, setAlerts] = useState<AlertTicker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const tickerRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const [fleetRes, alertsRes] = await Promise.all([
        fetch('/api/rtsa/fleet'),
        fetch('/api/rtsa/alerts?limit=5&sort=createdAt:desc'),
      ]);

      if (fleetRes.ok) {
        const fleetJson = await fleetRes.json();
        setFleetData(fleetJson.data ?? fleetJson);
      }

      if (alertsRes.ok) {
        const alertsJson = await alertsRes.json();
        const alertsList = alertsJson.data ?? alertsJson;
        setAlerts(Array.isArray(alertsList) ? alertsList.slice(0, 5) : []);
      }

      setError(null);
    } catch {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Auto-scroll ticker
  useEffect(() => {
    const ticker = tickerRef.current;
    if (!ticker || alerts.length === 0) return;

    let scrollPos = 0;
    const scrollInterval = setInterval(() => {
      scrollPos += 1;
      if (scrollPos >= ticker.scrollWidth - ticker.clientWidth) {
        scrollPos = 0;
      }
      ticker.scrollLeft = scrollPos;
    }, 30);

    return () => clearInterval(scrollInterval);
  }, [alerts]);

  const handleBusSelect = (busId: string) => {
    setSelectedBusId(busId);
  };

  const selectedJourney =
    selectedBusId && fleetData?.journeys ? fleetData.journeys[selectedBusId] : null;

  const severityColor: Record<string, string> = {
    LOW: 'text-sky-600',
    MEDIUM: 'text-amber-600',
    HIGH: 'text-orange-600',
    CRITICAL: 'text-[#E24B4A]',
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error && !fleetData) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-12 w-12 text-[#E24B4A]" />
        <p className="text-lg font-medium text-gray-700">{error}</p>
        <Button onClick={fetchData}>Retry</Button>
      </div>
    );
  }

  const stats = fleetData?.stats;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1A1A1A]">Fleet Overview</h1>
        <p className="mt-1 text-sm text-gray-500">
          Real-time monitoring of all active buses across Zambia
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          icon={<Bus className="h-5 w-5" />}
          title="Active Buses"
          value={stats?.activeBuses ?? 0}
          change={stats?.activeBusesChange}
        />
        <StatsCard
          icon={<Users className="h-5 w-5" />}
          title="Total Passengers Today"
          value={(stats?.totalPassengersToday ?? 0).toLocaleString()}
          change={stats?.passengersChange}
        />
        <StatsCard
          icon={<AlertTriangle className="h-5 w-5" />}
          title="Alerts Today"
          value={stats?.alertsToday ?? 0}
          change={stats?.alertsChange}
        />
        <StatsCard
          icon={<ShieldCheck className="h-5 w-5" />}
          title="Avg Compliance Score"
          value={`${stats?.avgComplianceScore ?? 0}%`}
          change={stats?.complianceChange}
        />
      </div>

      {/* Map + Side panel */}
      <div className="flex gap-6">
        {/* Fleet map */}
        <div className="flex-1">
          <LiveFleetMap
            positions={fleetData?.buses ?? []}
            onBusSelect={handleBusSelect}
            className="h-[600px] w-full rounded-xl overflow-hidden border border-gray-200"
          />
        </div>

        {/* Side panel: selected bus details */}
        {selectedBusId && (
          <Card className="w-80 flex-shrink-0 self-start">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Bus Details</CardTitle>
                <button
                  onClick={() => setSelectedBusId(null)}
                  className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {selectedJourney ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0F6E56]/10">
                      <Bus className="h-5 w-5 text-[#0F6E56]" />
                    </div>
                    <div>
                      <p className="font-semibold text-[#1A1A1A]">
                        {selectedJourney.registrationPlate}
                      </p>
                      <p className="text-sm text-gray-500">{selectedJourney.operatorName}</p>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-lg bg-gray-50 p-3">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">{selectedJourney.route}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Gauge className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">{selectedJourney.speed} km/h</span>
                      {selectedJourney.speed > 100 && <Badge variant="danger">Over Speed</Badge>}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">{selectedJourney.driverName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">ETA: {selectedJourney.eta}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">
                        {selectedJourney.passengers}/{selectedJourney.capacity} passengers
                      </span>
                    </div>
                  </div>

                  <Badge
                    variant={
                      selectedJourney.status === 'IN_TRANSIT'
                        ? 'success'
                        : selectedJourney.status === 'DELAYED'
                          ? 'warning'
                          : 'default'
                    }
                  >
                    {selectedJourney.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-gray-400">
                  No journey data available for this bus
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent alerts ticker */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Recent Alerts</CardTitle>
            <a
              href="/rtsa/alerts"
              className="flex items-center gap-1 text-sm font-medium text-[#0F6E56] hover:underline"
            >
              View All <ChevronRight className="h-4 w-4" />
            </a>
          </div>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="py-2 text-sm text-gray-400">No recent alerts</p>
          ) : (
            <div ref={tickerRef} className="flex gap-4 overflow-hidden">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex flex-shrink-0 items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-2"
                >
                  <AlertTriangle
                    className={`h-4 w-4 ${severityColor[alert.severity] ?? 'text-gray-400'}`}
                  />
                  <div className="whitespace-nowrap">
                    <span className="text-sm font-medium text-[#1A1A1A]">{alert.title}</span>
                    <span className="mx-2 text-gray-300">|</span>
                    <span className="text-xs text-gray-500">{alert.operatorName}</span>
                    <span className="mx-2 text-gray-300">|</span>
                    <span className="text-xs text-gray-400">
                      {formatRelativeTime(alert.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
