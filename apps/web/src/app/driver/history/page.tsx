'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useAuthStore } from '@/store/auth.store';
import { useToast } from '@/hooks/use-toast';
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Star,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Zap,
  Route,
  TrendingUp,
  Bus,
  Filter,
} from 'lucide-react';
import type { Journey, SafetyAlert } from '@/types';

// ─── Types ──────────────────────────────────────────────────────────────────

interface JourneyHistoryItem {
  journey: Journey;
  rating: number | null;
  duration: string;
  distance: number;
  alerts: SafetyAlert[];
}

interface HistoryStats {
  totalJourneysThisMonth: number;
  averageRating: number;
  totalPassengers: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-ZM', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-ZM', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function computeDuration(departure: string, arrival: string): string {
  const start = new Date(departure).getTime();
  const end = new Date(arrival).getTime();
  const diff = end - start;
  if (diff <= 0) return 'N/A';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-3.5 w-3.5 ${
            star <= Math.round(rating)
              ? 'fill-[#EF9F27] text-[#EF9F27]'
              : 'fill-gray-200 text-gray-200'
          }`}
        />
      ))}
      <span className="ml-1 text-xs font-medium text-gray-600">{rating.toFixed(1)}</span>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function DriverHistoryPage() {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const { addToast } = useToast();

  const [historyItems, setHistoryItems] = useState<JourneyHistoryItem[]>([]);
  const [stats, setStats] = useState<HistoryStats>({
    totalJourneysThisMonth: 0,
    averageRating: 0,
    totalPassengers: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isFiltering, setIsFiltering] = useState(false);

  // Expanded rows
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };

  const fetchHistory = useCallback(
    async (fromDate?: string, toDate?: string) => {
      if (!user || !accessToken) return;

      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          driverId: user.id,
          status: 'COMPLETED',
          sort: 'date_desc',
        });

        if (fromDate) params.set('dateFrom', fromDate);
        if (toDate) params.set('dateTo', toDate);

        const res = await fetch(`/api/journeys?${params.toString()}`, { headers });

        if (!res.ok) throw new Error('Failed to load journey history');

        const data = await res.json();
        const journeys: Journey[] = data.data ?? data.journeys ?? [];

        // Transform journeys into history items
        const items: JourneyHistoryItem[] = journeys.map((journey) => {
          const departure = (journey.actualDeparture ??
            journey.scheduledDeparture) as unknown as string;
          const arrival = (journey.actualArrival ?? journey.scheduledArrival) as unknown as string;

          return {
            journey,
            rating: journey.driver?.averageRating ?? null,
            duration: computeDuration(departure, arrival),
            distance: journey.route?.distanceKm ?? 0,
            alerts: journey.alerts ?? [],
          };
        });

        setHistoryItems(items);

        // Calculate stats for current month
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisMonthItems = items.filter(
          (item) => new Date(item.journey.scheduledDeparture as unknown as string) >= monthStart
        );

        const ratingsWithValues = items.filter((item) => item.rating !== null && item.rating > 0);
        const avgRating =
          ratingsWithValues.length > 0
            ? ratingsWithValues.reduce((acc, item) => acc + (item.rating ?? 0), 0) /
              ratingsWithValues.length
            : 0;

        const totalPassengers = items.reduce(
          (acc, item) => acc + (item.journey.currentPassengerCount ?? 0),
          0
        );

        setStats({
          totalJourneysThisMonth: thisMonthItems.length,
          averageRating: avgRating,
          totalPassengers,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load history';
        setError(message);
        addToast('error', message);
      } finally {
        setIsLoading(false);
        setIsFiltering(false);
      }
    },
    [user, accessToken, addToast]
  );

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleApplyFilter = () => {
    setIsFiltering(true);
    fetchHistory(dateFrom || undefined, dateTo || undefined);
  };

  const handleClearFilter = () => {
    setDateFrom('');
    setDateTo('');
    setIsFiltering(true);
    fetchHistory();
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  // ─── Loading ──────────────────────────────────────────────────────────

  if (isLoading && historyItems.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-gray-500">Loading journey history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1A1A1A]">Journey History</h1>
        <p className="mt-1 text-sm text-gray-500">
          View your past journeys, ratings, and performance metrics.
        </p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0F6E56]/10">
              <Bus className="h-5 w-5 text-[#0F6E56]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1A1A1A]">{stats.totalJourneysThisMonth}</p>
              <p className="text-xs text-gray-500">Journeys This Month</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EF9F27]/10">
              <Star className="h-5 w-5 text-[#EF9F27]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1A1A1A]">
                {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '--'}
              </p>
              <p className="text-xs text-gray-500">Average Rating</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <Users className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1A1A1A]">{stats.totalPassengers}</p>
              <p className="text-xs text-gray-500">Total Passengers</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Date Filter */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filter by date:</span>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <Input
                type="date"
                label="From"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-40"
              />
              <Input
                type="date"
                label="To"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-40"
              />
              <Button variant="primary" size="sm" onClick={handleApplyFilter} loading={isFiltering}>
                Apply
              </Button>
              {(dateFrom || dateTo) && (
                <Button variant="ghost" size="sm" onClick={handleClearFilter}>
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Banner */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[#E24B4A]" />
            <p className="text-sm text-[#E24B4A]">{error}</p>
            <button
              onClick={() => fetchHistory(dateFrom || undefined, dateTo || undefined)}
              className="ml-auto text-sm font-medium text-[#E24B4A] underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Journey List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Past Journeys</CardTitle>
            <Badge variant="default">{historyItems.length} journeys</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {historyItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Route className="mb-3 h-12 w-12 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">No journeys found</p>
              <p className="mt-1 text-xs text-gray-400">
                {dateFrom || dateTo
                  ? 'Try adjusting your date filter.'
                  : 'Completed journeys will appear here.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {historyItems.map((item) => {
                const { journey } = item;
                const isExpanded = expandedId === journey.id;
                const departureStr = (journey.actualDeparture ??
                  journey.scheduledDeparture) as unknown as string;

                return (
                  <div
                    key={journey.id}
                    className="rounded-lg border border-gray-100 transition-colors hover:border-gray-200"
                  >
                    {/* Main Row */}
                    <button
                      onClick={() => toggleExpand(journey.id)}
                      className="flex w-full items-center gap-4 p-4 text-left"
                    >
                      {/* Date */}
                      <div className="hidden shrink-0 text-center sm:block sm:w-20">
                        <p className="text-sm font-bold text-[#0F6E56]">
                          {new Date(departureStr).toLocaleDateString('en-ZM', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </p>
                        <p className="text-xs text-gray-400">{formatTime(departureStr)}</p>
                      </div>

                      {/* Route */}
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
                            <Calendar className="h-3 w-3" />
                            {formatDate(departureStr)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {journey.currentPassengerCount} passengers
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {item.duration}
                          </span>
                          {item.distance > 0 && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {item.distance} km
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Rating */}
                      <div className="hidden shrink-0 sm:block">
                        {item.rating !== null && item.rating > 0 ? (
                          <StarDisplay rating={item.rating} />
                        ) : (
                          <span className="text-xs text-gray-400">No rating</span>
                        )}
                      </div>

                      {/* Expand icon */}
                      <div className="shrink-0">
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </button>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-4">
                        <div className="grid gap-4 sm:grid-cols-3">
                          {/* Journey Details */}
                          <div>
                            <p className="mb-2 text-xs font-medium uppercase text-gray-500">
                              Journey Details
                            </p>
                            <div className="space-y-1.5 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-500">Vehicle</span>
                                <span className="font-medium text-[#1A1A1A]">
                                  {journey.vehicle?.registrationPlate ?? 'N/A'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Departure</span>
                                <span className="font-medium text-[#1A1A1A]">
                                  {formatTime(departureStr)}
                                </span>
                              </div>
                              {journey.actualArrival && (
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Arrival</span>
                                  <span className="font-medium text-[#1A1A1A]">
                                    {formatTime(journey.actualArrival as unknown as string)}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between">
                                <span className="text-gray-500">Duration</span>
                                <span className="font-medium text-[#1A1A1A]">{item.duration}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Distance</span>
                                <span className="font-medium text-[#1A1A1A]">
                                  {item.distance} km
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* GPS Log Summary */}
                          <div>
                            <p className="mb-2 text-xs font-medium uppercase text-gray-500">
                              GPS Log Summary
                            </p>
                            <div className="space-y-1.5 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-500">Data Points</span>
                                <span className="font-medium text-[#1A1A1A]">
                                  {journey.gpsLogs?.length ?? 0}
                                </span>
                              </div>
                              {journey.gpsLogs && journey.gpsLogs.length > 0 && (
                                <>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Max Speed</span>
                                    <span className="font-medium text-[#1A1A1A]">
                                      {Math.round(
                                        Math.max(...journey.gpsLogs.map((log) => log.speed))
                                      )}{' '}
                                      km/h
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Avg Speed</span>
                                    <span className="font-medium text-[#1A1A1A]">
                                      {Math.round(
                                        journey.gpsLogs.reduce((a, l) => a + l.speed, 0) /
                                          journey.gpsLogs.length
                                      )}{' '}
                                      km/h
                                    </span>
                                  </div>
                                </>
                              )}
                              <div className="flex justify-between">
                                <span className="text-gray-500">Passengers</span>
                                <span className="font-medium text-[#1A1A1A]">
                                  {journey.currentPassengerCount} / {journey.maxCapacity}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Alerts & Rating */}
                          <div>
                            <p className="mb-2 text-xs font-medium uppercase text-gray-500">
                              Alerts & Rating
                            </p>

                            {/* Rating */}
                            <div className="mb-3">
                              {item.rating !== null && item.rating > 0 ? (
                                <div className="flex items-center gap-2">
                                  <StarDisplay rating={item.rating} />
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400">No passenger ratings</span>
                              )}
                            </div>

                            {/* Alerts */}
                            {item.alerts.length === 0 ? (
                              <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2">
                                <TrendingUp className="h-4 w-4 text-emerald-600" />
                                <span className="text-xs font-medium text-emerald-700">
                                  No alerts triggered
                                </span>
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                {item.alerts.slice(0, 5).map((alert) => (
                                  <div
                                    key={alert.id}
                                    className="flex items-center gap-2 rounded-md border border-gray-100 px-2 py-1.5"
                                  >
                                    {alert.type === 'SPEED_VIOLATION' ? (
                                      <Zap className="h-3.5 w-3.5 text-[#E24B4A]" />
                                    ) : (
                                      <AlertTriangle className="h-3.5 w-3.5 text-[#EF9F27]" />
                                    )}
                                    <span className="text-xs text-gray-700">{alert.title}</span>
                                    <Badge
                                      variant={
                                        alert.severity === 'CRITICAL' || alert.severity === 'HIGH'
                                          ? 'danger'
                                          : 'warning'
                                      }
                                      className="ml-auto"
                                    >
                                      {alert.severity}
                                    </Badge>
                                  </div>
                                ))}
                                {item.alerts.length > 5 && (
                                  <p className="text-xs text-gray-400">
                                    +{item.alerts.length - 5} more alerts
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
