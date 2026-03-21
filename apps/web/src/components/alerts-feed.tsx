'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils';
import { AlertType, AlertSeverity } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import {
  Gauge,
  AlertTriangle,
  MapPinOff,
  Route,
  Timer,
  Wrench,
  Car,
  ShieldAlert,
  CalendarClock,
  FileWarning,
  CheckCircle2,
} from 'lucide-react';

export interface AlertItem {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  operatorName: string;
  registrationPlate: string;
  location: string | null;
  speedAtAlert: number | null;
  speedLimit: number | null;
  isAcknowledged: boolean;
  createdAt: string;
}

export interface AlertsFeedProps {
  initialAlerts?: AlertItem[];
  fetchUrl?: string;
  onResolve?: (alertId: string) => Promise<void>;
  className?: string;
}

const alertTypeIcons: Record<AlertType, React.ReactNode> = {
  [AlertType.SPEED_VIOLATION]: <Gauge className="h-5 w-5" />,
  [AlertType.HARSH_BRAKING]: <AlertTriangle className="h-5 w-5" />,
  [AlertType.GEOFENCE_BREACH]: <MapPinOff className="h-5 w-5" />,
  [AlertType.ROUTE_DEVIATION]: <Route className="h-5 w-5" />,
  [AlertType.FATIGUE_WARNING]: <Timer className="h-5 w-5" />,
  [AlertType.VEHICLE_BREAKDOWN]: <Wrench className="h-5 w-5" />,
  [AlertType.ACCIDENT]: <Car className="h-5 w-5" />,
  [AlertType.SOS]: <ShieldAlert className="h-5 w-5" />,
  [AlertType.MAINTENANCE_DUE]: <Wrench className="h-5 w-5" />,
  [AlertType.LICENSE_EXPIRY]: <CalendarClock className="h-5 w-5" />,
  [AlertType.INSURANCE_EXPIRY]: <FileWarning className="h-5 w-5" />,
};

const severityColors: Record<AlertSeverity, string> = {
  [AlertSeverity.LOW]: 'text-sky-500 bg-sky-50',
  [AlertSeverity.MEDIUM]: 'text-[#EF9F27] bg-amber-50',
  [AlertSeverity.HIGH]: 'text-orange-600 bg-orange-50',
  [AlertSeverity.CRITICAL]: 'text-[#E24B4A] bg-red-50',
};

const severityBadge: Record<AlertSeverity, 'info' | 'warning' | 'danger' | 'default'> = {
  [AlertSeverity.LOW]: 'info',
  [AlertSeverity.MEDIUM]: 'warning',
  [AlertSeverity.HIGH]: 'danger',
  [AlertSeverity.CRITICAL]: 'danger',
};

const typeOptions = [
  { value: '', label: 'All Types' },
  ...Object.values(AlertType).map((t) => ({
    value: t,
    label: t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
  })),
];

const severityOptions = [
  { value: '', label: 'All Severities' },
  ...Object.values(AlertSeverity).map((s) => ({
    value: s,
    label: s.charAt(0) + s.slice(1).toLowerCase(),
  })),
];

export function AlertsFeed({
  initialAlerts = [],
  fetchUrl = '/api/alerts',
  onResolve,
  className,
}: AlertsFeedProps) {
  const [alerts, setAlerts] = useState<AlertItem[]>(initialAlerts);
  const [loading, setLoading] = useState(!initialAlerts.length);
  const [typeFilter, setTypeFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.set('type', typeFilter);
      if (severityFilter) params.set('severity', severityFilter);

      const res = await fetch(`${fetchUrl}?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.data ?? data);
      }
    } catch {
      // Silently fail on auto-refresh
    } finally {
      setLoading(false);
    }
  }, [fetchUrl, typeFilter, severityFilter]);

  // Initial fetch and auto-refresh every 10s
  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const handleResolve = async (alertId: string) => {
    if (!onResolve) return;
    setResolvingId(alertId);
    try {
      await onResolve(alertId);
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch {
      // Error handling via toast in parent
    } finally {
      setResolvingId(null);
    }
  };

  const filtered = alerts.filter((a) => {
    if (typeFilter && a.type !== typeFilter) return false;
    if (severityFilter && a.severity !== severityFilter) return false;
    return true;
  });

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="w-48">
          <Select
            options={typeOptions}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            placeholder="Filter by type"
          />
        </div>
        <div className="w-48">
          <Select
            options={severityOptions}
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            placeholder="Filter by severity"
          />
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center py-12 text-gray-400">
          <CheckCircle2 className="mb-2 h-10 w-10" />
          <p className="text-sm">No active alerts</p>
        </div>
      )}

      {/* Alert list */}
      <div className="space-y-3">
        {filtered.map((alert) => (
          <div
            key={alert.id}
            className="flex items-start gap-4 rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300"
          >
            {/* Icon */}
            <div
              className={cn(
                'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg',
                severityColors[alert.severity]
              )}
            >
              {alertTypeIcons[alert.type]}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="font-semibold text-[#1A1A1A]">{alert.title}</span>
                <Badge variant={severityBadge[alert.severity]}>{alert.severity}</Badge>
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
            {!alert.isAcknowledged && onResolve && (
              <Button
                variant="secondary"
                size="sm"
                loading={resolvingId === alert.id}
                onClick={() => handleResolve(alert.id)}
              >
                Resolve
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
