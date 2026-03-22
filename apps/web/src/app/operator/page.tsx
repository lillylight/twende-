'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { StatsCard } from '@/components/stats-card';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';
import {
  DollarSign,
  CalendarCheck,
  Bus,
  ShieldCheck,
  AlertTriangle,
  Clock,
  BarChart3,
} from 'lucide-react';

interface DashboardData {
  revenue: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  stats: {
    totalBookings: number;
    activeJourneys: number;
    fleetSize: number;
    complianceScore: number;
  };
  upcomingJourneys: Array<{
    id: string;
    route: string;
    departureTime: string;
    driverName: string;
    vehicleReg: string;
    seatsBooked: number;
    totalSeats: number;
    status: string;
  }>;
  recentAlerts: Array<{
    id: string;
    alertType: string;
    severity: string;
    data: Record<string, unknown>;
    createdAt: string;
    resolved: boolean;
  }>;
}

export default function OperatorDashboard() {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    if (!user || !accessToken) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/operators/${user.id}/dashboard`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        throw new Error('Failed to load dashboard data');
      }

      const json = await res.json();
      setData(json.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [user, accessToken]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <p className="text-gray-600">{error ?? 'No data available'}</p>
        <button
          onClick={fetchDashboard}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Operator Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Overview of your operations and performance</p>
      </div>

      {/* Revenue Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-teal-50 p-4">
              <p className="text-sm text-teal-600 font-medium">Today</p>
              <p className="mt-1 text-2xl font-bold text-teal-800">
                {formatCurrency(data.revenue.today)}
              </p>
            </div>
            <div className="rounded-lg bg-teal-50 p-4">
              <p className="text-sm text-teal-600 font-medium">This Week</p>
              <p className="mt-1 text-2xl font-bold text-teal-800">
                {formatCurrency(data.revenue.thisWeek)}
              </p>
            </div>
            <div className="rounded-lg bg-teal-50 p-4">
              <p className="text-sm text-teal-600 font-medium">This Month</p>
              <p className="mt-1 text-2xl font-bold text-teal-800">
                {formatCurrency(data.revenue.thisMonth)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          icon={<CalendarCheck className="h-5 w-5" />}
          title="Total Bookings"
          value={data.stats.totalBookings}
        />
        <StatsCard
          icon={<Bus className="h-5 w-5" />}
          title="Active Journeys"
          value={data.stats.activeJourneys}
        />
        <StatsCard
          icon={<DollarSign className="h-5 w-5" />}
          title="Fleet Size"
          value={data.stats.fleetSize}
        />
        <StatsCard
          icon={<ShieldCheck className="h-5 w-5" />}
          title="Compliance Score"
          value={`${data.stats.complianceScore}/10`}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Upcoming Journeys */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Journeys</CardTitle>
          </CardHeader>
          <CardContent>
            {data.upcomingJourneys.length === 0 ? (
              <p className="text-center text-sm text-gray-500 py-8">No upcoming journeys</p>
            ) : (
              <div className="space-y-3">
                {data.upcomingJourneys.map((journey) => (
                  <div
                    key={journey.id}
                    className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 text-sm truncate">{journey.route}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(journey.departureTime).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {journey.driverName} &middot; {journey.vehicleReg}
                      </p>
                    </div>
                    <div className="ml-4 text-right">
                      <Badge variant={journey.status === 'BOARDING' ? 'warning' : 'info'}>
                        {journey.status}
                      </Badge>
                      <p className="mt-1 text-xs text-gray-500">
                        {journey.seatsBooked}/{journey.totalSeats} seats
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentAlerts.length === 0 ? (
              <p className="text-center text-sm text-gray-500 py-8">No recent alerts</p>
            ) : (
              <div className="space-y-3">
                {data.recentAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start justify-between rounded-lg border border-gray-100 p-3"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'mt-0.5 h-2 w-2 rounded-full flex-shrink-0',
                          alert.severity === 'CRITICAL' ? 'bg-red-500' : 'bg-amber-500'
                        )}
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {alert.alertType.replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatRelativeTime(alert.createdAt)}
                        </p>
                      </div>
                    </div>
                    <Badge variant={alert.resolved ? 'success' : 'danger'}>
                      {alert.resolved ? 'Resolved' : 'Active'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Occupancy Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Occupancy Rates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50">
            <div className="text-center">
              <BarChart3 className="mx-auto h-10 w-10 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">
                Occupancy chart - integrate with charting library
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
