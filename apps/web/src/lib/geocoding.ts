import { prisma } from './prisma';

const EARTH_RADIUS_KM = 6371;

/**
 * Calculate the distance between two geographic coordinates using the Haversine formula.
 * Returns the distance in kilometers.
 */
export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number): number => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

/**
 * Point-to-segment distance in meters.
 * Calculates the perpendicular distance from a point to the closest point on a line segment.
 */
function pointToSegmentDistance(
  pLat: number,
  pLng: number,
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number {
  const ap = { lat: pLat - aLat, lng: pLng - aLng };
  const ab = { lat: bLat - aLat, lng: bLng - aLng };

  const abLenSq = ab.lat * ab.lat + ab.lng * ab.lng;

  if (abLenSq === 0) {
    return haversineDistance(pLat, pLng, aLat, aLng) * 1000;
  }

  let t = (ap.lat * ab.lat + ap.lng * ab.lng) / abLenSq;
  t = Math.max(0, Math.min(1, t));

  const closestLat = aLat + t * ab.lat;
  const closestLng = aLng + t * ab.lng;

  return haversineDistance(pLat, pLng, closestLat, closestLng) * 1000;
}

interface ZambianTown {
  name: string;
  lat: number;
  lng: number;
}

const ZAMBIAN_TOWNS: ZambianTown[] = [
  { name: 'Lusaka', lat: -15.3875, lng: 28.3228 },
  { name: 'Kitwe', lat: -12.8025, lng: 28.2132 },
  { name: 'Ndola', lat: -12.9587, lng: 28.6366 },
  { name: 'Kabwe', lat: -14.4378, lng: 28.4513 },
  { name: 'Chingola', lat: -12.5297, lng: 27.8533 },
  { name: 'Mufulira', lat: -12.5447, lng: 28.2396 },
  { name: 'Livingstone', lat: -17.8419, lng: 25.8544 },
  { name: 'Luanshya', lat: -13.1367, lng: 28.4166 },
  { name: 'Kasama', lat: -10.2128, lng: 31.1808 },
  { name: 'Chipata', lat: -13.6333, lng: 32.65 },
  { name: 'Solwezi', lat: -12.1667, lng: 25.8667 },
  { name: 'Mansa', lat: -11.2, lng: 28.8833 },
  { name: 'Mongu', lat: -15.2544, lng: 23.1272 },
  { name: 'Mazabuka', lat: -15.8561, lng: 27.7481 },
  { name: 'Kapiri Mposhi', lat: -14.9708, lng: 28.6828 },
  { name: 'Mpika', lat: -11.8314, lng: 31.4564 },
  { name: 'Serenje', lat: -13.2325, lng: 30.2278 },
  { name: 'Choma', lat: -16.5414, lng: 26.9872 },
  { name: 'Kafue', lat: -15.7667, lng: 28.1833 },
  { name: 'Siavonga', lat: -16.5381, lng: 28.7181 },
  { name: 'Chirundu', lat: -15.9944, lng: 28.85 },
  { name: 'Nakonde', lat: -9.35, lng: 32.75 },
  { name: 'Mumbwa', lat: -14.9833, lng: 27.0667 },
  { name: 'Senanga', lat: -15.55, lng: 23.2667 },
  { name: 'Kalulushi', lat: -12.8417, lng: 28.0944 },
  { name: 'Kaoma', lat: -14.7833, lng: 24.8 },
  { name: 'Petauke', lat: -14.2439, lng: 31.3186 },
  { name: 'Monze', lat: -16.2833, lng: 27.4833 },
  { name: 'Samfya', lat: -11.35, lng: 29.55 },
  { name: 'Mbala', lat: -8.84, lng: 31.37 },
];

/**
 * Reverse geocode a lat/lng pair to the nearest Zambian town name.
 */
export function reverseGeocode(lat: number, lng: number): string {
  let nearest = ZAMBIAN_TOWNS[0];
  let minDistance = Infinity;

  for (const town of ZAMBIAN_TOWNS) {
    const distance = haversineDistance(lat, lng, town.lat, town.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = town;
    }
  }

  if (minDistance <= 5) {
    return nearest.name;
  }

  if (minDistance <= 30) {
    return `Near ${nearest.name}`;
  }

  return `${Math.round(minDistance)}km from ${nearest.name}`;
}

export interface ETAResult {
  etaMinutes: number;
  remainingDistanceKm: number;
  currentSpeed: number;
  nearestTown: string;
}

/**
 * Calculate ETA for a journey based on current position and speed.
 */
export async function calculateETA(
  journeyId: string,
  currentLat: number,
  currentLng: number
): Promise<ETAResult | null> {
  const journey = await prisma.journey.findUnique({
    where: { id: journeyId },
    include: {
      route: true,
      gpsLogs: {
        orderBy: { timestamp: 'desc' },
        take: 5,
      },
    },
  });

  if (!journey || !journey.route) {
    return null;
  }

  const route = journey.route;
  const waypoints = (route.waypoints as Array<{ lat: number; lng: number }>) ?? [];

  // Calculate remaining distance to destination
  // Use the last waypoint or construct a simple destination from route data
  let destinationPoints: Array<{ lat: number; lng: number }> = [];

  if (waypoints.length > 0) {
    // Find the closest waypoint ahead of us
    let minDist = Infinity;
    let closestIdx = 0;
    for (let i = 0; i < waypoints.length; i++) {
      const d = haversineDistance(currentLat, currentLng, waypoints[i].lat, waypoints[i].lng);
      if (d < minDist) {
        minDist = d;
        closestIdx = i;
      }
    }
    destinationPoints = waypoints.slice(closestIdx);
  }

  let remainingDistanceKm: number;

  if (destinationPoints.length >= 2) {
    remainingDistanceKm = 0;
    remainingDistanceKm += haversineDistance(
      currentLat,
      currentLng,
      destinationPoints[0].lat,
      destinationPoints[0].lng
    );
    for (let i = 0; i < destinationPoints.length - 1; i++) {
      remainingDistanceKm += haversineDistance(
        destinationPoints[i].lat,
        destinationPoints[i].lng,
        destinationPoints[i + 1].lat,
        destinationPoints[i + 1].lng
      );
    }
  } else {
    // Estimate remaining distance as proportion of total route
    const totalDistanceKm = route.distanceKm;
    // Use route estimated duration and elapsed time as fallback
    const directDistToStart =
      waypoints.length > 0
        ? haversineDistance(currentLat, currentLng, waypoints[0].lat, waypoints[0].lng)
        : totalDistanceKm;
    remainingDistanceKm = Math.max(0, totalDistanceKm - (totalDistanceKm - directDistToStart));
  }

  // Calculate current speed from recent GPS logs
  let currentSpeed = 0;

  if (journey.gpsLogs.length > 0) {
    const recentSpeeds = journey.gpsLogs.map((log) => log.speedKmh);
    currentSpeed = recentSpeeds.reduce((sum, s) => sum + s, 0) / recentSpeeds.length;
  }

  // Calculate ETA
  const effectiveSpeed = currentSpeed > 5 ? currentSpeed : 60; // Default 60km/h if stopped
  const etaMinutes = (remainingDistanceKm / effectiveSpeed) * 60;

  const nearestTown = reverseGeocode(currentLat, currentLng);

  return {
    etaMinutes: Math.round(etaMinutes),
    remainingDistanceKm: Math.round(remainingDistanceKm * 10) / 10,
    currentSpeed: Math.round(currentSpeed),
    nearestTown,
  };
}

/**
 * Calculate how far a vehicle has deviated from its planned route in meters.
 */
export async function calculateRouteDeviation(
  journeyId: string,
  lat: number,
  lng: number
): Promise<number> {
  const journey = await prisma.journey.findUnique({
    where: { id: journeyId },
    include: { route: true },
  });

  if (!journey || !journey.route) {
    return 0;
  }

  const waypoints = (journey.route.waypoints as Array<{ lat: number; lng: number }>) ?? [];

  if (waypoints.length < 2) {
    return 0;
  }

  // Find the minimum distance from the current position to any segment of the route
  let minDistance = Infinity;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const distance = pointToSegmentDistance(
      lat,
      lng,
      waypoints[i].lat,
      waypoints[i].lng,
      waypoints[i + 1].lat,
      waypoints[i + 1].lng
    );

    if (distance < minDistance) {
      minDistance = distance;
    }
  }

  return Math.round(minDistance);
}
