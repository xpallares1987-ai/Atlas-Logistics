/**
 * RailPhysicsService
 *
 * 100% Deterministic Railway Dynamics, Axle Load & Braking Physics Engine (EN 15528 & UIC 992 / TEN-T 750m).
 * Computes wagon axle loads, line category compliance, train consist length, and statutory brake percentages.
 */

export type UicLineCategory = "A" | "B" | "C" | "D";

export interface AxleLoadCalculation {
  wagonTareTonnes: number;
  payloadTonnes: number;
  grossWagonMassTonnes: number;
  numberOfAxles: number;
  calculatedAxleLoadTonnes: number;
  maxAllowedAxleLoadTonnes: number;
  isCompliant: boolean;
  notes: string;
}

export interface WagonConsistItem {
  wagonSeries: string;
  tareWeightTonnes: number;
  payloadMassTonnes: number;
  lengthOverBuffersMeters: number;
  brakedWeightTonnes: number;
  numberOfAxles: number;
}

export interface TrainConsistBrakingInput {
  locomotiveLengthMeters?: number; // Default: 23.0m
  locomotiveWeightTonnes?: number; // Default: 123.0t
  locomotiveBrakedWeightTonnes?: number; // Default: 110.0t
  maxAllowedLengthMeters?: number; // Default: 750m
  requiredBrakePercentage?: number; // Default: 65.0%
  corridorLineCategory?: UicLineCategory; // Default: 'D' (22.5 t/axle)
  wagons: WagonConsistItem[];
}

export interface TrainConsistBrakingResult {
  wagonCount: number;
  totalTrainLengthMeters: number;
  maxAllowedLengthMeters: number;
  isLengthCompliant: boolean;
  totalGrossMassTonnes: number;
  totalBrakedMassTonnes: number;
  calculatedBrakePercentage: number;
  requiredBrakePercentage: number;
  isBrakeCompliant: boolean;
  averageAxleLoadTonnes: number;
  maxWagonAxleLoadTonnes: number;
  isAllAxlesCompliant: boolean;
  summaryStatus:
    | "READY_FOR_DISPATCH"
    | "BRAKE_DEFICIT"
    | "LENGTH_EXCEEDED"
    | "AXLE_OVERLOAD";
  notes: string;
}

export class RailPhysicsService {
  // UIC Line Category Max Axle Loads (EN 15528)
  public static readonly UIC_AXLE_LIMITS: Record<UicLineCategory, number> = {
    A: 16.0,
    B: 18.0,
    C: 20.0,
    D: 22.5,
  };

  /**
   * Computes axle load distribution for an individual wagon and validates against line category.
   */
  public static calculateAxleLoad(
    wagonTareTonnes: number,
    payloadTonnes: number,
    numberOfAxles: number = 4,
    lineCategory: UicLineCategory = "D",
  ): AxleLoadCalculation {
    const tare = Math.max(0, wagonTareTonnes);
    const payload = Math.max(0, payloadTonnes);
    const axles = Math.max(2, numberOfAxles);
    const maxLimit = this.UIC_AXLE_LIMITS[lineCategory] || 22.5;

    const grossWagonMassTonnes = Number((tare + payload).toFixed(2));
    const calculatedAxleLoadTonnes = Number(
      (grossWagonMassTonnes / axles).toFixed(2),
    );
    const isCompliant = calculatedAxleLoadTonnes <= maxLimit;

    const notes = isCompliant
      ? `Carga por eje conforme (${calculatedAxleLoadTonnes} t/eje <= ${maxLimit} t/eje Categoría ${lineCategory}).`
      : `EXCESO DE CARGA POR EJE: ${calculatedAxleLoadTonnes} t/eje excede el límite máximo de ${maxLimit} t/eje (Línea Categoría ${lineCategory}).`;

    return {
      wagonTareTonnes: tare,
      payloadTonnes: payload,
      grossWagonMassTonnes,
      numberOfAxles: axles,
      calculatedAxleLoadTonnes,
      maxAllowedAxleLoadTonnes: maxLimit,
      isCompliant,
      notes,
    };
  }

  /**
   * Computes complete train consist dynamics: length, gross mass, total braked weight and brake percentage.
   */
  public static calculateTrainConsistBraking(
    input: TrainConsistBrakingInput,
  ): TrainConsistBrakingResult {
    const locoLen = input.locomotiveLengthMeters ?? 23.0;
    const locoWeight = input.locomotiveWeightTonnes ?? 123.0;
    const locoBrake = input.locomotiveBrakedWeightTonnes ?? 110.0;
    const maxLen = input.maxAllowedLengthMeters ?? 750;
    const reqBrake = input.requiredBrakePercentage ?? 65.0;
    const lineCat = input.corridorLineCategory ?? "D";
    const maxAxleLimit = this.UIC_AXLE_LIMITS[lineCat];

    let wagonsLength = 0;
    let wagonsGrossWeight = 0;
    let wagonsBrakedWeight = 0;
    let totalAxles = 6; // Locomotive standard 6 axles (Co-Co)
    let maxWagonAxleLoad = 0;
    let isAllAxlesCompliant = true;

    for (const w of input.wagons) {
      const wGross = w.tareWeightTonnes + w.payloadMassTonnes;
      wagonsLength += w.lengthOverBuffersMeters;
      wagonsGrossWeight += wGross;
      wagonsBrakedWeight += w.brakedWeightTonnes;
      totalAxles += w.numberOfAxles;

      const wAxleLoad = wGross / w.numberOfAxles;
      if (wAxleLoad > maxWagonAxleLoad) {
        maxWagonAxleLoad = Number(wAxleLoad.toFixed(2));
      }
      if (wAxleLoad > maxAxleLimit) {
        isAllAxlesCompliant = false;
      }
    }

    const totalTrainLengthMeters = Number((locoLen + wagonsLength).toFixed(1));
    const totalGrossMassTonnes = Number(
      (locoWeight + wagonsGrossWeight).toFixed(1),
    );
    const totalBrakedMassTonnes = Number(
      (locoBrake + wagonsBrakedWeight).toFixed(1),
    );

    const calculatedBrakePercentage =
      totalGrossMassTonnes > 0
        ? Number(
            ((totalBrakedMassTonnes / totalGrossMassTonnes) * 100).toFixed(2),
          )
        : 0.0;

    const isLengthCompliant = totalTrainLengthMeters <= maxLen;
    const isBrakeCompliant = calculatedBrakePercentage >= reqBrake;
    const averageAxleLoadTonnes =
      totalAxles > 0
        ? Number((totalGrossMassTonnes / totalAxles).toFixed(2))
        : 0;

    let summaryStatus: TrainConsistBrakingResult["summaryStatus"] =
      "READY_FOR_DISPATCH";
    let notes = `Tren bloque validado para expedición. Longitud: ${totalTrainLengthMeters}m / ${maxLen}m, Masa frenada: ${calculatedBrakePercentage}% (Mínimo: ${reqBrake}%).`;

    if (!isLengthCompliant) {
      summaryStatus = "LENGTH_EXCEEDED";
      notes = `LONGITUD EXCEDIDA: El convoy mide ${totalTrainLengthMeters}m superando el límite de ${maxLen}m de la Red TEN-T.`;
    } else if (!isBrakeCompliant) {
      summaryStatus = "BRAKE_DEFICIT";
      notes = `DÉFICIT DE FRENADO: Porcentaje calculado de ${calculatedBrakePercentage}% inferior al ${reqBrake}% requerido por el surco.`;
    } else if (!isAllAxlesCompliant) {
      summaryStatus = "AXLE_OVERLOAD";
      notes = `SOBRECARGA POR EJE: Hay vagones con hasta ${maxWagonAxleLoad} t/eje superando el límite de ${maxAxleLimit} t/eje (Categoría ${lineCat}).`;
    }

    return {
      wagonCount: input.wagons.length,
      totalTrainLengthMeters,
      maxAllowedLengthMeters: maxLen,
      isLengthCompliant,
      totalGrossMassTonnes,
      totalBrakedMassTonnes,
      calculatedBrakePercentage,
      requiredBrakePercentage: reqBrake,
      isBrakeCompliant,
      averageAxleLoadTonnes,
      maxWagonAxleLoadTonnes: maxWagonAxleLoad,
      isAllAxlesCompliant,
      summaryStatus,
      notes,
    };
  }
}
