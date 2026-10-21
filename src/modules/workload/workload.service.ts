/**
 * @file workload.service.ts
 * @description Fastify service for Workload Analysis, Account Portfolio Management,
 * Axle Load Distribution, and Carrier Charge Audit (Book TEST01 · Barcelona).
 */

import {
  WorkloadSettings,
  DEFAULT_WORKLOAD_SETTINGS,
  OperativeWorkloadRawInput,
  OperativeWorkloadMetrics,
  WorkloadAnalysisSummary,
  RebalanceRecommendation,
  analyzeWorkloadPortfolio,
  generateRebalancingRecommendations,
  CoilPositionInput,
  AxleCalculationResult,
  calculateAxleLoadsAndHeatmap,
  BilledChargeItem,
  DiscrepancyAuditFinding,
  auditChargeItem,
} from "@atlas/shared";

export class WorkloadService {
  private settings: WorkloadSettings = { ...DEFAULT_WORKLOAD_SETTINGS };

  private operatives: OperativeWorkloadRawInput[] = [
    {
      operativeName: "TEST01 (Team Leader Customer01)",
      shipmentsCount: 42,
      totalTeus: 115,
      distinctBuyersCount: 14,
      complexIncotermsCount: 9,
      totalMetricTons: 2850,
      primaryBuyers: [
        {
          buyerName: "Customer01 Paper UK Ltd",
          shipmentsCount: 26,
          sharePercent: 61.9,
        },
        {
          buyerName: "Cartonneries Rhône-Alpes",
          shipmentsCount: 16,
          sharePercent: 38.1,
        },
      ],
    },
    {
      operativeName: "Operador Tráfico Marítimo 1",
      shipmentsCount: 52,
      totalTeus: 140,
      distinctBuyersCount: 16,
      complexIncotermsCount: 12,
      totalMetricTons: 3400,
      primaryBuyers: [
        {
          buyerName: "Nordic Packaging AB",
          shipmentsCount: 32,
          sharePercent: 61.5,
        },
        {
          buyerName: "Iberia Corrugated S.L.",
          shipmentsCount: 20,
          sharePercent: 38.5,
        },
      ],
    },
    {
      operativeName: "Operador Tráfico Marítimo 2",
      shipmentsCount: 22,
      totalTeus: 55,
      distinctBuyersCount: 6,
      complexIncotermsCount: 3,
      totalMetricTons: 1450,
      primaryBuyers: [
        {
          buyerName: "Mediterranean Paper Srl",
          shipmentsCount: 22,
          sharePercent: 100,
        },
      ],
    },
    {
      operativeName: "TEST02 (Operations Manager)",
      shipmentsCount: 0,
      totalTeus: 0,
      distinctBuyersCount: 0,
      complexIncotermsCount: 0,
      totalMetricTons: 0,
    },
    {
      operativeName: "Blocked User (Contabilidad)",
      shipmentsCount: 0,
      totalTeus: 0,
      distinctBuyersCount: 0,
      complexIncotermsCount: 0,
      totalMetricTons: 0,
    },
  ];

  private chargeAudits: BilledChargeItem[] = [
    {
      id: "CHG-MSC-001",
      shipmentRef: "EXP-BCN-2026-901",
      carrierCode: "MSC",
      carrierRawName: "Mediterranean Shipping Company",
      chargeCode: "DEMURRAGE",
      equipmentType: "40HC",
      quantityUnits: 3,
      unitRateBilledEur: 80,
      totalBilledEur: 240,
      freeDaysContracted: 7,
      actualDaysPortStay: 5,
      reimbursedToClientEur: 240,
    },
    {
      id: "CHG-MAERSK-002",
      shipmentRef: "EXP-BCN-2026-902",
      carrierCode: "MAERSK",
      carrierRawName: "Maersk Line A/S",
      chargeCode: "DETENTION",
      equipmentType: "40HC",
      quantityUnits: 2,
      unitRateBilledEur: 95,
      totalBilledEur: 190,
      agreedContractRateEur: 80,
      freeDaysContracted: 7,
      actualDaysPortStay: 9,
      reimbursedToClientEur: 190,
    },
    {
      id: "CHG-CMA-003",
      shipmentRef: "EXP-BCN-2026-903",
      carrierCode: "CMACGM",
      carrierRawName: "CMA CGM S.A.",
      chargeCode: "STORAGE",
      equipmentType: "40HC",
      quantityUnits: 1,
      unitRateBilledEur: 145,
      totalBilledEur: 145,
      freeDaysContracted: 5,
      actualDaysPortStay: 6,
      reimbursedToClientEur: 50, // Fuga de margen de 95 EUR
    },
  ];

  public getSettings(): WorkloadSettings {
    return { ...this.settings };
  }

  public updateSettings(
    newSettings: Partial<WorkloadSettings>,
  ): WorkloadSettings {
    this.settings = { ...this.settings, ...newSettings };
    return { ...this.settings };
  }

  public getWorkloadAnalysis(): {
    summary: WorkloadAnalysisSummary;
    operatives: OperativeWorkloadMetrics[];
    rebalanceRecommendations: RebalanceRecommendation[];
  } {
    const analysis = analyzeWorkloadPortfolio(this.operatives, this.settings);
    const rebalanceRecommendations = generateRebalancingRecommendations(
      this.operatives,
      this.settings,
    );
    return {
      summary: analysis.summary,
      operatives: analysis.operatives,
      rebalanceRecommendations,
    };
  }

  public applyRebalance(params: {
    sourceOperative: string;
    targetOperative: string;
    buyerName: string;
  }): { success: boolean; message: string } {
    const source = this.operatives.find(
      (o) => o.operativeName === params.sourceOperative,
    );
    const target = this.operatives.find(
      (o) => o.operativeName === params.targetOperative,
    );

    if (!source || !target) {
      throw new Error("Operativo de origen o destino no encontrado.");
    }

    const buyerIdx =
      source.primaryBuyers?.findIndex(
        (b) => b.buyerName === params.buyerName,
      ) ?? -1;
    if (buyerIdx === -1 || !source.primaryBuyers) {
      throw new Error(
        `Cuenta '${params.buyerName}' no encontrada en el gestor de origen.`,
      );
    }

    const [transferredBuyer] = source.primaryBuyers.splice(buyerIdx, 1);
    source.shipmentsCount = Math.max(
      0,
      source.shipmentsCount - transferredBuyer.shipmentsCount,
    );
    source.distinctBuyersCount = Math.max(1, source.distinctBuyersCount - 1);

    if (!target.primaryBuyers) target.primaryBuyers = [];
    target.primaryBuyers.push(transferredBuyer);
    target.shipmentsCount += transferredBuyer.shipmentsCount;
    target.distinctBuyersCount += 1;

    return {
      success: true,
      message: `Cuenta '${params.buyerName}' transferida con éxito de '${params.sourceOperative}' a '${params.targetOperative}'.`,
    };
  }

  public calculateAxleHeatmap(
    coils: CoilPositionInput[],
    isUsa: boolean = false,
  ): AxleCalculationResult {
    return calculateAxleLoadsAndHeatmap(coils, isUsa);
  }

  public getChargeDiscrepancies(): {
    totalAudited: number;
    discrepanciesCount: number;
    totalDiscrepancyEur: number;
    findings: DiscrepancyAuditFinding[];
  } {
    const findings = this.chargeAudits.map((chg) => auditChargeItem(chg));
    const discrepancies = findings.filter((f) => f.type !== "COMPLIANT");
    const totalDiscrepancyEur = Number(
      discrepancies.reduce((acc, f) => acc + f.discrepancyEur, 0).toFixed(2),
    );

    return {
      totalAudited: findings.length,
      discrepanciesCount: discrepancies.length,
      totalDiscrepancyEur,
      findings,
    };
  }
}
