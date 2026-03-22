'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { Plus, Users, Star, AlertTriangle } from 'lucide-react';

interface DriverItem {
  id: string;
  userId: string;
  user: {
    firstName: string;
    lastName: string;
    phone: string;
  };
  licenceNumber: string;
  licenceExpiry: string;
  rating: number;
  totalTrips: number;
  isActive: boolean;
}

interface DriverFormData {
  phone: string;
  firstName: string;
  lastName: string;
  licenceNumber: string;
  licenceExpiry: string;
  password: string;
}

const INITIAL_FORM: DriverFormData = {
  phone: '',
  firstName: '',
  lastName: '',
  licenceNumber: '',
  licenceExpiry: '',
  password: '',
};

const RETRAINING_THRESHOLD = 3.0;

export default function OperatorDriversPage() {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const [drivers, setDrivers] = useState<DriverItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState<DriverFormData>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  const fetchDrivers = useCallback(async () => {
    if (!user || !accessToken) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/operators/${user.id}/dashboard?include=drivers`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const json = await res.json();
        setDrivers(json.data?.drivers ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [user, accessToken]);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !accessToken) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/drivers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          operatorId: user.id,
          phone: form.phone,
          firstName: form.firstName,
          lastName: form.lastName,
          licenceNumber: form.licenceNumber,
          licenceExpiry: form.licenceExpiry,
          password: form.password,
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setForm(INITIAL_FORM);
        fetchDrivers();
      }
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  };

  const needsRetraining = (rating: number) => rating < RETRAINING_THRESHOLD;

  // Sort drivers by rating (lowest first to highlight those needing attention)
  const sortedDrivers = [...drivers].sort((a, b) => a.rating - b.rating);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Drivers</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage drivers and monitor performance scores
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Driver
        </button>
      </div>

      <Card>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-6 w-6" />
            </div>
          ) : sortedDrivers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-10 w-10 text-gray-300" />
              <p className="mt-3 text-sm text-gray-500">No drivers registered yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    <th className="px-4 py-3">Driver</th>
                    <th className="px-4 py-3">Licence</th>
                    <th className="px-4 py-3">Rating</th>
                    <th className="px-4 py-3">Trips</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Flags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedDrivers.map((driver) => {
                    const retraining = needsRetraining(driver.rating);
                    const licenceExpired = new Date(driver.licenceExpiry) < new Date();

                    return (
                      <tr key={driver.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900">
                              {driver.user.firstName} {driver.user.lastName}
                            </p>
                            <p className="text-xs text-gray-500">{driver.user.phone}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-gray-700">{driver.licenceNumber}</p>
                          <p
                            className={`text-xs ${
                              licenceExpired ? 'text-red-500 font-medium' : 'text-gray-500'
                            }`}
                          >
                            {licenceExpired ? 'EXPIRED' : 'Exp:'}{' '}
                            {new Date(driver.licenceExpiry).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Star
                              className={`h-4 w-4 ${
                                retraining ? 'text-red-400' : 'text-amber-400'
                              }`}
                              fill="currentColor"
                            />
                            <span
                              className={`font-medium ${
                                retraining ? 'text-red-600' : 'text-gray-900'
                              }`}
                            >
                              {Number(driver.rating).toFixed(1)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{driver.totalTrips}</td>
                        <td className="px-4 py-3">
                          <Badge variant={driver.isActive ? 'success' : 'danger'}>
                            {driver.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            {retraining && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                                <AlertTriangle className="h-3 w-3" />
                                Retraining Required
                              </span>
                            )}
                            {licenceExpired && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">
                                Licence Expired
                              </span>
                            )}
                          </div>
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

      {/* Add Driver Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Driver">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">First Name</label>
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                required
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Last Name</label>
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                required
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-teal-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Phone Number</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              required
              placeholder="+260971234567"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Licence Number</label>
            <input
              type="text"
              value={form.licenceNumber}
              onChange={(e) => setForm({ ...form, licenceNumber: e.target.value })}
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Licence Expiry</label>
            <input
              type="date"
              value={form.licenceExpiry}
              onChange={(e) => setForm({ ...form, licenceExpiry: e.target.value })}
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Initial Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={8}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-teal-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
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
              Add Driver
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
