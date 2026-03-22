import { calculateRouteDeviation, haversineDistance } from '../geocoding';
import { addAlertJob } from '../queues/alerts.queue';
import { prisma } from '../prisma';

const SPEED_WARNING_KMH = 100;
const SPEED_CRITICAL_KMH = 120;
const ROUTE_DEVIATION_WARNING_METERS = 2000;
const ROUTE_DEVIATION_CRITICAL_METERS = 5000;

export interface PositionData {
  lat: number;
  lng: number;
  speed: number;
  operatorId: string;
}

export interface SafetyCheckResult {
  speedAlert: boolean;
  routeDeviationAlert: boolean;
  speedSeverity: 'WARNING' | 'CRITICAL' | null;
  routeDeviationSeverity: 'WARNING' | 'CRITICAL' | null;
  deviationMeters: number;
}

/**
 * Check if the current position falls within any active planned detour
 * for the given journey. Uses haversine distance to check proximity
 * to the detour's start and end points within the specified radius.
 */
async function isWithinPlannedDetour(
  journeyId: string,
  lat: number,
  lng: number
): Promise<boolean> {
  const now = new Date();

  const activeDetours = await prisma.plannedDetour.findMany({
    where: {
      journeyId,
      isActive: true,
      expiresAt: { gt: now },
    },
  });

  if (activeDetours.length === 0) {
    return false;
  }

  for (const detour of activeDetours) {
    const radiusKm = detour.radiusMeters / 1000;

    // Check distance from the detour's start point
    const distToStart = haversineDistance(lat, lng, detour.startLat, detour.startLng);
    if (distToStart <= radiusKm) {
      return true;
    }

    // Check distance from the detour's end point
    const distToEnd = haversineDistance(lat, lng, detour.endLat, detour.endLng);
    if (distToEnd <= radiusKm) {
      return true;
    }

    // Also check if the position is within radius of the line between start and end
    // This handles the corridor between the two detour endpoints
    const distToMidpoint = haversineDistance(
      lat,
      lng,
      (detour.startLat + detour.endLat) / 2,
      (detour.startLng + detour.endLng) / 2
    );

    // If the detour segment is long, check the midpoint too with a slightly larger radius
    const segmentLength = haversineDistance(
      detour.startLat,
      detour.startLng,
      detour.endLat,
      detour.endLng
    );

    if (segmentLength > 0 && distToMidpoint <= radiusKm + segmentLength / 2) {
      // More precise check: point-to-segment distance
      const pointToSegDist = pointToSegmentDistanceKm(
        lat,
        lng,
        detour.startLat,
        detour.startLng,
        detour.endLat,
        detour.endLng
      );

      if (pointToSegDist <= radiusKm) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Approximate point-to-segment distance in km using lat/lng coordinates.
 */
function pointToSegmentDistanceKm(
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
    return haversineDistance(pLat, pLng, aLat, aLng);
  }

  let t = (ap.lat * ab.lat + ap.lng * ab.lng) / abLenSq;
  t = Math.max(0, Math.min(1, t));

  const closestLat = aLat + t * ab.lat;
  const closestLng = aLng + t * ab.lng;

  return haversineDistance(pLat, pLng, closestLat, closestLng);
}

export async function checkSafetyThresholds(
  journeyId: string,
  position: PositionData
): Promise<SafetyCheckResult> {
  const { lat, lng, speed, operatorId } = position;

  const result: SafetyCheckResult = {
    speedAlert: false,
    routeDeviationAlert: false,
    speedSeverity: null,
    routeDeviationSeverity: null,
    deviationMeters: 0,
  };

  // Check speed thresholds
  if (speed >= SPEED_CRITICAL_KMH) {
    result.speedAlert = true;
    result.speedSeverity = 'CRITICAL';

    await addAlertJob({
      type: 'speeding',
      journeyId,
      operatorId,
      speed,
      speedLimit: SPEED_CRITICAL_KMH,
      lat,
      lng,
      severity: 'CRITICAL',
    });

    console.log(`[Safety] CRITICAL speed alert: journey=${journeyId}, speed=${speed}km/h`);
  } else if (speed >= SPEED_WARNING_KMH) {
    result.speedAlert = true;
    result.speedSeverity = 'WARNING';

    await addAlertJob({
      type: 'speeding',
      journeyId,
      operatorId,
      speed,
      speedLimit: SPEED_WARNING_KMH,
      lat,
      lng,
      severity: 'WARNING',
    });

    console.log(`[Safety] WARNING speed alert: journey=${journeyId}, speed=${speed}km/h`);
  }

  // Check route deviation
  const deviationMeters = await calculateRouteDeviation(journeyId, lat, lng);
  result.deviationMeters = deviationMeters;

  if (deviationMeters >= ROUTE_DEVIATION_WARNING_METERS) {
    // Before creating a route deviation alert, check if the position
    // falls within an active planned detour
    const withinDetour = await isWithinPlannedDetour(journeyId, lat, lng);

    if (withinDetour) {
      console.log(
        `[Safety] Route deviation suppressed (planned detour): journey=${journeyId}, deviation=${deviationMeters}m`
      );
      // Do not raise a route deviation alert
    } else if (deviationMeters >= ROUTE_DEVIATION_CRITICAL_METERS) {
      result.routeDeviationAlert = true;
      result.routeDeviationSeverity = 'CRITICAL';

      await addAlertJob({
        type: 'route_deviation',
        journeyId,
        operatorId,
        deviationMeters,
        lat,
        lng,
        severity: 'CRITICAL',
      });

      console.log(
        `[Safety] CRITICAL route deviation: journey=${journeyId}, deviation=${deviationMeters}m`
      );
    } else {
      result.routeDeviationAlert = true;
      result.routeDeviationSeverity = 'WARNING';

      await addAlertJob({
        type: 'route_deviation',
        journeyId,
        operatorId,
        deviationMeters,
        lat,
        lng,
        severity: 'WARNING',
      });

      console.log(
        `[Safety] WARNING route deviation: journey=${journeyId}, deviation=${deviationMeters}m`
      );
    }
  }

  return result;
}
