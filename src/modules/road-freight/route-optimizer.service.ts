export interface RoutePlanningInput {
  originCity: string;
  destinationCity: string;
  distanceKm: number;
  totalPallets: number;
  totalGrossWeightKg: number;
  departureTime?: Date | string;
  customMaxPallets?: number;
  customMaxPayloadKg?: number;
  averageSpeedKmh?: number;
}

export interface TachographStop {
  stopOrder: number;
  type:
    | "ORIGIN_DEPARTURE"
    | "DRIVING_REST_BREAK"
    | "DAILY_REST_PERIOD"
    | "DESTINATION_ARRIVAL";
  name: string;
  distanceFromOriginKm: number;
  drivingTimeMinutes: number;
  restBreakMinutes: number;
  cumulativeElapsedHours: number;
  estimatedTimestamp: Date;
}

export interface RouteOptimizationResult {
  originCity: string;
  destinationCity: string;
  distanceKm: number;
  estimatedDrivingHours: number;
  totalTransitDurationHours: number;
  requiredRestBreaksCount: number;
  requiredDailyRestCount: number;
  departureTime: Date;
  estimatedArrivalTime: Date;
  capacityUtilization: {
    totalPallets: number;
    maxPallets: number;
    floorUtilizationPct: number;
    isPalletOverloaded: boolean;
    totalGrossWeightKg: number;
    maxPayloadKg: number;
    payloadUtilizationPct: number;
    isWeightOverloaded: boolean;
  };
  tachographItinerary: TachographStop[];
  complianceNotes: string;
}

export class RoadRouteOptimizerService {
  public static readonly DEFAULT_MAX_PALLETS = 33; // 13.6m Standard Euro Trailer
  public static readonly DEFAULT_MAX_PAYLOAD_KG = 24000; // 24 Tons
  public static readonly DEFAULT_AVG_SPEED_KMH = 75; // 75 km/h commercial truck average
  public static readonly MAX_CONTINUOUS_DRIVE_HOURS = 4.5;
  public static readonly REST_BREAK_MINUTES = 45;
  public static readonly MAX_DAILY_DRIVE_HOURS = 9.0;
  public static readonly DAILY_REST_HOURS = 11.0;

  /**
   * Deterministically plans road route capacity, trailer load, and EU EC 561/2006 tachograph driver hours
   */
  public static planRouteAndSchedule(
    input: RoutePlanningInput,
  ): RouteOptimizationResult {
    const {
      originCity,
      destinationCity,
      distanceKm,
      totalPallets,
      totalGrossWeightKg,
      departureTime = new Date(),
      customMaxPallets = this.DEFAULT_MAX_PALLETS,
      customMaxPayloadKg = this.DEFAULT_MAX_PAYLOAD_KG,
      averageSpeedKmh = this.DEFAULT_AVG_SPEED_KMH,
    } = input;

    const depDate = new Date(departureTime);

    // 1. Capacity Calculations
    const floorUtilizationPct = Number(
      Math.min(100, (totalPallets / customMaxPallets) * 100).toFixed(2),
    );
    const payloadUtilizationPct = Number(
      Math.min(100, (totalGrossWeightKg / customMaxPayloadKg) * 100).toFixed(2),
    );
    const isPalletOverloaded = totalPallets > customMaxPallets;
    const isWeightOverloaded = totalGrossWeightKg > customMaxPayloadKg;

    // 2. Driving Time & Tachograph Breakdown
    const totalDrivingHours = Number((distanceKm / averageSpeedKmh).toFixed(2));
    const breaksCount = Math.floor(
      totalDrivingHours / this.MAX_CONTINUOUS_DRIVE_HOURS,
    );
    const dailyRestsCount = Math.floor(
      totalDrivingHours / this.MAX_DAILY_DRIVE_HOURS,
    );

    const totalRestTimeHours =
      breaksCount * (this.REST_BREAK_MINUTES / 60) +
      dailyRestsCount * this.DAILY_REST_HOURS;

    const totalTransitDurationHours = Number(
      (totalDrivingHours + totalRestTimeHours).toFixed(2),
    );

    const arrivalTimestamp = new Date(
      depDate.getTime() + totalTransitDurationHours * 3600 * 1000,
    );

    // 3. Generate Stop-by-Stop Tachograph Schedule
    const itinerary: TachographStop[] = [];
    let currentKm = 0;
    let currentDrivingHrs = 0;
    let currentElapsedHrs = 0;
    let stopCounter = 1;

    // Origin
    itinerary.push({
      stopOrder: stopCounter++,
      type: "ORIGIN_DEPARTURE",
      name: `Salida de Origen: ${originCity}`,
      distanceFromOriginKm: 0,
      drivingTimeMinutes: 0,
      restBreakMinutes: 0,
      cumulativeElapsedHours: 0,
      estimatedTimestamp: new Date(depDate),
    });

    let remainingDriveHours = totalDrivingHours;

    while (remainingDriveHours > this.MAX_CONTINUOUS_DRIVE_HOURS) {
      currentDrivingHrs += this.MAX_CONTINUOUS_DRIVE_HOURS;
      currentKm += this.MAX_CONTINUOUS_DRIVE_HOURS * averageSpeedKmh;
      currentElapsedHrs += this.MAX_CONTINUOUS_DRIVE_HOURS;

      // Check if daily rest needed (9h driving)
      if (currentDrivingHrs % this.MAX_DAILY_DRIVE_HOURS === 0) {
        currentElapsedHrs += this.DAILY_REST_HOURS;
        itinerary.push({
          stopOrder: stopCounter++,
          type: "DAILY_REST_PERIOD",
          name: `Pausa Diaria Tacógrafo (11h) - Km ${Math.round(currentKm)}`,
          distanceFromOriginKm: Math.round(currentKm),
          drivingTimeMinutes: Math.round(currentDrivingHrs * 60),
          restBreakMinutes: this.DAILY_REST_HOURS * 60,
          cumulativeElapsedHours: Number(currentElapsedHrs.toFixed(2)),
          estimatedTimestamp: new Date(
            depDate.getTime() + currentElapsedHrs * 3600 * 1000,
          ),
        });
      } else {
        currentElapsedHrs += this.REST_BREAK_MINUTES / 60;
        itinerary.push({
          stopOrder: stopCounter++,
          type: "DRIVING_REST_BREAK",
          name: `Pausa Obligatoria Tacógrafo (45 min) - Km ${Math.round(currentKm)}`,
          distanceFromOriginKm: Math.round(currentKm),
          drivingTimeMinutes: Math.round(currentDrivingHrs * 60),
          restBreakMinutes: this.REST_BREAK_MINUTES,
          cumulativeElapsedHours: Number(currentElapsedHrs.toFixed(2)),
          estimatedTimestamp: new Date(
            depDate.getTime() + currentElapsedHrs * 3600 * 1000,
          ),
        });
      }

      remainingDriveHours -= this.MAX_CONTINUOUS_DRIVE_HOURS;
    }

    // Destination Arrival
    currentElapsedHrs += remainingDriveHours;
    itinerary.push({
      stopOrder: stopCounter++,
      type: "DESTINATION_ARRIVAL",
      name: `Llegada a Destino: ${destinationCity}`,
      distanceFromOriginKm: distanceKm,
      drivingTimeMinutes: Math.round(totalDrivingHours * 60),
      restBreakMinutes: 0,
      cumulativeElapsedHours: Number(currentElapsedHrs.toFixed(2)),
      estimatedTimestamp: arrivalTimestamp,
    });

    let complianceNotes = `Ruta de ${distanceKm} km. Tiempo estimado al volante: ${totalDrivingHours}h a ${averageSpeedKmh} km/h. `;
    if (breaksCount > 0) {
      complianceNotes += `Planificadas ${breaksCount} pausas reglamentarias de 45 minutos conforme al Reglamento (CE) 561/2006. `;
    }
    if (isPalletOverloaded || isWeightOverloaded) {
      complianceNotes +=
        "ADVERTENCIA: Carga supera la capacidad máxima reglamentaria del semirremolque.";
    }

    return {
      originCity,
      destinationCity,
      distanceKm,
      estimatedDrivingHours: totalDrivingHours,
      totalTransitDurationHours,
      requiredRestBreaksCount: breaksCount,
      requiredDailyRestCount: dailyRestsCount,
      departureTime: depDate,
      estimatedArrivalTime: arrivalTimestamp,
      capacityUtilization: {
        totalPallets,
        maxPallets: customMaxPallets,
        floorUtilizationPct,
        isPalletOverloaded,
        totalGrossWeightKg,
        maxPayloadKg: customMaxPayloadKg,
        payloadUtilizationPct,
        isWeightOverloaded,
      },
      tachographItinerary: itinerary,
      complianceNotes,
    };
  }
}
