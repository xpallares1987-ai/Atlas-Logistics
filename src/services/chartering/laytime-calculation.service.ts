export interface SofEventItem {
  id?: string;
  eventStartTimestamp: string; // ISO
  eventEndTimestamp: string; // ISO
  durationMinutes?: number;
  eventType: string; // "WORKING_OPERATIONS" | "RAIN_STOPPAGE" | "VESSEL_CRANE_BREAKDOWN" | "SUNDAY_SHEX_EXCLUDED" etc.
  laytimeCountingPercentage?: number; // default 100, 50, or 0
  isCountedAgainstLaytime?: boolean;
  interruptionReason?: string;
}

export interface LaytimeCalculationInput {
  cargoQuantityMt: number;
  laytimeAllowanceType?:
    "FIXED_TOTAL_HOURS" | "LOADING_DISCHARGING_RATES" | "TOTAL_DAYS_WWD";
  totalAllowedLaytimeHours?: number; // If fixed
  rateMtPerDay?: number; // e.g. 5000 MT/day
  laytimeTerms?: "SHINC" | "SHEX_EIU" | "SHEX_UU" | "FHINC" | "FHEX" | "CUSTOM";
  demurrageRateUsdPerDay: number; // e.g. 14000
  despatchRateUsdPerDay: number; // e.g. 7000
  despatchCalculationBasis?: "ATS_ALL_TIME_SAVED" | "WTS_WORKING_TIME_SAVED";
  laytimeCommencedTimestamp: string; // ISO
  operationsCompletedTimestamp: string; // ISO
  events: SofEventItem[];
  enforceOnceOnDemurrageRule?: boolean; // default true
}

export interface ProcessedEventBreakdown {
  eventType: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  percentCounted: number;
  countedMinutes: number;
  deductedMinutes: number;
  reason: string;
  isOnDemurrageDuringEvent: boolean;
}

export interface LaytimeCalculationOutput {
  allowedLaytimeSeconds: number;
  allowedLaytimeFormatted: string;
  allowedDaysDecimal: number;

  grossTimeElapsedSeconds: number;
  totalDeductionsSeconds: number;
  netLaytimeUsedSeconds: number;
  netLaytimeUsedFormatted: string;
  netUsedDaysDecimal: number;

  timeDifferenceSeconds: number; // Positive = Demurrage, Negative = Despatch
  timeDifferenceFormatted: string;

  isDemurrage: boolean;
  demurrageDaysDecimal: number;
  despatchDaysDecimal: number;

  totalDemurrageAmountUsd: number;
  totalDespatchAmountUsd: number;
  netFinancialPayableUsd: number;
  payableParty: "CHARTERER_PAYS_OWNER" | "OWNER_PAYS_CHARTERER" | "NIL_BALANCE";

  eventBreakdowns: ProcessedEventBreakdown[];
  calculationSummary: string;
}

export class LaytimeCalculationService {
  /**
   * Formats seconds into "Xd Xh Xm" string
   */
  public static formatDuration(totalSeconds: number): string {
    const isNeg = totalSeconds < 0;
    const absSec = Math.abs(Math.round(totalSeconds));
    const days = Math.floor(absSec / 86400);
    const hours = Math.floor((absSec % 86400) / 3600);
    const minutes = Math.floor((absSec % 3600) / 60);

    return `${isNeg ? "-" : ""}${days}d ${hours.toString().padStart(2, "0")}h ${minutes.toString().padStart(2, "0")}m`;
  }

  /**
   * Computes deterministic Laytime, Demurrage and Despatch based on SOF events.
   */
  public static calculateLaytime(
    input: LaytimeCalculationInput,
  ): LaytimeCalculationOutput {
    // 1. Calculate Allowed Laytime
    let allowedSeconds = 0;
    if (
      input.laytimeAllowanceType === "FIXED_TOTAL_HOURS" &&
      input.totalAllowedLaytimeHours
    ) {
      allowedSeconds = Math.round(input.totalAllowedLaytimeHours * 3600);
    } else if (input.rateMtPerDay && input.rateMtPerDay > 0) {
      const allowedDays = input.cargoQuantityMt / input.rateMtPerDay;
      allowedSeconds = Math.round(allowedDays * 86400);
    } else if (input.totalAllowedLaytimeHours) {
      allowedSeconds = Math.round(input.totalAllowedLaytimeHours * 3600);
    } else {
      // Default fallback: 5 days
      allowedSeconds = 5 * 86400;
    }

    const allowedDaysDecimal = Number((allowedSeconds / 86400).toFixed(4));
    const allowedFormatted = this.formatDuration(allowedSeconds);

    // 2. Sort events chronologically
    const sortedEvents = [...input.events].sort(
      (a, b) =>
        new Date(a.eventStartTimestamp).getTime() -
        new Date(b.eventStartTimestamp).getTime(),
    );

    const onceOnDemurrage = input.enforceOnceOnDemurrageRule !== false;
    let accumulatedUsedSeconds = 0;
    let totalDeductionsSeconds = 0;
    let currentlyOnDemurrage = false;

    const breakdowns: ProcessedEventBreakdown[] = [];

    for (const ev of sortedEvents) {
      const start = new Date(ev.eventStartTimestamp).getTime();
      const end = new Date(ev.eventEndTimestamp).getTime();
      const durSec = Math.max(0, Math.round((end - start) / 1000));
      const durMin = Math.round(durSec / 60);

      // Determine default counting percentage based on event type & contract terms
      let defaultPercent = ev.laytimeCountingPercentage ?? 100;
      let reason = ev.interruptionReason || "";

      if (ev.eventType === "WORKING_OPERATIONS") {
        defaultPercent = 100;
        reason = reason || "Normal cargo operations";
      } else if (
        ev.eventType === "RAIN_STOPPAGE" ||
        ev.eventType === "STRONG_WINDS_STORM_WWD"
      ) {
        defaultPercent = 0; // WWD exception
        reason = reason || "Weather stoppage (WWD exception)";
      } else if (ev.eventType === "VESSEL_CRANE_BREAKDOWN") {
        defaultPercent = 0; // Vessel breakdown always excluded
        reason = reason || "Shipboard crane breakdown (Owner liability)";
      } else if (ev.eventType === "BERTHING_SHIFTING_TRANSIT") {
        defaultPercent = 0; // Shifting from anchorage to berth excluded
        reason = reason || "Inward transit from anchorage to berth";
      } else if (
        ev.eventType === "SUNDAY_SHEX_EXCLUDED" ||
        ev.eventType === "HOLIDAY_SHEX_EXCLUDED"
      ) {
        if (input.laytimeTerms === "SHINC" || input.laytimeTerms === "FHINC") {
          defaultPercent = 100;
          reason = reason || "Sunday/Holiday included in laytime (SHINC)";
        } else {
          defaultPercent = 0;
          reason = reason || "Sunday/Holiday excluded from laytime (SHEX)";
        }
      } else if (ev.isCountedAgainstLaytime === false) {
        defaultPercent = 0;
        reason = reason || "Explicit non-counting event";
      }

      // Check if vessel is already on demurrage and enforce "Once on demurrage, always on demurrage"
      if (
        currentlyOnDemurrage &&
        onceOnDemurrage &&
        ev.eventType !== "VESSEL_CRANE_BREAKDOWN"
      ) {
        // Once on demurrage, weather & SHEX deductions no longer apply!
        if (defaultPercent < 100) {
          reason +=
            " [Deduction disallowed: Once on demurrage, always on demurrage]";
          defaultPercent = 100;
        }
      }

      const countedSec = Math.round(durSec * (defaultPercent / 100));
      const deductedSec = durSec - countedSec;

      accumulatedUsedSeconds += countedSec;
      totalDeductionsSeconds += deductedSec;

      if (accumulatedUsedSeconds >= allowedSeconds) {
        currentlyOnDemurrage = true;
      }

      breakdowns.push({
        eventType: ev.eventType,
        startTime: ev.eventStartTimestamp,
        endTime: ev.eventEndTimestamp,
        durationMinutes: durMin,
        percentCounted: defaultPercent,
        countedMinutes: Math.round(countedSec / 60),
        deductedMinutes: Math.round(deductedSec / 60),
        reason,
        isOnDemurrageDuringEvent: currentlyOnDemurrage,
      });
    }

    // 3. Compute Gross & Net Laytime
    const commencedMs = new Date(input.laytimeCommencedTimestamp).getTime();
    const completedMs = new Date(input.operationsCompletedTimestamp).getTime();
    const grossElapsedSec = Math.max(
      0,
      Math.round((completedMs - commencedMs) / 1000),
    );

    // If no events provided or events duration differs, sync netLaytime
    const netLaytimeUsedSeconds =
      accumulatedUsedSeconds > 0
        ? accumulatedUsedSeconds
        : Math.max(0, grossElapsedSec - totalDeductionsSeconds);
    const netUsedDaysDecimal = Number(
      (netLaytimeUsedSeconds / 86400).toFixed(4),
    );
    const netUsedFormatted = this.formatDuration(netLaytimeUsedSeconds);

    // 4. Determine Demurrage vs Despatch
    const timeDiffSec = netLaytimeUsedSeconds - allowedSeconds;
    const isDemurrage = timeDiffSec > 0;
    const timeDiffFormatted = this.formatDuration(Math.abs(timeDiffSec));

    let demurrageDays = 0;
    let despatchDays = 0;
    let totalDemurrage = 0;
    let totalDespatch = 0;
    let netPayable = 0;
    let payableParty:
      "CHARTERER_PAYS_OWNER" | "OWNER_PAYS_CHARTERER" | "NIL_BALANCE" =
      "NIL_BALANCE";

    if (isDemurrage) {
      demurrageDays = Number((timeDiffSec / 86400).toFixed(4));
      totalDemurrage = Number(
        (demurrageDays * input.demurrageRateUsdPerDay).toFixed(2),
      );
      netPayable = totalDemurrage;
      payableParty = "CHARTERER_PAYS_OWNER";
    } else if (timeDiffSec < 0) {
      despatchDays = Number((Math.abs(timeDiffSec) / 86400).toFixed(4));
      totalDespatch = Number(
        (despatchDays * input.despatchRateUsdPerDay).toFixed(2),
      );
      netPayable = totalDespatch;
      payableParty = "OWNER_PAYS_CHARTERER";
    }

    const summary = isDemurrage
      ? `Buque incurrió en DEMURRAGE por ${timeDiffFormatted} (${demurrageDays} días). Fletador debe abonar $${totalDemurrage.toLocaleString("en-US", { minimumFractionDigits: 2 })} USD al Armador.`
      : timeDiffSec < 0
        ? `Operación completada con PRONTO DESPACHO (DESPATCH) ahorrando ${timeDiffFormatted} (${despatchDays} días). Armador debe abonar $${totalDespatch.toLocaleString("en-US", { minimumFractionDigits: 2 })} USD al Fletador.`
        : "Operación finalizada exactamente en el tiempo de plancha concedido (Saldo cero).";

    return {
      allowedLaytimeSeconds: allowedSeconds,
      allowedLaytimeFormatted: allowedFormatted,
      allowedDaysDecimal,
      grossTimeElapsedSeconds: grossElapsedSec,
      totalDeductionsSeconds,
      netLaytimeUsedSeconds,
      netLaytimeUsedFormatted: netUsedFormatted,
      netUsedDaysDecimal,
      timeDifferenceSeconds: timeDiffSec,
      timeDifferenceFormatted: isDemurrage
        ? `+${timeDiffFormatted}`
        : `-${timeDiffFormatted}`,
      isDemurrage,
      demurrageDaysDecimal: demurrageDays,
      despatchDaysDecimal: despatchDays,
      totalDemurrageAmountUsd: totalDemurrage,
      totalDespatchAmountUsd: totalDespatch,
      netFinancialPayableUsd: netPayable,
      payableParty,
      eventBreakdowns: breakdowns,
      calculationSummary: summary,
    };
  }
}
