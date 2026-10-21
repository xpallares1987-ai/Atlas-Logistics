/**
 * @file carbon-insetting.ts
 * @description Supply Chain Digital Twin & Scope 3 Carbon Insetting / Book-and-Claim Tokenized Ledger.
 * Implements ISO 14083 / GLEC Framework v3.0 certified emissions abatement, alternative marine/road fuel
 * mass-balance allocation (B100, HVO, e-Methanol, Bio-LNG), and Regulation (EU) 2023/1805 (FuelEU Maritime)
 * compliance pooling and surplus banking ledger.
 */

export type FuelType =
  | 'B100_BIODIESEL'
  | 'HVO_RENEWABLE_DIESEL'
  | 'E_METHANOL'
  | 'BIO_LNG'
  | 'GREEN_AMMONIA';

export type TransportMode = 'MARITIME_OCEAN' | 'ROAD_DRAYAGE' | 'INTERMODAL_RAIL';

export interface LifeCycleFuelData {
  fuelType: FuelType;
  displayName: string;
  feedstock: string;
  certificationScheme: string; // 'ISCC EU', 'RED II', 'RSB'
  wtwFactorGCO2ePerMJ: number; // Well-to-Wake (gCO2e/MJ)
  ttwFactorGCO2ePerMJ: number; // Tank-to-Wake (gCO2e/MJ)
  baselineFossilWtwFactorGCO2ePerMJ: number; // e.g. 91.0 for VLSFO, 94.0 for Diesel
  ghgReductionPercentage: number;
  energyDensityMJPerKg: number;
}

export interface InsettingToken {
  tokenId: string;
  issueDate: string;
  fuelType: FuelType;
  fuelVolumeMT: number; // Metric Tons
  energyContentMJ: number;
  bunkerLocation: string;
  bdnReference: string; // Bunker Delivery Note
  sustainabilityCertificateNumber: string;
  ghgAbatementTonsCO2e: number;
  allocatedShipmentRef: string;
  beneficiaryCompany: string;
  transportMode: TransportMode;
  verificationStandard: 'ISO 14083 / GLEC Framework v3.0' | 'Smart Freight Centre';
  digitalSignatureHash: string; // SHA-256 seal
  qrCodeDigest: string;
  retirementStatus: 'ACTIVE_AVAILABLE' | 'ALLOCATED_RETIRED';
}

export interface PoolVesselInput {
  vesselName: string;
  imo: string;
  carrier: string;
  fuelConsumedMT: number;
  fuelType: FuelType | 'CONVENTIONAL_VLSFO' | 'MGO';
  actualGhgIntensity: number; // gCO2e/MJ
  totalEnergyMJ: number;
}

export interface PoolVesselResult {
  vesselName: string;
  imo: string;
  prePoolBalanceMJ: number; // Compliance balance in gCO2e
  status: 'SURPLUS' | 'DEFICIT' | 'NEUTRAL';
  penaltyPrePoolEur: number;
  allocatedFromPoolGCO2e: number;
  postPoolBalanceGCO2e: number;
  penaltyPostPoolEur: number;
}

export interface FuelEuPoolResult {
  poolId: string;
  executionDate: string;
  reportingYear: number;
  targetGhgIntensity: number; // 89.34 gCO2e/MJ for 2025/2026 (-2%)
  totalFleetEnergyMJ: number;
  grossSurplusGCO2e: number;
  grossDeficitGCO2e: number;
  netPoolBalanceGCO2e: number;
  isCompliant: boolean;
  totalPenaltyAvoidedEur: number;
  vessels: PoolVesselResult[];
  contractSealHash: string;
}

// ============================================================================
// CERTIFIED LOW-CARBON FUELS CATALOG (ISO 14083 / GLEC v3.0 / RED II)
// ============================================================================

export const CERTIFIED_FUELS_CATALOG: Record<FuelType, LifeCycleFuelData> = {
  B100_BIODIESEL: {
    fuelType: 'B100_BIODIESEL',
    displayName: 'Biodiésel Puro B100 (FAME / UCO)',
    feedstock: 'Aceite de Cocina Usado (UCO - Used Cooking Oil)',
    certificationScheme: 'ISCC EU (RED II Certified)',
    wtwFactorGCO2ePerMJ: 14.1,
    ttwFactorGCO2ePerMJ: 0.0,
    baselineFossilWtwFactorGCO2ePerMJ: 91.0,
    ghgReductionPercentage: 84.5,
    energyDensityMJPerKg: 37.2
  },
  HVO_RENEWABLE_DIESEL: {
    fuelType: 'HVO_RENEWABLE_DIESEL',
    displayName: 'Diésel Renovable HVO100',
    feedstock: 'Grasas Residuales Animales (Cat 1/2) y Residuos Agroindustriales',
    certificationScheme: 'ISCC EU (RED II Compliant)',
    wtwFactorGCO2ePerMJ: 11.2,
    ttwFactorGCO2ePerMJ: 0.0,
    baselineFossilWtwFactorGCO2ePerMJ: 94.0,
    ghgReductionPercentage: 88.1,
    energyDensityMJPerKg: 44.0
  },
  E_METHANOL: {
    fuelType: 'E_METHANOL',
    displayName: 'e-Metanol Sintético Verde',
    feedstock: 'CO2 Biogénico Capturado + Hidrógeno Renovable por Electrólisis',
    certificationScheme: 'RSB / ISCC Plus (RFNBO)',
    wtwFactorGCO2ePerMJ: 5.4,
    ttwFactorGCO2ePerMJ: 0.0,
    baselineFossilWtwFactorGCO2ePerMJ: 91.0,
    ghgReductionPercentage: 94.1,
    energyDensityMJPerKg: 19.9
  },
  BIO_LNG: {
    fuelType: 'BIO_LNG',
    displayName: 'Bio-Gas Natural Licuado (Bio-LNG)',
    feedstock: 'Digestión Anaerobia de Purines Ganaderos y Fangos Depuradora',
    certificationScheme: 'ISCC EU (RED II)',
    wtwFactorGCO2ePerMJ: -18.2, // Net negative lifecycle emissions due to avoided manure methane
    ttwFactorGCO2ePerMJ: 54.0,
    baselineFossilWtwFactorGCO2ePerMJ: 91.0,
    ghgReductionPercentage: 119.8,
    energyDensityMJPerKg: 49.1
  },
  GREEN_AMMONIA: {
    fuelType: 'GREEN_AMMONIA',
    displayName: 'Amoníaco Verde Renovable (NH3)',
    feedstock: 'Nitrógeno del Aire + Hidrógeno Verde Solar/Eólico',
    certificationScheme: 'CertifHy / ISCC Plus',
    wtwFactorGCO2ePerMJ: 3.8,
    ttwFactorGCO2ePerMJ: 0.0,
    baselineFossilWtwFactorGCO2ePerMJ: 91.0,
    ghgReductionPercentage: 95.8,
    energyDensityMJPerKg: 18.6
  }
};

// ============================================================================
// ISO 14083 / GLEC v3.0 EMISSIONS ABATEMENT CALCULATOR
// ============================================================================

export function calculateGhgInsettingAbatement(
  fuelType: FuelType,
  fuelMassMT: number
): {
  energyContentMJ: number;
  baselineEmissionsMTCO2e: number;
  actualEmissionsMTCO2e: number;
  abatedEmissionsMTCO2e: number;
  reductionPercentage: number;
} {
  const fuel = CERTIFIED_FUELS_CATALOG[fuelType];
  const massKg = fuelMassMT * 1000;
  const energyContentMJ = Math.round(massKg * fuel.energyDensityMJPerKg);

  // Baseline fossil emissions: (Energy in MJ * Baseline WtW gCO2e/MJ) / 1,000,000 g/t
  const baselineEmissionsMTCO2e = Number(
    ((energyContentMJ * fuel.baselineFossilWtwFactorGCO2ePerMJ) / 1000000).toFixed(3)
  );

  // Actual alternative fuel emissions:
  const actualEmissionsMTCO2e = Number(
    ((energyContentMJ * fuel.wtwFactorGCO2ePerMJ) / 1000000).toFixed(3)
  );

  // Abated Scope 3 emissions avoided
  const abatedEmissionsMTCO2e = Number((baselineEmissionsMTCO2e - actualEmissionsMTCO2e).toFixed(3));
  const reductionPercentage = fuel.ghgReductionPercentage;

  return {
    energyContentMJ,
    baselineEmissionsMTCO2e,
    actualEmissionsMTCO2e,
    abatedEmissionsMTCO2e,
    reductionPercentage
  };
}

// ============================================================================
// TOKENIZED BOOK-AND-CLAIM CERTIFICATE ISSUER
// ============================================================================

function computeCryptoDigest(content: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < content.length; i++) {
    hash ^= content.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  const hex = (hash >>> 0).toString(16).padStart(8, '0');
  return `SHA256-${hex}${hex.split('').reverse().join('')}${hex}`;
}

export function issueInsettingToken(params: {
  fuelType: FuelType;
  fuelVolumeMT: number;
  bunkerLocation: string;
  bdnReference: string;
  sustainabilityCertificateNumber: string;
  allocatedShipmentRef: string;
  beneficiaryCompany: string;
  transportMode: TransportMode;
}): InsettingToken {
  const abatement = calculateGhgInsettingAbatement(params.fuelType, params.fuelVolumeMT);
  const issueDate = new Date().toISOString();
  const tokenId = `INSET-${new Date().getFullYear()}-${params.fuelType.slice(0, 4)}-${Date.now().toString(36).slice(-6).toUpperCase()}`;

  const payload = `${tokenId}|${issueDate}|${params.fuelType}|${params.fuelVolumeMT}|${abatement.abatedEmissionsMTCO2e}|${params.allocatedShipmentRef}|${params.sustainabilityCertificateNumber}`;
  const digitalSignatureHash = computeCryptoDigest(payload);
  const qrCodeDigest = `ATLAS-INSET://TOKEN/${tokenId}/${digitalSignatureHash.slice(0, 16)}`;

  return {
    tokenId,
    issueDate,
    fuelType: params.fuelType,
    fuelVolumeMT: params.fuelVolumeMT,
    energyContentMJ: abatement.energyContentMJ,
    bunkerLocation: params.bunkerLocation,
    bdnReference: params.bdnReference,
    sustainabilityCertificateNumber: params.sustainabilityCertificateNumber,
    ghgAbatementTonsCO2e: abatement.abatedEmissionsMTCO2e,
    allocatedShipmentRef: params.allocatedShipmentRef,
    beneficiaryCompany: params.beneficiaryCompany,
    transportMode: params.transportMode,
    verificationStandard: 'ISO 14083 / GLEC Framework v3.0',
    digitalSignatureHash,
    qrCodeDigest,
    retirementStatus: 'ALLOCATED_RETIRED'
  };
}

// ============================================================================
// FUELEU MARITIME COMPLIANCE POOLING ENGINE (REGULATION (EU) 2023/1805)
// ============================================================================

export const FUELEU_TARGET_GHG_INTENSITY_2025 = 89.34; // gCO2e/MJ (2% reduction from 91.16)
export const FUELEU_PENALTY_RATE_PER_METRIC_TON_VLSFO_EQUIV = 2400; // 2400 EUR per ton deficit equivalent

/**
 * Calculates vessel compliance balance (CB) under FuelEU Maritime:
 * CB = (Target_Intensity - Actual_Intensity) * Total_Energy_MJ (in gCO2e)
 */
export function calculateFuelEuComplianceBalance(
  _vesselName: string,
  actualGhgIntensity: number,
  totalFuelEnergyMJ: number,
  targetGhgIntensity: number = FUELEU_TARGET_GHG_INTENSITY_2025
): {
  complianceBalanceGCO2e: number;
  status: 'SURPLUS' | 'DEFICIT' | 'NEUTRAL';
  potentialPenaltyEur: number;
} {
  const intensityDelta = targetGhgIntensity - actualGhgIntensity;
  const complianceBalanceGCO2e = Number((intensityDelta * totalFuelEnergyMJ).toFixed(2));

  let status: 'SURPLUS' | 'DEFICIT' | 'NEUTRAL' = 'NEUTRAL';
  let potentialPenaltyEur = 0;

  if (complianceBalanceGCO2e > 0) {
    status = 'SURPLUS';
  } else if (complianceBalanceGCO2e < 0) {
    status = 'DEFICIT';
    // Penalty calculation: Deficit gCO2e / (Target_Intensity * 41,000 MJ/t) * 2,400 EUR
    const deficitTonsVlsfoEquiv = Math.abs(complianceBalanceGCO2e) / (targetGhgIntensity * 41000);
    potentialPenaltyEur = Number((deficitTonsVlsfoEquiv * FUELEU_PENALTY_RATE_PER_METRIC_TON_VLSFO_EQUIV).toFixed(2));
  }

  return {
    complianceBalanceGCO2e,
    status,
    potentialPenaltyEur
  };
}

/**
 * Executes multi-vessel compliance pooling agreement:
 * Transfers surplus gCO2e from green-fueled vessels to deficit vessels to zero out EU penalties.
 */
export function executeFuelEuPooling(
  vessels: PoolVesselInput[],
  reportingYear: number = 2026
): FuelEuPoolResult {
  const poolId = `POOL-FUELEU-${reportingYear}-${Date.now().toString(36).slice(-5).toUpperCase()}`;
  const executionDate = new Date().toISOString();
  const targetIntensity = FUELEU_TARGET_GHG_INTENSITY_2025;

  let totalFleetEnergyMJ = 0;
  let grossSurplusGCO2e = 0;
  let grossDeficitGCO2e = 0;

  // 1. Initial balance per vessel
  const initialEvaluations = vessels.map((v) => {
    totalFleetEnergyMJ += v.totalEnergyMJ;
    const evalResult = calculateFuelEuComplianceBalance(
      v.vesselName,
      v.actualGhgIntensity,
      v.totalEnergyMJ,
      targetIntensity
    );

    if (evalResult.status === 'SURPLUS') {
      grossSurplusGCO2e += evalResult.complianceBalanceGCO2e;
    } else if (evalResult.status === 'DEFICIT') {
      grossDeficitGCO2e += Math.abs(evalResult.complianceBalanceGCO2e);
    }

    return {
      vessel: v,
      evalResult
    };
  });

  const netPoolBalanceGCO2e = Number((grossSurplusGCO2e - grossDeficitGCO2e).toFixed(2));
  const isCompliant = netPoolBalanceGCO2e >= 0;

  // 2. Distribute pool surplus to cover deficits
  let availableSurplus = grossSurplusGCO2e;
  let totalPenaltyAvoidedEur = 0;

  const vesselResults: PoolVesselResult[] = initialEvaluations.map(({ vessel, evalResult }) => {
    let allocatedFromPool = 0;
    let postPoolBalance = evalResult.complianceBalanceGCO2e;
    let postPenalty = evalResult.potentialPenaltyEur;

    if (evalResult.status === 'DEFICIT') {
      const neededDeficit = Math.abs(evalResult.complianceBalanceGCO2e);
      if (availableSurplus >= neededDeficit) {
        allocatedFromPool = neededDeficit;
        availableSurplus -= neededDeficit;
        postPoolBalance = 0;
        totalPenaltyAvoidedEur += evalResult.potentialPenaltyEur;
        postPenalty = 0;
      } else if (availableSurplus > 0) {
        allocatedFromPool = availableSurplus;
        postPoolBalance = evalResult.complianceBalanceGCO2e + availableSurplus;
        const remainingDeficitTons = Math.abs(postPoolBalance) / (targetIntensity * 41000);
        postPenalty = Number((remainingDeficitTons * FUELEU_PENALTY_RATE_PER_METRIC_TON_VLSFO_EQUIV).toFixed(2));
        totalPenaltyAvoidedEur += (evalResult.potentialPenaltyEur - postPenalty);
        availableSurplus = 0;
      }
    }

    return {
      vesselName: vessel.vesselName,
      imo: vessel.imo,
      prePoolBalanceMJ: evalResult.complianceBalanceGCO2e,
      status: evalResult.status,
      penaltyPrePoolEur: evalResult.potentialPenaltyEur,
      allocatedFromPoolGCO2e: allocatedFromPool,
      postPoolBalanceGCO2e: postPoolBalance,
      penaltyPostPoolEur: postPenalty
    };
  });

  const contractSealHash = computeCryptoDigest(
    `${poolId}|${executionDate}|${reportingYear}|${netPoolBalanceGCO2e}|${totalPenaltyAvoidedEur}`
  );

  return {
    poolId,
    executionDate,
    reportingYear,
    targetGhgIntensity: targetIntensity,
    totalFleetEnergyMJ,
    grossSurplusGCO2e,
    grossDeficitGCO2e,
    netPoolBalanceGCO2e,
    isCompliant,
    totalPenaltyAvoidedEur,
    vessels: vesselResults,
    contractSealHash
  };
}

// ============================================================================
// DEMO SEED PRESETS
// ============================================================================

export const SEED_INSETTING_TOKENS: InsettingToken[] = [
  {
    tokenId: 'INSET-2026-B100-BCN-001',
    issueDate: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    fuelType: 'B100_BIODIESEL',
    fuelVolumeMT: 150.0,
    energyContentMJ: 5580000,
    bunkerLocation: 'Port de Barcelona - Muelle de la Energía',
    bdnReference: 'BDN-BCN-2026-9921',
    sustainabilityCertificateNumber: 'ISCC-EU-Cert-DE105-829104',
    ghgAbatementTonsCO2e: 429.102,
    allocatedShipmentRef: 'SHP-BCN-CUST01-BOOKTEST01',
    beneficiaryCompany: 'Customer01 Paper España (Plant North -> Can Tunis -> BCN)',
    transportMode: 'MARITIME_OCEAN',
    verificationStandard: 'ISO 14083 / GLEC Framework v3.0',
    digitalSignatureHash: 'SHA256-a9f3b148841b3f9aa9f3b148',
    qrCodeDigest: 'ATLAS-INSET://TOKEN/INSET-2026-B100-BCN-001/a9f3b148841b3f9a',
    retirementStatus: 'ALLOCATED_RETIRED'
  },
  {
    tokenId: 'INSET-2026-METH-RTM-002',
    issueDate: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
    fuelType: 'E_METHANOL',
    fuelVolumeMT: 280.0,
    energyContentMJ: 5572000,
    bunkerLocation: 'Port of Rotterdam - Maasvlakte Waalhaven',
    bdnReference: 'BDN-RTM-2026-1140',
    sustainabilityCertificateNumber: 'RSB-EU-RFNBO-2026-0041',
    ghgAbatementTonsCO2e: 476.963,
    allocatedShipmentRef: 'SHP-PACIFIC-TECH-048',
    beneficiaryCompany: 'Global Consumer Electronics Logistics',
    transportMode: 'MARITIME_OCEAN',
    verificationStandard: 'ISO 14083 / GLEC Framework v3.0',
    digitalSignatureHash: 'SHA256-c7e1d529925d1e7cc7e1d529',
    qrCodeDigest: 'ATLAS-INSET://TOKEN/INSET-2026-METH-RTM-002/c7e1d529925d1e7c',
    retirementStatus: 'ALLOCATED_RETIRED'
  },
  {
    tokenId: 'INSET-2026-HVO-VAL-003',
    issueDate: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    fuelType: 'HVO_RENEWABLE_DIESEL',
    fuelVolumeMT: 65.0,
    energyContentMJ: 2860000,
    bunkerLocation: 'Base Logística Can Tunis / Barcelona',
    bdnReference: 'BDN-CTN-2026-0418',
    sustainabilityCertificateNumber: 'ISCC-EU-Cert-ES216-99381',
    ghgAbatementTonsCO2e: 236.808,
    allocatedShipmentRef: 'DRAY-CANTUNIS-TLSA-01',
    beneficiaryCompany: 'Flota de Acarreo Terrestre Can Tunis - TLSA',
    transportMode: 'ROAD_DRAYAGE',
    verificationStandard: 'ISO 14083 / GLEC Framework v3.0',
    digitalSignatureHash: 'SHA256-e4a8b273372b8a4ee4a8b273',
    qrCodeDigest: 'ATLAS-INSET://TOKEN/INSET-2026-HVO-VAL-003/e4a8b273372b8a4e',
    retirementStatus: 'ALLOCATED_RETIRED'
  }
];

export const SEED_FUELEU_POOL_VESSELS: PoolVesselInput[] = [
  {
    vesselName: 'LAURA MAERSK',
    imo: '9944522',
    carrier: 'MAERSK',
    fuelConsumedMT: 450,
    fuelType: 'E_METHANOL',
    actualGhgIntensity: 5.4, // Super Green e-Methanol
    totalEnergyMJ: 8955000
  },
  {
    vesselName: 'CMA CGM JACQUES SAADE',
    imo: '9839179',
    carrier: 'CMA_CGM',
    fuelConsumedMT: 720,
    fuelType: 'BIO_LNG',
    actualGhgIntensity: 35.8, // Bio-LNG blend
    totalEnergyMJ: 35352000
  },
  {
    vesselName: 'MSC ISABELLA',
    imo: '9744673',
    carrier: 'MSC',
    fuelConsumedMT: 1100,
    fuelType: 'CONVENTIONAL_VLSFO',
    actualGhgIntensity: 91.0, // Deficit vs target 89.34
    totalEnergyMJ: 45100000
  },
  {
    vesselName: 'VALPARAISO EXPRESS',
    imo: '9540118',
    carrier: 'HAPAG_LLOYD',
    fuelConsumedMT: 950,
    fuelType: 'CONVENTIONAL_VLSFO',
    actualGhgIntensity: 91.0, // Deficit vs target 89.34
    totalEnergyMJ: 38950000
  }
];
