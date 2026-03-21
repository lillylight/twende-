'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface SeatMapProps {
  totalSeats: number;
  takenSeats: number[];
  selectedSeat: number | null;
  onSelect: (seat: number) => void;
}

type SeatStatus = 'available' | 'taken' | 'selected' | 'yours';

export function SeatMap({ totalSeats, takenSeats, selectedSeat, onSelect }: SeatMapProps) {
  const takenSet = new Set(takenSeats);

  const getSeatStatus = (seat: number): SeatStatus => {
    if (seat === selectedSeat) return 'selected';
    if (takenSet.has(seat)) return 'taken';
    return 'available';
  };

  const statusStyles: Record<SeatStatus, string> = {
    available:
      'bg-emerald-100 border-emerald-300 text-emerald-700 hover:bg-emerald-200 cursor-pointer',
    taken: 'bg-gray-200 border-gray-300 text-gray-400 cursor-not-allowed',
    selected: 'bg-[#0F6E56] border-[#0F6E56] text-white cursor-pointer ring-2 ring-[#0F6E56]/30',
    yours: 'bg-[#EF9F27] border-[#EF9F27] text-white cursor-default',
  };

  // Build rows: 4 seats per row with aisle (2 | aisle | 2)
  const rows: number[][] = [];
  for (let i = 1; i <= totalSeats; i += 4) {
    const row: number[] = [];
    for (let j = i; j < i + 4 && j <= totalSeats; j++) {
      row.push(j);
    }
    rows.push(row);
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      {/* Legend */}
      <div className="mb-4 flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="h-4 w-4 rounded border border-emerald-300 bg-emerald-100" />
          <span className="text-gray-600">Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-4 w-4 rounded border border-gray-300 bg-gray-200" />
          <span className="text-gray-600">Taken</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-4 w-4 rounded border border-[#0F6E56] bg-[#0F6E56]" />
          <span className="text-gray-600">Selected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-4 w-4 rounded border border-[#EF9F27] bg-[#EF9F27]" />
          <span className="text-gray-600">Your Seat</span>
        </div>
      </div>

      {/* Driver indicator */}
      <div className="mb-3 flex justify-center">
        <div className="rounded-lg bg-gray-100 px-6 py-1 text-xs font-medium text-gray-500">
          FRONT
        </div>
      </div>

      {/* Seat grid */}
      <div className="flex flex-col items-center gap-2">
        {rows.map((row, rowIdx) => (
          <div key={rowIdx} className="flex items-center gap-2">
            {/* Left pair */}
            {row.slice(0, 2).map((seat) => {
              const status = getSeatStatus(seat);
              return (
                <button
                  key={seat}
                  disabled={status === 'taken'}
                  onClick={() => {
                    if (status !== 'taken') onSelect(seat);
                  }}
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-medium transition-colors',
                    statusStyles[status]
                  )}
                  aria-label={`Seat ${seat} - ${status}`}
                >
                  {seat}
                </button>
              );
            })}

            {/* Aisle */}
            <div className="w-6" />

            {/* Right pair */}
            {row.slice(2, 4).map((seat) => {
              const status = getSeatStatus(seat);
              return (
                <button
                  key={seat}
                  disabled={status === 'taken'}
                  onClick={() => {
                    if (status !== 'taken') onSelect(seat);
                  }}
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-medium transition-colors',
                    statusStyles[status]
                  )}
                  aria-label={`Seat ${seat} - ${status}`}
                >
                  {seat}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Back label */}
      <div className="mt-3 flex justify-center">
        <div className="rounded-lg bg-gray-100 px-6 py-1 text-xs font-medium text-gray-500">
          BACK
        </div>
      </div>
    </div>
  );
}
