'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { JourneyCard } from '@/components/journey-card';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { useAuthStore } from '@/store/auth.store';
import { useToast } from '@/components/ui/toast';
import type { JourneySearchResult } from '@/types';
import { Search, MapPin, Calendar, SlidersHorizontal, ArrowUpDown, Bus, X } from 'lucide-react';

const CITIES = [
  'Lusaka',
  'Kitwe',
  'Ndola',
  'Livingstone',
  'Kabwe',
  'Chipata',
  'Kasama',
  'Solwezi',
  'Mansa',
  'Mongu',
];

type SortKey = 'departure' | 'price' | 'rating';

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accessToken = useAuthStore((s) => s.accessToken);
  const { toast } = useToast();

  const initialFrom = searchParams.get('from') ?? '';
  const initialTo = searchParams.get('to') ?? '';
  const initialDate = searchParams.get('date') ?? '';

  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [date, setDate] = useState(initialDate);
  const [results, setResults] = useState<JourneySearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>('departure');
  const [maxPrice, setMaxPrice] = useState('');
  const [minDeparture, setMinDeparture] = useState('');
  const [maxDeparture, setMaxDeparture] = useState('');
  const [operatorFilter, setOperatorFilter] = useState('');

  const [bookingLoadingId, setBookingLoadingId] = useState<string | null>(null);

  const fetchResults = useCallback(
    async (fromCity: string, toCity: string, travelDate: string) => {
      if (!fromCity || !toCity) return;
      setLoading(true);
      setHasSearched(true);
      try {
        const params = new URLSearchParams({
          origin: fromCity,
          destination: toCity,
        });
        if (travelDate) params.set('date', travelDate);

        const res = await fetch(`/api/journeys?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        setResults(data.data ?? []);
      } catch {
        toast({
          type: 'error',
          title: 'Search Error',
          description: 'Could not fetch journeys. Please try again.',
        });
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [accessToken, toast]
  );

  useEffect(() => {
    if (initialFrom && initialTo) {
      fetchResults(initialFrom, initialTo, initialDate);
    }
  }, [initialFrom, initialTo, initialDate, fetchResults]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!from || !to) {
      toast({
        type: 'warning',
        title: 'Missing Fields',
        description: 'Please select both departure and destination',
      });
      return;
    }
    const params = new URLSearchParams({ from, to });
    if (date) params.set('date', date);
    router.replace(`/passenger/search?${params.toString()}`);
    fetchResults(from, to, date);
  }

  function handleBook(journeyId: string) {
    setBookingLoadingId(journeyId);
    router.push(`/passenger/booking/${journeyId}`);
  }

  // Extract unique operators
  const operators = useMemo(() => {
    const names = new Set(results.map((r) => r.operatorName));
    return Array.from(names).sort();
  }, [results]);

  // Filtered and sorted
  const filteredResults = useMemo(() => {
    let filtered = [...results];

    if (maxPrice) {
      const max = parseFloat(maxPrice);
      if (!isNaN(max)) {
        filtered = filtered.filter((r) => r.fare <= max);
      }
    }

    if (minDeparture) {
      filtered = filtered.filter((r) => r.departureTime >= minDeparture);
    }

    if (maxDeparture) {
      filtered = filtered.filter((r) => r.departureTime <= maxDeparture);
    }

    if (operatorFilter) {
      filtered = filtered.filter((r) => r.operatorName === operatorFilter);
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return a.fare - b.fare;
        case 'rating':
          return (b.journey.driver?.averageRating ?? 0) - (a.journey.driver?.averageRating ?? 0);
        case 'departure':
        default:
          return a.departureTime.localeCompare(b.departureTime);
      }
    });

    return filtered;
  }, [results, maxPrice, minDeparture, maxDeparture, operatorFilter, sortBy]);

  function clearFilters() {
    setMaxPrice('');
    setMinDeparture('');
    setMaxDeparture('');
    setOperatorFilter('');
    setSortBy('departure');
  }

  const hasActiveFilters = maxPrice || minDeparture || maxDeparture || operatorFilter;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#1A1A1A]">Search Journeys</h1>

      {/* Search Bar */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-gray-500">From</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <select
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20"
                >
                  <option value="">Departure city</option>
                  {CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-gray-500">To</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <select
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20"
                >
                  <option value="">Destination city</option>
                  {CITIES.filter((c) => c !== from).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-gray-500">Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20"
                />
              </div>
            </div>
            <Button type="submit" loading={loading}>
              <Search className="h-4 w-4" />
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Toolbar: Sort + Filters */}
      {hasSearched && results.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-[#1A1A1A] transition-colors hover:bg-gray-50"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0F6E56] text-xs text-white">
                !
              </span>
            )}
          </button>
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#0F6E56] focus:outline-none"
            >
              <option value="departure">Departure Time</option>
              <option value="price">Lowest Price</option>
              <option value="rating">Highest Rating</option>
            </select>
          </div>
          <span className="text-sm text-gray-500">
            {filteredResults.length} journey{filteredResults.length !== 1 ? 's' : ''} found
          </span>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-sm text-[#E24B4A] hover:underline"
            >
              <X className="h-3 w-3" />
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  Max Price (ZMW)
                </label>
                <input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="e.g. 200"
                  min="0"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  Departure After
                </label>
                <input
                  type="time"
                  value={minDeparture}
                  onChange={(e) => setMinDeparture(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  Departure Before
                </label>
                <input
                  type="time"
                  value={maxDeparture}
                  onChange={(e) => setMaxDeparture(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Operator</label>
                <select
                  value={operatorFilter}
                  onChange={(e) => setOperatorFilter(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20"
                >
                  <option value="">All operators</option>
                  {operators.map((op) => (
                    <option key={op} value={op}>
                      {op}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Spinner size="lg" />
          <p className="mt-4 text-sm text-gray-500">Searching for journeys...</p>
        </div>
      ) : hasSearched && filteredResults.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <Bus className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-[#1A1A1A]">No Journeys Found</h3>
            <p className="mb-6 max-w-sm text-sm text-gray-500">
              {hasActiveFilters
                ? 'Try adjusting your filters or search for a different date.'
                : 'No journeys available for this route. Try a different date or route.'}
            </p>
            {hasActiveFilters && (
              <Button variant="secondary" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredResults.map((result) => (
            <JourneyCard
              key={result.journey.id}
              id={result.journey.id}
              operatorName={result.operatorName}
              operatorLogoUrl={null}
              origin={result.journey.route?.origin ?? from}
              destination={result.journey.route?.destination ?? to}
              departureTime={result.departureTime}
              arrivalTime={result.arrivalTime}
              fareZmw={result.fare}
              availableSeats={result.availableSeats}
              complianceScore={85}
              onBook={handleBook}
              bookingLoading={bookingLoadingId === result.journey.id}
            />
          ))}
        </div>
      )}

      {/* Skeleton loading states */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border border-gray-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gray-200" />
                  <div>
                    <div className="mb-1 h-4 w-32 rounded bg-gray-200" />
                    <div className="h-3 w-20 rounded bg-gray-200" />
                  </div>
                </div>
                <div className="h-6 w-20 rounded bg-gray-200" />
              </div>
              <div className="mb-4 flex items-center gap-3">
                <div className="h-6 w-16 rounded bg-gray-200" />
                <div className="h-px flex-1 bg-gray-200" />
                <div className="h-6 w-16 rounded bg-gray-200" />
              </div>
              <div className="flex items-center justify-between">
                <div className="h-4 w-24 rounded bg-gray-200" />
                <div className="h-9 w-24 rounded-lg bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
