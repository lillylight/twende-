'use client';

import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export interface OperatorCompliance {
  id: string;
  companyName: string;
  rtsaLicenseNumber: string;
  complianceScore: number; // 0–100
  totalTrips: number;
  activeAlerts: number;
  isApproved: boolean;
}

export interface ComplianceTableProps {
  operators: OperatorCompliance[];
  onOperatorClick?: (operatorId: string) => void;
  className?: string;
}

type SortField =
  | 'companyName'
  | 'rtsaLicenseNumber'
  | 'complianceScore'
  | 'totalTrips'
  | 'activeAlerts';
type SortDir = 'asc' | 'desc';

function getRiskLevel(score: number): { label: string; variant: 'success' | 'warning' | 'danger' } {
  if (score >= 80) return { label: 'LOW', variant: 'success' };
  if (score >= 50) return { label: 'MEDIUM', variant: 'warning' };
  return { label: 'HIGH', variant: 'danger' };
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 50) return 'bg-[#EF9F27]';
  return 'bg-[#E24B4A]';
}

export function ComplianceTable({ operators, onOperatorClick, className }: ComplianceTableProps) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('complianceScore');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const filtered = useMemo(() => {
    let result = operators;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (op) =>
          op.companyName.toLowerCase().includes(q) || op.rtsaLicenseNumber.toLowerCase().includes(q)
      );
    }

    result = [...result].sort((a, b) => {
      let cmp = 0;
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        cmp = aVal.localeCompare(bVal);
      } else {
        cmp = (aVal as number) - (bVal as number);
      }

      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [operators, search, sortField, sortDir]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 text-gray-300" />;
    return sortDir === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-[#0F6E56]" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-[#0F6E56]" />
    );
  };

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Search */}
      <div className="mb-4 max-w-sm">
        <Input
          placeholder="Search operators..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={<Search className="h-4 w-4" />}
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {(
                [
                  ['companyName', 'Operator'],
                  ['rtsaLicenseNumber', 'Licence'],
                  ['complianceScore', 'Score'],
                  ['totalTrips', 'Total Trips'],
                  ['activeAlerts', 'Active Alerts'],
                ] as [SortField, string][]
              ).map(([field, label]) => (
                <th
                  key={field}
                  onClick={() => handleSort(field)}
                  className="cursor-pointer select-none px-4 py-3 text-left font-medium text-gray-600 transition-colors hover:text-[#1A1A1A]"
                >
                  <div className="flex items-center gap-1.5">
                    {label}
                    <SortIcon field={field} />
                  </div>
                </th>
              ))}
              <th className="px-4 py-3 text-left font-medium text-gray-600">Risk</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((op) => {
              const risk = getRiskLevel(op.complianceScore);
              return (
                <tr
                  key={op.id}
                  onClick={() => onOperatorClick?.(op.id)}
                  className={cn(
                    'transition-colors',
                    onOperatorClick && 'cursor-pointer hover:bg-gray-50'
                  )}
                >
                  <td className="px-4 py-3 font-medium text-[#1A1A1A]">{op.companyName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {op.rtsaLicenseNumber}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-200">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            getScoreColor(op.complianceScore)
                          )}
                          style={{ width: `${op.complianceScore}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-gray-600">
                        {op.complianceScore}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{op.totalTrips.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {op.activeAlerts > 0 ? (
                      <span className="font-semibold text-[#E24B4A]">{op.activeAlerts}</span>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={risk.variant}>{risk.label}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={op.isApproved ? 'success' : 'danger'}>
                      {op.isApproved ? 'Active' : 'Suspended'}
                    </Badge>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                  No operators found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
