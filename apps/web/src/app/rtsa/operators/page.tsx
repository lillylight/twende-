'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { StatsCard } from '@/components/stats-card';
import { ComplianceTable, OperatorCompliance } from '@/components/compliance-table';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Building2, CheckCircle2, ShieldOff, BarChart3, AlertTriangle } from 'lucide-react';

interface OperatorListData {
  operators: OperatorCompliance[];
  stats: {
    total: number;
    active: number;
    suspended: number;
    avgCompliance: number;
  };
}

export default function OperatorsPage() {
  const router = useRouter();
  const [data, setData] = useState<OperatorListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOperators = useCallback(async () => {
    try {
      const res = await fetch('/api/rtsa/operators');
      if (!res.ok) throw new Error('Failed to fetch operators');
      const json = await res.json();
      const operators: OperatorCompliance[] = json.data ?? json.operators ?? json;

      const operatorsList = Array.isArray(operators) ? operators : [];
      const active = operatorsList.filter((op) => op.isApproved).length;
      const suspended = operatorsList.filter((op) => !op.isApproved).length;
      const avgCompliance =
        operatorsList.length > 0
          ? Math.round(
              operatorsList.reduce((sum, op) => sum + op.complianceScore, 0) / operatorsList.length
            )
          : 0;

      setData({
        operators: operatorsList,
        stats: {
          total: operatorsList.length,
          active,
          suspended,
          avgCompliance,
        },
      });
      setError(null);
    } catch {
      setError('Failed to load operators');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOperators();
  }, [fetchOperators]);

  const handleOperatorClick = (operatorId: string) => {
    router.push(`/rtsa/operators/${operatorId}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-12 w-12 text-[#E24B4A]" />
        <p className="text-lg font-medium text-gray-700">{error}</p>
        <Button onClick={fetchOperators}>Retry</Button>
      </div>
    );
  }

  const stats = data?.stats;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1A1A1A]">Operators</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage and monitor all registered transport operators
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          icon={<Building2 className="h-5 w-5" />}
          title="Total Operators"
          value={stats?.total ?? 0}
        />
        <StatsCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          title="Active"
          value={stats?.active ?? 0}
        />
        <StatsCard
          icon={<ShieldOff className="h-5 w-5" />}
          title="Suspended"
          value={stats?.suspended ?? 0}
        />
        <StatsCard
          icon={<BarChart3 className="h-5 w-5" />}
          title="Avg Compliance"
          value={`${stats?.avgCompliance ?? 0}%`}
        />
      </div>

      {/* Compliance table */}
      <ComplianceTable operators={data?.operators ?? []} onOperatorClick={handleOperatorClick} />
    </div>
  );
}
