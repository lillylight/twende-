'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { useAuthStore } from '@/store/auth.store';
import { useToast } from '@/hooks/use-toast';
import {
  Star,
  Bus,
  Clock,
  MapPin,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  Play,
  History,
  UserCircle,
  Users,
  Zap,
  ChevronRight,
} from 'lucide-react';
import type { Journey, SafetyAlert, JourneyStatus } from '@/types';

// ─── Types ──────────────────────────────────────────────────────────────────

interface DriverStats {
  totalTrips: number;
  averageRating: number;
  complianceScore: number;
  activeAlerts: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-ZM', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function getStatusBadge(status: JourneyStatus) {
  const map: Record<
    string,
    { variant: 'success' | 'warning' | 'danger' | 'info' | 'default'; label: string }
  > = {
    SCHEDULED: { variant: 'info', label: 'Scheduled' },
    BOARDING: { variant: 'warning', label: 'Boarding' },
    IN_TRANSIT: { variant: 'success', label: 'In Transit' },
    DELAYED: { variant: 'danger', label: 'Delayed' },
    ARRIVED: { variant: 'success', label: 'Arrived' },
    COMPLETED: { variant: 'default', label: 'Completed' },
    CANCELLED: { variant: 'danger', label: 'Cancelled' },
  };
  const entry = map[status] ?? { variant: 'default' as const, label: status };
  return <Badge variant={entry.variant}>{entry.label}</Badge>;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= Math.round(rating)
              ? 'fill-[#EF9F27] text-[#EF9F27]'
              : 'fill-gray-200 text-gray-200'
          }`}
        />
      ))}
      <span className="ml-1.5 text-sm font-medium text-gray-700">{rating.toFixed(1)}</span>
    </div>
  );
}

function getAlertIcon(type: string) {
  switch (type) {
    case 'SPEED_VIOLATION':
      return <Zap className="h-4 w-4 text-[#E24B4A]" />;
    case 'HARSH_BRAKING':
      return <AlertTriangle className="h-4 w-4 text-[#EF9F27]" />;
    case 'ROUTE_DEVIATION':
      return <MapPin className="h-4 w-4 text-[#EF9F27]" />;
    case 'FATIGUE_WARNING':
      return <Clock className="h-4 w-4 text-[#E24B4A]" />;
    default:
      return <AlertTriangle className="h-4 w-4 text-gray-500" />;
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function DriverDashboardPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const { addToast } = useToast();

  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [alerts, setAlerts] = useState<SafetyAlert[]>([]);
  const [stats, setStats] = useState<DriverStats>({
    totalTrips: 0,
    averageRating: 0,
    complianceScore: 0,
    activeAlerts: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    if (!user || !accessToken) return;

    setIsLoading(true);
    setError(null);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    };

    try {
      const today = new Date().toISOString().split('T')[0];

      const [journeysRes, alertsRes, statsRes] = await Promise.allSettled([
        fetch(`/api/journeys?driverId=${user.id}&date=${today}`, { headers }),
        fetch(`/api/rtsa/alerts?driverId=${user.id}&limit=5`, { headers }),
        fetch(`/api/drivers/${user.id}/rating`, { headers }),
      ]);

      // Parse journeys
      if (journeysRes.status === 'fulfilled' && journeysRes.value.ok) {
        const data = await journeysRes.value.json();
        setJourneys(data.data ?? data.journeys ?? []);
      }

      // Parse alerts
      if (alertsRes.status === 'fulfilled' && alertsRes.value.ok) {
        const data = await alertsRes.value.json();
        setAlerts(data.data ?? data.alerts ?? []);
      }

      // Parse stats
      if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
        const data = await statsRes.value.json();
        const driverData = data.data ?? data;
        setStats({
          totalTrips: driverData.totalTrips ?? 0,
          averageRating: driverData.averageRating ?? 0,
          complianceScore: driverData.complianceScore ?? 100,
          activeAlerts: driverData.activeAlerts ?? 0,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load dashboard data';
      setError(message);
      addToast('error', message);
    } finally {
      setIsLoading(false);
    }
  }, [user, accessToken, addToast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">
            Welcome back, {user?.firstName ?? 'Driver'}
          </h1>
          <div className="mt-1 flex items-center gap-3">
            <StarRating rating={stats.averageRating} />
            <span className="text-sm text-gray-500">{stats.totalTrips} total trips</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              const scheduled = journeys.find(
                (j) => j.status === 'SCHEDULED' || j.status === 'BOARDING'
              );
              if (scheduled) {
                router.push(`/driver/journey/${scheduled.id}`);
              } else {
                addToast('info', 'No scheduled journeys to start right now.');
              }
            }}
          >
            <Play className="h-4 w-4" />
            Start Journey
          </Button>
          <Button variant="secondary" size="sm" onClick={() => router.push('/driver/history')}>
            <History className="h-4 w-4" />
            View History
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[#E24B4A]" />
            <p className="text-sm text-[#E24B4A]">{error}</p>
            <button
              onClick={fetchDashboardData}
              className="ml-auto text-sm font-medium text-[#E24B4A] underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0F6E56]/10">
              <Bus className="h-5 w-5 text-[#0F6E56]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1A1A1A]">{stats.totalTrips}</p>
              <p className="text-xs text-gray-500">Total Trips</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EF9F27]/10">
              <Star className="h-5 w-5 text-[#EF9F27]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1A1A1A]">{stats.averageRating.toFixed(1)}</p>
              <p className="text-xs text-gray-500">Avg Rating</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1A1A1A]">{stats.complianceScore}%</p>
              <p className="text-xs text-gray-500">Compliance</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${stats.activeAlerts > 0 ? 'bg-red-50' : 'bg-gray-100'}`}
            >
              <AlertTriangle
                className={`h-5 w-5 ${stats.activeAlerts > 0 ? 'text-[#E24B4A]' : 'text-gray-400'}`}
              />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1A1A1A]">{stats.activeAlerts}</p>
              <p className="text-xs text-gray-500">Active Alerts</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Schedule + Recent Alerts */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Today's Schedule */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Today&apos;s Schedule</CardTitle>
                <Badge variant="info">{journeys.length} journeys</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {journeys.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Bus className="mb-3 h-12 w-12 text-gray-300" />
                  <p className="text-sm font-medium text-gray-500">
                    No journeys scheduled for today
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    Check back later for new assignments.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {journeys.map((journey) => (
                    <div
                      key={journey.id}
                      className="group flex items-center gap-4 rounded-lg border border-gray-100 p-4 transition-colors hover:border-[#0F6E56]/20 hover:bg-[#0F6E56]/[0.02]"
                    >
                      {/* Time */}
                      <div className="hidden shrink-0 text-center sm:block">
                        <p className="text-lg font-bold text-[#0F6E56]">
                          {formatTime(journey.scheduledDeparture as unknown as string)}
                        </p>
                        <p className="text-xs text-gray-400">departure</p>
                      </div>

                      {/* Route Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-sm font-semibold text-[#1A1A1A]">
                          <span className="truncate">{journey.route?.origin ?? 'Origin'}</span>
                          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                          <span className="truncate">
                            {journey.route?.destination ?? 'Destination'}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1 sm:hidden">
                            <Clock className="h-3 w-3" />
                            {formatTime(journey.scheduledDeparture as unknown as string)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Bus className="h-3 w-3" />
                            {journey.vehicle?.registrationPlate ?? 'TBD'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {journey.currentPassengerCount}/{journey.maxCapacity} seats
                          </span>
                        </div>
                      </div>

                      {/* Status + Action */}
                      <div className="flex shrink-0 items-center gap-3">
                        {getStatusBadge(journey.status)}
                        {(journey.status === 'SCHEDULED' || journey.status === 'BOARDING') && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => router.push(`/driver/journey/${journey.id}`)}
                          >
                            <Play className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Start</span>
                          </Button>
                        )}
                        {journey.status === 'IN_TRANSIT' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => router.push(`/driver/journey/${journey.id}`)}
                          >
                            View
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Alerts + Quick Actions */}
        <div className="space-y-6">
          {/* Recent Alerts */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="flex flex-col items-center py-6 text-center">
                  <ShieldCheck className="mb-2 h-8 w-8 text-emerald-400" />
                  <p className="text-sm text-gray-500">No recent alerts</p>
                  <p className="text-xs text-gray-400">Keep up the safe driving!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-start gap-3 rounded-lg border border-gray-100 p-3"
                    >
                      <div className="mt-0.5">{getAlertIcon(alert.type)}</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[#1A1A1A]">{alert.title}</p>
                        <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">
                          {alert.description}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          {new Date(alert.createdAt).toLocaleString('en-ZM', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <Badge
                        variant={
                          alert.severity === 'CRITICAL' || alert.severity === 'HIGH'
                            ? 'danger'
                            : alert.severity === 'MEDIUM'
                              ? 'warning'
                              : 'default'
                        }
                      >
                        {alert.severity}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <button
                onClick={() => {
                  const scheduled = journeys.find(
                    (j) => j.status === 'SCHEDULED' || j.status === 'BOARDING'
                  );
                  if (scheduled) {
                    router.push(`/driver/journey/${scheduled.id}`);
                  } else {
                    addToast('info', 'No scheduled journeys available.');
                  }
                }}
                className="flex w-full items-center gap-3 rounded-lg border border-gray-100 px-4 py-3 text-left transition-colors hover:border-[#0F6E56]/20 hover:bg-[#0F6E56]/[0.02]"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0F6E56]/10">
                  <Play className="h-4 w-4 text-[#0F6E56]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1A1A1A]">Start Journey</p>
                  <p className="text-xs text-gray-500">Begin your next scheduled trip</p>
                </div>
                <ChevronRight className="ml-auto h-4 w-4 text-gray-400" />
              </button>

              <button
                onClick={() => router.push('/driver/history')}
                className="flex w-full items-center gap-3 rounded-lg border border-gray-100 px-4 py-3 text-left transition-colors hover:border-[#0F6E56]/20 hover:bg-[#0F6E56]/[0.02]"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EF9F27]/10">
                  <History className="h-4 w-4 text-[#EF9F27]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1A1A1A]">View History</p>
                  <p className="text-xs text-gray-500">See past journeys and ratings</p>
                </div>
                <ChevronRight className="ml-auto h-4 w-4 text-gray-400" />
              </button>

              <button
                onClick={() => router.push('/profile')}
                className="flex w-full items-center gap-3 rounded-lg border border-gray-100 px-4 py-3 text-left transition-colors hover:border-[#0F6E56]/20 hover:bg-[#0F6E56]/[0.02]"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
                  <UserCircle className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1A1A1A]">Update Profile</p>
                  <p className="text-xs text-gray-500">Manage your driver details</p>
                </div>
                <ChevronRight className="ml-auto h-4 w-4 text-gray-400" />
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
