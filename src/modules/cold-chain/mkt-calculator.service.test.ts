import { describe, it, expect } from "vitest";
import {
  MktCalculatorService,
  MktEvaluationInput,
} from "./mkt-calculator.service.js";

describe("MktCalculatorService (Arrhenius Mean Kinetic Temperature)", () => {
  it("should calculate identical MKT when temperatures are constant", () => {
    const temps = [5.0, 5.0, 5.0, 5.0, 5.0];
    const result = MktCalculatorService.calculateMkt(temps);
    expect(result.mktCelsius).toBe(5.0);
    expect(result.mktKelvin).toBe(278.15);
  });

  it("should weight higher temperatures more heavily in MKT calculation", () => {
    // 4 readings at 4.0°C and 1 spike at 10.0°C
    const temps = [4.0, 4.0, 4.0, 4.0, 10.0];
    const arithmeticMean = (4 * 4 + 10) / 5; // 5.2°C
    const result = MktCalculatorService.calculateMkt(temps);

    // MKT should be higher than the arithmetic mean due to the exponential Arrhenius curve
    expect(result.mktCelsius).toBeGreaterThan(arithmeticMean);
    expect(result.mktCelsius).toBe(5.6);
  });

  it("should evaluate a compliant +2°C to +8°C shipment with RELEASED verdict", () => {
    const input: MktEvaluationInput = {
      readings: [
        { celsius: 4.5, durationMinutes: 60 },
        { celsius: 5.0, durationMinutes: 60 },
        { celsius: 5.2, durationMinutes: 60 },
        { celsius: 4.8, durationMinutes: 60 },
      ],
      minAllowedCelsius: 2.0,
      maxAllowedCelsius: 8.0,
      targetCelsius: 5.0,
    };

    const evaluation = MktCalculatorService.evaluateShipment(input);
    expect(evaluation.isCompliant).toBe(true);
    expect(evaluation.excursionStatus).toBe("COMPLIANT");
    expect(evaluation.recommendedVerdict).toBe("RELEASED_FOR_DISTRIBUTION");
    expect(evaluation.totalExcursionMinutes).toBe(0);
  });

  it("should classify minor excursion within tolerance as MINOR_EXCURSION with RELEASED verdict", () => {
    const input: MktEvaluationInput = {
      readings: [
        { celsius: 5.0, durationMinutes: 60 },
        { celsius: 8.3, durationMinutes: 15 }, // Brief 15 min spike
        { celsius: 5.1, durationMinutes: 60 },
      ],
      minAllowedCelsius: 2.0,
      maxAllowedCelsius: 8.0,
      targetCelsius: 5.0,
    };

    const evaluation = MktCalculatorService.evaluateShipment(input);
    expect(evaluation.excursionStatus).toBe("MINOR_EXCURSION");
    expect(evaluation.recommendedVerdict).toBe("RELEASED_FOR_DISTRIBUTION");
    expect(evaluation.totalExcursionMinutes).toBe(15);
  });

  it("should classify prolonged critical excursion as CRITICAL_EXCURSION with QUARANTINE verdict", () => {
    const input: MktEvaluationInput = {
      readings: [
        { celsius: 20.0, durationMinutes: 60 },
        { celsius: 28.5, durationMinutes: 180 }, // 3h excursion above 25°C
        { celsius: 20.2, durationMinutes: 60 },
      ],
      minAllowedCelsius: 15.0,
      maxAllowedCelsius: 25.0,
      targetCelsius: 20.0,
    };

    const evaluation = MktCalculatorService.evaluateShipment(input);
    expect(evaluation.excursionStatus).toBe("CRITICAL_EXCURSION");
    expect(evaluation.recommendedVerdict).toBe("QUARANTINE_INVESTIGATION");
    expect(evaluation.totalExcursionMinutes).toBe(180);
  });
});
