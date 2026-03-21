import { calculateRouteDeviation } from '../geocoding';
import { addAlertJob } from '../queues/alerts.queue';

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

  if (deviationMeters >= ROUTE_DEVIATION_CRITICAL_METERS) {
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
  } else if (deviationMeters >= ROUTE_DEVIATION_WARNING_METERS) {
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

  return result;
}
