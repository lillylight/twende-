'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { formatRelativeTime } from '@/lib/utils';
import {
  ArrowLeft,
  Building2,
  ShieldCheck,
  AlertTriangle,
  Phone,
  Mail,
  MapPin,
  Bus,
  Users,
  Star,
  Calendar,
  FileText,
  ShieldOff,
  Send,
  Download,
  Clock,
  Gauge,
} from 'lucide-react';

interface OperatorDetail {
  id: string;
  companyName: string;
  rtsaLicenseNumber: string;
  rtsaLicenseExpiry: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  city: string;
  province: string;
  isApproved: boolean;
  complianceScore: number;
  riskLevel: string;
  activeBuses: number;
  totalDrivers: number;
  totalTrips: number;
  recentJourneys: JourneyRow[];
  alerts: AlertRow[];
  sosEvents: SOSRow[];
  complianceBreakdown: ComplianceBreakdown;
  scoreTrend: MonthlyScore[];
  violations: ViolationSummary[];
  drivers: DriverRow[];
}

interface JourneyRow {
  id: string;
  route: string;
  date: string;
  vehicle: string;
  driver: string;
  status: string;
  passengers: number;
}

interface AlertRow {
  id: string;
  type: string;
  severity: string;
  date: string;
  journeyId: string;
  status: string;
  description: string;
}

interface SOSRow {
  id: string;
  date: string;
  location: string;
  status: string;
  description: string;
}

interface ComplianceBreakdown {
  speedCompliance: number;
  routeCompliance: number;
  vehicleMaintenance: number;
  driverFatigue: number;
  documentCompliance: number;
}

interface MonthlyScore {
  month: string;
  score: number;
}

interface ViolationSummary {
  type: string;
  count: number;
  lastOccurrence: string;
}

interface DriverRow {
  id: string;
  name: string;
  phone: string;
  rating: number;
  totalTrips: number;
  licenseExpiry: string;
}

type Tab = 'overview' | 'safety' | 'compliance' | 'drivers';

function getRiskBadge(level: string) {
  switch (level?.toUpperCase()) {
    case 'LOW':
      return <Badge variant="success">LOW</Badge>;
    case 'MEDIUM':
      return <Badge variant="warning">MEDIUM</Badge>;
    case 'HIGH':
      return <Badge variant="danger">HIGH</Badge>;
    default:
      return <Badge>{level}</Badge>;
  }
}

function getScoreColor(score: number) {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 50) return 'text-[#EF9F27]';
  return 'text-[#E24B4A]';
}

function getScoreBarColor(score: number) {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 50) return 'bg-[#EF9F27]';
  return 'bg-[#E24B4A]';
}

export default function OperatorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const operatorId = params.id as string;

  const [operator, setOperator] = useState<OperatorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [suspending, setSuspending] = useState(false);

  const fetchOperator = useCallback(async () => {
    try {
      const res = await fetch(`/api/rtsa/operators/${operatorId}/history`);
      if (!res.ok) throw new Error('Failed to fetch operator');
      const json = await res.json();
      setOperator(json.data ?? json);
      setError(null);
    } catch {
      setError('Failed to load operator details');
    } finally {
      setLoading(false);
    }
  }, [operatorId]);

  useEffect(() => {
    fetchOperator();
  }, [fetchOperator]);

  const handleSuspend = async () => {
    setSuspending(true);
    try {
      const res = await fetch(`/api/rtsa/operators/${operatorId}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to suspend operator');
      setSuspendModalOpen(false);
      fetchOperator();
    } catch {
      // Error handled silently; could add toast
    } finally {
      setSuspending(false);
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'safety', label: 'Safety' },
    { key: 'compliance', label: 'Compliance' },
    { key: 'drivers', label: 'Drivers' },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !operator) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-12 w-12 text-[#E24B4A]" />
        <p className="text-lg font-medium text-gray-700">{error ?? 'Operator not found'}</p>
        <Button onClick={() => router.push('/rtsa/operators')}>Back to Operators</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.push('/rtsa/operators')}
        className="flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-[#0F6E56]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Operators
      </button>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#0F6E56]/10">
            <Building2 className="h-7 w-7 text-[#0F6E56]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A1A]">{operator.companyName}</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              RTSA Licence: {operator.rtsaLicenseNumber}
            </p>
            <div className="mt-2 flex items-center gap-3">
              <span className={`text-3xl font-bold ${getScoreColor(operator.complianceScore)}`}>
                {operator.complianceScore}%
              </span>
              {getRiskBadge(operator.riskLevel)}
              <Badge variant={operator.isApproved ? 'success' : 'danger'}>
                {operator.isApproved ? 'Active' : 'Suspended'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            variant="danger"
            size="sm"
            onClick={() => setSuspendModalOpen(true)}
            disabled={!operator.isApproved}
          >
            <ShieldOff className="h-4 w-4" />
            Suspend Operator
          </Button>
          <Button variant="secondary" size="sm">
            <Send className="h-4 w-4" />
            Send Warning
          </Button>
          <Button variant="ghost" size="sm">
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-[#0F6E56] text-[#0F6E56]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && <OverviewTab operator={operator} />}
      {activeTab === 'safety' && (
        <SafetyTab alerts={operator.alerts} sosEvents={operator.sosEvents} />
      )}
      {activeTab === 'compliance' && (
        <ComplianceTab
          breakdown={operator.complianceBreakdown}
          trend={operator.scoreTrend}
          violations={operator.violations}
        />
      )}
      {activeTab === 'drivers' && <DriversTab drivers={operator.drivers} />}

      {/* Suspend confirmation modal */}
      <Modal
        open={suspendModalOpen}
        onClose={() => setSuspendModalOpen(false)}
        title="Suspend Operator"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <ShieldOff className="h-6 w-6 text-[#E24B4A]" />
            </div>
            <div>
              <p className="font-semibold text-[#1A1A1A]">Suspend {operator.companyName}?</p>
              <p className="text-sm text-gray-500">
                This will immediately suspend all operations for this operator.
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            All active journeys will be flagged, and the operator will be notified. This action can
            be reversed later.
          </p>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setSuspendModalOpen(false)}
              disabled={suspending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={handleSuspend}
              loading={suspending}
            >
              Confirm Suspension
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ─── Overview Tab ──────────────────────────────────────────────── */

function OverviewTab({ operator }: { operator: OperatorDetail }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Quick stats */}
      <div className="space-y-4 lg:col-span-2">
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Bus className="h-5 w-5 text-[#0F6E56]" />
              <div>
                <p className="text-xs text-gray-500">Active Buses</p>
                <p className="text-lg font-bold text-[#1A1A1A]">{operator.activeBuses}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Users className="h-5 w-5 text-[#0F6E56]" />
              <div>
                <p className="text-xs text-gray-500">Total Drivers</p>
                <p className="text-lg font-bold text-[#1A1A1A]">{operator.totalDrivers}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <FileText className="h-5 w-5 text-[#0F6E56]" />
              <div>
                <p className="text-xs text-gray-500">Total Trips</p>
                <p className="text-lg font-bold text-[#1A1A1A]">
                  {operator.totalTrips.toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent journeys */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Journeys</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Route</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Date</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Vehicle</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Driver</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Passengers</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(operator.recentJourneys ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-gray-400">
                        No recent journeys
                      </td>
                    </tr>
                  ) : (
                    operator.recentJourneys.map((j) => (
                      <tr key={j.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium text-[#1A1A1A]">{j.route}</td>
                        <td className="px-3 py-2 text-gray-500">
                          {new Date(j.date).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-gray-500">{j.vehicle}</td>
                        <td className="px-3 py-2 text-gray-600">{j.driver}</td>
                        <td className="px-3 py-2 text-gray-600">{j.passengers}</td>
                        <td className="px-3 py-2">
                          <Badge
                            variant={
                              j.status === 'COMPLETED'
                                ? 'success'
                                : j.status === 'IN_TRANSIT'
                                  ? 'info'
                                  : j.status === 'CANCELLED'
                                    ? 'danger'
                                    : 'default'
                            }
                          >
                            {j.status.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contact info */}
      <Card className="self-start">
        <CardHeader>
          <CardTitle className="text-base">Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">{operator.contactEmail}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">{operator.contactPhone}</span>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="mt-0.5 h-4 w-4 text-gray-400" />
            <span className="text-gray-600">
              {operator.address}, {operator.city}, {operator.province}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">
              Licence Expires: {new Date(operator.rtsaLicenseExpiry).toLocaleDateString()}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Safety Tab ────────────────────────────────────────────────── */

function SafetyTab({ alerts, sosEvents }: { alerts: AlertRow[]; sosEvents: SOSRow[] }) {
  return (
    <div className="space-y-6">
      {/* Alerts history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alerts History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Type</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Severity</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Description</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Date</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(alerts ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-gray-400">
                      No alerts recorded
                    </td>
                  </tr>
                ) : (
                  alerts.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-gray-400" />
                          <span className="font-medium text-[#1A1A1A]">
                            {a.type.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <Badge
                          variant={
                            a.severity === 'CRITICAL' || a.severity === 'HIGH'
                              ? 'danger'
                              : a.severity === 'MEDIUM'
                                ? 'warning'
                                : 'info'
                          }
                        >
                          {a.severity}
                        </Badge>
                      </td>
                      <td className="max-w-xs truncate px-3 py-2 text-gray-600">{a.description}</td>
                      <td className="px-3 py-2 text-gray-500">{formatRelativeTime(a.date)}</td>
                      <td className="px-3 py-2">
                        <Badge variant={a.status === 'RESOLVED' ? 'success' : 'warning'}>
                          {a.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* SOS Events */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">SOS Events</CardTitle>
        </CardHeader>
        <CardContent>
          {(sosEvents ?? []).length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">No SOS events recorded</p>
          ) : (
            <div className="space-y-3">
              {sosEvents.map((sos) => (
                <div
                  key={sos.id}
                  className="flex items-start gap-3 rounded-lg border border-red-100 bg-red-50/50 p-3"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
                    <AlertTriangle className="h-4 w-4 text-[#E24B4A]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-[#1A1A1A]">
                        {sos.description ?? 'Emergency SOS triggered'}
                      </p>
                      <Badge variant={sos.status === 'RESOLVED' ? 'success' : 'danger'}>
                        {sos.status}
                      </Badge>
                    </div>
                    <div className="mt-1 flex gap-3 text-xs text-gray-500">
                      <span>{sos.location}</span>
                      <span>{formatRelativeTime(sos.date)}</span>
                    </div>
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

/* ─── Compliance Tab ────────────────────────────────────────────── */

function ComplianceTab({
  breakdown,
  trend,
  violations,
}: {
  breakdown: ComplianceBreakdown;
  trend: MonthlyScore[];
  violations: ViolationSummary[];
}) {
  const breakdownItems = breakdown
    ? [
        { label: 'Speed Compliance', score: breakdown.speedCompliance },
        { label: 'Route Compliance', score: breakdown.routeCompliance },
        { label: 'Vehicle Maintenance', score: breakdown.vehicleMaintenance },
        { label: 'Driver Fatigue', score: breakdown.driverFatigue },
        { label: 'Document Compliance', score: breakdown.documentCompliance },
      ]
    : [];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Score breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compliance Score Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {breakdownItems.map((item) => (
            <div key={item.label}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-gray-600">{item.label}</span>
                <span className={`font-semibold ${getScoreColor(item.score)}`}>{item.score}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className={`h-full rounded-full transition-all ${getScoreBarColor(item.score)}`}
                  style={{ width: `${item.score}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Score trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly Score Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {(trend ?? []).length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">No trend data available</p>
          ) : (
            <div className="space-y-2">
              {trend.map((m) => (
                <div
                  key={m.month}
                  className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
                >
                  <span className="text-sm font-medium text-gray-700">{m.month}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className={`h-full rounded-full ${getScoreBarColor(m.score)}`}
                        style={{ width: `${m.score}%` }}
                      />
                    </div>
                    <span className={`text-sm font-semibold ${getScoreColor(m.score)}`}>
                      {m.score}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Violation summary */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Violation Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {(violations ?? []).length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">No violations recorded</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-3 py-2 text-left font-medium text-gray-600">
                      Violation Type
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Count</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">
                      Last Occurrence
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {violations.map((v) => (
                    <tr key={v.type} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-[#1A1A1A]">
                        {v.type.replace(/_/g, ' ')}
                      </td>
                      <td className="px-3 py-2">
                        <span className="font-semibold text-[#E24B4A]">{v.count}</span>
                      </td>
                      <td className="px-3 py-2 text-gray-500">
                        {formatRelativeTime(v.lastOccurrence)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Drivers Tab ───────────────────────────────────────────────── */

function DriversTab({ drivers }: { drivers: DriverRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Registered Drivers</CardTitle>
      </CardHeader>
      <CardContent>
        {(drivers ?? []).length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">No drivers registered</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Name</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Phone</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Rating</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Total Trips</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Licence Expiry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {drivers.map((d) => {
                  const expiryDate = new Date(d.licenseExpiry);
                  const isExpiringSoon =
                    expiryDate.getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000;
                  const isExpired = expiryDate < new Date();

                  return (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0F6E56]/10">
                            <Users className="h-4 w-4 text-[#0F6E56]" />
                          </div>
                          <span className="font-medium text-[#1A1A1A]">{d.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-gray-600">{d.phone}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-[#EF9F27] text-[#EF9F27]" />
                          <span className="font-medium text-gray-700">{d.rating.toFixed(1)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-gray-600">{d.totalTrips.toLocaleString()}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`text-sm ${
                            isExpired
                              ? 'font-semibold text-[#E24B4A]'
                              : isExpiringSoon
                                ? 'text-[#EF9F27]'
                                : 'text-gray-600'
                          }`}
                        >
                          {expiryDate.toLocaleDateString()}
                        </span>
                        {isExpired && (
                          <Badge variant="danger" className="ml-2">
                            Expired
                          </Badge>
                        )}
                        {!isExpired && isExpiringSoon && (
                          <Badge variant="warning" className="ml-2">
                            Expiring Soon
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
