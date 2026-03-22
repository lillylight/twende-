'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { formatCurrency } from '@/lib/utils';
import { Plus, Bus, Clock, Users } from 'lucide-react';

type Tab = 'upcoming' | 'active' | 'completed';

interface JourneyItem {
  id: string;
  route: { fromCity: string; toCity: string };
  departureTime: string;
  arrivalTime: string | null;
  driverName: string;
  vehicleReg: string;
  totalSeats: number;
  availableSeats: number;
  price: number;
  status: string;
}

interface FormData {
  routeId: string;
  driverId: string;
  vehicleId: string;
  departureTime: string;
  totalSeats: string;
  price: string;
}

const INITIAL_FORM: FormData = {
  routeId: '',
  driverId: '',
  vehicleId: '',
  departureTime: '',
  totalSeats: '',
  price: '',
};

const STATUS_BADGE: Record<string, 'info' | 'warning' | 'success' | 'danger' | 'default'> = {
  SCHEDULED: 'info',
  BOARDING: 'warning',
  EN_ROUTE: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'danger',
};

export default function OperatorJourneysPage() {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const [tab, setTab] = useState<Tab>('upcoming');
  const [journeys, setJourneys] = useState<JourneyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  const fetchJourneys = useCallback(async () => {
    if (!user || !accessToken) return;
    try {
      setLoading(true);
      const filter: Record<Tab, string[]> = {
        upcoming: ['SCHEDULED', 'BOARDING'],
        active: ['EN_ROUTE'],
        completed: ['COMPLETED', 'CANCELLED'],
      };
      const statuses = filter[tab].join(',');
      const res = await fetch(`/api/journeys?operatorId=${user.id}&status=${statuses}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const json = await res.json();
        setJourneys(json.data ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [user, accessToken, tab]);

  useEffect(() => {
    fetchJourneys();
  }, [fetchJourneys]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !accessToken) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/journeys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          routeId: form.routeId,
          driverId: form.driverId,
          vehicleId: form.vehicleId,
          departureTime: form.departureTime,
          totalSeats: parseInt(form.totalSeats, 10),
          price: parseFloat(form.price),
          operatorId: user.id,
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setForm(INITIAL_FORM);
        fetchJourneys();
      }
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'active', label: 'Active' },
    { key: 'completed', label: 'Completed' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Journeys</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your scheduled and active journeys</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Journey
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Journey List */}
      <Card>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-6 w-6" />
            </div>
          ) : journeys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bus className="h-10 w-10 text-gray-300" />
              <p className="mt-3 text-sm text-gray-500">No {tab} journeys found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {journeys.map((journey) => (
                <div
                  key={journey.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <p className="font-semibold text-gray-900">
                        {journey.route.fromCity} &rarr; {journey.route.toCity}
                      </p>
                      <Badge variant={STATUS_BADGE[journey.status] ?? 'default'}>
                        {journey.status}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(journey.departureTime).toLocaleString()}
                      </span>
                      <span>{journey.driverName}</span>
                      <span>{journey.vehicleReg}</span>
                      <span>{formatCurrency(journey.price)}</span>
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    <div className="inline-flex items-center gap-1 text-sm font-medium text-gray-700">
                      <Users className="h-4 w-4" />
                      {journey.totalSeats - journey.availableSeats}/{journey.totalSeats}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">seats booked</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Journey Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Journey"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Route ID</label>
            <input
              type="text"
              value={form.routeId}
              onChange={(e) => setForm({ ...form, routeId: e.target.value })}
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-teal-500"
              placeholder="Enter route ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Driver ID</label>
            <input
              type="text"
              value={form.driverId}
              onChange={(e) => setForm({ ...form, driverId: e.target.value })}
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-teal-500"
              placeholder="Enter driver ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Vehicle ID</label>
            <input
              type="text"
              value={form.vehicleId}
              onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-teal-500"
              placeholder="Enter vehicle ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Departure Time</label>
            <input
              type="datetime-local"
              value={form.departureTime}
              onChange={(e) => setForm({ ...form, departureTime: e.target.value })}
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-teal-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Total Seats</label>
              <input
                type="number"
                value={form.totalSeats}
                onChange={(e) => setForm({ ...form, totalSeats: e.target.value })}
                required
                min="1"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Price (ZMW)</label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                required
                min="0"
                step="0.01"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-teal-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              {submitting && <Spinner className="h-4 w-4" />}
              Create Journey
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
