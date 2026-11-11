/**
 * @file iata-one-record.service.ts
 * @description Orchestration service for IATA ONE Record & Air Cargo e-AWB Linked Data Hub (SQLite WAL backing).
 */

import { eq, and, asc } from "drizzle-orm";
import { db } from "../../db/index.js";
import * as schema from "../../db/schema/index.js";
import { outboxBus } from "../../scm/kernel/outbox-bus.js";
import { DEFAULT_OPERATOR_ACTOR } from "../../scm/kernel/primitives.js";
import {
  OneRecordWaybill,
  CargoIqMilestone,
  DangerousGoodsItem,
  EDgdValidationResult,
  CargoIqMilestoneCode,
  MilestoneSlaStatus,
  validateDangerousGoodsDeclaration,
  evaluateMilestoneSla,
} from "@atlas/shared";

export class IataOneRecordService {
  public async getWaybills(): Promise<OneRecordWaybill[]> {
    const rows = await db
      .select()
      .from(schema.airwayBills)
      .where(eq(schema.airwayBills.isDeleted, false));

    return rows.map((row) => {
      if (row.oneRecordJsonLd && typeof row.oneRecordJsonLd === "object") {
        return row.oneRecordJsonLd as OneRecordWaybill;
      }

      const prefix =
        row.airlinePrefix ||
        (row.awbNumber.includes("-") ? row.awbNumber.split("-")[0] : "075");
      const num = row.awbNumber.includes("-")
        ? row.awbNumber.split("-")[1]
        : row.awbNumber;

      return {
        "@context": "https://onerecord.iata.org/ns/cargo#",
        "@type": "Waybill",
        waybillId: `WBL-${row.awbNumber}`,
        waybillPrefix: prefix,
        waybillNumber: num,
        fullAwbNumber: row.awbNumber,
        originAirport: row.originAirport,
        destinationAirport: row.destinationAirport,
        piecesCount: row.pieces,
        totalGrossWeightKg: row.grossWeightKg,
        totalVolumeCbm: row.volumeCbm,
        chargeableWeightKg: row.chargeableWeightKg,
        natureAndQuantityOfGoods: row.natureOfGoods,
        shipper: (row.shipperData as any) || {
          "@type": "Actor",
          name: "Shipper",
        },
        consignee: (row.consigneeData as any) || {
          "@type": "Actor",
          name: "Consignee",
        },
        issuingAgent: (row.issuingAgentData as any) || {
          "@type": "Actor",
          name: "Atlas Cargo Agent",
        },
        carrier: {
          "@type": "Actor",
          name: row.airlineName || "Carrier",
          iataCode: prefix,
        },
        transportMovement: {
          "@type": "TransportMovement",
          flightNumber: row.flightNumber || "FL001",
          carrierCode: prefix,
          originAirport: row.originAirport,
          destinationAirport: row.destinationAirport,
          scheduledDeparture: row.flightDate
            ? new Date(row.flightDate).toISOString()
            : new Date().toISOString(),
          scheduledArrival: new Date(
            Date.now() + 8 * 3600 * 1000,
          ).toISOString(),
          aircraftType: "Airbus A350-900",
        },
        pieces: [],
        specialHandlingCodes: (row.specialHandlingCodes as string[]) || [],
        createdDate: row.createdAt
          ? new Date(row.createdAt).toISOString()
          : new Date().toISOString(),
        digitalSealHash: `SHA256-${row.id || row.awbNumber}`,
      } as OneRecordWaybill;
    });
  }

  public async getWaybill(
    waybillId: string,
  ): Promise<OneRecordWaybill | undefined> {
    const cleanId = waybillId.replace(/^WBL-/, "");
    const rows = await db
      .select()
      .from(schema.airwayBills)
      .where(eq(schema.airwayBills.isDeleted, false));

    const match = rows.find(
      (r) =>
        r.awbNumber === waybillId ||
        r.awbNumber === cleanId ||
        r.id === waybillId ||
        (r.oneRecordJsonLd &&
          typeof r.oneRecordJsonLd === "object" &&
          ((r.oneRecordJsonLd as any).waybillId === waybillId ||
            (r.oneRecordJsonLd as any).fullAwbNumber === cleanId)),
    );

    if (!match) return undefined;

    if (match.oneRecordJsonLd && typeof match.oneRecordJsonLd === "object") {
      return match.oneRecordJsonLd as OneRecordWaybill;
    }

    const waybills = await this.getWaybills();
    return waybills.find(
      (w) => w.fullAwbNumber === match.awbNumber || w.waybillId === waybillId,
    );
  }

  public async getMilestones(awbNumber: string): Promise<CargoIqMilestone[]> {
    const cleanAwb = awbNumber.replace(/^WBL-/, "");
    const rows = await db
      .select()
      .from(schema.cargoIqMilestones)
      .where(
        and(
          eq(schema.cargoIqMilestones.awbNumber, cleanAwb),
          eq(schema.cargoIqMilestones.isDeleted, false),
        ),
      )
      .orderBy(asc(schema.cargoIqMilestones.scheduledTime));

    return rows.map((row) => {
      const scheduledMs =
        row.scheduledTime instanceof Date
          ? row.scheduledTime.getTime()
          : Number(row.scheduledTime) * 1000;
      const actualMs = row.actualTime
        ? row.actualTime instanceof Date
          ? row.actualTime.getTime()
          : Number(row.actualTime) * 1000
        : null;
      const slaDeadlineMs =
        row.slaDeadline instanceof Date
          ? row.slaDeadline.getTime()
          : Number(row.slaDeadline) * 1000;

      const plannedIso = new Date(scheduledMs).toISOString();
      const actualIso = actualMs ? new Date(actualMs).toISOString() : undefined;
      const slaDeadlineIso = new Date(slaDeadlineMs).toISOString();

      let status: MilestoneSlaStatus = "ON_SCHEDULE";
      let deltaMinutes = 0;

      if (actualMs) {
        status = "COMPLETED";
        deltaMinutes = Math.round((actualMs - scheduledMs) / 60000);
      } else if (Date.now() > slaDeadlineMs) {
        status = "SLA_BREACHED";
        deltaMinutes = Math.round((Date.now() - scheduledMs) / 60000);
      } else if (slaDeadlineMs - Date.now() < 30 * 60 * 1000) {
        status = "WARNING_AT_RISK";
        deltaMinutes = 0;
      }

      const m: CargoIqMilestone = {
        milestoneCode: row.milestoneCode as CargoIqMilestoneCode,
        name: row.milestoneName,
        locationAirport: row.locationAirportCode,
        plannedTimestamp: plannedIso,
        actualTimestamp: actualIso,
        slaLimitTimestamp: slaDeadlineIso,
        status,
        deltaMinutes,
        eventRemarks: row.eventRemarks || undefined,
      };

      return evaluateMilestoneSla(m);
    });
  }

  public async recordMilestoneEvent(
    awbNumber: string,
    milestoneCode: CargoIqMilestoneCode,
    eventRemarks?: string,
  ): Promise<{
    success: boolean;
    updatedMilestone?: CargoIqMilestone;
    message: string;
  }> {
    const cleanAwb = awbNumber.replace(/^WBL-/, "");
    const rows = await db
      .select()
      .from(schema.cargoIqMilestones)
      .where(
        and(
          eq(schema.cargoIqMilestones.awbNumber, cleanAwb),
          eq(schema.cargoIqMilestones.milestoneCode, milestoneCode),
          eq(schema.cargoIqMilestones.isDeleted, false),
        ),
      );

    if (rows.length === 0) {
      return {
        success: false,
        message: `Hito ${milestoneCode} no encontrado para e-AWB ${awbNumber}.`,
      };
    }

    const target = rows[0];
    const actualTime = new Date();
    const scheduledMs =
      target.scheduledTime instanceof Date
        ? target.scheduledTime.getTime()
        : Number(target.scheduledTime) * 1000;
    const slaDeadlineMs =
      target.slaDeadline instanceof Date
        ? target.slaDeadline.getTime()
        : Number(target.slaDeadline) * 1000;

    let slaStatus: "ON_TIME" | "WARNING" | "BREACHED" = "ON_TIME";
    if (actualTime.getTime() > slaDeadlineMs) {
      slaStatus = "BREACHED";
    } else if (slaDeadlineMs - actualTime.getTime() < 30 * 60 * 1000) {
      slaStatus = "WARNING";
    }

    const remarks = eventRemarks || target.eventRemarks || undefined;

    await db
      .update(schema.cargoIqMilestones)
      .set({
        actualTime,
        eventRemarks: remarks,
        slaStatus,
        updatedAt: new Date(),
      })
      .where(eq(schema.cargoIqMilestones.id, target.id));

    // If SLA is breached, enqueue outbox event for platform governance
    if (slaStatus === "BREACHED") {
      try {
        await outboxBus.enqueueEvents([
          {
            eventId: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            eventType: "IATA_ONE_RECORD_SLA_BREACHED",
            schemaVersion: 1,
            producerContext: "IATA_ONE_RECORD",
            aggregateType: "AIRWAY_BILL",
            aggregateId: cleanAwb,
            aggregateVersion: 1,
            correlationId: `corr_${cleanAwb}`,
            causationId: `cause_${milestoneCode}`,
            actor: DEFAULT_OPERATOR_ACTOR,
            payload: {
              awbNumber: cleanAwb,
              milestoneCode,
              scheduledTime: new Date(scheduledMs).toISOString(),
              actualTime: actualTime.toISOString(),
              slaDeadline: new Date(slaDeadlineMs).toISOString(),
              remarks,
            },
            occurredAt: new Date().toISOString(),
          },
        ]);
      } catch (err) {
        console.warn("Error enqueuing outbox event for SLA breach:", err);
      }
    }

    const deltaMinutes = Math.round(
      (actualTime.getTime() - scheduledMs) / 60000,
    );
    const updatedMilestone: CargoIqMilestone = evaluateMilestoneSla({
      milestoneCode,
      name: target.milestoneName,
      locationAirport: target.locationAirportCode,
      plannedTimestamp: new Date(scheduledMs).toISOString(),
      actualTimestamp: actualTime.toISOString(),
      slaLimitTimestamp: new Date(slaDeadlineMs).toISOString(),
      status: "COMPLETED",
      deltaMinutes,
      eventRemarks: remarks,
    });

    return {
      success: true,
      updatedMilestone,
      message: `Hito Cargo iQ ${milestoneCode} registrado con éxito en SQLite.`,
    };
  }

  public validateDangerousGoods(
    item: DangerousGoodsItem,
  ): EDgdValidationResult {
    return validateDangerousGoodsDeclaration(item);
  }
}
