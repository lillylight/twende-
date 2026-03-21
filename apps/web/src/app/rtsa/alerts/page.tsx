'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { StatsCard } from '@/components/stats-card';
import { AlertsFeed, AlertItem } from '@/components/alerts-feed';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertType, AlertSeverity } from '@/types';
import { formatRelativeTime } from '@/lib/utils';
import {
  AlertTriangle,
  AlertOctagon,
  Bell,
  CheckCircle2,
  Filter,
  Gauge,
  MapPinOff,
  ShieldAlert,
  Route,
  Calendar,
} from 'lucide-react';

interface AlertStats {
  total: number;
  critical: number;
  warnings: number;
  resolvedToday: number;
}

const alertTypeOptions = [
  { value: '', label: 'All Types' },
  { value: 'SPEED_VIOLATION', label: 'Speeding' },
  { value: 'ROUTE_DEVIATION', label: 'Route Deviation' },
  { value: 'GEOFENCE_BREACH', label: 'No Signal / Geofence' },
  { value: 'SOS', label: 'SOS' },
  { value: 'HARSH_BRAKING', label: 'Harsh Braking' },
  { value: 'FATIGUE_WARNING', label: 'Fatigue Warning' },
  { value: 'VEHICLE_BREAKDOWN', label: 'Vehicle Breakdown' },
  { value: 'ACCIDENT', label: 'Accident' },
];

const severityOptions = [
  { value: '', label: 'All Severities' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [stats, setStats] = useState<AlertStats>({
    total: 0,
    critical: 0,
    warnings: 0,
    resolvedToday: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [resolving, setResolving] = useState(false);

  const fetchAlerts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.set('type', typeFilter);
      if (severityFilter) params.set('severity', severityFilter);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const res = await fetch(`/api/rtsa/alerts?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch alerts');
      const json = await res.json();
      const alertsList: AlertItem[] = json.data ?? json;
      const list = Array.isArray(alertsList) ? alertsList : [];
      setAlerts(list);

      // Compute stats
      const critical = list.filter((a) => a.severity === AlertSeverity.CRITICAL).length;
      const warnings = list.filter(
        (a) => a.severity === AlertSeverity.MEDIUM || a.severity === AlertSeverity.HIGH
      ).length;
      const today = new Date().toDateString();
      const resolvedToday = list.filter(
        (a) => a.isAcknowledged && new Date(a.createdAt).toDateString() === today
      ).length;

      setStats({
        total: list.length,
        critical,
        warnings,
        resolvedToday,
      });
      setError(null);
    } catch {
      setError('Failed to load alerts');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, severityFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleResolve = async (alertId: string) => {
    const res = await fetch(`/api/rtsa/alerts`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertIds: [alertId], action: 'resolve' }),
    });
    if (!res.ok) throw new Error('Failed to resolve alert');
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(alertId);
      return next;
    });
  };

  const handleBatchResolve = async () => {
    if (selectedIds.size === 0) return;
    setResolving(true);
    try {
      const res = await fetch(`/api/rtsa/alerts`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertIds: Array.from(selectedIds),
          action: 'resolve',
        }),
      });
      if (!res.ok) throw new Error('Failed to resolve alerts');
      setAlerts((prev) => prev.filter((a) => !selectedIds.has(a.id)));
      setSelectedIds(new Set());
    } catch {
      // Error can be handled via toast
    } finally {
      setResolving(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === alerts.filter((a) => !a.isAcknowledged).length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(alerts.filter((a) => !a.isAcknowledged).map((a) => a.id)));
    }
  };

  const severityColor: Record<string, string> = {
    LOW: 'text-sky-600 bg-sky-50',
    MEDIUM: 'text-[#EF9F27] bg-amber-50',
    HIGH: 'text-orange-600 bg-orange-50',
    CRITICAL: 'text-[#E24B4A] bg-red-50',
  };

  const alertTypeIcon: Record<string, React.ReactNode> = {
    SPEED_VIOLATION: <Gauge className="h-5 w-5" />,
    ROUTE_DEVIATION: <Route className="h-5 w-5" />,
    GEOFENCE_BREACH: <MapPinOff className="h-5 w-5" />,
    SOS: <ShieldAlert className="h-5 w-5" />,
    HARSH_BRAKING: <AlertTriangle className="h-5 w-5" />,
    FATIGUE_WARNING: <AlertTriangle className="h-5 w-5" />,
    VEHICLE_BREAKDOWN: <AlertTriangle className="h-5 w-5" />,
    ACCIDENT: <AlertOctagon className="h-5 w-5" />,
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1A1A1A]">Safety Alerts</h1>
        <p className="mt-1 text-sm text-gray-500">
          Monitor and manage safety alerts across all operators
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard icon={<Bell className="h-5 w-5" />} title="Total Alerts" value={stats.total} />
        <StatsCard
          icon={<AlertOctagon className="h-5 w-5" />}
          title="Critical"
          value={stats.critical}
        />
        <StatsCard
          icon={<AlertTriangle className="h-5 w-5" />}
          title="Warnings"
          value={stats.warnings}
        />
        <StatsCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          title="Resolved Today"
          value={stats.resolvedToday}
        />
      </div>

      {/* Filter bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
              <Filter className="h-4 w-4" />
              Filters
            </div>
            <div className="w-48">
              <Select
                options={alertTypeOptions}
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                placeholder="Alert Type"
              />
            </div>
            <div className="w-40">
              <Select
                options={severityOptions}
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                placeholder="Severity"
              />
            </div>
            <div className="w-40">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                placeholder="From"
              />
            </div>
            <div className="w-40">
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                placeholder="To"
              />
            </div>
            {(typeFilter || severityFilter || dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTypeFilter('');
                  setSeverityFilter('');
                  setDateFrom('');
                  setDateTo('');
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Batch actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 rounded-lg border border-[#0F6E56]/20 bg-[#0F6E56]/5 px-4 py-3">
          <span className="text-sm font-medium text-[#0F6E56]">
            {selectedIds.size} alert{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          <Button variant="primary" size="sm" onClick={handleBatchResolve} loading={resolving}>
            <CheckCircle2 className="h-4 w-4" />
            Resolve Selected
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
            Clear Selection
          </Button>
        </div>
      )}

      {/* Alert list with checkboxes */}
      {error ? (
        <div className="flex flex-col items-center gap-4 py-12">
          <AlertTriangle className="h-12 w-12 text-[#E24B4A]" />
          <p className="text-gray-700">{error}</p>
          <Button onClick={fetchAlerts}>Retry</Button>
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-gray-400">
          <CheckCircle2 className="mb-2 h-10 w-10" />
          <p className="text-sm">No alerts matching your filters</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Select all */}
          <div className="flex items-center gap-2 px-1">
            <input
              type="checkbox"
              checked={
                selectedIds.size > 0 &&
                selectedIds.size === alerts.filter((a) => !a.isAcknowledged).length
              }
              onChange={toggleSelectAll}
              className="h-4 w-4 rounded border-gray-300 text-[#0F6E56] focus:ring-[#0F6E56]"
            />
            <span className="text-xs text-gray-500">Select all unresolved</span>
          </div>

          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300"
            >
              {/* Checkbox */}
              {!alert.isAcknowledged && (
                <input
                  type="checkbox"
                  checked={selectedIds.has(alert.id)}
                  onChange={() => toggleSelect(alert.id)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-[#0F6E56] focus:ring-[#0F6E56]"
                />
              )}

              {/* Icon */}
              <div
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${
                  severityColor[alert.severity] ?? 'text-gray-400 bg-gray-50'
                }`}
              >
                {alertTypeIcon[alert.type] ?? <AlertTriangle className="h-5 w-5" />}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-[#1A1A1A]">{alert.title}</span>
                  <Badge
                    variant={
                      alert.severity === 'CRITICAL' || alert.severity === 'HIGH'
                        ? 'danger'
                        : alert.severity === 'MEDIUM'
                          ? 'warning'
                          : 'info'
                    }
                  >
                    {alert.severity}
                  </Badge>
                  {alert.isAcknowledged && <Badge variant="success">Resolved</Badge>}
                </div>
                <p className="mb-1 text-sm text-gray-600">{alert.description}</p>
                <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                  <span>{alert.operatorName}</span>
                  <span>{alert.registrationPlate}</span>
                  {alert.location && <span>{alert.location}</span>}
                  {alert.speedAtAlert !== null && (
                    <span>
                      {alert.speedAtAlert} km/h
                      {alert.speedLimit !== null && ` / ${alert.speedLimit} limit`}
                    </span>
                  )}
                  <span>{formatRelativeTime(alert.createdAt)}</span>
                </div>
              </div>

              {/* Resolve button */}
              {!alert.isAcknowledged && (
                <Button variant="secondary" size="sm" onClick={() => handleResolve(alert.id)}>
                  Resolve
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
