'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import {
  Calendar,
  MapPin,
  Download,
  ChevronLeft,
  ChevronRight,
  Bus,
  Clock,
  Wallet,
  TrendingUp,
  History,
  AlertCircle,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface JourneyHistoryItem {
  bookingId: string;
  reference: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  seatNumber: string | null;
  amount: number;
  passengerName: string;
  bookedAt: string;
  journey: {
    id: string;
    departureTime: string;
    arrivalTime: string | null;
    status: string;
    route: {
      origin: string;
      destination: string;
      distanceKm: number;
    };
    operator: string;
    vehicleRegistration: string;
  };
}

interface SpendingSummary {
  thisMonth: number;
  thisYear: number;
  allTime: number;
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-ZM', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateStr));
}

function formatTime(dateStr: string): string {
  return new Intl.DateTimeFormat('en-ZM', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(dateStr));
}

function getStatusBadge(status: string): {
  variant: 'success' | 'danger' | 'warning' | 'info' | 'default';
  label: string;
} {
  switch (status) {
    case 'COMPLETED':
      return { variant: 'success', label: 'Completed' };
    case 'CANCELLED':
      return { variant: 'danger', label: 'Cancelled' };
    case 'CONFIRMED':
      return { variant: 'info', label: 'Confirmed' };
    case 'CHECKED_IN':
      return { variant: 'info', label: 'Checked In' };
    case 'PENDING':
      return { variant: 'warning', label: 'Pending' };
    default:
      return { variant: 'default', label: status };
  }
}

function formatPaymentMethodShort(method: string): string {
  const map: Record<string, string> = {
    AIRTEL_MONEY: 'Airtel Money',
    MTN_MOMO: 'MTN MoMo',
    ZAMTEL_KWACHA: 'Zamtel',
    PAY_AT_TERMINAL: 'Terminal',
    VISA: 'Visa',
    MASTERCARD: 'Mastercard',
    CASH: 'Cash',
  };
  return map[method] ?? method;
}

// ─── Components ─────────────────────────────────────────────────────────────

function SpendingCard({
  title,
  amount,
  icon,
}: {
  title: string;
  amount: number;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0F6E56]/10 text-[#0F6E56]">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-lg font-semibold text-[#1A1A1A]">{formatCurrency(amount)}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function JourneyEntry({
  item,
  onDownloadReceipt,
  isDownloading,
}: {
  item: JourneyHistoryItem;
  onDownloadReceipt: (reference: string) => void;
  isDownloading: boolean;
}) {
  const statusBadge = getStatusBadge(item.status);
  const canDownloadReceipt =
    item.status === 'COMPLETED' || item.status === 'CONFIRMED' || item.status === 'CHECKED_IN';

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          {/* Left: Journey info */}
          <div className="min-w-0 flex-1 space-y-2">
            {/* Route */}
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#0F6E56]" aria-hidden="true" />
              <div>
                <p className="font-semibold text-[#1A1A1A]">
                  {item.journey.route.origin} <span className="text-gray-400 mx-1">&rarr;</span>{' '}
                  {item.journey.route.destination}
                </p>
                <p className="text-sm text-gray-500">{item.journey.operator}</p>
              </div>
            </div>

            {/* Date & time */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                {formatDate(item.journey.departureTime)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                {formatTime(item.journey.departureTime)}
              </span>
              <span className="flex items-center gap-1">
                <Bus className="h-3.5 w-3.5" aria-hidden="true" />
                {item.seatNumber ? `Seat ${item.seatNumber}` : 'Unassigned'}
              </span>
            </div>

            {/* Reference & vehicle */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
              <span>Ref: {item.reference}</span>
              <span>Vehicle: {item.journey.vehicleRegistration}</span>
              <span>{formatPaymentMethodShort(item.paymentMethod)}</span>
            </div>
          </div>

          {/* Right: Amount, status, actions */}
          <div className="flex flex-row items-center gap-3 sm:flex-col sm:items-end sm:gap-2">
            <p className="text-lg font-semibold text-[#1A1A1A]">{formatCurrency(item.amount)}</p>
            <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
            {canDownloadReceipt && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDownloadReceipt(item.reference)}
                loading={isDownloading}
                aria-label={`Download receipt for booking ${item.reference}`}
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Receipt</span>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function JourneyHistoryPage() {
  const accessToken = useAuthStore((s) => s.accessToken);

  // Data state
  const [journeys, setJourneys] = useState<JourneyHistoryItem[]>([]);
  const [spending, setSpending] = useState<SpendingSummary>({
    thisMonth: 0,
    thisYear: 0,
    allTime: 0,
  });
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingRef, setDownloadingRef] = useState<string | null>(null);

  // Filter state
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchHistory = useCallback(async () => {
    if (!accessToken) return;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '10');
      if (statusFilter) params.set('status', statusFilter);
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);

      const response = await fetch(`/api/journeys/history?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message ?? 'Failed to load journey history.');
      }

      setJourneys(result.data);
      setSpending(result.spending);
      setPagination(result.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, page, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, dateFrom, dateTo]);

  const handleDownloadReceipt = async (reference: string) => {
    if (!accessToken || downloadingRef) return;

    setDownloadingRef(reference);

    try {
      const response = await fetch(`/api/bookings/${reference}/receipt`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error?.message ?? 'Failed to download receipt.');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `twende-receipt-${reference}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Receipt download error:', err);
      alert(err instanceof Error ? err.message : 'Failed to download receipt.');
    } finally {
      setDownloadingRef(null);
    }
  };

  const handleClearFilters = () => {
    setStatusFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const hasActiveFilters = statusFilter || dateFrom || dateTo;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1A1A1A] flex items-center gap-2">
          <History className="h-6 w-6 text-[#0F6E56]" aria-hidden="true" />
          Journey History
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          View your past journeys, spending summary, and download receipts.
        </p>
      </div>

      {/* Spending Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SpendingCard
          title="This Month"
          amount={spending.thisMonth}
          icon={<Wallet className="h-5 w-5" />}
        />
        <SpendingCard
          title="This Year"
          amount={spending.thisYear}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <SpendingCard
          title="All Time"
          amount={spending.allTime}
          icon={<Bus className="h-5 w-5" />}
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Select
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: 'COMPLETED', label: 'Completed' },
                  { value: 'CANCELLED', label: 'Cancelled' },
                  { value: 'CONFIRMED', label: 'Confirmed' },
                  { value: 'CHECKED_IN', label: 'Checked In' },
                  { value: 'PENDING', label: 'Pending' },
                ]}
                placeholder="All statuses"
              />
            </div>
            <div className="flex-1">
              <Input
                label="From Date"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Input
                label="To Date"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16" role="status">
          <Spinner size="lg" />
          <span className="sr-only">Loading journey history...</span>
        </div>
      ) : error ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <AlertCircle className="h-10 w-10 text-[#E24B4A]" aria-hidden="true" />
            <p className="text-sm text-gray-600">{error}</p>
            <Button variant="secondary" size="sm" onClick={fetchHistory}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : journeys.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Bus className="h-12 w-12 text-gray-300" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-[#1A1A1A]">No journeys found</h2>
            <p className="max-w-sm text-sm text-gray-500">
              {hasActiveFilters
                ? 'No journeys match your current filters. Try adjusting or clearing the filters.'
                : "You haven't taken any journeys yet. Book your first trip to get started!"}
            </p>
            {hasActiveFilters && (
              <Button variant="secondary" size="sm" onClick={handleClearFilters}>
                Clear filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Journey list */}
          <div className="space-y-3" role="list" aria-label="Journey history">
            {journeys.map((item) => (
              <div key={item.bookingId} role="listitem">
                <JourneyEntry
                  item={item}
                  onDownloadReceipt={handleDownloadReceipt}
                  isDownloading={downloadingRef === item.reference}
                />
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 pt-4">
              <p className="text-sm text-gray-500">
                Showing {(pagination.page - 1) * pagination.pageSize + 1} -{' '}
                {Math.min(pagination.page * pagination.pageSize, pagination.totalItems)} of{' '}
                {pagination.totalItems} journeys
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={!pagination.hasPreviousPage}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm font-medium text-gray-700">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!pagination.hasNextPage}
                  aria-label="Next page"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
