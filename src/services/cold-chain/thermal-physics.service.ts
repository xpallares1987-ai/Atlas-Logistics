/**
 * ThermalPhysicsService
 *
 * 100% Deterministic Thermal Physics Engine for Cold Chain Logistics.
 * Calculates Dry Ice (UN 1845) sublimation kinetics and Reefer Genset fuel/power consumption.
 */

export interface DryIceSimulationInput {
  initialWeightKg: number;
  currentWeightKg: number;
  sublimationRateKgHr?: number;
  ambientTempCelsius?: number; // Default: 22°C
  transitHoursRemaining?: number;
}

export interface DryIceSimulationResult {
  currentWeightKg: number;
  sublimationRateKgHr: number;
  holdoverHoursRemaining: number;
  isSafeForTransit: boolean;
  projectedWeightAtArrivalKg: number;
  status: "SAFE" | "WARNING_REPLENISH_SOON" | "CRITICAL_DEFICIT";
  notes: string;
}

export interface ReeferPowerSimulationInput {
  ambientTempCelsius: number;
  setpointCelsius: number;
  transitHours: number;
  tankCapacityLiters?: number; // Default: 450L (standard undermount genset)
  initialFuelLiters?: number; // Default: 450L
}

export interface ReeferPowerSimulationResult {
  deltaTCelsius: number;
  fuelBurnRateLitersPerHr: number;
  totalFuelConsumedLiters: number;
  remainingFuelLiters: number;
  totalAutonomyHours: number;
  isRefuelingRequired: boolean;
  notes: string;
}

export class ThermalPhysicsService {
  public static readonly DRY_ICE_SUBLIMATION_POINT = -78.5; // °C

  /**
   * Evaluates Dry Ice (UN 1845) sublimation rate and autonomy holdover buffer.
   */
  public static calculateDryIceHoldover(
    input: DryIceSimulationInput,
  ): DryIceSimulationResult {
    const ambient = input.ambientTempCelsius ?? 22.0;
    const currentKg = Number(input.currentWeightKg.toFixed(2));

    // Dynamic sublimation rate estimate if not provided (standard VIP packaging)
    let rate = input.sublimationRateKgHr;
    if (!rate || rate <= 0) {
      const deltaT = ambient - this.DRY_ICE_SUBLIMATION_POINT; // e.g. 22 - (-78.5) = 100.5°C
      rate = Number((0.35 + 0.003 * deltaT).toFixed(3)); // ~0.65 kg/h at 22°C
    }

    const holdoverHours = Number((currentKg / rate).toFixed(1));
    const transitRemaining = input.transitHoursRemaining ?? 24;
    const projectedAtArrival = Number(
      Math.max(0, currentKg - rate * transitRemaining).toFixed(2),
    );

    let status: DryIceSimulationResult["status"] = "SAFE";
    let isSafeForTransit = true;
    let notes = "";

    if (holdoverHours < transitRemaining || projectedAtArrival <= 0) {
      status = "CRITICAL_DEFICIT";
      isSafeForTransit = false;
      notes = `Déficit de hielo seco crítico. La autonomía restante (${holdoverHours} h) es inferior al tiempo de tránsito (${transitRemaining} h). Requiere re-hielo inmediato.`;
    } else if (
      holdoverHours < transitRemaining + 12 ||
      projectedAtArrival < 5.0
    ) {
      status = "WARNING_REPLENISH_SOON";
      isSafeForTransit = true;
      notes = `Margen de seguridad ajustado. Llegada estimada con ${projectedAtArrival} kg de hielo seco. Se aconseja monitorización prioritaria.`;
    } else {
      status = "SAFE";
      isSafeForTransit = true;
      notes = `Autonomía de hielo seco óptima (${holdoverHours} horas restantes). Llegada estimada con ${projectedAtArrival} kg de reserva.`;
    }

    return {
      currentWeightKg: currentKg,
      sublimationRateKgHr: rate,
      holdoverHoursRemaining: holdoverHours,
      isSafeForTransit,
      projectedWeightAtArrivalKg: projectedAtArrival,
      status,
      notes,
    };
  }

  /**
   * Calculates Reefer Genset diesel consumption and thermal power draw based on temperature delta.
   */
  public static calculateReeferPowerAndFuel(
    input: ReeferPowerSimulationInput,
  ): ReeferPowerSimulationResult {
    const deltaT = Number(
      Math.abs(input.ambientTempCelsius - input.setpointCelsius).toFixed(1),
    );

    // Baseline fuel burn ~1.8 L/h + 0.08 L/h per degree Celsius of deltaT
    const fuelBurnRate = Number((1.8 + 0.08 * deltaT).toFixed(2));
    const totalFuelConsumed = Number(
      (fuelBurnRate * input.transitHours).toFixed(1),
    );

    const tankCap = input.tankCapacityLiters ?? 450.0;
    const initialFuel = input.initialFuelLiters ?? tankCap;
    const remainingFuel = Number(
      Math.max(0, initialFuel - totalFuelConsumed).toFixed(1),
    );
    const totalAutonomyHours = Number((initialFuel / fuelBurnRate).toFixed(1));

    const isRefuelingRequired =
      remainingFuel < 50.0 || totalFuelConsumed > initialFuel;

    let notes = "";
    if (isRefuelingRequired) {
      notes = `Repostaje de combustible OBLIGATORIO durante el trayecto. Consumo previsto: ${totalFuelConsumed} L para una reserva de ${initialFuel} L (Autonomía: ${totalAutonomyHours} h).`;
    } else {
      notes = `Autonomía diésel suficiente (${totalAutonomyHours} horas disponibles vs ${input.transitHours} horas de trayecto). Consumo estimado: ${totalFuelConsumed} L.`;
    }

    return {
      deltaTCelsius: deltaT,
      fuelBurnRateLitersPerHr: fuelBurnRate,
      totalFuelConsumedLiters: totalFuelConsumed,
      remainingFuelLiters: remainingFuel,
      totalAutonomyHours,
      isRefuelingRequired,
      notes,
    };
  }
}
