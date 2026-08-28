/**
 * MktCalculatorService
 *
 * 100% Deterministic Mean Kinetic Temperature (MKT) and Thermal Excursion Engine.
 * Implements the standard Arrhenius kinetics equation for pharmaceutical stability evaluation (EU GDP / USP <1079> / WHO).
 */

export interface TemperaturePoint {
  celsius: number;
  timestamp?: string;
  durationMinutes?: number; // Default: 60 min if interval is hourly
}

export interface MktEvaluationInput {
  readings: TemperaturePoint[];
  minAllowedCelsius: number;
  maxAllowedCelsius: number;
  targetCelsius: number;
  activationEnergyJPerMol?: number; // Default: 83,144.72 J/mol (standard for pharma)
}

export interface MktEvaluationResult {
  mktCelsius: number;
  mktKelvin: number;
  minRecordedCelsius: number;
  maxRecordedCelsius: number;
  avgRecordedCelsius: number;
  totalExcursionMinutes: number;
  excursionCount: number;
  isCompliant: boolean;
  excursionStatus: "COMPLIANT" | "MINOR_EXCURSION" | "CRITICAL_EXCURSION";
  recommendedVerdict:
    | "RELEASED_FOR_DISTRIBUTION"
    | "QUARANTINE_INVESTIGATION"
    | "REJECTED_DISPOSAL";
  stabilityAuditNotes: string;
}

export class MktCalculatorService {
  // Constants for standard Arrhenius equation
  public static readonly DELTA_H_ACTIVATION = 83144.72; // J/mol (USP / WHO standard)
  public static readonly GAS_CONSTANT_R = 8.314472; // J/(mol·K)
  public static readonly KELVIN_OFFSET = 273.15;

  /**
   * Calculates Mean Kinetic Temperature (MKT) in Celsius and Kelvin from an array of temperature readings.
   */
  public static calculateMkt(
    temperaturesCelsius: number[],
    activationEnergy: number = this.DELTA_H_ACTIVATION,
  ): { mktCelsius: number; mktKelvin: number } {
    if (!temperaturesCelsius || temperaturesCelsius.length === 0) {
      return { mktCelsius: 0, mktKelvin: 0 };
    }

    const n = temperaturesCelsius.length;
    const deltaHOverR = activationEnergy / this.GAS_CONSTANT_R;

    let sumExp = 0;
    for (const tempC of temperaturesCelsius) {
      const tempK = tempC + this.KELVIN_OFFSET;
      sumExp += Math.exp(-deltaHOverR / tempK);
    }

    const meanExp = sumExp / n;
    const mktKelvin = deltaHOverR / -Math.log(meanExp);
    const mktCelsius = Number((mktKelvin - this.KELVIN_OFFSET).toFixed(2));

    return {
      mktCelsius,
      mktKelvin: Number(mktKelvin.toFixed(2)),
    };
  }

  /**
   * Evaluates a complete series of temperature telemetry readings against regulated GDP profile limits.
   */
  public static evaluateShipment(
    input: MktEvaluationInput,
  ): MktEvaluationResult {
    const readings = input.readings || [];
    if (readings.length === 0) {
      return {
        mktCelsius: input.targetCelsius,
        mktKelvin: input.targetCelsius + this.KELVIN_OFFSET,
        minRecordedCelsius: input.targetCelsius,
        maxRecordedCelsius: input.targetCelsius,
        avgRecordedCelsius: input.targetCelsius,
        totalExcursionMinutes: 0,
        excursionCount: 0,
        isCompliant: true,
        excursionStatus: "COMPLIANT",
        recommendedVerdict: "RELEASED_FOR_DISTRIBUTION",
        stabilityAuditNotes: "Sin lecturas térmicas registradas.",
      };
    }

    const temps = readings.map((r) => r.celsius);
    const { mktCelsius, mktKelvin } = this.calculateMkt(
      temps,
      input.activationEnergyJPerMol,
    );

    const minRecorded = Math.min(...temps);
    const maxRecorded = Math.max(...temps);
    const avgRecorded = Number(
      (temps.reduce((acc, v) => acc + v, 0) / temps.length).toFixed(2),
    );

    let totalExcursionMinutes = 0;
    let excursionCount = 0;
    let maxBreachDelta = 0;

    for (const r of readings) {
      const isBelow = r.celsius < input.minAllowedCelsius;
      const isAbove = r.celsius > input.maxAllowedCelsius;

      if (isBelow || isAbove) {
        excursionCount++;
        const duration = r.durationMinutes ?? 60;
        totalExcursionMinutes += duration;

        const breach = isBelow
          ? input.minAllowedCelsius - r.celsius
          : r.celsius - input.maxAllowedCelsius;
        if (breach > maxBreachDelta) {
          maxBreachDelta = breach;
        }
      }
    }

    // Determine Excursion Classification & GDP Verdict
    let excursionStatus: MktEvaluationResult["excursionStatus"] = "COMPLIANT";
    let recommendedVerdict: MktEvaluationResult["recommendedVerdict"] =
      "RELEASED_FOR_DISTRIBUTION";
    let stabilityAuditNotes = "";

    if (excursionCount === 0) {
      excursionStatus = "COMPLIANT";
      recommendedVerdict = "RELEASED_FOR_DISTRIBUTION";
      stabilityAuditNotes = `Cadena de frío 100% íntegra. MKT calculado: ${mktCelsius}°C (Rango regulado: ${input.minAllowedCelsius}°C a ${input.maxAllowedCelsius}°C). Aprobado para liberación farmacéutica inmediata.`;
    } else if (
      totalExcursionMinutes <= 60 &&
      maxBreachDelta <= 1.5 &&
      mktCelsius >= input.minAllowedCelsius &&
      mktCelsius <= input.maxAllowedCelsius
    ) {
      excursionStatus = "MINOR_EXCURSION";
      recommendedVerdict = "RELEASED_FOR_DISTRIBUTION";
      stabilityAuditNotes = `Excursión térmica menor detectada (${totalExcursionMinutes} min acumulados, desviación máx +${maxBreachDelta.toFixed(
        1,
      )}°C). MKT global de ${mktCelsius}°C se mantiene dentro del rango seguro. Dictamen favorable de estabilidad.`;
    } else {
      excursionStatus = "CRITICAL_EXCURSION";
      recommendedVerdict =
        maxBreachDelta > 5.0 || totalExcursionMinutes > 240
          ? "REJECTED_DISPOSAL"
          : "QUARANTINE_INVESTIGATION";
      stabilityAuditNotes = `Excursión térmica crítica (${totalExcursionMinutes} min fuera de rango, desviación máx ${maxBreachDelta.toFixed(
        1,
      )}°C, MKT: ${mktCelsius}°C). El lote requiere retención en CUARENTENA y análisis de estabilidad acelerada o rechazo.`;
    }

    return {
      mktCelsius,
      mktKelvin,
      minRecordedCelsius: Number(minRecorded.toFixed(2)),
      maxRecordedCelsius: Number(maxRecorded.toFixed(2)),
      avgRecordedCelsius: avgRecorded,
      totalExcursionMinutes,
      excursionCount,
      isCompliant: excursionStatus === "COMPLIANT",
      excursionStatus,
      recommendedVerdict,
      stabilityAuditNotes,
    };
  }
}
