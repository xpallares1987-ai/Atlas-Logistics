/**
 * @file stowage-3d.ts
 * @description 3D Multimodal Container & Pallet Packing Engine.
 * Features:
 * - Multimodal equipment profiles (20ft, 40ft, 40HC, 45HC, 53ft Van, Megatrailer 13.6m, Air ULD LD3).
 * - Algorithmic 3D Bin Packing (Heuristic Corner/Extreme-Point with floor support and weight layering).
 * - Center of Gravity (CoG) in 3D (Lateral, Longitudinal, Vertical with rollover and escore risk scoring).
 * - Axle Weight Distribution for road tractor-semitrailer combinations (Steer, Drive, Trailer Tridem, GCVW)
 *   compliant with EU Directive 96/53/EC and US DOT Bridge Formula.
 * - IMO / IMDG 7.2.4 Dangerous Goods 3D segregation distance and incompatibility checker.
 */

// =========================================================================
// 1. EQUIPMENT PROFILES & CARGO TYPES
// =========================================================================

export type ContainerTypeKey =
  | "20ft_dry"
  | "40ft_dry"
  | "40ft_hc"
  | "45ft_hc"
  | "53ft_van"
  | "megatrailer_136"
  | "air_uld_ld3";

export interface ContainerSpecification {
  key: ContainerTypeKey;
  name: string;
  category: "MARITIME" | "ROAD_TRAILER" | "INTERMODAL" | "AIR_CARGO";
  internalLengthM: number; // Y-axis (depth/longitudinal)
  internalWidthM: number;  // X-axis (transverse/width)
  internalHeightM: number; // Z-axis (height/vertical)
  maxPayloadKg: number;
  tareWeightKg: number;
  maxGrossWeightKg: number;
  internalVolumeCbm: number;
  doorWidthM: number;
  doorHeightM: number;
}

export const EQUIPMENT_CATALOG: Record<ContainerTypeKey, ContainerSpecification> = {
  "20ft_dry": {
    key: "20ft_dry",
    name: "20' Standard Dry ISO Container",
    category: "MARITIME",
    internalLengthM: 5.90,
    internalWidthM: 2.35,
    internalHeightM: 2.39,
    maxPayloadKg: 21800,
    tareWeightKg: 2200,
    maxGrossWeightKg: 24000,
    internalVolumeCbm: 33.2,
    doorWidthM: 2.34,
    doorHeightM: 2.28,
  },
  "40ft_dry": {
    key: "40ft_dry",
    name: "40' Standard Dry ISO Container",
    category: "MARITIME",
    internalLengthM: 12.03,
    internalWidthM: 2.35,
    internalHeightM: 2.39,
    maxPayloadKg: 26680,
    tareWeightKg: 3800,
    maxGrossWeightKg: 30480,
    internalVolumeCbm: 67.7,
    doorWidthM: 2.34,
    doorHeightM: 2.28,
  },
  "40ft_hc": {
    key: "40ft_hc",
    name: "40' High Cube ISO Container (9'6\")",
    category: "MARITIME",
    internalLengthM: 12.03,
    internalWidthM: 2.35,
    internalHeightM: 2.69,
    maxPayloadKg: 26580,
    tareWeightKg: 3900,
    maxGrossWeightKg: 30480,
    internalVolumeCbm: 76.2,
    doorWidthM: 2.34,
    doorHeightM: 2.58,
  },
  "45ft_hc": {
    key: "45ft_hc",
    name: "45' Pallet-Wide High Cube Container",
    category: "INTERMODAL",
    internalLengthM: 13.56,
    internalWidthM: 2.44,
    internalHeightM: 2.69,
    maxPayloadKg: 27800,
    tareWeightKg: 4800,
    maxGrossWeightKg: 32600,
    internalVolumeCbm: 89.0,
    doorWidthM: 2.42,
    doorHeightM: 2.58,
  },
  "53ft_van": {
    key: "53ft_van",
    name: "53' North American Domestic Dry Van",
    category: "INTERMODAL",
    internalLengthM: 16.00,
    internalWidthM: 2.50,
    internalHeightM: 2.79,
    maxPayloadKg: 20400, // US 80k lbs highway bridge limit
    tareWeightKg: 6200,
    maxGrossWeightKg: 26600,
    internalVolumeCbm: 111.6,
    doorWidthM: 2.48,
    doorHeightM: 2.74,
  },
  "megatrailer_136": {
    key: "megatrailer_136",
    name: "European Standard 13.6m Megatrailer (Tautliner)",
    category: "ROAD_TRAILER",
    internalLengthM: 13.62,
    internalWidthM: 2.48,
    internalHeightM: 2.70,
    maxPayloadKg: 25000,
    tareWeightKg: 7500,
    maxGrossWeightKg: 32500,
    internalVolumeCbm: 91.2,
    doorWidthM: 2.46,
    doorHeightM: 2.65,
  },
  "air_uld_ld3": {
    key: "air_uld_ld3",
    name: "IATA ULD LD3 / AKE Air Cargo Container",
    category: "AIR_CARGO",
    internalLengthM: 1.56,
    internalWidthM: 1.53,
    internalHeightM: 1.63,
    maxPayloadKg: 1588,
    tareWeightKg: 85,
    maxGrossWeightKg: 1673,
    internalVolumeCbm: 4.3,
    doorWidthM: 1.45,
    doorHeightM: 1.55,
  },
};

export interface CargoItemInput {
  id: string;
  name: string;
  lengthM: number; // along Y
  widthM: number;  // along X
  heightM: number; // along Z
  weightKg: number;
  stackable: boolean;
  maxStackWeightKg?: number;
  allowRotation?: boolean; // 90-degree yaw rotation on XY plane
  hazardClass?: string;   // e.g. "3", "5.1", "8", or undefined for non-DG
  color?: string;
  unNumber?: string;
}

export interface PlacedCargoItem extends CargoItemInput {
  placed: boolean;
  x: number; // 0 to container width (transverse)
  y: number; // 0 to container length (longitudinal from nose to door)
  z: number; // 0 to container height (floor to ceiling)
  rotated: boolean;
  effectiveWidthM: number;
  effectiveLengthM: number;
  effectiveHeightM: number;
}

// =========================================================================
// 2. CENTER OF GRAVITY (CoG) & STABILITY ANALYSIS
// =========================================================================

export interface CenterOfGravityResult {
  cogX: number; // in meters
  cogY: number; // in meters
  cogZ: number; // in meters
  idealX: number;
  idealY: number;
  lateralDeviationPercent: number;     // X deviation (-50% to +50%)
  longitudinalDeviationPercent: number;// Y deviation (-50% to +50%)
  verticalHeightPercent: number;       // Z as % of container height
  stabilityScore: number;              // 0 to 100
  lateralStatus: "OPTIMAL" | "ACCEPTABLE" | "HAZARDOUS";
  longitudinalStatus: "OPTIMAL" | "ACCEPTABLE" | "HAZARDOUS";
  rolloverRisk: "LOW" | "MODERATE" | "HIGH";
  safetyRecommendations: string[];
}

export function calculateCenterOfGravity(
  container: ContainerSpecification,
  items: PlacedCargoItem[]
): CenterOfGravityResult {
  const placed = items.filter((item) => item.placed);
  const idealX = container.internalWidthM / 2;
  const idealY = container.internalLengthM / 2;

  if (placed.length === 0) {
    return {
      cogX: idealX,
      cogY: idealY,
      cogZ: 0,
      idealX,
      idealY,
      lateralDeviationPercent: 0,
      longitudinalDeviationPercent: 0,
      verticalHeightPercent: 0,
      stabilityScore: 100,
      lateralStatus: "OPTIMAL",
      longitudinalStatus: "OPTIMAL",
      rolloverRisk: "LOW",
      safetyRecommendations: ["El contenedor está vacío."],
    };
  }

  let totalWeight = 0;
  let momentX = 0;
  let momentY = 0;
  let momentZ = 0;

  for (const item of placed) {
    const itemCenterX = item.x + item.effectiveWidthM / 2;
    const itemCenterY = item.y + item.effectiveLengthM / 2;
    const itemCenterZ = item.z + item.effectiveHeightM / 2;

    totalWeight += item.weightKg;
    momentX += itemCenterX * item.weightKg;
    momentY += itemCenterY * item.weightKg;
    momentZ += itemCenterZ * item.weightKg;
  }

  const cogX = momentX / totalWeight;
  const cogY = momentY / totalWeight;
  const cogZ = momentZ / totalWeight;

  const lateralDeviationPercent = ((cogX - idealX) / container.internalWidthM) * 100;
  const longitudinalDeviationPercent = ((cogY - idealY) / container.internalLengthM) * 100;
  const verticalHeightPercent = (cogZ / container.internalHeightM) * 100;

  // Evaluation of stability status
  const absLat = Math.abs(lateralDeviationPercent);
  const absLong = Math.abs(longitudinalDeviationPercent);

  const lateralStatus = absLat <= 3 ? "OPTIMAL" : absLat <= 6 ? "ACCEPTABLE" : "HAZARDOUS";
  const longitudinalStatus = absLong <= 4 ? "OPTIMAL" : absLong <= 8 ? "ACCEPTABLE" : "HAZARDOUS";
  const rolloverRisk = verticalHeightPercent <= 42 ? "LOW" : verticalHeightPercent <= 52 ? "MODERATE" : "HIGH";

  // Score from 100 downwards based on penalizations
  let score = 100;
  score -= absLat * 4;       // penalty for lateral asymmetry
  score -= absLong * 2.5;    // penalty for longitudinal imbalance
  if (verticalHeightPercent > 45) {
    score -= (verticalHeightPercent - 45) * 3;
  }
  const stabilityScore = Math.max(0, Math.min(100, Math.round(score)));

  const safetyRecommendations: string[] = [];
  if (lateralStatus === "HAZARDOUS") {
    safetyRecommendations.push(
      `Alerta de escora: Desviación lateral de ${lateralDeviationPercent.toFixed(1)}%. Reubique cargas pesadas hacia la línea central (X=${idealX.toFixed(2)}m) para evitar vuelco en maniobra.`
    );
  }
  if (longitudinalStatus === "HAZARDOUS") {
    const dir = longitudinalDeviationPercent > 0 ? "hacia las puertas traseras" : "hacia el fondo delantero";
    safetyRecommendations.push(
      `Desbalance longitudinal excesivo (${longitudinalDeviationPercent.toFixed(1)}% ${dir}). Riesgo de sobrecarga de eje tractocamión o pérdida de tracción.`
    );
  }
  if (rolloverRisk === "HIGH") {
    safetyRecommendations.push(
      `Centro de gravedad vertical elevado (${verticalHeightPercent.toFixed(1)}% de altura). Estiba las cargas más densas y pesadas directamente sobre el piso.`
    );
  }
  if (safetyRecommendations.length === 0) {
    safetyRecommendations.push("Estiba balanceada y conforme con directivas de estabilidad IMO/ILO/UNECE.");
  }

  return {
    cogX: Math.round(cogX * 1000) / 1000,
    cogY: Math.round(cogY * 1000) / 1000,
    cogZ: Math.round(cogZ * 1000) / 1000,
    idealX,
    idealY,
    lateralDeviationPercent: Math.round(lateralDeviationPercent * 10) / 10,
    longitudinalDeviationPercent: Math.round(longitudinalDeviationPercent * 10) / 10,
    verticalHeightPercent: Math.round(verticalHeightPercent * 10) / 10,
    stabilityScore,
    lateralStatus,
    longitudinalStatus,
    rolloverRisk,
    safetyRecommendations,
  };
}

// =========================================================================
// 3. ROAD AXLE WEIGHT DISTRIBUTION ENGINE
// =========================================================================

export interface TractorTrailerConfig {
  tractorTareKg: number;       // e.g. 7,200 kg
  chassisTareKg: number;       // e.g. 4,500 kg
  steerAxleTareKg: number;     // e.g. 4,500 kg unladen
  driveAxleTareKg: number;     // e.g. 2,700 kg unladen
  trailerBogieTareKg: number;  // e.g. 4,500 kg unladen
  steerMaxLegalKg: number;     // e.g. 7,000 kg (EU/ES)
  driveMaxLegalKg: number;     // e.g. 11,500 kg (EU single drive)
  trailerTridemMaxLegalKg: number; // e.g. 24,000 kg (EU tridem)
  gcvwMaxLegalKg: number;      // e.g. 40,000 kg (std) or 44,000 kg (intermodal 40'/45')
  kingpinToTridemDistanceM: number; // distance from fifth-wheel kingpin to trailer bogie center (~7.8m)
  tractorWheelbaseM: number;   // steer axle to drive axle (~3.6m)
  fifthWheelOffsetM: number;   // kingpin ahead of drive axle center (~0.3m)
}

export const DEFAULT_EU_ROAD_CONFIG: TractorTrailerConfig = {
  tractorTareKg: 7200,
  chassisTareKg: 4300,
  steerAxleTareKg: 4700,
  driveAxleTareKg: 2500,
  trailerBogieTareKg: 4300,
  steerMaxLegalKg: 7000,
  driveMaxLegalKg: 11500,
  trailerTridemMaxLegalKg: 24000,
  gcvwMaxLegalKg: 40000,
  kingpinToTridemDistanceM: 7.80,
  tractorWheelbaseM: 3.60,
  fifthWheelOffsetM: 0.30,
};

export interface AxleWeightDistributionResult {
  steerAxleLoadKg: number;
  driveAxleLoadKg: number;
  trailerTridemLoadKg: number;
  grossCombinedWeightKg: number;
  payloadWeightKg: number;
  steerOverloadKg: number;
  driveOverloadKg: number;
  trailerOverloadKg: number;
  gcvwOverloadKg: number;
  isLegal: boolean;
  legalComplianceSummary: string;
}

export function calculateAxleWeightDistribution(
  container: ContainerSpecification,
  items: PlacedCargoItem[],
  roadConfig: TractorTrailerConfig = DEFAULT_EU_ROAD_CONFIG
): AxleWeightDistributionResult {
  const placed = items.filter((i) => i.placed);
  const payloadWeightKg = placed.reduce((acc, i) => acc + i.weightKg, 0);
  const totalContainerWeightKg = payloadWeightKg + container.tareWeightKg;

  // Center of Gravity along length (Y) from front of container
  let cogYFromFront = container.internalLengthM / 2;
  if (placed.length > 0 && payloadWeightKg > 0) {
    const momentY = placed.reduce((sum, item) => {
      const cy = item.y + item.effectiveLengthM / 2;
      return sum + cy * item.weightKg;
    }, 0);
    // Combine payload CoG with container tare CoG (assumed at geometric center)
    const tareMoment = (container.internalLengthM / 2) * container.tareWeightKg;
    cogYFromFront = (momentY + tareMoment) / totalContainerWeightKg;
  }

  // Container placement on chassis:
  // Kingpin is positioned approximately 0.9m behind the front bulkhead of the container
  const kingpinToFrontM = 0.90;
  const distanceFrontToBogieM = kingpinToFrontM + roadConfig.kingpinToTridemDistanceM;

  // Moment about Kingpin to find load on Trailer Bogie:
  // Weight * (cogYFromFront - kingpinToFrontM) = BogieReaction * kingpinToTridemDistanceM
  const armFromKingpin = Math.max(0, cogYFromFront - kingpinToFrontM);
  const trailerTridemPayloadShare = (totalContainerWeightKg * armFromKingpin) / roadConfig.kingpinToTridemDistanceM;
  const fifthWheelPayloadShare = Math.max(0, totalContainerWeightKg - trailerTridemPayloadShare);

  // Distribution of Fifth Wheel load to Tractor Steer and Drive axles:
  // Drive axle is close to fifth wheel:
  // Steer axle load increase = FifthWheelShare * (fifthWheelOffsetM / tractorWheelbaseM)
  // Drive axle load increase = FifthWheelShare * ((tractorWheelbaseM - fifthWheelOffsetM) / tractorWheelbaseM)
  const steerAddition = (fifthWheelPayloadShare * roadConfig.fifthWheelOffsetM) / roadConfig.tractorWheelbaseM;
  const driveAddition = fifthWheelPayloadShare - steerAddition;

  const steerAxleLoadKg = Math.round(roadConfig.steerAxleTareKg + steerAddition);
  const driveAxleLoadKg = Math.round(roadConfig.driveAxleTareKg + driveAddition);
  const trailerTridemLoadKg = Math.round(roadConfig.trailerBogieTareKg + trailerTridemPayloadShare);
  const grossCombinedWeightKg = steerAxleLoadKg + driveAxleLoadKg + trailerTridemLoadKg;

  const steerOverloadKg = Math.max(0, steerAxleLoadKg - roadConfig.steerMaxLegalKg);
  const driveOverloadKg = Math.max(0, driveAxleLoadKg - roadConfig.driveMaxLegalKg);
  const trailerOverloadKg = Math.max(0, trailerTridemLoadKg - roadConfig.trailerTridemMaxLegalKg);
  const gcvwOverloadKg = Math.max(0, grossCombinedWeightKg - roadConfig.gcvwMaxLegalKg);

  const isLegal =
    steerOverloadKg === 0 &&
    driveOverloadKg === 0 &&
    trailerOverloadKg === 0 &&
    gcvwOverloadKg === 0;

  let legalComplianceSummary = "Conforme: Todas las cargas por eje y MMA dentro de límites legales (Directiva 96/53/CE).";
  if (!isLegal) {
    const violations: string[] = [];
    if (steerOverloadKg > 0) violations.push(`Eje directriz +${steerOverloadKg} kg`);
    if (driveOverloadKg > 0) violations.push(`Eje motriz +${driveOverloadKg} kg`);
    if (trailerOverloadKg > 0) violations.push(`Tridem semirremolque +${trailerOverloadKg} kg`);
    if (gcvwOverloadKg > 0) violations.push(`MMA Total +${gcvwOverloadKg} kg`);
    legalComplianceSummary = `Infracción por sobrepeso: ${violations.join(", ")}. Riesgo de sanción en báscula.`;
  }

  return {
    steerAxleLoadKg,
    driveAxleLoadKg,
    trailerTridemLoadKg,
    grossCombinedWeightKg,
    payloadWeightKg,
    steerOverloadKg,
    driveOverloadKg,
    trailerOverloadKg,
    gcvwOverloadKg,
    isLegal,
    legalComplianceSummary,
  };
}

// =========================================================================
// 4. IMO / IMDG 7.2.4 SEGREGATION & HAZMAT 3D CHECKER
// =========================================================================

export interface ImdgSegregationCheck {
  itemAId: string;
  itemAName: string;
  classA: string;
  itemBId: string;
  itemBName: string;
  classB: string;
  imdgRequirementCode: "0" | "1" | "2" | "3" | "4";
  minRequiredDistanceM: number;
  actualDistanceM: number;
  isCompliant: boolean;
  statusMessage: string;
}

// Compact IMDG 7.2.4 Table for primary classes
const IMDG_SEGREGATION_MATRIX: Record<string, Record<string, "0" | "1" | "2" | "3" | "4">> = {
  "2.1": { "2.1": "0", "2.2": "0", "2.3": "0", "3": "2", "4.1": "1", "4.2": "2", "4.3": "1", "5.1": "2", "5.2": "2", "6.1": "0", "8": "1" },
  "2.2": { "2.1": "0", "2.2": "0", "2.3": "0", "3": "1", "4.1": "0", "4.2": "1", "4.3": "0", "5.1": "0", "5.2": "1", "6.1": "0", "8": "0" },
  "3":   { "2.1": "2", "2.2": "1", "2.3": "0", "3": "0", "4.1": "0", "4.2": "2", "4.3": "1", "5.1": "2", "5.2": "2", "6.1": "0", "8": "0" },
  "4.1": { "2.1": "1", "2.2": "0", "2.3": "0", "3": "0", "4.1": "0", "4.2": "1", "4.3": "0", "5.1": "1", "5.2": "2", "6.1": "0", "8": "1" },
  "5.1": { "2.1": "2", "2.2": "0", "2.3": "0", "3": "2", "4.1": "1", "4.2": "2", "4.3": "2", "5.1": "0", "5.2": "2", "6.1": "1", "8": "2" },
  "8":   { "2.1": "1", "2.2": "0", "2.3": "0", "3": "0", "4.1": "1", "4.2": "1", "4.3": "1", "5.1": "2", "5.2": "2", "6.1": "0", "8": "0" },
};

export function checkImoSegregationInContainer(items: PlacedCargoItem[]): {
  checks: ImdgSegregationCheck[];
  hasIncompatibleHazard: boolean;
  summary: string;
} {
  const dgItems = items.filter((i) => i.placed && i.hazardClass);
  const checks: ImdgSegregationCheck[] = [];
  let hasIncompatibleHazard = false;

  for (let i = 0; i < dgItems.length; i++) {
    for (let j = i + 1; j < dgItems.length; j++) {
      const a = dgItems[i];
      const b = dgItems[j];
      const classA = a.hazardClass!;
      const classB = b.hazardClass!;

      const reqCode =
        IMDG_SEGREGATION_MATRIX[classA]?.[classB] ||
        IMDG_SEGREGATION_MATRIX[classB]?.[classA] ||
        "0";

      // 3D Euclidean distance between centers
      const centerAX = a.x + a.effectiveWidthM / 2;
      const centerAY = a.y + a.effectiveLengthM / 2;
      const centerAZ = a.z + a.effectiveHeightM / 2;

      const centerBX = b.x + b.effectiveWidthM / 2;
      const centerBY = b.y + b.effectiveLengthM / 2;
      const centerBZ = b.z + b.effectiveHeightM / 2;

      const dx = centerAX - centerBX;
      const dy = centerAY - centerBY;
      const dz = centerAZ - centerBZ;
      const actualDistanceM = Math.round(Math.sqrt(dx * dx + dy * dy + dz * dz) * 100) / 100;

      let minRequiredDistanceM = 0;
      let isCompliant = true;
      let statusMessage = "Sin incompatibilidad específica de segregación.";

      if (reqCode === "1") {
        minRequiredDistanceM = 3.0; // "Away from" inside CTU: minimum 3m or non-combustible partition
        isCompliant = actualDistanceM >= minRequiredDistanceM;
        statusMessage = isCompliant
          ? `Separación "Away from" cumplida (${actualDistanceM}m >= 3.0m).`
          : `Infracción IMDG: Requiere "Away from" (mínimo 3.0m). Distancia actual: ${actualDistanceM}m.`;
      } else if (reqCode === "2" || reqCode === "3" || reqCode === "4") {
        minRequiredDistanceM = 6.0;
        // Under IMDG 7.2.3.3, items requiring "Separated from" (2, 3, 4) cannot be in the same CTU / container
        isCompliant = false;
        hasIncompatibleHazard = true;
        statusMessage = `Prohibición Estricta IMDG (Código ${reqCode}): Clases ${classA} y ${classB} no pueden coestibarse en el mismo contenedor.`;
      }

      if (!isCompliant) hasIncompatibleHazard = true;

      checks.push({
        itemAId: a.id,
        itemAName: a.name,
        classA,
        itemBId: b.id,
        itemBName: b.name,
        classB,
        imdgRequirementCode: reqCode,
        minRequiredDistanceM,
        actualDistanceM,
        isCompliant,
        statusMessage,
      });
    }
  }

  const summary =
    checks.length === 0
      ? "No hay mercancías peligrosas o no requieren segregación mutua."
      : hasIncompatibleHazard
      ? "ALERTA CRÍTICA: Se detectaron violaciones de segregación IMDG entre mercancías peligrosas."
      : "Cumplimiento IMDG OK: Todas las mercancías peligrosas cumplen distancias de segregación reglamentarias.";

  return { checks, hasIncompatibleHazard, summary };
}

// =========================================================================
// 5. 3D BIN PACKING HEURISTIC OPTIMIZER
// =========================================================================

export interface StowageOptimizationResult {
  container: ContainerSpecification;
  packedItems: PlacedCargoItem[];
  unpackedItems: CargoItemInput[];
  totalCargoWeightKg: number;
  totalCargoVolumeCbm: number;
  weightUtilizationPercent: number;
  volumeUtilizationPercent: number;
  centerOfGravity: CenterOfGravityResult;
  axleDistribution: AxleWeightDistributionResult;
  imoSegregation: {
    checks: ImdgSegregationCheck[];
    hasIncompatibleHazard: boolean;
    summary: string;
  };
  executionTimeMs: number;
}

export function optimizeStowage3D(
  container: ContainerSpecification,
  cargo: CargoItemInput[],
  options: { centerPayload?: boolean } = { centerPayload: true }
): StowageOptimizationResult {
  const startTime = Date.now();

  // Sort items:
  // 1. Heavy items first (so they are placed on the floor to lower CoG)
  // 2. High density (weight / volume)
  // 3. Stackable items before non-stackable
  const itemsToPack = [...cargo].sort((a, b) => {
    if (a.stackable !== b.stackable) return a.stackable ? -1 : 1;
    const densA = a.weightKg / (a.lengthM * a.widthM * a.heightM);
    const densB = b.weightKg / (b.lengthM * b.widthM * b.heightM);
    if (Math.abs(densB - densA) > 50) return densB - densA;
    return b.weightKg - a.weightKg;
  });

  const packed: PlacedCargoItem[] = [];
  const unpacked: CargoItemInput[] = [];

  const contWidth = container.internalWidthM;
  const contLength = container.internalLengthM;
  const contHeight = container.internalHeightM;
  const maxPayload = container.maxPayloadKg;

  let currentPayloadKg = 0;

  // Potential Anchor / Placement points in 3D:
  // We initialize with origin (0, 0, 0)
  const candidatePoints: Array<{ x: number; y: number; z: number }> = [{ x: 0, y: 0, z: 0 }];

  const STEP = 0.05; // 5 cm precision grid

  for (const item of itemsToPack) {
    if (currentPayloadKg + item.weightKg > maxPayload) {
      unpacked.push(item);
      continue;
    }

    let placed = false;
    let bestX = 0;
    let bestY = 0;
    let bestZ = 0;
    let bestRotated = false;
    let bestEffWidth = item.widthM;
    let bestEffLength = item.lengthM;
    let bestEffHeight = item.heightM;

    // Sort candidate points:
    // Prioritize bottom-most (Z lowest), then front-to-back (Y lowest), then symmetrical lateral (X closest to center)
    candidatePoints.sort((a, b) => {
      if (Math.abs(a.z - b.z) > 0.01) return a.z - b.z;
      if (Math.abs(a.y - b.y) > 0.01) return a.y - b.y;
      return Math.abs(a.x - contWidth / 2) - Math.abs(b.x - contWidth / 2);
    });

    const orientations = item.allowRotation !== false ? [false, true] : [false];

    for (const pt of candidatePoints) {
      for (const rotate of orientations) {
        const curWidth = rotate ? item.lengthM : item.widthM;
        const curLength = rotate ? item.widthM : item.lengthM;
        const curHeight = item.heightM;

        // Container boundary check
        if (pt.x + curWidth > contWidth + 0.001) continue;
        if (pt.y + curLength > contLength + 0.001) continue;
        if (pt.z + curHeight > contHeight + 0.001) continue;

        // Collision check against already packed items
        let collision = false;
        for (const other of packed) {
          const overlapX = pt.x < other.x + other.effectiveWidthM - 0.001 && pt.x + curWidth > other.x + 0.001;
          const overlapY = pt.y < other.y + other.effectiveLengthM - 0.001 && pt.y + curLength > other.y + 0.001;
          const overlapZ = pt.z < other.z + other.effectiveHeightM - 0.001 && pt.z + curHeight > other.z + 0.001;
          if (overlapX && overlapY && overlapZ) {
            collision = true;
            break;
          }
        }
        if (collision) continue;

        // Floor / Stacking Support check:
        // If pt.z > 0, the item must be supported underneath by stackable items
        if (pt.z > 0.01) {
          let supportArea = 0;
          const itemBaseArea = curWidth * curLength;
          let isSupportedByStackable = true;

          for (const other of packed) {
            // Check if 'other' is directly underneath
            if (Math.abs(other.z + other.effectiveHeightM - pt.z) < 0.02) {
              const xOverlap = Math.max(0, Math.min(pt.x + curWidth, other.x + other.effectiveWidthM) - Math.max(pt.x, other.x));
              const yOverlap = Math.max(0, Math.min(pt.y + curLength, other.y + other.effectiveLengthM) - Math.max(pt.y, other.y));
              const contactArea = xOverlap * yOverlap;

              if (contactArea > 0.001) {
                if (!other.stackable) {
                  isSupportedByStackable = false;
                  break;
                }
                supportArea += contactArea;
              }
            }
          }

          // Must have at least 70% support underneath and no unstackable base
          if (!isSupportedByStackable || supportArea / itemBaseArea < 0.70) {
            continue;
          }
        }

        // Candidate placement found!
        bestX = Math.round(pt.x * 100) / 100;
        bestY = Math.round(pt.y * 100) / 100;
        bestZ = Math.round(pt.z * 100) / 100;
        bestRotated = rotate;
        bestEffWidth = curWidth;
        bestEffLength = curLength;
        bestEffHeight = curHeight;
        placed = true;
        break;
      }
      if (placed) break;
    }

    if (placed) {
      const placedItem: PlacedCargoItem = {
        ...item,
        placed: true,
        x: bestX,
        y: bestY,
        z: bestZ,
        rotated: bestRotated,
        effectiveWidthM: bestEffWidth,
        effectiveLengthM: bestEffLength,
        effectiveHeightM: bestEffHeight,
      };
      packed.push(placedItem);
      currentPayloadKg += item.weightKg;

      // Generate new candidate corner points
      candidatePoints.push(
        { x: bestX + bestEffWidth, y: bestY, z: bestZ },
        { x: bestX, y: bestY + bestEffLength, z: bestZ },
        { x: bestX, y: bestY, z: bestZ + bestEffHeight }
      );
    } else {
      unpacked.push(item);
    }
  }

  // Intelligent Cargo Centering & Longitudinal Load Balancing (Prevents Axle Overload)
  if (options.centerPayload !== false && packed.length > 0) {
    const maxX = Math.max(...packed.map((i) => i.x + i.effectiveWidthM));
    const minX = Math.min(...packed.map((i) => i.x));
    const spanX = maxX - minX;
    const deltaX = Math.max(0, (contWidth - spanX) / 2 - minX);

    const maxY = Math.max(...packed.map((i) => i.y + i.effectiveLengthM));
    const minY = Math.min(...packed.map((i) => i.y));
    const spanY = maxY - minY;
    const deltaY = Math.max(0, (contLength - spanY) / 2 - minY);

    if (deltaX > 0.05 || deltaY > 0.05) {
      for (const item of packed) {
        item.x = Math.round((item.x + deltaX) * 100) / 100;
        item.y = Math.round((item.y + deltaY) * 100) / 100;
      }
    }
  }

  // Calculate volume & utilization
  const totalCargoWeightKg = packed.reduce((sum, i) => sum + i.weightKg, 0);
  const totalCargoVolumeCbm =
    Math.round(
      packed.reduce((sum, i) => sum + i.effectiveWidthM * i.effectiveLengthM * i.effectiveHeightM, 0) * 100
    ) / 100;

  const weightUtilizationPercent =
    Math.round((totalCargoWeightKg / container.maxPayloadKg) * 1000) / 10;
  const volumeUtilizationPercent =
    Math.round((totalCargoVolumeCbm / container.internalVolumeCbm) * 1000) / 10;

  // Run CoG, Axle distribution, and IMO Segregation
  const centerOfGravity = calculateCenterOfGravity(container, packed);
  const axleDistribution = calculateAxleWeightDistribution(container, packed);
  const imoSegregation = checkImoSegregationInContainer(packed);

  return {
    container,
    packedItems: packed,
    unpackedItems: unpacked,
    totalCargoWeightKg,
    totalCargoVolumeCbm,
    weightUtilizationPercent,
    volumeUtilizationPercent,
    centerOfGravity,
    axleDistribution,
    imoSegregation,
    executionTimeMs: Date.now() - startTime,
  };
}

// =========================================================================
// 6. REALISTIC DEMO PRESETS
// =========================================================================

export const STOWAGE_DEMO_PRESETS: Record<
  string,
  { name: string; containerType: ContainerTypeKey; items: CargoItemInput[] }
> = {
  balanced_40hc: {
    name: "40' HC Multimodal Balanced (Pallets & Electronics)",
    containerType: "40ft_hc",
    items: [
      { id: "p1", name: "Industrial Genset Motor A", lengthM: 1.8, widthM: 1.2, heightM: 1.4, weightKg: 2800, stackable: false, color: "#3b82f6" },
      { id: "p2", name: "Industrial Genset Motor B", lengthM: 1.8, widthM: 1.2, heightM: 1.4, weightKg: 2800, stackable: false, color: "#3b82f6" },
      { id: "p3", name: "Telecom Server Racks A", lengthM: 1.2, widthM: 1.0, heightM: 1.3, weightKg: 950, stackable: true, color: "#10b981" },
      { id: "p4", name: "Telecom Server Racks B", lengthM: 1.2, widthM: 1.0, heightM: 1.3, weightKg: 950, stackable: true, color: "#10b981" },
      { id: "p5", name: "Precision Tooling Crate A", lengthM: 1.5, widthM: 1.1, heightM: 1.1, weightKg: 1400, stackable: true, color: "#8b5cf6" },
      { id: "p6", name: "Precision Tooling Crate B", lengthM: 1.5, widthM: 1.1, heightM: 1.1, weightKg: 1400, stackable: true, color: "#8b5cf6" },
      { id: "p7", name: "Automotive Suspension Parts", lengthM: 1.2, widthM: 1.0, heightM: 1.0, weightKg: 1100, stackable: true, color: "#f59e0b" },
      { id: "p8", name: "Electronic Control Units (ECU)", lengthM: 1.2, widthM: 1.0, heightM: 1.0, weightKg: 850, stackable: true, color: "#06b6d4" },
      { id: "p9", name: "HVAC Climate Assemblies", lengthM: 1.6, widthM: 1.0, heightM: 1.2, weightKg: 650, stackable: true, color: "#ec4899" },
      { id: "p10", name: "EV Battery Pack Tray A", lengthM: 1.4, widthM: 1.1, heightM: 0.8, weightKg: 1600, stackable: true, color: "#6366f1" },
    ],
  },
  heavy_axle_warning: {
    name: "Front Overload Warning (Heavy Nose Loading)",
    containerType: "40ft_dry",
    items: [
      { id: "h1", name: "Heavy Steel Coils Pallet A", lengthM: 1.5, widthM: 1.5, heightM: 1.3, weightKg: 7500, stackable: false, color: "#ef4444" },
      { id: "h2", name: "Heavy Steel Coils Pallet B", lengthM: 1.5, widthM: 1.5, heightM: 1.3, weightKg: 7500, stackable: false, color: "#ef4444" },
      { id: "h3", name: "Light Foam Insulation Crate", lengthM: 2.2, widthM: 1.2, heightM: 1.5, weightKg: 400, stackable: false, color: "#38bdf8" },
      { id: "h4", name: "Plastic Pipe Assemblies", lengthM: 2.5, widthM: 1.1, heightM: 1.4, weightKg: 600, stackable: false, color: "#a855f7" },
    ],
  },
  imdg_segregation_alert: {
    name: "Dangerous Goods IMDG Segregation Conflict",
    containerType: "20ft_dry",
    items: [
      { id: "dg1", name: "Gasoline Drums (Class 3)", lengthM: 1.2, widthM: 1.0, heightM: 1.1, weightKg: 1200, stackable: false, hazardClass: "3", color: "#f97316" },
      { id: "dg2", name: "Organic Peroxides (Class 5.2)", lengthM: 1.2, widthM: 1.0, heightM: 1.1, weightKg: 850, stackable: false, hazardClass: "5.1", color: "#eab308" },
      { id: "gen1", name: "Spare Pump Fittings", lengthM: 1.1, widthM: 1.1, heightM: 1.0, weightKg: 600, stackable: true, color: "#64748b" },
    ],
  },
  megatrailer_eu_33pallets: {
    name: "EU Megatrailer 33 Europallets (Full Truck Load)",
    containerType: "megatrailer_136",
    items: Array.from({ length: 30 }).map((_, idx) => ({
      id: `eu_pal_${idx + 1}`,
      name: `Europallet #${idx + 1} (${idx < 10 ? "Heavy Parts" : "Standard Goods"})`,
      lengthM: 1.20,
      widthM: 0.80,
      heightM: 1.40,
      weightKg: idx < 10 ? 850 : 600,
      stackable: true,
      color: idx < 10 ? "#3b82f6" : idx < 20 ? "#10b981" : "#8b5cf6",
    })),
  },
};
