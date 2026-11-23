/**
 * @file marine-telemetry.service.ts
 * @description Domain service for ingesting marine telematics (MQTT streams & NMEA-0183 sentences),
 * executing FuelEU Maritime & IMO CII assessments, managing snapshot state, and publishing outbox events.
 * @module @atlas/services/marine-telemetry
 * @see {@link docs/adr/0042-maritime-decarbonization-and-cbam-financial-ledger.md}
 */

import { v4 as uuidv4 } from "uuid";
import { outboxBus } from "../scm/kernel/outbox-bus.js";
import {
  assessVoyageTelemetry,
  parseNmeaRmcSentence,
  parseNmeaVtgSentence,
  parseNmeaRpmSentence,
  type RawMqttMarineTelemetry,
  type CompleteVoyageTelemetryAssessment,
  type NmeaRmcSentence,
  type NmeaVtgSentence,
  type NmeaRpmSentence,
} from "../scm/engines/marine-telemetry.engine.js";

export interface ParsedNmeaBatchResult {
  rmc: NmeaRmcSentence[];
  vtg: NmeaVtgSentence[];
  rpm: NmeaRpmSentence[];
  unparsedCount: number;
}

export class MarineTelemetryService {
  private static instance: MarineTelemetryService;
  // In-memory latest snapshot cache per IMO number for fast real-time fleet queries
  private readonly vesselSnapshots = new Map<
    string,
    CompleteVoyageTelemetryAssessment
  >();

  public static getInstance(): MarineTelemetryService {
    if (!MarineTelemetryService.instance) {
      MarineTelemetryService.instance = new MarineTelemetryService();
    }
    return MarineTelemetryService.instance;
  }

  /**
   * Ingests vessel telemetry from MQTT or automated IoT sensors,
   * runs deterministic FuelEU/CII assessment, caches snapshot, and emits outbox events.
   */
  public async ingestTelemetry(
    rawTelemetry: RawMqttMarineTelemetry,
    tenantId = "global_default",
    calendarYear = 2026,
  ): Promise<CompleteVoyageTelemetryAssessment> {
    const assessment = assessVoyageTelemetry(rawTelemetry, calendarYear);

    // Cache latest snapshot in memory for fast fleet queries
    this.vesselSnapshots.set(rawTelemetry.imoNumber, assessment);

    // Publish transactional event via Outbox Bus
    await outboxBus.publish({
      eventType: "marine.telemetry.ingested",
      aggregateType: "VESSEL_TELEMETRY",
      aggregateId: rawTelemetry.imoNumber,
      payload: {
        assessmentId: uuidv4(),
        tenantId,
        imoNumber: rawTelemetry.imoNumber,
        vesselName: rawTelemetry.vesselName,
        vesselType: rawTelemetry.vesselType,
        speedKnots: assessment.telemetry.speedOverGroundKnots,
        distanceNm: assessment.telemetry.distanceSailedNm,
        actualGhgIntensityGPerMj: assessment.fuelEu.actualGhgIntensityGPerMj,
        targetGhgIntensityGPerMj: assessment.fuelEu.targetGhgIntensityGPerMj,
        complianceBalanceGco2e: assessment.fuelEu.complianceBalanceGco2e,
        isFuelEuCompliant: assessment.fuelEu.isCompliant,
        fuelEuStatutoryPenaltyEur: assessment.fuelEu.statutoryPenaltyEur,
        attainedAerGco2PerDwtNm: assessment.cii.attainedAerGco2PerDwtNm,
        requiredCiiGco2PerDwtNm: assessment.cii.requiredCiiGco2PerDwtNm,
        ciiRating: assessment.cii.rating,
        correctiveActionRequired: assessment.cii.correctiveActionRequired,
        alertCount: assessment.alerts.length,
        timestamp: rawTelemetry.timestamp,
      },
    });

    return assessment;
  }

  /**
   * Parses and classifies a batch of raw NMEA-0183 sentences.
   */
  public parseNmeaBatch(sentences: string[]): ParsedNmeaBatchResult {
    const rmc: NmeaRmcSentence[] = [];
    const vtg: NmeaVtgSentence[] = [];
    const rpm: NmeaRpmSentence[] = [];
    let unparsedCount = 0;

    for (const line of sentences) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("$")) {
        unparsedCount++;
        continue;
      }

      if (trimmed.includes("RMC")) {
        const parsed = parseNmeaRmcSentence(trimmed);
        if (parsed) rmc.push(parsed);
        else unparsedCount++;
      } else if (trimmed.includes("VTG")) {
        const parsed = parseNmeaVtgSentence(trimmed);
        if (parsed) vtg.push(parsed);
        else unparsedCount++;
      } else if (trimmed.includes("RPM")) {
        const parsed = parseNmeaRpmSentence(trimmed);
        if (parsed) rpm.push(parsed);
        else unparsedCount++;
      } else {
        unparsedCount++;
      }
    }

    return {
      rmc,
      vtg,
      rpm,
      unparsedCount,
    };
  }

  /**
   * Retrieves the latest cached operational telemetry snapshot for a vessel by IMO number.
   */
  public getLatestSnapshot(
    imoNumber: string,
  ): CompleteVoyageTelemetryAssessment | null {
    const cleanImo = imoNumber.toUpperCase().replace(/^IMO/, "").trim();
    // Check both forms: "IMO9811000" and "9811000"
    return (
      this.vesselSnapshots.get(cleanImo) ||
      this.vesselSnapshots.get(`IMO${cleanImo}`) ||
      null
    );
  }

  /**
   * Lists all active cached vessel telemetry assessments.
   */
  public listFleetSnapshots(): CompleteVoyageTelemetryAssessment[] {
    return Array.from(this.vesselSnapshots.values());
  }

  /**
   * Clears in-memory fleet cache (useful for testing).
   */
  public clearCache(): void {
    this.vesselSnapshots.clear();
  }
}

export const marineTelemetryService = MarineTelemetryService.getInstance();
