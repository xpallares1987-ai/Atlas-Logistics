/**
 * @file workload.ts
 * @description Operational Workload & Account Portfolio Engine for Atlas Logistics (Book TEST01 · Barcelona).
 * Implements weighted operational scoring, saturation thresholds, exclusion rules for managers/accounting,
 * and automated account rebalancing recommendations.
 */

export interface WorkloadSettings {
  weightShipment: number; // Puntos por expediente base (ej. 1.0)
  weightTeu: number; // Puntos por TEU / contenedor (ej. 0.06)
  weightBuyer: number; // Puntos por cuenta de cliente distinta (ej. 1.5)
  weightComplexIncoterm: number; // Puntos por incoterm complejo (DAP/DDP/FCA/DPU/DDU/CIP/EXW) (ej. 2.0)
  weightTonsHundred: number; // Puntos por cada 100 toneladas (ej. 0.05)
  capacityThreshold: number; // Umbral mensual de capacidad estándar por operativo en puntos (ej. 100.0)
  thresholdHighWarning: number; // % de saturación para Alerta Amarilla (ej. 80.0%)
  thresholdCritical: number; // % de saturación para Sobrecarga Crítica / Alerta Roja (ej. 100.0%)
  concentrationThreshold: number; // % de concentración de una cuenta para alerta de riesgo comercial (ej. 50.0%)
  rebalanceTargetSaturation: number; // % máximo objetivo al transferir cuentas a otro gestor (ej. 85.0%)
}

export const DEFAULT_WORKLOAD_SETTINGS: WorkloadSettings = {
  weightShipment: 1.0,
  weightTeu: 0.06,
  weightBuyer: 1.5,
  weightComplexIncoterm: 2.0,
  weightTonsHundred: 0.05,
  capacityThreshold: 100.0,
  thresholdHighWarning: 80.0,
  thresholdCritical: 100.0,
  concentrationThreshold: 50.0,
  rebalanceTargetSaturation: 85.0,
};

export const EXCLUDED_OPERATIVE_NAMES = [
  "operations manager",
  "department manager",
  "test02",
  "blocked user",
  "restricted_user",
  "restricted_operator",
  "accounting lead",
];

/**
 * Checks whether an operative name represents a management/accounting role excluded from tactical traffic assignments.
 */
export function isExcludedOperative(name: string): boolean {
  if (!name) return false;
  const clean = name.trim().toLowerCase();
  return EXCLUDED_OPERATIVE_NAMES.some(
    (excluded) => clean === excluded || clean.includes(excluded),
  );
}

export interface OperativeWorkloadRawInput {
  operativeName: string;
  shipmentsCount: number;
  totalTeus: number;
  distinctBuyersCount: number;
  complexIncotermsCount: number;
  totalMetricTons: number;
  primaryBuyers?: Array<{
    buyerName: string;
    shipmentsCount: number;
    sharePercent: number;
  }>;
}

export interface OperativeWorkloadMetrics {
  operativeName: string;
  totalPoints: number;
  shipmentPoints: number;
  teuPoints: number;
  buyerPoints: number;
  incotermPoints: number;
  tonnagePoints: number;
  saturationPercent: number;
  status: "NORMAL" | "HIGH_WARNING" | "CRITICAL_OVERLOAD";
  isExcluded: boolean;
  hasConcentrationRisk: boolean;
  topBuyer?: { buyerName: string; sharePercent: number };
}

export interface WorkloadAnalysisSummary {
  totalOperatives: number;
  activeOperatives: number;
  excludedOperatives: number;
  avgSaturation: number;
  overloadedCount: number;
  highCount: number;
  normalCount: number;
  totalShipments: number;
  totalTeus: number;
}

export interface RebalanceRecommendation {
  sourceOperative: string;
  targetOperative: string;
  buyerToTransfer: string;
  transferredShipments: number;
  transferredPoints: number;
  sourceOldSaturation: number;
  sourceNewSaturation: number;
  targetOldSaturation: number;
  targetNewSaturation: number;
  rationale: string;
}

/**
 * Calculates weighted workload score and saturation percentage for an operative.
 */
export function calculateOperativeScore(
  input: OperativeWorkloadRawInput,
  settings: WorkloadSettings = DEFAULT_WORKLOAD_SETTINGS,
): OperativeWorkloadMetrics {
  const isExcluded = isExcludedOperative(input.operativeName);

  if (isExcluded) {
    return {
      operativeName: input.operativeName,
      totalPoints: 0,
      shipmentPoints: 0,
      teuPoints: 0,
      buyerPoints: 0,
      incotermPoints: 0,
      tonnagePoints: 0,
      saturationPercent: 0,
      status: "NORMAL",
      isExcluded: true,
      hasConcentrationRisk: false,
    };
  }

  const shipmentPoints = Number(
    (input.shipmentsCount * settings.weightShipment).toFixed(2),
  );
  const teuPoints = Number((input.totalTeus * settings.weightTeu).toFixed(2));
  const buyerPoints = Number(
    (input.distinctBuyersCount * settings.weightBuyer).toFixed(2),
  );
  const incotermPoints = Number(
    (input.complexIncotermsCount * settings.weightComplexIncoterm).toFixed(2),
  );
  const tonnagePoints = Number(
    ((input.totalMetricTons / 100) * settings.weightTonsHundred).toFixed(2),
  );

  const totalPoints = Number(
    (
      shipmentPoints +
      teuPoints +
      buyerPoints +
      incotermPoints +
      tonnagePoints
    ).toFixed(2),
  );
  const saturationPercent = Number(
    ((totalPoints / Math.max(1, settings.capacityThreshold)) * 100).toFixed(1),
  );

  let status: "NORMAL" | "HIGH_WARNING" | "CRITICAL_OVERLOAD" = "NORMAL";
  if (saturationPercent >= settings.thresholdCritical) {
    status = "CRITICAL_OVERLOAD";
  } else if (saturationPercent >= settings.thresholdHighWarning) {
    status = "HIGH_WARNING";
  }

  // Concentration check
  let hasConcentrationRisk = false;
  let topBuyer: { buyerName: string; sharePercent: number } | undefined;

  if (input.primaryBuyers && input.primaryBuyers.length > 0) {
    const sorted = [...input.primaryBuyers].sort(
      (a, b) => b.sharePercent - a.sharePercent,
    );
    topBuyer = {
      buyerName: sorted[0].buyerName,
      sharePercent: sorted[0].sharePercent,
    };
    if (topBuyer.sharePercent >= settings.concentrationThreshold) {
      hasConcentrationRisk = true;
    }
  }

  return {
    operativeName: input.operativeName,
    totalPoints,
    shipmentPoints,
    teuPoints,
    buyerPoints,
    incotermPoints,
    tonnagePoints,
    saturationPercent,
    status,
    isExcluded: false,
    hasConcentrationRisk,
    topBuyer,
  };
}

/**
 * Computes portfolio-wide workload analysis and KPI summary.
 */
export function analyzeWorkloadPortfolio(
  operatives: OperativeWorkloadRawInput[],
  settings: WorkloadSettings = DEFAULT_WORKLOAD_SETTINGS,
): {
  summary: WorkloadAnalysisSummary;
  operatives: OperativeWorkloadMetrics[];
} {
  const scored = operatives.map((op) => calculateOperativeScore(op, settings));
  const activeOnly = scored.filter((s) => !s.isExcluded);

  const totalOperatives = scored.length;
  const activeOperatives = activeOnly.length;
  const excludedOperatives = totalOperatives - activeOperatives;

  const overloadedCount = activeOnly.filter(
    (s) => s.status === "CRITICAL_OVERLOAD",
  ).length;
  const highCount = activeOnly.filter(
    (s) => s.status === "HIGH_WARNING",
  ).length;
  const normalCount = activeOnly.filter((s) => s.status === "NORMAL").length;

  const totalSaturation = activeOnly.reduce(
    (acc, s) => acc + s.saturationPercent,
    0,
  );
  const avgSaturation =
    activeOperatives > 0
      ? Number((totalSaturation / activeOperatives).toFixed(1))
      : 0;

  const totalShipments = operatives.reduce(
    (acc, op) => acc + (op.shipmentsCount || 0),
    0,
  );
  const totalTeus = operatives.reduce(
    (acc, op) => acc + (op.totalTeus || 0),
    0,
  );

  return {
    summary: {
      totalOperatives,
      activeOperatives,
      excludedOperatives,
      avgSaturation,
      overloadedCount,
      highCount,
      normalCount,
      totalShipments,
      totalTeus,
    },
    operatives: scored,
  };
}

/**
 * Generates automated account rebalancing recommendations to mitigate burnout and ensure SLA compliance.
 */
export function generateRebalancingRecommendations(
  rawOperatives: OperativeWorkloadRawInput[],
  settings: WorkloadSettings = DEFAULT_WORKLOAD_SETTINGS,
): RebalanceRecommendation[] {
  const analysis = analyzeWorkloadPortfolio(rawOperatives, settings);
  const recommendations: RebalanceRecommendation[] = [];

  const overloaded = analysis.operatives.filter(
    (op) => op.status === "CRITICAL_OVERLOAD",
  );
  const availableReceivers = analysis.operatives
    .filter(
      (op) =>
        !op.isExcluded &&
        op.saturationPercent < settings.rebalanceTargetSaturation,
    )
    .sort((a, b) => a.saturationPercent - b.saturationPercent);

  for (const donor of overloaded) {
    const rawDonor = rawOperatives.find(
      (r) => r.operativeName === donor.operativeName,
    );
    if (
      !rawDonor ||
      !rawDonor.primaryBuyers ||
      rawDonor.primaryBuyers.length <= 1
    )
      continue;

    // Pick a candidate buyer that is not the sole main account
    const candidateBuyers = [...rawDonor.primaryBuyers]
      .filter((b) => b.sharePercent < 80)
      .sort((a, b) => a.shipmentsCount - b.shipmentsCount);

    for (const candidate of candidateBuyers) {
      const estimatedBuyerPoints = Number(
        (
          candidate.shipmentsCount * settings.weightShipment +
          settings.weightBuyer
        ).toFixed(2),
      );

      // Find an available receiver who won't breach target saturation
      for (const receiver of availableReceivers) {
        const potentialReceiverPoints =
          receiver.totalPoints + estimatedBuyerPoints;
        const potentialReceiverSat = Number(
          (
            (potentialReceiverPoints / settings.capacityThreshold) *
            100
          ).toFixed(1),
        );

        if (potentialReceiverSat <= settings.rebalanceTargetSaturation) {
          const sourceNewPoints = Math.max(
            0,
            donor.totalPoints - estimatedBuyerPoints,
          );
          const sourceNewSat = Number(
            ((sourceNewPoints / settings.capacityThreshold) * 100).toFixed(1),
          );

          recommendations.push({
            sourceOperative: donor.operativeName,
            targetOperative: receiver.operativeName,
            buyerToTransfer: candidate.buyerName,
            transferredShipments: candidate.shipmentsCount,
            transferredPoints: estimatedBuyerPoints,
            sourceOldSaturation: donor.saturationPercent,
            sourceNewSaturation: sourceNewSat,
            targetOldSaturation: receiver.saturationPercent,
            targetNewSaturation: potentialReceiverSat,
            rationale: `Rebalancear cuenta '${candidate.buyerName}' (${candidate.shipmentsCount} expedientes, ${estimatedBuyerPoints} pts) para aliviar sobrecarga de ${donor.saturationPercent}% a ${sourceNewSat}% sin saturar al receptor.`,
          });

          // Update receiver saturation in local tracking to avoid multiple piling
          receiver.totalPoints = potentialReceiverPoints;
          receiver.saturationPercent = potentialReceiverSat;
          break;
        }
      }
    }
  }

  return recommendations;
}
