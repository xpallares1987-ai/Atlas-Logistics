import { describe, it, expect } from "vitest";
import {
  RailPhysicsService,
  TrainConsistBrakingInput,
} from "./rail-physics.service.js";

describe("RailPhysicsService (Train Dynamics, Axle Loads & Brake %)", () => {
  it("should calculate wagon axle load and enforce UIC Category D (22.5 t/axle)", () => {
    const calc = RailPhysicsService.calculateAxleLoad(28.5, 60.0, 6, "D");
    expect(calc.grossWagonMassTonnes).toBe(88.5);
    expect(calc.calculatedAxleLoadTonnes).toBe(14.75); // 88.5 / 6
    expect(calc.isCompliant).toBe(true);
    expect(calc.maxAllowedAxleLoadTonnes).toBe(22.5);
  });

  it("should flag overload if axle load exceeds Line Category A (16.0 t/axle)", () => {
    // 20t tare + 50t payload = 70t on 4 axles = 17.5 t/axle (> 16.0 t)
    const calc = RailPhysicsService.calculateAxleLoad(20.0, 50.0, 4, "A");
    expect(calc.calculatedAxleLoadTonnes).toBe(17.5);
    expect(calc.isCompliant).toBe(false);
    expect(calc.notes).toContain("EXCESO DE CARGA POR EJE");
  });

  it("should compute full train consist braking and length against 750m TEN-T limit", () => {
    const input: TrainConsistBrakingInput = {
      locomotiveLengthMeters: 23.0,
      locomotiveWeightTonnes: 123.0,
      locomotiveBrakedWeightTonnes: 110.0,
      maxAllowedLengthMeters: 750,
      requiredBrakePercentage: 65.0,
      corridorLineCategory: "D",
      wagons: [
        {
          wagonSeries: "Sggmrss 90'",
          tareWeightTonnes: 28.5,
          payloadMassTonnes: 50.0,
          lengthOverBuffersMeters: 29.59,
          brakedWeightTonnes: 80.0,
          numberOfAxles: 6,
        },
        {
          wagonSeries: "Sdggmrss T3000e",
          tareWeightTonnes: 34.0,
          payloadMassTonnes: 68.0,
          lengthOverBuffersMeters: 34.03,
          brakedWeightTonnes: 92.0,
          numberOfAxles: 6,
        },
      ],
    };

    const result = RailPhysicsService.calculateTrainConsistBraking(input);
    expect(result.wagonCount).toBe(2);
    expect(result.totalTrainLengthMeters).toBe(86.6); // 23 + 29.59 + 34.03 = 86.62 -> 86.6
    expect(result.isLengthCompliant).toBe(true);
    expect(result.totalGrossMassTonnes).toBe(303.5); // 123 + 78.5 + 102 = 303.5
    expect(result.totalBrakedMassTonnes).toBe(282.0); // 110 + 80 + 92 = 282
    expect(result.calculatedBrakePercentage).toBeGreaterThan(65.0);
    expect(result.isBrakeCompliant).toBe(true);
    expect(result.summaryStatus).toBe("READY_FOR_DISPATCH");
  });

  it("should flag when train length exceeds 750 meters", () => {
    const wagons = Array.from({ length: 26 }, () => ({
      wagonSeries: "Sdggmrss T3000e",
      tareWeightTonnes: 34.0,
      payloadMassTonnes: 60.0,
      lengthOverBuffersMeters: 34.0,
      brakedWeightTonnes: 90.0,
      numberOfAxles: 6,
    })); // 26 * 34m = 884m + 23m loco = 907m

    const input: TrainConsistBrakingInput = {
      maxAllowedLengthMeters: 750,
      wagons,
    };

    const result = RailPhysicsService.calculateTrainConsistBraking(input);
    expect(result.totalTrainLengthMeters).toBeGreaterThan(750);
    expect(result.isLengthCompliant).toBe(false);
    expect(result.summaryStatus).toBe("LENGTH_EXCEEDED");
  });
});
