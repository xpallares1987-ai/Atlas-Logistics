/**
 * @file saica.ts
 * @description Domain models, vehicle identification, CO2e reduction, 40' HC CoG 2-opt balancing,
 * and governance rules for SAICA Logistics & FMS Platform (Corredor Oficial Book 012 · BCN.FE.FE01.012).
 */

export const SAICA_CORRIDOR_CODE = 'BCN.FE.FE01.012';

export type SaicaWarehouse = 'CANTUNIS' | 'TLSA' | 'BERRIO';
export type SaicaTransportMode = 'TREN_VAGONES' | 'CAMION_LONA';
export type SaicaExceptionSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type SaicaExceptionType =
  | 'BOBINA_DANADA'
  | 'DESCUADRE_PESO'
  | 'RETRASO_FERROVIARIO'
  | 'ROTURA_FLEJE'
  | 'HUMEDAD_DETECTADA'
  | 'INCIDENCIA_ACCESO_MUELLE';

export interface SaicaCoil {
  coilId: string;
  paperGrade: string; // e.g. 'SAICA PRIMA 140', 'SAICA MEDIUM 110'
  grossWeightKg: number;
  widthMm: number; // e.g. 2400
  diameterMm: number; // e.g. 1250
  rollLengthM?: number;
  factoryOrigin: string; // e.g. 'Zaragoza El Burgo', 'Zaragoza San Juan', 'Zaragoza Centro'
  destinationWarehouse: SaicaWarehouse;
  assignedContainerRef?: string;
  xPositionM?: number;
  yPositionM?: number;
}

export interface SaicaVehicleDetection {
  warehouse: SaicaWarehouse;
  vehicleIdentifier: string;
  transportMode: SaicaTransportMode;
  isRail: boolean;
  co2eFactorKgPerTonKm: number; // 0.018 for Electric Train vs 0.078 for Euro VI truck
  co2eSavingsPercent: number; // 76.9% savings for Electric Train
  description: string;
}

export interface SaicaAlbaran {
  albaranId: string;
  albaranNumber: string;
  factoryOrigin: string;
  destinationWarehouse: SaicaWarehouse;
  expeditionDate: string;
  vehicleIdentifier: string;
  vehicleDetection: SaicaVehicleDetection;
  coils: SaicaCoil[];
  totalNetWeightKg: number;
  targetContainerNumber?: string;
  status: 'PENDING_UNLOAD' | 'UNLOADED_IN_STOCK' | 'STUFFED_IN_CONTAINER';
}

export interface SaicaException {
  exceptionId: string;
  timestamp: string;
  warehouse: SaicaWarehouse;
  exceptionType: SaicaExceptionType;
  severity: SaicaExceptionSeverity;
  affectedCoilId?: string;
  affectedVehicleId?: string;
  description: string;
  reportedByRole: 'ESXPA' | 'ESACA';
  reportedByName: string;
  resolved: boolean;
  resolutionRemarks?: string;
}

export interface SaicaStowageResult {
  containerPayloadLimitKg: number; // Baseline: 26,500 kg
  totalCoilsWeightKg: number;
  payloadUtilizationPercent: number;
  falsoFleteKg: number;
  falsoFleteEstimatedCostEur: number; // e.g. €0.08 per kg missed under baseline
  geometricCenterM: { x: number; y: number }; // Xgeom = 6.016 m, Ygeom = 1.176 m
  actualCenterOfGravityM: { x: number; y: number };
  deltaXMeters: number;
  deltaYMeters: number;
  longitudinalStatus: 'BALANCED' | 'WARNING' | 'CRITICAL';
  transverseStatus: 'BALANCED' | 'TRANSVERSE_TILT';
  twoOptRebalanced: boolean;
  twoOptSwapsExecuted: number;
  recommendedComplementaryCoils: Array<{
    coilId: string;
    paperGrade: string;
    weightKg: number;
  }>;
}

export interface SaicaGovernanceUser {
  roleCode: 'ESXPA' | 'ESACA' | 'ESRSE';
  fullName: string;
  title: string;
  operationalAssignmentsAllowed: boolean;
  superAdminPrivileges: boolean;
}

export const SAICA_OFFICIAL_ROLES: Record<string, SaicaGovernanceUser> = {
  ESXPA: {
    roleCode: 'ESXPA',
    fullName: 'Xavier Pallarès',
    title: 'SuperAdmin & Systems/Multiplier Lead',
    operationalAssignmentsAllowed: true,
    superAdminPrivileges: true,
  },
  ESACA: {
    roleCode: 'ESACA',
    fullName: 'Ariel Catalano',
    title: 'Department Team Leader (SAICA Barcelona)',
    operationalAssignmentsAllowed: true,
    superAdminPrivileges: false,
  },
  ESRSE: {
    roleCode: 'ESRSE',
    fullName: 'Raquel Serrano',
    title: 'Department Manager (Supervisión Ejecutiva)',
    operationalAssignmentsAllowed: false,
    superAdminPrivileges: false,
  },
};

// ============================================================================
// VEHICLE DETECTION & CO2e CALCULATION (Rule 1 & 2)
// ============================================================================

/**
 * Detects whether an arriving vehicle at SAICA external warehouses is an Electric Train or Road Truck.
 * Strictly enforces:
 * - CANTUNIS is the ONLY rail terminal.
 * - TLSA and BERRIO receive ALWAYS road trucks.
 * - TMZa is strictly prohibited from intermediate container drayage.
 */
export function detectSaicaVehicle(
  warehouse: SaicaWarehouse,
  rawVehicleId: string
): SaicaVehicleDetection {
  const cleanId = rawVehicleId.trim().toUpperCase();

  // Strict prohibition: TMZa
  if (cleanId.includes('TMZA') || cleanId.includes('TERMINAL MARITIMA ZARAGOZA')) {
    throw new Error(
      'PROHIBICIÓN ESTRICTA: TMZa (Terminal Marítima de Zaragoza) no puede ser modelada como estación intermedia o de acarreo en el Corredor Book 012.'
    );
  }

  // TLSA and BERRIO always receive highway road curtain-trailers
  if (warehouse === 'TLSA' || warehouse === 'BERRIO') {
    return {
      warehouse,
      vehicleIdentifier: cleanId,
      transportMode: 'CAMION_LONA',
      isRail: false,
      co2eFactorKgPerTonKm: 0.078, // Euro VI diesel truck
      co2eSavingsPercent: 0.0,
      description: `Camión-Lona (Carretera Euro VI) con destino ${warehouse}`,
    };
  }

  // CANTUNIS warehouse detection
  // Spanish road plate regex: 4 digits + 3 letters (e.g. 4821-LXZ, 1234ABC) or trailer R-1234-BBB
  const isRoadPlate =
    /^\d{4}\s*[- ]?[A-Z]{3}$/.test(cleanId) || /^R\s*[- ]?\d{4}\s*[- ]?[A-Z]{3}$/.test(cleanId);

  if (isRoadPlate) {
    return {
      warehouse: 'CANTUNIS',
      vehicleIdentifier: cleanId,
      transportMode: 'CAMION_LONA',
      isRail: false,
      co2eFactorKgPerTonKm: 0.078,
      co2eSavingsPercent: 0.0,
      description: 'Camión-Lona (Carretera Euro VI) descargado puntualmente en CANTUNIS',
    };
  }

  // Otherwise, in CANTUNIS: Classified as electric freight rail wagon (UIC code)
  return {
    warehouse: 'CANTUNIS',
    vehicleIdentifier: cleanId,
    transportMode: 'TREN_VAGONES',
    isRail: true,
    co2eFactorKgPerTonKm: 0.018, // Electric train
    co2eSavingsPercent: 76.9, // 76.9% certified savings
    description: 'Tren de Mercancías Eléctrico (Vagones UIC) en CANTUNIS · 76.9% Ahorro CO2e',
  };
}

// ============================================================================
// 40' HC PHYSICAL STOWAGE & 2-OPT CoG BALANCING (Rule 3)
// ============================================================================

export const ISO_40HC_INTERNAL_LENGTH_M = 12.032;
export const ISO_40HC_INTERNAL_WIDTH_M = 2.352;
export const ISO_40HC_PAYLOAD_LIMIT_KG = 26500; // Spanish combined transport legal road limit (44t PMA)
export const ISO_40HC_US_PAYLOAD_LIMIT_KG = 20500; // US DOT Federal Bridge limit

export function verifySaicaContainerStowage(
  coils: SaicaCoil[],
  payloadLimitKg: number = ISO_40HC_PAYLOAD_LIMIT_KG
): SaicaStowageResult {
  const X_geom = ISO_40HC_INTERNAL_LENGTH_M / 2; // 6.016 m
  const Y_geom = ISO_40HC_INTERNAL_WIDTH_M / 2; // 1.176 m

  let totalWeight = coils.reduce((acc, c) => acc + c.grossWeightKg, 0);
  const utilization = Math.min(100, Number(((totalWeight / payloadLimitKg) * 100).toFixed(2)));

  const falsoFleteKg = Math.max(0, payloadLimitKg - totalWeight);
  const falsoFleteCost = Number((falsoFleteKg * 0.065).toFixed(2)); // €0.065/kg typical freight opportunity loss

  // Compute 2D Center of Gravity
  let sumWeightX = 0;
  let sumWeightY = 0;

  // Assign physical default 2D placement if not present
  const placedCoils = coils.map((c, i) => {
    const x = c.xPositionM ?? 1.5 + (i * 1.8) % 10.5;
    const y = c.yPositionM ?? (i % 2 === 0 ? Y_geom - 0.04 : Y_geom + 0.04);
    sumWeightX += c.grossWeightKg * x;
    sumWeightY += c.grossWeightKg * y;
    return { ...c, xPositionM: x, yPositionM: y };
  });

  let X_cog = totalWeight > 0 ? sumWeightX / totalWeight : X_geom;
  let Y_cog = totalWeight > 0 ? sumWeightY / totalWeight : Y_geom;

  let deltaX = Number(Math.abs(X_cog - X_geom).toFixed(3));
  let deltaY = Number(Math.abs(Y_cog - Y_geom).toFixed(3));

  let twoOptRebalanced = false;
  let swapsCount = 0;

  // Rebalanceo Automático 2-opt: If |Δx| > 0.35m, reorder symmetric pairs
  if (deltaX > 0.35 && placedCoils.length >= 2) {
    const count = placedCoils.length;
    // Generate symmetric slot positions from geometric center
    const maxSpan = Math.min(9.0, (count - 1) * 1.8);
    const slots: number[] = [];
    for (let i = 0; i < count; i++) {
      const offset = (i - (count - 1) / 2) * (maxSpan / Math.max(1, count - 1));
      slots.push(X_geom + offset);
    }

    // Sort coils descending by weight
    const sorted = [...placedCoils].sort((a, b) => b.grossWeightKg - a.grossWeightKg);

    // Greedy moment-balanced placement across symmetric slots
    const assignedSlots: number[] = new Array(count);
    let leftPtr = 0;
    let rightPtr = count - 1;
    let currentMoment = 0;

    for (const coil of sorted) {
      if (leftPtr === rightPtr) {
        assignedSlots[leftPtr] = slots[leftPtr];
        currentMoment += coil.grossWeightKg * (slots[leftPtr] - X_geom);
        leftPtr++;
      } else if (currentMoment >= 0) {
        assignedSlots[leftPtr] = slots[leftPtr];
        currentMoment += coil.grossWeightKg * (slots[leftPtr] - X_geom);
        leftPtr++;
      } else {
        assignedSlots[rightPtr] = slots[rightPtr];
        currentMoment += coil.grossWeightKg * (slots[rightPtr] - X_geom);
        rightPtr--;
      }
    }

    for (let i = 0; i < count; i++) {
      sorted[i].xPositionM = assignedSlots[i];
    }

    let bestSumX = sorted.reduce((acc, c) => acc + c.grossWeightKg * (c.xPositionM ?? X_geom), 0);
    let bestDeltaX = Math.abs(bestSumX / totalWeight - X_geom);

    // 2-opt pair swap search to minimize deltaX
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const deltaMoment =
          (sorted[i].grossWeightKg - sorted[j].grossWeightKg) *
          ((sorted[j].xPositionM ?? X_geom) - (sorted[i].xPositionM ?? X_geom));
        const testSumX = bestSumX + deltaMoment;
        const testDeltaX = Math.abs(testSumX / totalWeight - X_geom);
        if (testDeltaX < bestDeltaX) {
          const tempX = sorted[i].xPositionM;
          sorted[i].xPositionM = sorted[j].xPositionM;
          sorted[j].xPositionM = tempX;
          bestSumX = testSumX;
          bestDeltaX = testDeltaX;
          swapsCount++;
        }
      }
    }

    X_cog = bestSumX / totalWeight;
    deltaX = Number(bestDeltaX.toFixed(3));
    twoOptRebalanced = true;
    swapsCount = Math.max(1, swapsCount);
  }

  // Determine Longitudinal Status
  let longitudinalStatus: 'BALANCED' | 'WARNING' | 'CRITICAL' = 'BALANCED';
  if (deltaX > 0.85) {
    longitudinalStatus = 'CRITICAL';
  } else if (deltaX > 0.6) {
    longitudinalStatus = 'WARNING';
  }

  // Transverse tolerance
  const transverseStatus: 'BALANCED' | 'TRANSVERSE_TILT' =
    deltaY <= 0.08 ? 'BALANCED' : 'TRANSVERSE_TILT';

  // Recommendations for falso flete recovery
  const recommendedComplementaryCoils = [];
  if (falsoFleteKg > 1500) {
    recommendedComplementaryCoils.push({
      coilId: 'STK-CANTUNIS-B140-9921',
      paperGrade: 'SAICA PRIMA 140 (Stock Almacén)',
      weightKg: Math.min(falsoFleteKg, 2200),
    });
  }

  return {
    containerPayloadLimitKg: payloadLimitKg,
    totalCoilsWeightKg: totalWeight,
    payloadUtilizationPercent: utilization,
    falsoFleteKg,
    falsoFleteEstimatedCostEur: falsoFleteCost,
    geometricCenterM: { x: X_geom, y: Y_geom },
    actualCenterOfGravityM: { x: Number(X_cog.toFixed(3)), y: Number(Y_cog.toFixed(3)) },
    deltaXMeters: deltaX,
    deltaYMeters: deltaY,
    longitudinalStatus,
    transverseStatus,
    twoOptRebalanced,
    twoOptSwapsExecuted: swapsCount,
    recommendedComplementaryCoils,
  };
}

// ============================================================================
// GOVERNANCE & ROLE POLICIES (Rule 5)
// ============================================================================

export function validateSaicaRoleAssignment(
  roleCode: string,
  personName: string
): { allowed: boolean; reason?: string } {
  const normName = personName.trim().toLowerCase();

  // Strict Exclusion: Jose Miguel Gomez
  if (normName.includes('jose miguel gomez') || normName.includes('josé miguel gómez')) {
    return {
      allowed: false,
      reason:
        'POLÍTICA DE GOBERNANZA: Jose Miguel Gomez está expresamente excluido de asignaciones operativas en Atlas Logistics.',
    };
  }

  // ESRSE (Raquel Serrano) Manager exclusion from daily dock/coil tactical assignments
  if (
    roleCode === 'ESRSE' ||
    normName.includes('raquel serrano') ||
    normName.includes('serrano raquel')
  ) {
    return {
      allowed: false,
      reason:
        'POLÍTICA DE GOBERNANZA: ESRSE (Raquel Serrano) ostenta supervisión gerencial y queda expresamente excluida de recibir asignaciones operativas tácticas de expedientes, bobinas o muelles.',
    };
  }

  const role = SAICA_OFFICIAL_ROLES[roleCode];
  if (!role || !role.operationalAssignmentsAllowed) {
    return {
      allowed: false,
      reason: `Rol ${roleCode} no autorizado para asignaciones tácticas en el Corredor ${SAICA_CORRIDOR_CODE}.`,
    };
  }

  return { allowed: true };
}

// ============================================================================
// SEED PRESETS
// ============================================================================

export const SEED_SAICA_COILS: SaicaCoil[] = [
  {
    coilId: 'BOB-SAICA-2026-081',
    paperGrade: 'SAICA NATURE PRIMA 140',
    grossWeightKg: 2650,
    widthMm: 2400,
    diameterMm: 1250,
    factoryOrigin: 'Zaragoza El Burgo',
    destinationWarehouse: 'CANTUNIS',
    xPositionM: 2.1,
    yPositionM: 1.15,
  },
  {
    coilId: 'BOB-SAICA-2026-082',
    paperGrade: 'SAICA NATURE PRIMA 140',
    grossWeightKg: 2650,
    widthMm: 2400,
    diameterMm: 1250,
    factoryOrigin: 'Zaragoza El Burgo',
    destinationWarehouse: 'CANTUNIS',
    xPositionM: 4.0,
    yPositionM: 1.19,
  },
  {
    coilId: 'BOB-SAICA-2026-083',
    paperGrade: 'SAICA NATURE MEDIUM 110',
    grossWeightKg: 2580,
    widthMm: 2400,
    diameterMm: 1250,
    factoryOrigin: 'Zaragoza El Burgo',
    destinationWarehouse: 'CANTUNIS',
    xPositionM: 6.0,
    yPositionM: 1.16,
  },
  {
    coilId: 'BOB-SAICA-2026-084',
    paperGrade: 'SAICA NATURE MEDIUM 110',
    grossWeightKg: 2580,
    widthMm: 2400,
    diameterMm: 1250,
    factoryOrigin: 'Zaragoza El Burgo',
    destinationWarehouse: 'CANTUNIS',
    xPositionM: 8.0,
    yPositionM: 1.18,
  },
  {
    coilId: 'BOB-SAICA-2026-085',
    paperGrade: 'SAICA NATURE FLUTING 100',
    grossWeightKg: 2620,
    widthMm: 2400,
    diameterMm: 1250,
    factoryOrigin: 'Zaragoza El Burgo',
    destinationWarehouse: 'CANTUNIS',
    xPositionM: 10.0,
    yPositionM: 1.15,
  },
];

export const SEED_SAICA_ALBARANES: SaicaAlbaran[] = [
  {
    albaranId: 'ALB-SAICA-2026-9001',
    albaranNumber: 'ALB-012-9001',
    factoryOrigin: 'Zaragoza El Burgo',
    destinationWarehouse: 'CANTUNIS',
    expeditionDate: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    vehicleIdentifier: '31 71 4556 089-2', // Rail wagon UIC
    vehicleDetection: {
      warehouse: 'CANTUNIS',
      vehicleIdentifier: '31 71 4556 089-2',
      transportMode: 'TREN_VAGONES',
      isRail: true,
      co2eFactorKgPerTonKm: 0.018,
      co2eSavingsPercent: 76.9,
      description: 'Tren de Mercancías Eléctrico (Vagones UIC) en CANTUNIS · 76.9% Ahorro CO2e',
    },
    coils: SEED_SAICA_COILS,
    totalNetWeightKg: 13080,
    targetContainerNumber: 'MSKU-481920-4',
    status: 'UNLOADED_IN_STOCK',
  },
  {
    albaranId: 'ALB-SAICA-2026-9002',
    albaranNumber: 'ALB-012-9002',
    factoryOrigin: 'Zaragoza San Juan',
    destinationWarehouse: 'TLSA',
    expeditionDate: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    vehicleIdentifier: '4821-LXZ', // Spanish plate
    vehicleDetection: {
      warehouse: 'TLSA',
      vehicleIdentifier: '4821-LXZ',
      transportMode: 'CAMION_LONA',
      isRail: false,
      co2eFactorKgPerTonKm: 0.078,
      co2eSavingsPercent: 0.0,
      description: 'Camión-Lona (Carretera Euro VI) con destino TLSA',
    },
    coils: [
      {
        coilId: 'BOB-SAICA-2026-101',
        paperGrade: 'SAICA WHITE TOP 135',
        grossWeightKg: 2850,
        widthMm: 2400,
        diameterMm: 1250,
        factoryOrigin: 'Zaragoza San Juan',
        destinationWarehouse: 'TLSA',
      },
      {
        coilId: 'BOB-SAICA-2026-102',
        paperGrade: 'SAICA WHITE TOP 135',
        grossWeightKg: 2850,
        widthMm: 2400,
        diameterMm: 1250,
        factoryOrigin: 'Zaragoza San Juan',
        destinationWarehouse: 'TLSA',
      },
    ],
    totalNetWeightKg: 5700,
    targetContainerNumber: 'CMAU-992140-1',
    status: 'PENDING_UNLOAD',
  },
];

export const SEED_SAICA_EXCEPTIONS: SaicaException[] = [
  {
    exceptionId: 'EXC-SAICA-001',
    timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    warehouse: 'CANTUNIS',
    exceptionType: 'RETRASO_FERROVIARIO',
    severity: 'MEDIUM',
    affectedVehicleId: '31 71 4556 089-2',
    description: 'Vía de maniobras 3 de Morrot ocupada; retraso en desenganche de 45 minutos.',
    reportedByRole: 'ESACA',
    reportedByName: 'Ariel Catalano',
    resolved: false,
  },
];
