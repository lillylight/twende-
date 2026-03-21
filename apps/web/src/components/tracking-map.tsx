'use client';

import React, { useCallback, useEffect, useRef } from 'react';

export interface TrackingPosition {
  lat: number;
  lng: number;
  heading: number;
  speed: number;
}

export interface TrackingWaypoint {
  lat: number;
  lng: number;
  name?: string;
}

export interface TrackingJourneyInfo {
  operatorName: string;
  registrationPlate: string;
  etaMinutes: number | null;
  driverName: string;
}

export interface TrackingMapProps {
  position: TrackingPosition;
  waypoints: TrackingWaypoint[];
  journeyInfo: TrackingJourneyInfo;
  googleMapsApiKey?: string;
  className?: string;
}

function TrackingMapInner({
  position,
  waypoints,
  journeyInfo,
  googleMapsApiKey,
  className,
}: TrackingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const loadedRef = useRef(false);

  const initMap = useCallback(() => {
    if (!mapRef.current || !window.google) return;

    const map = new google.maps.Map(mapRef.current, {
      center: { lat: position.lat, lng: position.lng },
      zoom: 14,
      disableDefaultUI: true,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      styles: [
        {
          featureType: 'poi',
          stylers: [{ visibility: 'off' }],
        },
      ],
    });
    googleMapRef.current = map;

    // Bus marker with SVG icon
    const marker = new google.maps.Marker({
      position: { lat: position.lat, lng: position.lng },
      map,
      icon: {
        path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        fillColor: '#0F6E56',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        scale: 7,
        rotation: position.heading,
      },
      title: journeyInfo.registrationPlate,
    });
    markerRef.current = marker;

    // Info window
    const infoWindow = new google.maps.InfoWindow({
      content: buildInfoContent(),
    });
    infoWindowRef.current = infoWindow;

    marker.addListener('click', () => {
      infoWindow.open(map, marker);
    });

    // Route polyline
    if (waypoints.length > 0) {
      const path = waypoints.map((wp) => ({
        lat: wp.lat,
        lng: wp.lng,
      }));
      const polyline = new google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: '#0F6E56',
        strokeOpacity: 0.7,
        strokeWeight: 4,
      });
      polyline.setMap(map);
      polylineRef.current = polyline;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildInfoContent = useCallback(() => {
    const etaText =
      journeyInfo.etaMinutes !== null ? `${journeyInfo.etaMinutes} min` : 'Calculating...';
    return `
      <div style="font-family: sans-serif; padding: 4px 0; min-width: 180px;">
        <div style="font-weight: 700; font-size: 14px; color: #1A1A1A; margin-bottom: 4px;">
          ${journeyInfo.operatorName}
        </div>
        <div style="font-size: 12px; color: #666; margin-bottom: 2px;">
          ${journeyInfo.registrationPlate} &middot; ${journeyInfo.driverName}
        </div>
        <div style="font-size: 12px; color: #666; margin-bottom: 2px;">
          Speed: <strong>${Math.round(position.speed)} km/h</strong>
        </div>
        <div style="font-size: 12px; color: #0F6E56; font-weight: 600;">
          ETA: ${etaText}
        </div>
      </div>
    `;
  }, [journeyInfo, position.speed]);

  // Load Google Maps script
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.google?.maps) {
      initMap();
      loadedRef.current = true;
      return;
    }

    if (loadedRef.current) return;

    const key = googleMapsApiKey || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      loadedRef.current = true;
      initMap();
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup not needed for script tag
    };
  }, [googleMapsApiKey, initMap]);

  // Update marker position when position changes
  useEffect(() => {
    if (!markerRef.current || !googleMapRef.current) return;

    const newPos = { lat: position.lat, lng: position.lng };
    markerRef.current.setPosition(newPos);

    // Update rotation
    const icon = markerRef.current.getIcon() as google.maps.Symbol;
    if (icon) {
      markerRef.current.setIcon({
        ...icon,
        rotation: position.heading,
      });
    }

    // Update info window content
    if (infoWindowRef.current) {
      infoWindowRef.current.setContent(buildInfoContent());
    }

    // Auto-follow: pan to new position
    googleMapRef.current.panTo(newPos);
  }, [position, buildInfoContent]);

  return (
    <div
      ref={mapRef}
      className={className ?? 'h-[400px] w-full rounded-xl border border-gray-200 overflow-hidden'}
    />
  );
}

import dynamic from 'next/dynamic';

export const TrackingMap = dynamic(() => Promise.resolve(TrackingMapInner), {
  ssr: false,
  loading: () => (
    <div className="flex h-[400px] w-full items-center justify-center rounded-xl border border-gray-200 bg-gray-50">
      <div className="text-sm text-gray-400">Loading Map...</div>
    </div>
  ),
});
