/**
 * @file air-cargo-messaging.service.ts
 * @description Application service for IATA Air Cargo Messaging (Cargo-IMP FWB/FHL/FSU), e-AWB dispatch, and Cargo iQ milestone updates.
 * @module @atlas/services/air-cargo/air-cargo-messaging
 * @see {@link docs/adr/0029-air-cargo-messaging-cass-and-agent-network-clearing.md}
 */

import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  airCargoMessages,
  airwayBills,
  cargoIqMilestones,
} from "../../db/schema/index.js";
import {
  validateIataAwbNumber,
  calculateIataAwbCheckDigit,
  calculateAirChargeableWeight,
  buildCargoImpFwb,
  buildCargoImpFhl,
  parseCargoImpFsu,
  type CargoImpFwbInput,
  type CargoImpFhlInput,
} from "@atlas/shared";
import crypto from "node:crypto";
import { logger } from "../../config/logger.js";

export class AirCargoMessagingService {
  /**
   * Generates and enqueues an official IATA Cargo-IMP FWB (Freight Waybill) v16 teletype message
   * to transmit an electronic Air Waybill (e-AWB) to the operating airline.
   */
  async dispatchMasterFwb(
    input: CargoImpFwbInput,
    tenantId = "tenant-default",
  ) {
    // 1. Validate AWB number and modulus-7 check digit
    const cleanSerial = input.awbSerial7.replace(/[^0-9]/g, "");
    const fullAwbCandidate =
      cleanSerial.length === 7
        ? `${input.airlinePrefix}-${cleanSerial}${calculateIataAwbCheckDigit(cleanSerial)}`
        : `${input.airlinePrefix}-${cleanSerial}`;
    const awbValidation = validateIataAwbNumber(fullAwbCandidate);
    if (!awbValidation.isValid) {
      throw new Error(`Invalid IATA Master AWB: ${awbValidation.error}`);
    }

    // 2. Compute TACT chargeable weight
    const weightCalc = calculateAirChargeableWeight(
      input.grossWeightKg,
      input.volumeCbm ?? 0,
    );
    const finalChargeableWeight =
      input.chargeableWeightKg ?? weightCalc.chargeableWeightKg;

    // 3. Build standard Cargo-IMP FWB payload
    const teletypePayload = buildCargoImpFwb({
      ...input,
      chargeableWeightKg: finalChargeableWeight,
    });

    const messageId = `msg_fwb_${crypto.randomUUID()}`;
    const formattedAwb = awbValidation.formattedAwb!;

    // 4. Record in messaging ledger
    const messageRecord = {
      id: messageId,
      messageType: "FWB" as const,
      messageStandard: "CARGO_IMP" as const,
      messageVersion: "16",
      awbNumber: formattedAwb,
      airwayBillId: null,
      parentMawbNumber: null,
      flightNumber: input.flightNumber,
      flightDate: input.flightDayMonth,
      originAirport: input.originAirport.toUpperCase(),
      destinationAirport: input.destinationAirport.toUpperCase(),
      direction: "OUTBOUND_AIRLINE" as const,
      payloadRaw: teletypePayload,
      piecesCount: input.pieces,
      grossWeightKg: input.grossWeightKg,
      chargeableWeightKg: finalChargeableWeight,
      transmissionStatus: "QUEUED" as const,
      tenantId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.insert(airCargoMessages).values(messageRecord);

    logger.info(
      { messageId, awbNumber: formattedAwb },
      "Enqueued Cargo-IMP FWB to airline messaging outbox",
    );

    return {
      messageId,
      awbNumber: formattedAwb,
      messageType: "FWB",
      transmissionStatus: "QUEUED",
      chargeableWeightKg: finalChargeableWeight,
      payloadRaw: teletypePayload,
    };
  }

  /**
   * Generates and enqueues an IATA Cargo-IMP FHL (Consolidation List) v4 message
   * linking multiple House Air Waybills (HAWBs) under a parent Master AWB.
   */
  async dispatchHouseFhl(input: CargoImpFhlInput, tenantId = "tenant-default") {
    const cleanSerial = input.mawbSerial7.replace(/[^0-9]/g, "");
    const mawbCandidate =
      cleanSerial.length === 7
        ? `${input.airlinePrefix}-${cleanSerial}${calculateIataAwbCheckDigit(cleanSerial)}`
        : `${input.airlinePrefix}-${cleanSerial}`;
    const awbValidation = validateIataAwbNumber(mawbCandidate);
    if (!awbValidation.isValid) {
      throw new Error(`Invalid Parent Master AWB: ${awbValidation.error}`);
    }

    const teletypePayload = buildCargoImpFhl(input);
    const messageId = `msg_fhl_${crypto.randomUUID()}`;
    const formattedMawb = awbValidation.formattedAwb!;

    const messageRecord = {
      id: messageId,
      messageType: "FHL" as const,
      messageStandard: "CARGO_IMP" as const,
      messageVersion: "4",
      awbNumber: formattedMawb,
      airwayBillId: null,
      parentMawbNumber: formattedMawb,
      flightNumber: null,
      flightDate: null,
      originAirport: input.originAirport.toUpperCase(),
      destinationAirport: input.destinationAirport.toUpperCase(),
      direction: "OUTBOUND_AIRLINE" as const,
      payloadRaw: teletypePayload,
      piecesCount: input.totalPieces,
      grossWeightKg: input.totalGrossWeightKg,
      chargeableWeightKg: input.totalGrossWeightKg,
      transmissionStatus: "QUEUED" as const,
      tenantId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.insert(airCargoMessages).values(messageRecord);

    logger.info(
      { messageId, parentMawb: formattedMawb, houseCount: input.items.length },
      "Enqueued Cargo-IMP FHL consolidation message to airline outbox",
    );

    return {
      messageId,
      parentMawbNumber: formattedMawb,
      messageType: "FHL",
      houseCount: input.items.length,
      payloadRaw: teletypePayload,
    };
  }

  /**
   * Ingests an inbound airline Status Update (FSU) teletype message,
   * buffers it into `air_cargo_messages`, and updates Cargo iQ milestone records.
   */
  async ingestAirlineStatusUpdateFsu(
    teletypeRaw: string,
    tenantId = "tenant-default",
  ) {
    const parsed = parseCargoImpFsu(teletypeRaw);
    if (!parsed.isValid || !parsed.awbNumber || !parsed.milestoneCode) {
      throw new Error(
        `Invalid Cargo-IMP FSU payload: ${parsed.error || "missing fields"}`,
      );
    }

    const messageId = `msg_fsu_${crypto.randomUUID()}`;
    const messageRecord = {
      id: messageId,
      messageType: "FSU" as const,
      messageStandard: "CARGO_IMP" as const,
      messageVersion: "16",
      awbNumber: parsed.awbNumber,
      airwayBillId: null,
      parentMawbNumber: null,
      flightNumber: parsed.flightNumber || null,
      flightDate: null,
      originAirport: parsed.eventAirport || "MAD",
      destinationAirport: "JFK",
      milestoneCode: parsed.milestoneCode,
      direction: "INBOUND_AIRLINE" as const,
      payloadRaw: teletypeRaw,
      piecesCount: parsed.pieces ?? 1,
      grossWeightKg: parsed.grossWeightKg ?? 0,
      chargeableWeightKg: parsed.grossWeightKg ?? 0,
      transmissionStatus: "PROCESSED" as const,
      tenantId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.insert(airCargoMessages).values(messageRecord);

    // Update or insert Cargo iQ milestone
    const existingMilestone = await db
      .select()
      .from(cargoIqMilestones)
      .where(eq(cargoIqMilestones.awbNumber, parsed.awbNumber))
      .limit(1);

    if (existingMilestone.length > 0) {
      await db
        .update(cargoIqMilestones)
        .set({
          actualTime: new Date(),
          slaStatus: "ON_TIME",
          flightNumber: parsed.flightNumber || undefined,
          updatedAt: new Date(),
        })
        .where(eq(cargoIqMilestones.id, existingMilestone[0].id));
    }

    logger.info(
      {
        messageId,
        awbNumber: parsed.awbNumber,
        milestone: parsed.milestoneCode,
      },
      "Ingested airline FSU milestone update",
    );

    return {
      messageId,
      awbNumber: parsed.awbNumber,
      milestoneCode: parsed.milestoneCode,
      eventAirport: parsed.eventAirport,
      status: "PROCESSED",
    };
  }

  /**
   * Retrieves full IATA messaging audit trail for an AWB.
   */
  async getMessagesByAwb(awbNumber: string) {
    const list = await db
      .select()
      .from(airCargoMessages)
      .where(eq(airCargoMessages.awbNumber, awbNumber));

    return list;
  }
}
