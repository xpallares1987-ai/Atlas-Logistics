import { db } from "../../db/index.js";
import { roadConsignments } from "../../db/schema/road_freight.js";
import { eq, desc } from "drizzle-orm";
import {
  AdrComplianceService,
  AdrItemInput,
} from "./adr-compliance.service.js";
import { RoadRouteOptimizerService } from "./route-optimizer.service.js";

export interface CreateConsignmentDTO {
  shipmentId?: string;
  consignmentType: "INTERNATIONAL_CMR" | "NATIONAL_CARTA_PORTE";
  senderName: string;
  senderAddress: string;
  senderCountry: string;
  consigneeName: string;
  consigneeAddress: string;
  consigneeCountry: string;
  carrierName: string;
  carrierVat: string;
  tractorPlate: string;
  trailerPlate: string;
  driverName: string;
  driverLicense: string;
  driverPhone?: string;
  originCity: string;
  destinationCity: string;
  totalDistanceKm: number;
  pickupDate: Date | string;
  deliveryDate?: Date | string;
  totalPallets: number;
  totalGrossWeightKg: number;
  goodsDescription: string;
  specialInstructions?: string;
  cargoItems?: AdrItemInput[];
}

export class RoadWaybillService {
  /**
   * Generates sequential consignment number: CMR-YYYY-XXXXX or CDP-YYYY-XXXXX
   */
  public static async generateConsignmentNumber(
    type: "INTERNATIONAL_CMR" | "NATIONAL_CARTA_PORTE",
  ): Promise<string> {
    const prefix = type === "INTERNATIONAL_CMR" ? "CMR" : "CDP";
    const year = new Date().getFullYear();
    const suffix = Math.floor(10000 + Math.random() * 90000);
    return `${prefix}-${year}-${suffix}`;
  }

  /**
   * Creates a new validated road consignment with automated ADR evaluation and route capacity planning
   */
  public static async createConsignment(data: CreateConsignmentDTO) {
    const consignmentNumber = await this.generateConsignmentNumber(
      data.consignmentType,
    );

    // 1. ADR Evaluation
    const adrEvaluation = AdrComplianceService.calculateAdrExemption(
      data.cargoItems || [],
    );

    // 2. Route & Capacity Planning
    const routePlan = RoadRouteOptimizerService.planRouteAndSchedule({
      originCity: data.originCity,
      destinationCity: data.destinationCity,
      distanceKm: Number(data.totalDistanceKm),
      totalPallets: Number(data.totalPallets),
      totalGrossWeightKg: Number(data.totalGrossWeightKg),
      departureTime: data.pickupDate,
    });

    const consignmentId = `road_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newConsignment = {
      id: consignmentId,
      consignmentNumber,
      shipmentId: data.shipmentId || null,
      consignmentType: data.consignmentType,
      status: "PLANNED",
      senderName: data.senderName,
      senderAddress: data.senderAddress,
      senderCountry: data.senderCountry,
      consigneeName: data.consigneeName,
      consigneeAddress: data.consigneeAddress,
      consigneeCountry: data.consigneeCountry,
      carrierName: data.carrierName,
      carrierVat: data.carrierVat,
      tractorPlate: data.tractorPlate,
      trailerPlate: data.trailerPlate,
      driverName: data.driverName,
      driverLicense: data.driverLicense,
      driverPhone: data.driverPhone || null,
      originCity: data.originCity,
      destinationCity: data.destinationCity,
      totalDistanceKm: Number(data.totalDistanceKm),
      estimatedDrivingHours: routePlan.estimatedDrivingHours,
      requiredRestBreaksCount: routePlan.requiredRestBreaksCount,
      pickupDate: new Date(data.pickupDate),
      deliveryDate: data.deliveryDate
        ? new Date(data.deliveryDate)
        : routePlan.estimatedArrivalTime,
      totalPallets: Number(data.totalPallets),
      palletCapacityMax: 33,
      totalGrossWeightKg: Number(data.totalGrossWeightKg),
      payloadCapacityMaxKg: 24000,
      trailerFloorUtilizationPct:
        routePlan.capacityUtilization.floorUtilizationPct,
      isAdrHazardous: adrEvaluation.isHazardous,
      adrTotalPoints: adrEvaluation.totalPoints,
      adrExemption1136Applied: adrEvaluation.isExempt1136,
      orangePlatesRequired: adrEvaluation.orangePlatesRequired,
      tunnelRestrictionCode:
        adrEvaluation.tunnelRestrictionCodes.length > 0
          ? adrEvaluation.tunnelRestrictionCodes.join(", ")
          : null,
      goodsDescription: data.goodsDescription,
      specialInstructions:
        data.specialInstructions ||
        (data.consignmentType === "NATIONAL_CARTA_PORTE"
          ? "Sujeto a la Ley 15/2009 y RDL 3/2022. Prohibición de carga/descarga por conductor y paralizaciones > 1h."
          : "Sujeto al Convenio de Ginebra de 1956 (CMR)."),
      cargoItemsData: data.cargoItems || [],
      routeStopsData: routePlan.tachographItinerary,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(roadConsignments).values(newConsignment);
    return {
      consignment: newConsignment,
      adrEvaluation,
      routePlan,
    };
  }

  /**
   * Lists road consignments with filters
   */
  public static async listConsignments(filter?: {
    status?: string;
    type?: string;
    search?: string;
  }) {
    const all = await db
      .select()
      .from(roadConsignments)
      .orderBy(desc(roadConsignments.createdAt));

    return all.filter((c) => {
      if (
        filter?.status &&
        filter.status !== "ALL" &&
        c.status !== filter.status
      ) {
        return false;
      }
      if (
        filter?.type &&
        filter.type !== "ALL" &&
        c.consignmentType !== filter.type
      ) {
        return false;
      }
      if (filter?.search) {
        const q = filter.search.toLowerCase();
        const num = (c.consignmentNumber || "").toLowerCase();
        const sender = (c.senderName || "").toLowerCase();
        const consignee = (c.consigneeName || "").toLowerCase();
        const carrier = (c.carrierName || "").toLowerCase();
        const driver = (c.driverName || "").toLowerCase();
        const plates = `${c.tractorPlate} ${c.trailerPlate}`.toLowerCase();
        if (
          !num.includes(q) &&
          !sender.includes(q) &&
          !consignee.includes(q) &&
          !carrier.includes(q) &&
          !driver.includes(q) &&
          !plates.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Retrieves single consignment by ID
   */
  public static async getConsignmentById(id: string) {
    const res = await db
      .select()
      .from(roadConsignments)
      .where(eq(roadConsignments.id, id))
      .limit(1);
    if (res.length === 0) return null;
    return res[0];
  }
}
