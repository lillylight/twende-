'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { useAuthStore } from '@/store/auth.store';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/components/ui/toast';
import {
  User,
  Phone,
  Mail,
  Shield,
  Edit3,
  Save,
  X,
  Plus,
  Trash2,
  LogOut,
  MapPin,
  Star,
  Route,
  Ticket,
  AlertTriangle,
} from 'lucide-react';

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
}

interface TripStats {
  totalTrips: number;
  favoriteRoute: string | null;
  averageRating: number | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const { logout } = useAuth({ requireAuth: true });
  const { toast } = useToast();

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [saving, setSaving] = useState(false);

  // Emergency contacts
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [addingContact, setAddingContact] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);

  // Stats
  const [stats, setStats] = useState<TripStats>({
    totalTrips: 0,
    favoriteRoute: null,
    averageRating: null,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Ratings
  const [ratings, setRatings] = useState<
    { id: string; score: number; comment: string | null; date: string; route: string }[]
  >([]);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName);
      setLastName(user.lastName);
      setEmail(user.email ?? '');
    }
  }, [user]);

  useEffect(() => {
    fetchProfileData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchProfileData() {
    setLoadingStats(true);
    try {
      // Fetch bookings for stats
      const bookingsRes = await fetch('/api/bookings', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (bookingsRes.ok) {
        const bookingsData = await bookingsRes.json();
        const bookings = bookingsData.data ?? [];
        const completedTrips = bookings.filter((b: { status: string }) => b.status === 'COMPLETED');

        // Calculate favorite route
        const routeCounts: Record<string, number> = {};
        completedTrips.forEach((b: { boardingPoint: string; alightingPoint: string }) => {
          const route = `${b.boardingPoint} - ${b.alightingPoint}`;
          routeCounts[route] = (routeCounts[route] ?? 0) + 1;
        });
        const favorite = Object.entries(routeCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;

        setStats({
          totalTrips: completedTrips.length,
          favoriteRoute: favorite,
          averageRating: null,
        });
      }

      // Fetch ratings
      const ratingsRes = await fetch('/api/ratings', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (ratingsRes.ok) {
        const ratingsData = await ratingsRes.json();
        const rawRatings = ratingsData.data ?? [];
        setRatings(
          rawRatings
            .slice(0, 10)
            .map(
              (r: {
                id: string;
                score: number;
                comment: string | null;
                createdAt: string;
                journey?: { route?: { origin: string; destination: string } };
              }) => ({
                id: r.id,
                score: r.score,
                comment: r.comment,
                date: new Date(r.createdAt).toLocaleDateString('en-ZM'),
                route: r.journey?.route
                  ? `${r.journey.route.origin} - ${r.journey.route.destination}`
                  : 'Unknown',
              })
            )
        );

        if (rawRatings.length > 0) {
          const avg =
            rawRatings.reduce((sum: number, r: { score: number }) => sum + r.score, 0) /
            rawRatings.length;
          setStats((prev) => ({ ...prev, averageRating: avg }));
        }
      }
    } catch {
      // Silent fail for non-critical data
    } finally {
      setLoadingStats(false);
    }
  }

  async function handleSaveProfile() {
    setSaving(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ firstName, lastName, email: email || null }),
      });

      if (!res.ok) throw new Error('Failed to update profile');

      // Update local store
      if (user) {
        useAuthStore.getState().setUser({
          ...user,
          firstName,
          lastName,
          email: email || null,
        });
      }

      setEditing(false);
      toast({ type: 'success', title: 'Profile Updated' });
    } catch {
      toast({
        type: 'error',
        title: 'Error',
        description: 'Could not update profile',
      });
    } finally {
      setSaving(false);
    }
  }

  function handleCancelEdit() {
    setFirstName(user?.firstName ?? '');
    setLastName(user?.lastName ?? '');
    setEmail(user?.email ?? '');
    setEditing(false);
  }

  async function handleAddContact() {
    if (!newContactName.trim() || !newContactPhone.trim()) {
      toast({
        type: 'warning',
        title: 'Missing Info',
        description: 'Please enter both name and phone number',
      });
      return;
    }
    setAddingContact(true);
    try {
      // Optimistically add locally
      const newContact: EmergencyContact = {
        id: `temp-${Date.now()}`,
        name: newContactName.trim(),
        phone: newContactPhone.trim(),
      };
      setEmergencyContacts((prev) => [...prev, newContact]);
      setNewContactName('');
      setNewContactPhone('');
      setShowAddContact(false);
      toast({ type: 'success', title: 'Emergency contact added' });
    } catch {
      toast({ type: 'error', title: 'Failed to add contact' });
    } finally {
      setAddingContact(false);
    }
  }

  function handleRemoveContact(id: string) {
    setEmergencyContacts((prev) => prev.filter((c) => c.id !== id));
    toast({ type: 'info', title: 'Contact removed' });
  }

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#1A1A1A]">Profile</h1>

      {/* User Info Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={`${user.firstName} ${user.lastName}`}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#0F6E56] text-2xl font-bold text-white">
                {user.firstName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-[#1A1A1A]">
                {user.firstName} {user.lastName}
              </h2>
              <div className="flex items-center gap-2">
                <Badge variant="success">{user.isVerified ? 'Verified' : 'Unverified'}</Badge>
                <span className="text-sm text-gray-500">{user.role}</span>
              </div>
            </div>
          </div>
          {!editing && (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              <Edit3 className="h-4 w-4" />
              Edit
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  icon={<User className="h-4 w-4" />}
                />
                <Input
                  label="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  icon={<User className="h-4 w-4" />}
                />
              </div>
              <Input
                label="Email (optional)"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="h-4 w-4" />}
                placeholder="your@email.com"
              />
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Phone className="h-4 w-4" />
                <span>{user.phone}</span>
                <span className="text-xs text-gray-400">(cannot be changed)</span>
              </div>
              <div className="flex gap-3">
                <Button loading={saving} onClick={handleSaveProfile}>
                  <Save className="h-4 w-4" />
                  Save Changes
                </Button>
                <Button variant="ghost" onClick={handleCancelEdit}>
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-[#1A1A1A]">{user.phone}</span>
              </div>
              {user.email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-[#1A1A1A]">{user.email}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm">
                <Shield className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500">
                  Member since{' '}
                  {new Date(user.createdAt).toLocaleDateString('en-ZM', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trip Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Trip Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingStats ? (
            <div className="flex items-center justify-center py-8">
              <Spinner size="md" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-gray-200 p-4 text-center">
                <Ticket className="mx-auto mb-2 h-6 w-6 text-[#0F6E56]" />
                <p className="text-2xl font-bold text-[#1A1A1A]">{stats.totalTrips}</p>
                <p className="text-xs text-gray-500">Total Trips</p>
              </div>
              <div className="rounded-lg border border-gray-200 p-4 text-center">
                <Route className="mx-auto mb-2 h-6 w-6 text-[#EF9F27]" />
                <p className="truncate text-sm font-bold text-[#1A1A1A]">
                  {stats.favoriteRoute ?? 'N/A'}
                </p>
                <p className="text-xs text-gray-500">Favourite Route</p>
              </div>
              <div className="rounded-lg border border-gray-200 p-4 text-center">
                <Star className="mx-auto mb-2 h-6 w-6 text-[#EF9F27]" />
                <p className="text-2xl font-bold text-[#1A1A1A]">
                  {stats.averageRating ? stats.averageRating.toFixed(1) : 'N/A'}
                </p>
                <p className="text-xs text-gray-500">Avg Rating Given</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Emergency Contacts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-[#E24B4A]" />
            Emergency Contacts
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setShowAddContact(!showAddContact)}>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {showAddContact && (
            <div className="rounded-lg border border-dashed border-gray-300 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Contact Name"
                  placeholder="e.g. Mum"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  icon={<User className="h-4 w-4" />}
                />
                <Input
                  label="Phone Number"
                  type="tel"
                  placeholder="+260 97 1234567"
                  value={newContactPhone}
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  icon={<Phone className="h-4 w-4" />}
                />
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" loading={addingContact} onClick={handleAddContact}>
                  <Plus className="h-4 w-4" />
                  Add Contact
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAddContact(false);
                    setNewContactName('');
                    setNewContactPhone('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {emergencyContacts.length === 0 && !showAddContact ? (
            <p className="py-4 text-center text-sm text-gray-400">
              No emergency contacts added yet. Add contacts so they can be notified during an SOS
              event.
            </p>
          ) : (
            <div className="space-y-2">
              {emergencyContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-[#1A1A1A]">{contact.name}</p>
                    <p className="text-sm text-gray-500">{contact.phone}</p>
                  </div>
                  <button
                    onClick={() => handleRemoveContact(contact.id)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-[#E24B4A]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rating History */}
      {ratings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Rating History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ratings.map((r) => (
                <div
                  key={r.id}
                  className="flex items-start justify-between rounded-lg border border-gray-200 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-[#1A1A1A]">{r.route}</p>
                    {r.comment && <p className="mt-0.5 text-sm text-gray-500">{r.comment}</p>}
                    <p className="mt-1 text-xs text-gray-400">{r.date}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-[#EF9F27] text-[#EF9F27]" />
                    <span className="font-semibold text-[#1A1A1A]">{r.score}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Logout */}
      <Card>
        <CardContent className="py-4">
          <Button variant="danger" className="w-full" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Log Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
