import { describe, it, expect } from "vitest";
import {
  ThermalPhysicsService,
  DryIceSimulationInput,
  ReeferPowerSimulationInput,
} from "./thermal-physics.service.js";

describe("ThermalPhysicsService (Dry Ice Kinetics & Reefer Fuel/Power)", () => {
  it("should calculate dry ice holdover hours and projected arrival weight", () => {
    const input: DryIceSimulationInput = {
      initialWeightKg: 45.0,
      currentWeightKg: 32.0,
      sublimationRateKgHr: 0.45,
      transitHoursRemaining: 24,
    };

    const result = ThermalPhysicsService.calculateDryIceHoldover(input);
    expect(result.holdoverHoursRemaining).toBe(71.1);
    expect(result.projectedWeightAtArrivalKg).toBe(21.2);
    expect(result.status).toBe("SAFE");
    expect(result.isSafeForTransit).toBe(true);
  });

  it("should flag critical deficit when dry ice holdover is insufficient for remaining transit", () => {
    const input: DryIceSimulationInput = {
      initialWeightKg: 20.0,
      currentWeightKg: 5.0,
      sublimationRateKgHr: 0.5,
      transitHoursRemaining: 16, // 5 / 0.5 = 10 hours < 16 hours
    };

    const result = ThermalPhysicsService.calculateDryIceHoldover(input);
    expect(result.holdoverHoursRemaining).toBe(10.0);
    expect(result.status).toBe("CRITICAL_DEFICIT");
    expect(result.isSafeForTransit).toBe(false);
  });

  it("should calculate Reefer Genset fuel burn rate and total consumption based on deltaT", () => {
    const input: ReeferPowerSimulationInput = {
      ambientTempCelsius: 35.0,
      setpointCelsius: 5.0, // deltaT = 30°C
      transitHours: 40,
      tankCapacityLiters: 450,
      initialFuelLiters: 450,
    };

    // Burn rate = 1.8 + 0.08 * 30 = 4.2 L/h
    // Consumed = 4.2 * 40 = 168 L
    const result = ThermalPhysicsService.calculateReeferPowerAndFuel(input);
    expect(result.deltaTCelsius).toBe(30.0);
    expect(result.fuelBurnRateLitersPerHr).toBe(4.2);
    expect(result.totalFuelConsumedLiters).toBe(168.0);
    expect(result.remainingFuelLiters).toBe(282.0);
    expect(result.isRefuelingRequired).toBe(false);
  });

  it("should require refueling when total transit fuel exceeds initial tank reserve", () => {
    const input: ReeferPowerSimulationInput = {
      ambientTempCelsius: 38.0,
      setpointCelsius: -20.0, // deltaT = 58°C -> Burn rate = 1.8 + 0.08*58 = 6.44 L/h
      transitHours: 80, // 6.44 * 80 = 515.2 L > 450 L
      tankCapacityLiters: 450,
      initialFuelLiters: 450,
    };

    const result = ThermalPhysicsService.calculateReeferPowerAndFuel(input);
    expect(result.isRefuelingRequired).toBe(true);
    expect(result.notes).toContain("Repostaje de combustible OBLIGATORIO");
  });
});
