'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface SpeedGaugeProps {
  currentSpeed: number;
  speedLimit?: number;
  maxSpeed?: number;
  className?: string;
}

function getSpeedColor(speed: number): string {
  if (speed <= 80) return '#10b981'; // emerald-500
  if (speed <= 110) return '#EF9F27'; // amber
  return '#E24B4A'; // danger red
}

export function SpeedGauge({
  currentSpeed,
  speedLimit = 110,
  maxSpeed = 160,
  className,
}: SpeedGaugeProps) {
  const size = 200;
  const strokeWidth = 14;
  const center = size / 2;
  const radius = center - strokeWidth;

  // Arc from 135deg to 405deg (270deg sweep)
  const startAngle = 135;
  const totalAngle = 270;
  const progress = Math.min(currentSpeed / maxSpeed, 1);
  const sweepAngle = progress * totalAngle;

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const arcPath = (angleDeg: number) => {
    const rad = toRad(angleDeg);
    return {
      x: center + radius * Math.cos(rad),
      y: center + radius * Math.sin(rad),
    };
  };

  const start = arcPath(startAngle);
  const end = arcPath(startAngle + sweepAngle);
  const largeArc = sweepAngle > 180 ? 1 : 0;

  // Speed limit indicator position
  const limitProgress = Math.min(speedLimit / maxSpeed, 1);
  const limitAngle = startAngle + limitProgress * totalAngle;
  const limitPos = arcPath(limitAngle);

  const bgEnd = arcPath(startAngle + totalAngle);
  const bgLargeArc = totalAngle > 180 ? 1 : 0;

  const color = getSpeedColor(currentSpeed);

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-sm">
        {/* Background arc */}
        <path
          d={`M ${start.x} ${start.y} A ${radius} ${radius} 0 ${bgLargeArc} 1 ${bgEnd.x} ${bgEnd.y}`}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Progress arc */}
        {sweepAngle > 0 && (
          <path
            d={`M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className="transition-all duration-300"
          />
        )}

        {/* Speed limit marker */}
        <circle
          cx={limitPos.x}
          cy={limitPos.y}
          r={4}
          fill="#E24B4A"
          stroke="white"
          strokeWidth={2}
        />

        {/* Center text */}
        <text
          x={center}
          y={center - 10}
          textAnchor="middle"
          className="fill-[#1A1A1A] text-4xl font-bold"
          style={{ fontSize: '42px', fontWeight: 700 }}
        >
          {Math.round(currentSpeed)}
        </text>
        <text
          x={center}
          y={center + 18}
          textAnchor="middle"
          className="fill-gray-400"
          style={{ fontSize: '14px' }}
        >
          km/h
        </text>
      </svg>

      {/* Speed limit label */}
      <div className="mt-2 flex items-center gap-2 text-sm">
        <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#E24B4A]">
          <span className="text-[10px] font-bold text-[#E24B4A]">{speedLimit}</span>
        </div>
        <span className="text-gray-500">Speed Limit</span>
      </div>
    </div>
  );
}
