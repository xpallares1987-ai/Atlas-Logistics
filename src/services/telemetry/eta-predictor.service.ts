import {
  GeofenceEngineService,
  Coordinates,
} from "./geofence-engine.service.js";

export interface EtaCalculationResult {
  remainingDistanceKm: number;
  estimatedRemainingHours: number;
  predictedEtaIso: string;
  delayHours: number;
  isOnTime: boolean;
}

export class EtaPredictorService {
  /**
   * Estimates remaining transit time and predicts ETA
   */
  static predictEta(
    currentPos: Coordinates,
    destinationPos: Coordinates,
    currentSpeedKnots: number,
    plannedEtaIso: string,
    defaultSpeedKnots: number = 18,
  ): EtaCalculationResult {
    // 1. Calculate remaining distance in KM
    const distanceMeters = GeofenceEngineService.calculateDistanceMeters(
      currentPos,
      destinationPos,
    );
    const remainingDistanceKm = Math.round((distanceMeters / 1000) * 10) / 10;

    // 2. Speed conversion: 1 Knot = 1.852 km/h
    const effectiveSpeedKnots =
      currentSpeedKnots > 2 ? currentSpeedKnots : defaultSpeedKnots;
    const speedKmH = effectiveSpeedKnots * 1.852;

    // 3. Estimated transit hours
    const estimatedRemainingHours =
      speedKmH > 0 ? Math.round((remainingDistanceKm / speedKmH) * 10) / 10 : 0;

    // 4. Calculate Predicted ETA Date
    const now = new Date();
    const predictedDate = new Date(
      now.getTime() + estimatedRemainingHours * 3600 * 1000,
    );
    const predictedEtaIso = predictedDate.toISOString();

    // 5. Compare with Planned ETA to determine delay
    const plannedDate = new Date(plannedEtaIso);
    const diffMs = predictedDate.getTime() - plannedDate.getTime();
    const delayHours = Math.round((diffMs / (3600 * 1000)) * 10) / 10;
    const isOnTime = delayHours <= 0.5; // Within 30 min is considered on time

    return {
      remainingDistanceKm,
      estimatedRemainingHours,
      predictedEtaIso,
      delayHours: Math.max(0, delayHours),
      isOnTime,
    };
  }
}
