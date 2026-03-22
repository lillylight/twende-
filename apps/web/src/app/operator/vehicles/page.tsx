'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { Plus, Truck, Wrench } from 'lucide-react';

interface VehicleItem {
  id: string;
  registrationNumber: string;
  vehicleType: string;
  capacity: number;
  isActive: boolean;
  totalDistanceKm: number;
  journeyCount: number;
  lastMaintenanceDate: string | null;
  isWheelchairAccessible: boolean;
}

interface VehicleFormData {
  registrationNumber: string;
  vehicleType: string;
  capacity: string;
  isWheelchairAccessible: boolean;
  lastMaintenanceDate: string;
}

const INITIAL_FORM: VehicleFormData = {
  registrationNumber: '',
  vehicleType: 'BUS',
  capacity: '',
  isWheelchairAccessible: false,
  lastMaintenanceDate: '',
};

export default function OperatorVehiclesPage() {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState<VehicleFormData>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  const fetchVehicles = useCallback(async () => {
    if (!user || !accessToken) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/vehicles?operatorId=${user.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const json = await res.json();
        setVehicles(json.data ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [user, accessToken]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !accessToken) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          registrationNumber: form.registrationNumber,
          vehicleType: form.vehicleType,
          capacity: parseInt(form.capacity, 10),
          isWheelchairAccessible: form.isWheelchairAccessible,
          lastMaintenanceDate: form.lastMaintenanceDate || null,
          operatorId: user.id,
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setForm(INITIAL_FORM);
        fetchVehicles();
      }
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  };

  const getDaysUntilMaintenance = (date: string | null): number | null => {
    if (!date) return null;
    const maintenance = new Date(date);
    const now = new Date();
    return Math.ceil((maintenance.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vehicles</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your fleet of vehicles</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Vehicle
        </button>
      </div>

      <Card>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-6 w-6" />
            </div>
          ) : vehicles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Truck className="h-10 w-10 text-gray-300" />
              <p className="mt-3 text-sm text-gray-500">No vehicles registered yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {vehicles.map((vehicle) => {
                const maintenanceDays = getDaysUntilMaintenance(vehicle.lastMaintenanceDate);
                const maintenanceOverdue = maintenanceDays !== null && maintenanceDays < 0;

                return (
                  <div
                    key={vehicle.id}
                    className="rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{vehicle.registrationNumber}</p>
                        <p className="text-xs text-gray-500">{vehicle.vehicleType}</p>
                      </div>
                      <Badge variant={vehicle.isActive ? 'success' : 'danger'}>
                        {vehicle.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>Capacity</span>
                        <span className="font-medium">{vehicle.capacity} seats</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Distance</span>
                        <span className="font-medium">
                          {Math.round(vehicle.totalDistanceKm).toLocaleString()} km
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Journeys</span>
                        <span className="font-medium">{vehicle.journeyCount}</span>
                      </div>
                      {vehicle.isWheelchairAccessible && (
                        <div className="flex items-center gap-1 text-teal-600 text-xs">
                          <span>Wheelchair Accessible</span>
                        </div>
                      )}
                    </div>

                    {vehicle.lastMaintenanceDate && (
                      <div
                        className={`mt-3 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs ${
                          maintenanceOverdue ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-600'
                        }`}
                      >
                        <Wrench className="h-3 w-3" />
                        <span>
                          Last maintenance:{' '}
                          {new Date(vehicle.lastMaintenanceDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Vehicle Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Vehicle">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Registration Number</label>
            <input
              type="text"
              value={form.registrationNumber}
              onChange={(e) =>
                setForm({ ...form, registrationNumber: e.target.value.toUpperCase() })
              }
              required
              placeholder="e.g. ABZ 1234"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Vehicle Type</label>
            <select
              value={form.vehicleType}
              onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-teal-500"
            >
              <option value="BUS">Bus</option>
              <option value="MINIBUS">Minibus</option>
              <option value="COASTER">Coaster</option>
              <option value="COACH">Coach</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Capacity (seats)</label>
            <input
              type="number"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              required
              min="1"
              max="100"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Last Maintenance Date</label>
            <input
              type="date"
              value={form.lastMaintenanceDate}
              onChange={(e) => setForm({ ...form, lastMaintenanceDate: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-teal-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="wheelchair"
              checked={form.isWheelchairAccessible}
              onChange={(e) => setForm({ ...form, isWheelchairAccessible: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <label htmlFor="wheelchair" className="text-sm text-gray-700">
              Wheelchair accessible
            </label>
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
              Add Vehicle
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
