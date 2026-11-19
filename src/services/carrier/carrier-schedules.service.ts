/**
 * @file carrier-schedules.service.ts
 * @description Master domain service for carrier vessel schedules, voyage port rotations, cut-offs, and corridor transit calculation.
 * @module @atlas/services/carrier/carrier-schedules
 * @see {@link docs/adr/0027-carrier-integrations-ocean-schedules-ebl-lifecycle.md}
 */

import { v4 as uuidv4 } from "uuid";
import { eq, and, sql, asc } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { db } from "../../db/index.js";
import {
  vessels,
  carrierServices,
  voyages,
  portCalls,
  addresses,
  Vessel,
  NewVessel,
  CarrierService,
  Voyage,
  PortCall,
  TransportMode,
  VoyageDirection,
  VoyageStatus,
} from "../../db/schema/index.js";
import { validateImoNumber } from "@atlas/shared";
import { logger } from "../../config/logger.js";

// ============================================================================
// TYPES & CONTRACTS
// ============================================================================

export interface RegisterVesselInput {
  imoNumber: string;
  vesselName: string;
  flag?: string;
  capacityTeu?: number;
  yearBuilt?: number;
  callSign?: string;
  mmsi?: string;
}

export interface CreateCarrierServiceInput {
  carrierId: string;
  serviceCode: string;
  serviceName: string;
  transportMode?: TransportMode;
  tradeLane?: string;
}

export interface PortCallInput {
  unlocode: string;
  terminalCode?: string;
  sequence: number;
  eta?: Date;
  etd?: Date;
  cyCutOff?: Date;
  vgmCutOff?: Date;
  siCutOff?: Date;
}

export interface CreateVoyageInput {
  voyageNumber: string;
  vesselId: string;
  serviceId?: string;
  direction?: VoyageDirection;
  status?: VoyageStatus;
  portCalls: PortCallInput[];
}

export interface CorridorSearchParams {
  originUnlocode: string;
  destinationUnlocode: string;
  departureAfter?: Date;
  carrierId?: string;
  maxResults?: number;
}

export interface CorridorScheduleResult {
  voyageId: string;
  voyageNumber: string;
  direction: string;
  vessel: {
    id: string;
    vesselName: string;
    imoNumber: string;
    flag: string | null;
    capacityTeu: number | null;
  };
  service: {
    id: string | null;
    serviceCode: string | null;
    serviceName: string | null;
    tradeLane: string | null;
  } | null;
  carrier: {
    id: string | null;
    name: string | null;
  } | null;
  origin: {
    unlocode: string;
    terminalCode: string | null;
    sequence: number;
    etd: Date | null;
    cyCutOff: Date | null;
    vgmCutOff: Date | null;
    siCutOff: Date | null;
  };
  destination: {
    unlocode: string;
    terminalCode: string | null;
    sequence: number;
    eta: Date | null;
  };
  transitDays: number;
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class CarrierSchedulesService {
  // --------------------------------------------------------------------------
  // 1. VESSEL MASTER DATA MANAGEMENT
  // --------------------------------------------------------------------------

  public static async registerVessel(
    input: RegisterVesselInput,
  ): Promise<Vessel> {
    const imoCheck = validateImoNumber(input.imoNumber);
    if (!imoCheck.valid) {
      throw new Error(
        `Invalid IMO number '${input.imoNumber}': ${imoCheck.reason}`,
      );
    }

    const cleanImo = imoCheck.cleanImo!;
    const existing = await db
      .select()
      .from(vessels)
      .where(eq(vessels.imoNumber, cleanImo))
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    const now = new Date();
    const newVessel: NewVessel = {
      id: `ves_${uuidv4().replace(/-/g, "").slice(0, 16)}`,
      imoNumber: cleanImo,
      vesselName: input.vesselName.trim().toUpperCase(),
      flag: input.flag ? input.flag.trim().toUpperCase() : null,
      capacityTeu: input.capacityTeu ?? null,
      yearBuilt: input.yearBuilt ?? null,
      callSign: input.callSign ? input.callSign.trim().toUpperCase() : null,
      mmsi: input.mmsi ? input.mmsi.trim() : null,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(vessels).values(newVessel);
    logger.info(
      { imoNumber: cleanImo, vesselName: newVessel.vesselName },
      "Registered new carrier vessel",
    );
    return (
      await db
        .select()
        .from(vessels)
        .where(eq(vessels.id, newVessel.id))
        .limit(1)
    )[0];
  }

  public static async getVesselById(id: string): Promise<Vessel | null> {
    const res = await db
      .select()
      .from(vessels)
      .where(eq(vessels.id, id))
      .limit(1);
    return res[0] ?? null;
  }

  public static async listVessels(): Promise<Vessel[]> {
    return db.select().from(vessels).orderBy(asc(vessels.vesselName));
  }

  // --------------------------------------------------------------------------
  // 2. CARRIER SERVICES & LOOPS
  // --------------------------------------------------------------------------

  public static async createCarrierService(
    input: CreateCarrierServiceInput,
  ): Promise<CarrierService> {
    const now = new Date();
    const id = `srv_${uuidv4().replace(/-/g, "").slice(0, 16)}`;

    await db.insert(carrierServices).values({
      id,
      carrierId: input.carrierId,
      serviceCode: input.serviceCode.trim().toUpperCase(),
      serviceName: input.serviceName.trim(),
      transportMode: input.transportMode || "OCEAN",
      tradeLane: input.tradeLane || null,
      createdAt: now,
      updatedAt: now,
    });

    const res = await db
      .select()
      .from(carrierServices)
      .where(eq(carrierServices.id, id))
      .limit(1);
    return res[0];
  }

  public static async listCarrierServices(
    carrierId?: string,
  ): Promise<CarrierService[]> {
    if (carrierId) {
      return db
        .select()
        .from(carrierServices)
        .where(eq(carrierServices.carrierId, carrierId));
    }
    return db.select().from(carrierServices);
  }

  // --------------------------------------------------------------------------
  // 3. VOYAGES & PORT ROTATIONS
  // --------------------------------------------------------------------------

  public static async createVoyageWithPortCalls(
    input: CreateVoyageInput,
  ): Promise<{
    voyage: Voyage;
    portCalls: PortCall[];
  }> {
    if (!input.portCalls || input.portCalls.length < 2) {
      throw new Error(
        "A voyage must contain at least 2 port calls (origin and destination)",
      );
    }

    // Verify vessel exists
    const vessel = await this.getVesselById(input.vesselId);
    if (!vessel) {
      throw new Error(`Vessel with id '${input.vesselId}' not found`);
    }

    // Validate sequential port call order
    const sequences = input.portCalls.map((pc) => pc.sequence);
    const sortedSequences = [...sequences].sort((a, b) => a - b);
    for (let i = 0; i < sortedSequences.length; i++) {
      if (sortedSequences[i] !== i + 1) {
        throw new Error(
          `Port calls must have strictly sequential sequences starting from 1 (found: ${sequences.join(", ")})`,
        );
      }
    }

    // Validate cut-offs against ETD
    for (const pc of input.portCalls) {
      if (pc.etd) {
        if (pc.cyCutOff && pc.cyCutOff.getTime() > pc.etd.getTime()) {
          throw new Error(
            `CY Cut-off (${pc.cyCutOff.toISOString()}) cannot be after ETD (${pc.etd.toISOString()}) at port ${pc.unlocode}`,
          );
        }
        if (pc.vgmCutOff && pc.vgmCutOff.getTime() > pc.etd.getTime()) {
          throw new Error(
            `VGM Cut-off (${pc.vgmCutOff.toISOString()}) cannot be after ETD (${pc.etd.toISOString()}) at port ${pc.unlocode}`,
          );
        }
        if (pc.siCutOff && pc.siCutOff.getTime() > pc.etd.getTime()) {
          throw new Error(
            `SI Cut-off (${pc.siCutOff.toISOString()}) cannot be after ETD (${pc.etd.toISOString()}) at port ${pc.unlocode}`,
          );
        }
      }
    }

    const now = new Date();
    const voyageId = `voy_${uuidv4().replace(/-/g, "").slice(0, 16)}`;

    const newVoyage: typeof voyages.$inferInsert = {
      id: voyageId,
      voyageNumber: input.voyageNumber.trim().toUpperCase(),
      vesselId: input.vesselId,
      serviceId: input.serviceId || null,
      direction: input.direction || "EAST",
      status: input.status || "SCHEDULED",
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(voyages).values(newVoyage);

    const portCallRows: (typeof portCalls.$inferInsert)[] = input.portCalls.map(
      (pc) => ({
        id: `ptc_${uuidv4().replace(/-/g, "").slice(0, 16)}`,
        voyageId,
        unlocode: pc.unlocode.trim().toUpperCase(),
        terminalCode: pc.terminalCode
          ? pc.terminalCode.trim().toUpperCase()
          : null,
        sequence: pc.sequence,
        eta: pc.eta || null,
        etd: pc.etd || null,
        cyCutOff: pc.cyCutOff || null,
        vgmCutOff: pc.vgmCutOff || null,
        siCutOff: pc.siCutOff || null,
        createdAt: now,
        updatedAt: now,
      }),
    );

    await db.insert(portCalls).values(portCallRows);

    const createdVoyage = (
      await db.select().from(voyages).where(eq(voyages.id, voyageId)).limit(1)
    )[0];
    const createdPortCalls = await db
      .select()
      .from(portCalls)
      .where(eq(portCalls.voyageId, voyageId))
      .orderBy(asc(portCalls.sequence));

    return {
      voyage: createdVoyage,
      portCalls: createdPortCalls,
    };
  }

  // --------------------------------------------------------------------------
  // 4. CORRIDOR SEARCH & TRANSIT TIME CALCULATION
  // --------------------------------------------------------------------------

  public static async searchCorridorSchedules(
    params: CorridorSearchParams,
  ): Promise<CorridorScheduleResult[]> {
    const origin = params.originUnlocode.trim().toUpperCase();
    const dest = params.destinationUnlocode.trim().toUpperCase();

    const originCalls = alias(portCalls, "origin_calls");
    const destCalls = alias(portCalls, "dest_calls");

    const query = db
      .select({
        voyageId: voyages.id,
        voyageNumber: voyages.voyageNumber,
        direction: voyages.direction,
        vesselId: vessels.id,
        vesselName: vessels.vesselName,
        imoNumber: vessels.imoNumber,
        flag: vessels.flag,
        capacityTeu: vessels.capacityTeu,
        serviceId: carrierServices.id,
        serviceCode: carrierServices.serviceCode,
        serviceName: carrierServices.serviceName,
        tradeLane: carrierServices.tradeLane,
        carrierId: carrierServices.carrierId,
        carrierName: sql<string>`COALESCE(${addresses.tradeName}, ${addresses.companyName})`,
        originUnlocode: originCalls.unlocode,
        originTerminal: originCalls.terminalCode,
        originSeq: originCalls.sequence,
        originEtd: originCalls.etd,
        originCyCutOff: originCalls.cyCutOff,
        originVgmCutOff: originCalls.vgmCutOff,
        originSiCutOff: originCalls.siCutOff,
        destUnlocode: destCalls.unlocode,
        destTerminal: destCalls.terminalCode,
        destSeq: destCalls.sequence,
        destEta: destCalls.eta,
      })
      .from(voyages)
      .innerJoin(vessels, eq(voyages.vesselId, vessels.id))
      .leftJoin(carrierServices, eq(voyages.serviceId, carrierServices.id))
      .leftJoin(addresses, eq(carrierServices.carrierId, addresses.id))
      .innerJoin(
        originCalls,
        and(
          eq(originCalls.voyageId, voyages.id),
          eq(originCalls.unlocode, origin),
        ),
      )
      .innerJoin(
        destCalls,
        and(
          eq(destCalls.voyageId, voyages.id),
          eq(destCalls.unlocode, dest),
          sql`${originCalls.sequence} < ${destCalls.sequence}`,
        ),
      );

    const rows = await query;

    const results: CorridorScheduleResult[] = [];

    for (const r of rows) {
      if (params.carrierId && r.carrierId !== params.carrierId) {
        continue;
      }

      if (
        params.departureAfter &&
        r.originEtd &&
        r.originEtd < params.departureAfter
      ) {
        continue;
      }

      let transitDays = 0;
      if (r.originEtd && r.destEta) {
        const diffMs = r.destEta.getTime() - r.originEtd.getTime();
        transitDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      }

      results.push({
        voyageId: r.voyageId,
        voyageNumber: r.voyageNumber,
        direction: r.direction,
        vessel: {
          id: r.vesselId,
          vesselName: r.vesselName,
          imoNumber: r.imoNumber,
          flag: r.flag,
          capacityTeu: r.capacityTeu,
        },
        service: r.serviceId
          ? {
              id: r.serviceId,
              serviceCode: r.serviceCode,
              serviceName: r.serviceName,
              tradeLane: r.tradeLane,
            }
          : null,
        carrier: r.carrierId
          ? {
              id: r.carrierId,
              name: r.carrierName || "Ocean Carrier",
            }
          : null,
        origin: {
          unlocode: r.originUnlocode,
          terminalCode: r.originTerminal,
          sequence: r.originSeq,
          etd: r.originEtd,
          cyCutOff: r.originCyCutOff,
          vgmCutOff: r.originVgmCutOff,
          siCutOff: r.originSiCutOff,
        },
        destination: {
          unlocode: r.destUnlocode,
          terminalCode: r.destTerminal,
          sequence: r.destSeq,
          eta: r.destEta,
        },
        transitDays,
      });
    }

    if (params.maxResults && params.maxResults > 0) {
      return results.slice(0, params.maxResults);
    }

    return results;
  }
}
