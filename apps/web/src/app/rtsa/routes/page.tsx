'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { formatRelativeTime } from '@/lib/utils';
import {
  Route,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  MapPin,
  Building2,
  BarChart3,
} from 'lucide-react';

interface RouteRisk {
  id: string;
  origin: string;
  destination: string;
  distanceKm: number;
  operatorCount: number;
  avgIncidentsPerMonth: number;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  incidents: IncidentBreakdown[];
  operators: RouteOperator[];
  recentAlerts: RouteAlert[];
}

interface IncidentBreakdown {
  type: string;
  count: number;
  percentage: number;
}

interface RouteOperator {
  id: string;
  name: string;
  activeBuses: number;
  complianceScore: number;
}

interface RouteAlert {
  id: string;
  type: string;
  severity: string;
  description: string;
  date: string;
  operatorName: string;
}

type SortField = 'riskLevel' | 'distanceKm' | 'operatorCount' | 'riskScore';
type SortDir = 'asc' | 'desc';

const sortOptions = [
  { value: 'riskScore', label: 'Risk Score' },
  { value: 'distanceKm', label: 'Distance' },
  { value: 'operatorCount', label: 'Popularity' },
  { value: 'riskLevel', label: 'Risk Level' },
];

const riskLevelOrder: Record<string, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

function getRiskBadge(level: string) {
  switch (level) {
    case 'LOW':
      return (
        <Badge variant="success">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            LOW
          </span>
        </Badge>
      );
    case 'MEDIUM':
      return (
        <Badge variant="warning">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[#EF9F27]" />
            MEDIUM
          </span>
        </Badge>
      );
    case 'HIGH':
      return (
        <Badge variant="danger">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[#E24B4A]" />
            HIGH
          </span>
        </Badge>
      );
    default:
      return <Badge>{level}</Badge>;
  }
}

function getRiskBarColor(level: string) {
  switch (level) {
    case 'LOW':
      return 'bg-emerald-500';
    case 'MEDIUM':
      return 'bg-[#EF9F27]';
    case 'HIGH':
      return 'bg-[#E24B4A]';
    default:
      return 'bg-gray-400';
  }
}

export default function RoutesPage() {
  const [routes, setRoutes] = useState<RouteRisk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('riskScore');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchRoutes = useCallback(async () => {
    try {
      const res = await fetch('/api/rtsa/routes/risk');
      if (!res.ok) throw new Error('Failed to fetch routes');
      const json = await res.json();
      const list = json.data ?? json;
      setRoutes(Array.isArray(list) ? list : []);
      setError(null);
    } catch {
      setError('Failed to load routes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const filtered = useMemo(() => {
    let result = routes;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) => r.origin.toLowerCase().includes(q) || r.destination.toLowerCase().includes(q)
      );
    }

    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'riskLevel') {
        cmp = (riskLevelOrder[a.riskLevel] ?? 0) - (riskLevelOrder[b.riskLevel] ?? 0);
      } else {
        cmp = a[sortField] - b[sortField];
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [routes, search, sortField, sortDir]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 text-gray-300" />;
    return sortDir === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-[#0F6E56]" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-[#0F6E56]" />
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error && routes.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-12 w-12 text-[#E24B4A]" />
        <p className="text-lg font-medium text-gray-700">{error}</p>
        <Button onClick={fetchRoutes}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1A1A1A]">Routes & Risk Analysis</h1>
        <p className="mt-1 text-sm text-gray-500">
          Analyze route safety metrics and incident patterns across Zambia
        </p>
      </div>

      {/* Search and sort */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="w-72">
          <Input
            placeholder="Search routes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="h-4 w-4" />}
          />
        </div>
        <div className="w-48">
          <Select
            options={sortOptions}
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
            placeholder="Sort by"
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
        >
          {sortDir === 'desc' ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
          {sortDir === 'desc' ? 'Descending' : 'Ascending'}
        </Button>
      </div>

      {/* Routes table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-600">Route</th>
              <th
                onClick={() => handleSort('distanceKm')}
                className="cursor-pointer select-none px-4 py-3 text-left font-medium text-gray-600 hover:text-[#1A1A1A]"
              >
                <div className="flex items-center gap-1">
                  Distance
                  <SortIcon field="distanceKm" />
                </div>
              </th>
              <th
                onClick={() => handleSort('operatorCount')}
                className="cursor-pointer select-none px-4 py-3 text-left font-medium text-gray-600 hover:text-[#1A1A1A]"
              >
                <div className="flex items-center gap-1">
                  Operators
                  <SortIcon field="operatorCount" />
                </div>
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Avg Incidents/Month</th>
              <th
                onClick={() => handleSort('riskScore')}
                className="cursor-pointer select-none px-4 py-3 text-left font-medium text-gray-600 hover:text-[#1A1A1A]"
              >
                <div className="flex items-center gap-1">
                  Risk Score
                  <SortIcon field="riskScore" />
                </div>
              </th>
              <th
                onClick={() => handleSort('riskLevel')}
                className="cursor-pointer select-none px-4 py-3 text-left font-medium text-gray-600 hover:text-[#1A1A1A]"
              >
                <div className="flex items-center gap-1">
                  Risk Level
                  <SortIcon field="riskLevel" />
                </div>
              </th>
              <th className="w-10 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                  No routes found
                </td>
              </tr>
            ) : (
              filtered.map((route) => (
                <React.Fragment key={route.id}>
                  {/* Main row */}
                  <tr
                    onClick={() => setExpandedId(expandedId === route.id ? null : route.id)}
                    className="cursor-pointer transition-colors hover:bg-gray-50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-[#0F6E56]" />
                        <span className="font-medium text-[#1A1A1A]">{route.origin}</span>
                        <span className="text-gray-400">&rarr;</span>
                        <span className="font-medium text-[#1A1A1A]">{route.destination}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{route.distanceKm} km</td>
                    <td className="px-4 py-3 text-gray-600">{route.operatorCount}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-semibold ${
                          route.avgIncidentsPerMonth > 10
                            ? 'text-[#E24B4A]'
                            : route.avgIncidentsPerMonth > 5
                              ? 'text-[#EF9F27]'
                              : 'text-gray-600'
                        }`}
                      >
                        {route.avgIncidentsPerMonth.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-200">
                          <div
                            className={`h-full rounded-full ${getRiskBarColor(route.riskLevel)}`}
                            style={{ width: `${route.riskScore}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-gray-600">
                          {route.riskScore}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{getRiskBadge(route.riskLevel)}</td>
                    <td className="px-4 py-3">
                      {expandedId === route.id ? (
                        <ChevronUp className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      )}
                    </td>
                  </tr>

                  {/* Expanded detail */}
                  {expandedId === route.id && (
                    <tr>
                      <td colSpan={7} className="bg-gray-50/50 px-4 py-4">
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                          {/* Incident breakdown */}
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm">Incident Breakdown</CardTitle>
                            </CardHeader>
                            <CardContent>
                              {(route.incidents ?? []).length === 0 ? (
                                <p className="py-2 text-xs text-gray-400">No incidents recorded</p>
                              ) : (
                                <div className="space-y-2">
                                  {route.incidents.map((inc) => (
                                    <div
                                      key={inc.type}
                                      className="flex items-center justify-between text-xs"
                                    >
                                      <span className="text-gray-600">
                                        {inc.type.replace(/_/g, ' ')}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-200">
                                          <div
                                            className="h-full rounded-full bg-[#0F6E56]"
                                            style={{
                                              width: `${inc.percentage}%`,
                                            }}
                                          />
                                        </div>
                                        <span className="font-medium text-gray-700">
                                          {inc.count}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </CardContent>
                          </Card>

                          {/* Operators on route */}
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm">Operators Serving Route</CardTitle>
                            </CardHeader>
                            <CardContent>
                              {(route.operators ?? []).length === 0 ? (
                                <p className="py-2 text-xs text-gray-400">No operators</p>
                              ) : (
                                <div className="space-y-2">
                                  {route.operators.map((op) => (
                                    <div
                                      key={op.id}
                                      className="flex items-center justify-between rounded-lg bg-white px-3 py-2"
                                    >
                                      <div className="flex items-center gap-2">
                                        <Building2 className="h-3.5 w-3.5 text-gray-400" />
                                        <span className="text-xs font-medium text-[#1A1A1A]">
                                          {op.name}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <span>
                                          {op.activeBuses} bus
                                          {op.activeBuses !== 1 ? 'es' : ''}
                                        </span>
                                        <span
                                          className={`font-semibold ${
                                            op.complianceScore >= 80
                                              ? 'text-emerald-600'
                                              : op.complianceScore >= 50
                                                ? 'text-[#EF9F27]'
                                                : 'text-[#E24B4A]'
                                          }`}
                                        >
                                          {op.complianceScore}%
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </CardContent>
                          </Card>

                          {/* Recent alerts */}
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm">Recent Alerts</CardTitle>
                            </CardHeader>
                            <CardContent>
                              {(route.recentAlerts ?? []).length === 0 ? (
                                <p className="py-2 text-xs text-gray-400">No recent alerts</p>
                              ) : (
                                <div className="space-y-2">
                                  {route.recentAlerts.map((alert) => (
                                    <div key={alert.id} className="rounded-lg bg-white px-3 py-2">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium text-[#1A1A1A]">
                                          {alert.type.replace(/_/g, ' ')}
                                        </span>
                                        <Badge
                                          variant={
                                            alert.severity === 'CRITICAL' ||
                                            alert.severity === 'HIGH'
                                              ? 'danger'
                                              : alert.severity === 'MEDIUM'
                                                ? 'warning'
                                                : 'info'
                                          }
                                        >
                                          {alert.severity}
                                        </Badge>
                                      </div>
                                      <p className="mt-0.5 text-xs text-gray-500">
                                        {alert.operatorName} &middot;{' '}
                                        {formatRelativeTime(alert.date)}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
