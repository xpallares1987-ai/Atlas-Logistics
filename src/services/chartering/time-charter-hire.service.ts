export interface OffHireIncidentInput {
  offHireReference?: string;
  offHireReason: string;
  offHireStartTimestamp: string; // ISO
  offHireEndTimestamp: string; // ISO
  bunkerVlsfoConsumedMt?: number;
  bunkerMgoConsumedMt?: number;
  vlsfoPriceUsdPerMt?: number;
  mgoPriceUsdPerMt?: number;
  incidentDescription?: string;
}

export interface TimeCharterHireInput {
  charterPeriodStart: string; // ISO
  charterPeriodEnd: string; // ISO
  dailyHireRateUsd: number; // e.g. 18500
  addressCommissionPercentage?: number; // e.g. 2.5% (charterer commission)
  brokeragePercentage?: number; // e.g. 1.25%
  offHireEvents?: OffHireIncidentInput[];
}

export interface ProcessedOffHire {
  offHireReference: string;
  offHireReason: string;
  start: string;
  end: string;
  durationHours: number;
  durationDaysDecimal: number;
  hireDeductionUsd: number;
  bunkerVlsfoConsumedMt: number;
  bunkerMgoConsumedMt: number;
  bunkerCompensationUsd: number;
  totalClaimUsd: number;
}

export interface TimeCharterHireOutput {
  grossPeriodDaysDecimal: number;
  grossHireAmountUsd: number;

  totalOffHireDaysDecimal: number;
  totalOffHireHireDeductionUsd: number;
  totalBunkerCompensationUsd: number;
  totalOffHireClaimsUsd: number;

  netHireDaysDecimal: number;
  addressCommissionAmountUsd: number;
  brokerageAmountUsd: number;
  totalCommissionsUsd: number;

  netPayableToOwnerUsd: number;
  offHires: ProcessedOffHire[];
  financialSummary: string;
}

export class TimeCharterHireService {
  /**
   * Calculates Time Charter Hire earnings, Off-Hire deductions and net settlements (NYPE 2015).
   */
  public static calculateHireStatement(
    input: TimeCharterHireInput,
  ): TimeCharterHireOutput {
    const startMs = new Date(input.charterPeriodStart).getTime();
    const endMs = new Date(input.charterPeriodEnd).getTime();
    const grossSec = Math.max(0, (endMs - startMs) / 1000);
    const grossDays = Number((grossSec / 86400).toFixed(4));
    const grossHire = Number((grossDays * input.dailyHireRateUsd).toFixed(2));

    const processedOffHires: ProcessedOffHire[] = [];
    let totalOffHireDays = 0;
    let totalOffHireHireDeduction = 0;
    let totalBunkerComp = 0;

    const events = input.offHireEvents || [];
    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      const evStart = new Date(ev.offHireStartTimestamp).getTime();
      const evEnd = new Date(ev.offHireEndTimestamp).getTime();
      const durSec = Math.max(0, (evEnd - evStart) / 1000);
      const durHours = Number((durSec / 3600).toFixed(2));
      const durDays = Number((durSec / 86400).toFixed(4));

      const hireDed = Number((durDays * input.dailyHireRateUsd).toFixed(2));

      const vlsfoMt = ev.bunkerVlsfoConsumedMt ?? 0;
      const mgoMt = ev.bunkerMgoConsumedMt ?? 0;
      const vlsfoPrice = ev.vlsfoPriceUsdPerMt ?? 580;
      const mgoPrice = ev.mgoPriceUsdPerMt ?? 750;
      const bunkerCost = Number(
        (vlsfoMt * vlsfoPrice + mgoMt * mgoPrice).toFixed(2),
      );

      const totalClaim = Number((hireDed + bunkerCost).toFixed(2));

      totalOffHireDays += durDays;
      totalOffHireHireDeduction += hireDed;
      totalBunkerComp += bunkerCost;

      processedOffHires.push({
        offHireReference: ev.offHireReference || `OFF-${i + 1}`,
        offHireReason: ev.offHireReason,
        start: ev.offHireStartTimestamp,
        end: ev.offHireEndTimestamp,
        durationHours: durHours,
        durationDaysDecimal: durDays,
        hireDeductionUsd: hireDed,
        bunkerVlsfoConsumedMt: vlsfoMt,
        bunkerMgoConsumedMt: mgoMt,
        bunkerCompensationUsd: bunkerCost,
        totalClaimUsd: totalClaim,
      });
    }

    totalOffHireDays = Number(totalOffHireDays.toFixed(4));
    totalOffHireHireDeduction = Number(totalOffHireHireDeduction.toFixed(2));
    totalBunkerComp = Number(totalBunkerComp.toFixed(2));
    const totalOffHireClaims = Number(
      (totalOffHireHireDeduction + totalBunkerComp).toFixed(2),
    );

    const netHireDays = Number(
      Math.max(0, grossDays - totalOffHireDays).toFixed(4),
    );
    const netHireBeforeCommissions = Number(
      (netHireDays * input.dailyHireRateUsd).toFixed(2),
    );

    const addrCommPercent = input.addressCommissionPercentage ?? 2.5;
    const brokeragePercent = input.brokeragePercentage ?? 1.25;
    const addrComm = Number(
      (
        (grossHire - totalOffHireHireDeduction) *
        (addrCommPercent / 100)
      ).toFixed(2),
    );
    const brokerage = Number(
      (
        (grossHire - totalOffHireHireDeduction) *
        (brokeragePercent / 100)
      ).toFixed(2),
    );
    const totalCommissions = Number((addrComm + brokerage).toFixed(2));

    const netPayable = Number(
      Math.max(
        0,
        netHireBeforeCommissions - totalBunkerComp - totalCommissions,
      ).toFixed(2),
    );

    const summary = `Periodo de fletamento: ${grossDays} días brutos ($${grossHire.toLocaleString("en-US")} USD). Deducciones Off-Hire: ${totalOffHireDays} días ($${totalOffHireClaims.toLocaleString("en-US")} USD incl. búnkeres). Comisiones: $${totalCommissions.toLocaleString("en-US")} USD. Saldo neto pagadero al Armador: $${netPayable.toLocaleString("en-US", { minimumFractionDigits: 2 })} USD.`;

    return {
      grossPeriodDaysDecimal: grossDays,
      grossHireAmountUsd: grossHire,
      totalOffHireDaysDecimal: totalOffHireDays,
      totalOffHireHireDeductionUsd: totalOffHireHireDeduction,
      totalBunkerCompensationUsd: totalBunkerComp,
      totalOffHireClaimsUsd: totalOffHireClaims,
      netHireDaysDecimal: netHireDays,
      addressCommissionAmountUsd: addrComm,
      brokerageAmountUsd: brokerage,
      totalCommissionsUsd: totalCommissions,
      netPayableToOwnerUsd: netPayable,
      offHires: processedOffHires,
      financialSummary: summary,
    };
  }
}
