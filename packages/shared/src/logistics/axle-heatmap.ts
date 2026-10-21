/**
 * @file axle-heatmap.ts
 * @description Physical axle load distribution, Kingpin coupling mechanics, and thermal stress heatmap
 * for 40' High Cube container chassis under Spanish RD 2822/1998 (44 t PMA) and US DOT Federal Bridge standards.
 */

export interface ChassisConfig {
  tareTractorKg: number;
  tareChassisKg: number;
  tareContainer40HcKg: number;
  containerLengthM: number;
  containerWidthM: number;
  containerHeightM: number;
  wheelbaseSemiM: number;
  distKpToContCenterM: number;
  tridemAxleSpacingM: number;
}

export const CHASSIS_CONFIG: ChassisConfig = {
  tareTractorKg: 7500, // Tractora 4x2: Eje 1 (4.900 kg), Eje 2 (2.600 kg)
  tareChassisKg: 4000, // Semirremolque porta-contenedor 3 ejes: Trídem (2.600 kg), Kingpin (1.400 kg)
  tareContainer40HcKg: 3850, // Tara estándar ISO 40' HC (45G1)
  containerLengthM: 12.032,
  containerWidthM: 2.352,
  containerHeightM: 2.698,
  wheelbaseSemiM: 8.1, // Distancia pivote Kingpin al centro geométrico del trídem
  distKpToContCenterM: 5.45, // Posición teórica del centro del contenedor respecto al Kingpin
  tridemAxleSpacingM: 1.31, // Separación estándar entre ejes del trídem
};

export interface AxleLimits {
  maxAxle1SteerKg: number;
  maxAxle2DriveKg: number;
  maxKingpinKg: number;
  maxAxle3Tridem1Kg: number;
  maxAxle4Tridem2Kg: number;
  maxAxle5Tridem3Kg: number;
  maxTridemTotalKg: number;
  maxTotalComboPmaKg: number;
  maxPayloadNetKg: number;
}

export const LIMITS_ES_44T: AxleLimits = {
  maxAxle1SteerKg: 7500, // Eje 1 (Directriz tractora): 7.5 t
  maxAxle2DriveKg: 11500, // Eje 2 (Motriz tractora): 11.5 t legal
  maxKingpinKg: 12000, // Quinta rueda: 12.0 t
  maxAxle3Tridem1Kg: 8000, // Eje 3: 8.0 t
  maxAxle4Tridem2Kg: 8000, // Eje 4: 8.0 t
  maxAxle5Tridem3Kg: 8000, // Eje 5: 8.0 t
  maxTridemTotalKg: 24000, // Trídem completo: 24.0 t legal
  maxTotalComboPmaKg: 44000, // Conjunto 5 ejes: 44.0 t legal
  maxPayloadNetKg: 26500, // Baseline neto Customer01 RD 2822/1998
};

export const LIMITS_USA: AxleLimits = {
  maxAxle1SteerKg: 5443, // 12.000 lbs
  maxAxle2DriveKg: 9072, // 20.000 lbs
  maxKingpinKg: 10000,
  maxAxle3Tridem1Kg: 6000,
  maxAxle4Tridem2Kg: 6000,
  maxAxle5Tridem3Kg: 6000,
  maxTridemTotalKg: 15422, // 34.000 lbs
  maxTotalComboPmaKg: 36287, // 80.000 lbs
  maxPayloadNetKg: 20500, // 20.5 t neto
};

export interface AxleDetail {
  axleNumber: number;
  name: string;
  actualLoadKg: number;
  maxAllowedKg: number;
  utilizationPercent: number;
  status: "LEGAL" | "WARNING" | "OVERLOAD";
}

export interface HeatmapCell {
  xIndex: number;
  yIndex: number;
  xRangeM: [number, number];
  yRangeM: [number, number];
  weightKg: number;
  stressFactor: number; // 0.0 to 1.0+
  stressLevel: "LOW" | "OPTIMAL" | "ELEVATED" | "CRITICAL";
}

export interface AxleCalculationResult {
  isUsa: boolean;
  totalNetPayloadKg: number;
  totalGrossComboKg: number;
  actualCenterOfGravityM: { x: number; y: number };
  deltaXMeters: number;
  kingpinLoadKg: number;
  tridemTotalLoadKg: number;
  axles: AxleDetail[];
  isFullyLegal: boolean;
  infractions: string[];
  heatmapGrid: HeatmapCell[][];
}

export interface CoilPositionInput {
  coilId: string;
  weightKg: number;
  xPositionM: number;
  yPositionM: number;
}

/**
 * Calculates physical axle weight distributions and stress heatmap across the container floor.
 */
export function calculateAxleLoadsAndHeatmap(
  coils: CoilPositionInput[],
  isUsa: boolean = false,
): AxleCalculationResult {
  const limits = isUsa ? LIMITS_USA : LIMITS_ES_44T;
  const cfg = CHASSIS_CONFIG;

  const totalNetPayloadKg = coils.reduce(
    (acc, c) => acc + (c.weightKg || 0),
    0,
  );

  // Compute 2D Center of Gravity
  let gxM = cfg.containerLengthM / 2; // 6.016 m
  let gyM = cfg.containerWidthM / 2; // 1.176 m

  if (coils.length > 0 && totalNetPayloadKg > 0) {
    const sumWX = coils.reduce((acc, c) => acc + c.weightKg * c.xPositionM, 0);
    const sumWY = coils.reduce((acc, c) => acc + c.weightKg * c.yPositionM, 0);
    gxM = Number((sumWX / totalNetPayloadKg).toFixed(3));
    gyM = Number((sumWY / totalNetPayloadKg).toFixed(3));
  }

  const deltaXMeters = Number((gxM - 6.016).toFixed(3));

  // Distance of cargo CG from Kingpin pivot
  // Front of container is located at (distKpToContCenterM - 6.016) from Kingpin
  const contFrontFromKp = cfg.distKpToContCenterM - 6.016;
  const cargoCGFromKp = contFrontFromKp + gxM;

  // Moment balance on semitrailer:
  // F_tridem * wheelbase = (grossContainer) * cargoCGFromKp + (tareChassis_moment)
  const grossContainerKg = totalNetPayloadKg + cfg.tareContainer40HcKg;

  // Load transferred to Trídem from container and cargo
  const tridemFromContainerKg =
    (grossContainerKg * cargoCGFromKp) / cfg.wheelbaseSemiM;
  const kingpinFromContainerKg = grossContainerKg - tridemFromContainerKg;

  // Semitrailer chassis tare split (2600 kg to tridem, 1400 kg to kingpin)
  const chassisTareTridemKg = 2600;
  const chassisTareKingpinKg = 1400;

  const totalTridemLoadKg = Math.round(
    tridemFromContainerKg + chassisTareTridemKg,
  );
  const totalKingpinLoadKg = Math.round(
    kingpinFromContainerKg + chassisTareKingpinKg,
  );

  // Tractor load distribution (Wheelbase 3.6m standard 4x2)
  // Tractor tare: Steer 4900 kg, Drive 2600 kg
  // Kingpin is typically 0.35m ahead of rear drive axle
  const kingpinToDriveOffsetM = 0.35;
  const tractorWheelbaseM = 3.6;

  const kpToSteerKg =
    (totalKingpinLoadKg * kingpinToDriveOffsetM) / tractorWheelbaseM;
  const kpToDriveKg = totalKingpinLoadKg - kpToSteerKg;

  const axle1SteerKg = Math.round(4900 + kpToSteerKg);
  const axle2DriveKg = Math.round(2600 + kpToDriveKg);

  // Distribute tridem load across 3 axles with realistic minor front/rear gradient
  const axle3Tridem1Kg = Math.round(totalTridemLoadKg * 0.33);
  const axle4Tridem2Kg = Math.round(totalTridemLoadKg * 0.34);
  const axle5Tridem3Kg = Math.round(totalTridemLoadKg * 0.33);

  const totalGrossComboKg = axle1SteerKg + axle2DriveKg + totalTridemLoadKg;

  // Build axle breakdown
  const axles: AxleDetail[] = [
    {
      axleNumber: 1,
      name: "Eje 1: Directriz Tractora",
      actualLoadKg: axle1SteerKg,
      maxAllowedKg: limits.maxAxle1SteerKg,
      utilizationPercent: Number(
        ((axle1SteerKg / limits.maxAxle1SteerKg) * 100).toFixed(1),
      ),
      status:
        axle1SteerKg > limits.maxAxle1SteerKg
          ? "OVERLOAD"
          : axle1SteerKg > limits.maxAxle1SteerKg * 0.9
            ? "WARNING"
            : "LEGAL",
    },
    {
      axleNumber: 2,
      name: "Eje 2: Motriz Tractora",
      actualLoadKg: axle2DriveKg,
      maxAllowedKg: limits.maxAxle2DriveKg,
      utilizationPercent: Number(
        ((axle2DriveKg / limits.maxAxle2DriveKg) * 100).toFixed(1),
      ),
      status:
        axle2DriveKg > limits.maxAxle2DriveKg
          ? "OVERLOAD"
          : axle2DriveKg > limits.maxAxle2DriveKg * 0.9
            ? "WARNING"
            : "LEGAL",
    },
    {
      axleNumber: 3,
      name: "Eje 3: 1er Eje Trídem Semirremolque",
      actualLoadKg: axle3Tridem1Kg,
      maxAllowedKg: limits.maxAxle3Tridem1Kg,
      utilizationPercent: Number(
        ((axle3Tridem1Kg / limits.maxAxle3Tridem1Kg) * 100).toFixed(1),
      ),
      status: axle3Tridem1Kg > limits.maxAxle3Tridem1Kg ? "OVERLOAD" : "LEGAL",
    },
    {
      axleNumber: 4,
      name: "Eje 4: 2º Eje Trídem Semirremolque",
      actualLoadKg: axle4Tridem2Kg,
      maxAllowedKg: limits.maxAxle4Tridem2Kg,
      utilizationPercent: Number(
        ((axle4Tridem2Kg / limits.maxAxle4Tridem2Kg) * 100).toFixed(1),
      ),
      status: axle4Tridem2Kg > limits.maxAxle4Tridem2Kg ? "OVERLOAD" : "LEGAL",
    },
    {
      axleNumber: 5,
      name: "Eje 5: 3er Eje Trídem Semirremolque",
      actualLoadKg: axle5Tridem3Kg,
      maxAllowedKg: limits.maxAxle5Tridem3Kg,
      utilizationPercent: Number(
        ((axle5Tridem3Kg / limits.maxAxle5Tridem3Kg) * 100).toFixed(1),
      ),
      status: axle5Tridem3Kg > limits.maxAxle5Tridem3Kg ? "OVERLOAD" : "LEGAL",
    },
  ];

  // Infractions analysis
  const infractions: string[] = [];
  if (totalNetPayloadKg > limits.maxPayloadNetKg) {
    infractions.push(
      `Carga neta (${totalNetPayloadKg.toLocaleString()} kg) excede el límite legal de ${limits.maxPayloadNetKg.toLocaleString()} kg.`,
    );
  }
  if (totalGrossComboKg > limits.maxTotalComboPmaKg) {
    infractions.push(
      `PMA del conjunto (${totalGrossComboKg.toLocaleString()} kg) excede los ${limits.maxTotalComboPmaKg.toLocaleString()} kg legales.`,
    );
  }
  if (axle1SteerKg > limits.maxAxle1SteerKg) {
    infractions.push(
      `Eje 1 Directriz sobrecargado (${axle1SteerKg} kg > ${limits.maxAxle1SteerKg} kg).`,
    );
  }
  if (axle2DriveKg > limits.maxAxle2DriveKg) {
    infractions.push(
      `Eje 2 Motriz sobrecargado (${axle2DriveKg} kg > ${limits.maxAxle2DriveKg} kg).`,
    );
  }
  if (totalTridemLoadKg > limits.maxTridemTotalKg) {
    infractions.push(
      `Trídem de semirremolque sobrecargado (${totalTridemLoadKg} kg > ${limits.maxTridemTotalKg} kg).`,
    );
  }

  // Generate 2D Floor Stress Heatmap (10 longitudinal segments x 3 lateral lanes)
  const X_SEGMENTS = 10;
  const Y_LANES = 3;
  const segLength = cfg.containerLengthM / X_SEGMENTS;
  const laneWidth = cfg.containerWidthM / Y_LANES;

  const heatmapGrid: HeatmapCell[][] = [];

  for (let x = 0; x < X_SEGMENTS; x++) {
    const xMin = Number((x * segLength).toFixed(3));
    const xMax = Number(((x + 1) * segLength).toFixed(3));
    const row: HeatmapCell[] = [];

    for (let y = 0; y < Y_LANES; y++) {
      const yMin = Number((y * laneWidth).toFixed(3));
      const yMax = Number(((y + 1) * laneWidth).toFixed(3));

      // Sum coils whose center falls inside this grid cell
      const cellWeight = coils
        .filter(
          (c) =>
            c.xPositionM >= xMin &&
            c.xPositionM < xMax &&
            c.yPositionM >= yMin &&
            c.yPositionM < yMax,
        )
        .reduce((acc, c) => acc + c.weightKg, 0);

      // Floor capacity is roughly 4,500 kg per grid cell
      const maxCellNominal = 4500;
      const stressFactor = Number((cellWeight / maxCellNominal).toFixed(2));

      let stressLevel: "LOW" | "OPTIMAL" | "ELEVATED" | "CRITICAL" = "LOW";
      if (stressFactor > 1.0) stressLevel = "CRITICAL";
      else if (stressFactor > 0.75) stressLevel = "ELEVATED";
      else if (stressFactor > 0.3) stressLevel = "OPTIMAL";

      row.push({
        xIndex: x,
        yIndex: y,
        xRangeM: [xMin, xMax],
        yRangeM: [yMin, yMax],
        weightKg: cellWeight,
        stressFactor,
        stressLevel,
      });
    }
    heatmapGrid.push(row);
  }

  return {
    isUsa,
    totalNetPayloadKg,
    totalGrossComboKg,
    actualCenterOfGravityM: { x: gxM, y: gyM },
    deltaXMeters,
    kingpinLoadKg: totalKingpinLoadKg,
    tridemTotalLoadKg: totalTridemLoadKg,
    axles,
    isFullyLegal: infractions.length === 0,
    infractions,
    heatmapGrid,
  };
}
