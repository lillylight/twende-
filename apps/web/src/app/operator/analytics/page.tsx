'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { formatCurrency } from '@/lib/utils';
import { BarChart3, Download, TrendingUp, MapPin, Users } from 'lucide-react';

type Period = 'daily' | 'weekly' | 'monthly';

interface AnalyticsData {
  revenueTrend: Array<{
    period: string;
    revenue: number;
    bookings: number;
  }>;
  routePerformance: Array<{
    routeId: string;
    routeName: string;
    revenue: number;
    bookings: number;
    occupancyRate: number;
  }>;
  occupancyRates: Array<{
    routeName: string;
    rate: number;
  }>;
  topDrivers: Array<{
    driverName: string;
    trips: number;
    rating: number;
    revenue: number;
  }>;
  summary: {
    totalRevenue: number;
    totalBookings: number;
    averageOccupancy: number;
    topRoute: string;
  };
}

export default function OperatorAnalyticsPage() {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const [period, setPeriod] = useState<Period>('weekly');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    if (!user || !accessToken) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/operators/${user.id}/analytics?period=${period}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [user, accessToken, period]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleExportCSV = async () => {
    if (!user || !accessToken) return;
    setExporting(true);
    try {
      const res = await fetch(`/api/operators/${user.id}/analytics?period=${period}&format=csv`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-${period}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch {
      // silently fail
    } finally {
      setExporting(false);
    }
  };

  const periods: { key: Period; label: string }[] = [
    { key: 'daily', label: 'Daily' },
    { key: 'weekly', label: 'Weekly' },
    { key: 'monthly', label: 'Monthly' },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">
            Revenue trends, route profitability, and driver performance
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={exporting}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <Download className="h-4 w-4" />
          {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      {/* Period Selector */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
        {periods.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              period === p.key
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {!data ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center">
          <BarChart3 className="h-12 w-12 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">No analytics data available</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Revenue</p>
                    <p className="text-xl font-bold text-gray-900">
                      {formatCurrency(data.summary.totalRevenue)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Bookings</p>
                    <p className="text-xl font-bold text-gray-900">{data.summary.totalBookings}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Avg Occupancy</p>
                    <p className="text-xl font-bold text-gray-900">
                      {data.summary.averageOccupancy.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Top Route</p>
                    <p className="text-lg font-bold text-gray-900 truncate max-w-[150px]">
                      {data.summary.topRoute || 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend ({period})</CardTitle>
            </CardHeader>
            <CardContent>
              {data.revenueTrend.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500">No data for this period</p>
              ) : (
                <div className="space-y-2">
                  {data.revenueTrend.map((item, index) => {
                    const maxRevenue = Math.max(...data.revenueTrend.map((r) => r.revenue), 1);
                    const widthPercent = (item.revenue / maxRevenue) * 100;

                    return (
                      <div key={index} className="flex items-center gap-4">
                        <span className="w-24 flex-shrink-0 text-xs text-gray-500 text-right">
                          {item.period}
                        </span>
                        <div className="flex-1">
                          <div className="h-6 rounded-md bg-gray-100 overflow-hidden">
                            <div
                              className="h-full rounded-md bg-teal-500 transition-all duration-300"
                              style={{ width: `${widthPercent}%` }}
                            />
                          </div>
                        </div>
                        <span className="w-24 flex-shrink-0 text-xs font-medium text-gray-700">
                          {formatCurrency(item.revenue)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Route Profitability */}
            <Card>
              <CardHeader>
                <CardTitle>Route Profitability</CardTitle>
              </CardHeader>
              <CardContent>
                {data.routePerformance.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-500">No route data</p>
                ) : (
                  <div className="space-y-3">
                    {data.routePerformance.map((route) => (
                      <div
                        key={route.routeId}
                        className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">{route.routeName}</p>
                          <p className="text-xs text-gray-500">
                            {route.bookings} bookings &middot; {route.occupancyRate.toFixed(0)}%
                            occupancy
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-teal-700">
                          {formatCurrency(route.revenue)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Drivers */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Drivers</CardTitle>
              </CardHeader>
              <CardContent>
                {data.topDrivers.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-500">No driver data</p>
                ) : (
                  <div className="space-y-3">
                    {data.topDrivers.map((driver, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-50 text-sm font-bold text-teal-700">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{driver.driverName}</p>
                            <p className="text-xs text-gray-500">
                              {driver.trips} trips &middot; {driver.rating.toFixed(1)} rating
                            </p>
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-teal-700">
                          {formatCurrency(driver.revenue)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
