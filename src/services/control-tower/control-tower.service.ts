import { db } from "../../db/index.js";
import {
  controlTowerIncidents,
  incidentRerouteOptions,
  customsIcs2Declarations,
  freightAuditDisputes,
  carrierInvoices,
  carrierInvoiceLines,
} from "../../db/schema/index.js";
import { eq, desc, sql } from "drizzle-orm";
import { domainEventBus } from "../../lib/events/domain-event-bus.js";
import { logger } from "../../config/logger.js";

export interface CreateIncidentInput {
  shipmentId?: string;
  assetId?: string;
  incidentType: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  title: string;
  description: string;
  locationName?: string;
  locationLat?: number;
  locationLng?: number;
  impactAmountEur?: number;
  delayHours?: number;
  slaDeadline?: string;
  assignedTo?: string;
}

export interface SpotRateParams {
  origin: string;
  destination: string;
  transportMode: "OCEAN_FCL" | "ROAD_EXPRESS" | "RAIL_INTERMODAL" | "AIR_CARGO";
  containerType?: "20FT" | "40FT" | "40HC" | "REEFER";
  weightKg?: number;
  distanceKm?: number;
  targetMarginPct?: number;
  includeCustoms?: boolean;
}

export interface SpotRateBreakdown {
  origin: string;
  destination: string;
  transportMode: string;
  equipment: string;
  baseFreight: number;
  fuelSurchargeBaf: number;
  carbonSurchargeEts: number;
  originThc: number;
  destinationThc: number;
  destThc: number;
  inlandDrayageAndTolls: number;
  customsClearanceFee: number;
  buyRateTotal: number;
  profitMarginAmount: number;
  profitMarginPct: number;
  sellRateTotal: number;
  currency: string;
  estimatedTransitDays: number;
  co2eKg: number;
}

export class ControlTowerService {
  /**
   * Retrieves high-level operational KPIs for the Control Tower
   */
  public static async getKpis() {
    try {
      const allIncidents = await db.select().from(controlTowerIncidents);
      const activeIncidents = allIncidents.filter((i) =>
        ["OPEN", "ANALYZING", "PENDING_APPROVAL"].includes(i.status),
      );
      const autoResolved = allIncidents.filter(
        (i) => i.autoResolved || i.status === "AUTO_RESOLVED",
      );

      const disputes = await db.select().from(freightAuditDisputes);
      const activeDisputes = disputes.filter((d) =>
        ["OPEN", "SUBMITTED_TO_CARRIER"].includes(d.status),
      );
      const totalDisputedEur = activeDisputes.reduce(
        (acc, d) => acc + (d.disputedAmount || 0),
        0,
      );

      const ics2List = await db.select().from(customsIcs2Declarations);
      const greenCircuit = ics2List.filter((d) => d.riskCircuit === "GREEN").length;
      const orangeCircuit = ics2List.filter((d) => d.riskCircuit === "ORANGE").length;
      const redCircuit = ics2List.filter((d) => d.riskCircuit === "RED").length;

      const autoResolvedPct =
        allIncidents.length > 0
          ? Math.round((autoResolved.length / allIncidents.length) * 100)
          : 0;

      const carbonAtRisk = activeIncidents.reduce((sum, i) => {
        // Estimate approx 0.08 tonnes CO2 per hour of delay on typical maritime/road cargo
        return sum + Math.round((i.delayHours || 0) * 0.08 * 10) / 10;
      }, 0);

      return {
        totalIncidents: allIncidents.length,
        activeIncidentsCount: activeIncidents.length,
        autoResolvedCount: autoResolved.length,
        autoResolvedPct,
        onTimeSlaPct: 94.4, // Baseline SLA
        carbonAtRiskTonnes: Math.round(carbonAtRisk * 10) / 10,
        totalDisputedFreightEur: Math.round(totalDisputedEur * 100) / 100,
        activeDisputesCount: activeDisputes.length,
        customsRadar: {
          total: ics2List.length,
          green: greenCircuit,
          orange: orangeCircuit,
          red: redCircuit,
          autoClearanceRatePct:
            ics2List.length > 0
              ? Math.round((greenCircuit / ics2List.length) * 100)
              : 0,
        },
      };
    } catch (err) {
      logger.error({ err }, "ControlTowerService.getKpis failed");
      throw err;
    }
  }

  /**
   * Lists all incidents with optional filtering and preloaded reroute options
   */
  public static async listIncidents(filter?: {
    status?: string;
    severity?: string;
    incidentType?: string;
  }) {
    const incidents = await db
      .select()
      .from(controlTowerIncidents)
      .orderBy(desc(controlTowerIncidents.createdAt));

    const options = await db.select().from(incidentRerouteOptions);

    let filtered = incidents;
    if (filter?.status && filter.status !== "ALL") {
      filtered = filtered.filter((i) => i.status === filter.status);
    }
    if (filter?.severity && filter.severity !== "ALL") {
      filtered = filtered.filter((i) => i.severity === filter.severity);
    }
    if (filter?.incidentType && filter.incidentType !== "ALL") {
      filtered = filtered.filter((i) => i.incidentType === filter.incidentType);
    }

    return filtered.map((incident) => {
      const incidentOpts = options.filter((o) => o.incidentId === incident.id);
      return {
        ...incident,
        rerouteOptions: incidentOpts,
      };
    });
  }

  /**
   * Fetches single incident with reroute options
   */
  public static async getIncidentById(id: string) {
    const rows = await db
      .select()
      .from(controlTowerIncidents)
      .where(eq(controlTowerIncidents.id, id));

    if (!rows || rows.length === 0) return null;
    const incident = rows[0];

    const options = await db
      .select()
      .from(incidentRerouteOptions)
      .where(eq(incidentRerouteOptions.incidentId, id));

    return {
      ...incident,
      rerouteOptions: options,
    };
  }

  /**
   * Ingests a new incident, applies autonomous resolution rules if within thresholds,
   * or triggers algorithmic alternative options generation.
   */
  public static async createIncident(input: CreateIncidentInput) {
    const id = "inc_" + Math.random().toString(36).slice(2, 10);
    const incidentNumber = "INC-2026-" + Math.floor(1000 + Math.random() * 9000);
    const impactEur = Number(input.impactAmountEur || 0);
    const delayHrs = Number(input.delayHours || 0);

    // Autonomous Rule: If financial impact < €500 AND delay <= 3h, auto-resolve immediately
    const isAutoResolvable = impactEur < 500 && delayHrs <= 3.0;

    const initialStatus = isAutoResolvable
      ? "AUTO_RESOLVED"
      : input.severity === "CRITICAL" || input.severity === "HIGH"
        ? "ANALYZING"
        : "OPEN";

    const resolutionAction = isAutoResolvable
      ? "Protocolo Autónomo de Mitigación: Despacho prioritario ejecutado sin impacto en SLA comercial."
      : undefined;

    const now = new Date().toISOString();
    const slaDeadline =
      input.slaDeadline ||
      new Date(Date.now() + 6 * 3600 * 1000).toISOString();

    await db.insert(controlTowerIncidents).values({
      id,
      incidentNumber,
      shipmentId: input.shipmentId || null,
      assetId: input.assetId || null,
      incidentType: input.incidentType,
      severity: input.severity,
      title: input.title,
      description: input.description,
      locationName: input.locationName || "Ubicación en Ruta",
      locationLat: input.locationLat || 40.4168,
      locationLng: input.locationLng || -3.7038,
      status: initialStatus,
      autoResolved: isAutoResolvable,
      impactAmountEur: impactEur,
      delayHours: delayHrs,
      slaDeadline,
      assignedTo: input.assignedTo || "usr_ops_01",
      resolutionAction,
      resolvedAt: isAutoResolvable ? now : null,
      resolvedBy: isAutoResolvable ? "AUTONOMOUS_ENGINE" : null,
      createdAt: now,
      updatedAt: now,
    });

    // If not auto-resolved and severity is HIGH or CRITICAL, generate alternative reroute options
    if (!isAutoResolvable && (input.severity === "CRITICAL" || input.severity === "HIGH")) {
      await this.generateRerouteOptions(id, input.title);
    }

    // Publish event
    await domainEventBus.publish("control-tower:incident-detected", id, {
      incidentId: id,
      incidentNumber,
      severity: input.severity,
      incidentType: input.incidentType,
      shipmentId: input.shipmentId,
    });

    return this.getIncidentById(id);
  }

  /**
   * Generates algorithmic alternative multimodal corridors for an incident
   */
  public static async generateRerouteOptions(incidentId: string, contextTitle: string) {
    const opt1Id = "ro_" + Math.random().toString(36).slice(2, 9);
    const opt2Id = "ro_" + Math.random().toString(36).slice(2, 9);

    // Option 1: Intermodal Rail / Feeder bypass
    await db.insert(incidentRerouteOptions).values({
      id: opt1Id,
      incidentId,
      optionName: "Desvío Corredor Intermodal Ferroviario (Bypass de Congestión)",
      transportMode: "RAIL_INTERMODAL",
      corridorDescription: `Desvío a nodo ferroviario cercano para evitar ${contextTitle}. Transbordo directo a tren lanzadera bloque con tracción eléctrica y enlace de última milla.`,
      etaDeltaHours: -14.0, // Saves 14 hours
      costDeltaEur: 380.0,
      co2DeltaKg: -210.0, // Significant carbon reduction
      feasibilityScore: 92,
      isRecommended: true,
      executionStatus: "PROPOSED",
      legsJson: JSON.stringify([
        "Desvío a terminal intermodal adyacente",
        "Tracción ferroviaria electrificada TEN-T",
        "Distribución final en camión Euro VI / EV",
      ]),
    });

    // Option 2: Express Road carrier connection
    await db.insert(incidentRerouteOptions).values({
      id: opt2Id,
      incidentId,
      optionName: "Conexión Urgente por Carretera (Doble Chófer)",
      transportMode: "ROAD_EXPRESS",
      corridorDescription:
        "Retirada inmediata del contenedor y fletamento de tractora express con relevo continuo para entrega directa al cliente antes del vencimiento del SLA.",
      etaDeltaHours: -22.0, // Saves 22 hours
      costDeltaEur: 850.0,
      co2DeltaKg: 340.0,
      feasibilityScore: 84,
      isRecommended: false,
      executionStatus: "PROPOSED",
      legsJson: JSON.stringify([
        "Recogida express con tracción dedicada",
        "Ruta directa autopista peaje sin paradas",
        "Entrega directa en destino final",
      ]),
    });

    return db
      .select()
      .from(incidentRerouteOptions)
      .where(eq(incidentRerouteOptions.incidentId, incidentId));
  }

  /**
   * Resolves an incident by accepting a proposed reroute option or applying custom action
   */
  public static async resolveIncident(
    incidentId: string,
    action: string,
    selectedOptionId?: string,
    resolvedBy = "OPERATOR",
  ) {
    const now = new Date().toISOString();

    if (selectedOptionId) {
      await db
        .update(incidentRerouteOptions)
        .set({ executionStatus: "EXECUTED" })
        .where(eq(incidentRerouteOptions.id, selectedOptionId));
    }

    await db
      .update(controlTowerIncidents)
      .set({
        status: "RESOLVED",
        resolutionAction: action,
        resolvedAt: now,
        resolvedBy,
        updatedAt: now,
      })
      .where(eq(controlTowerIncidents.id, incidentId));

    if (selectedOptionId) {
      const opts = await db
        .select()
        .from(incidentRerouteOptions)
        .where(eq(incidentRerouteOptions.id, selectedOptionId));
      const chosen = opts[0];

      await domainEventBus.publish("control-tower:reroute-executed", incidentId, {
        incidentId,
        selectedOptionId,
        newCorridor: chosen ? chosen.optionName : action,
        etaDeltaHours: chosen ? chosen.etaDeltaHours : 0,
      });
    }

    return this.getIncidentById(incidentId);
  }

  /**
   * 3-Way Match Freight Audit Ledger: Reconciles billed vs expected amounts
   */
  public static async getFreightAuditMatches() {
    const invoices = await db.select().from(carrierInvoices);
    const lines = await db.select().from(carrierInvoiceLines);
    const disputes = await db.select().from(freightAuditDisputes);

    return lines.map((line) => {
      const inv = invoices.find((i) => i.id === line.carrierInvoiceId);
      const dispute = disputes.find((d) => d.invoiceLineId === line.id);

      const variance = line.varianceAmount || line.billedAmount - line.expectedAmount;
      const isDiscrepant = Math.abs(variance) > 25.0; // Variance tolerance threshold

      return {
        lineId: line.id,
        carrierInvoiceId: line.carrierInvoiceId,
        carrierName: inv ? inv.carrierName : "Naviera / Transportista",
        invoiceNumber: inv ? inv.invoiceNumber : "INV-CARRIER",
        documentNumber: line.documentNumber,
        chargeCode: line.chargeCode,
        description: line.description,
        billedAmount: line.billedAmount,
        expectedAmount: line.expectedAmount,
        varianceAmount: Math.round(variance * 100) / 100,
        isWithinTolerance: !isDiscrepant,
        disputeStatus: dispute ? dispute.status : line.disputeStatus,
        disputeCode: dispute?.disputeCode,
        disputeReason: dispute?.reason,
      };
    });
  }

  /**
   * Raises a formal 3-Way Match dispute against a carrier invoice line
   */
  public static async createFreightDispute(input: {
    invoiceLineId: string;
    carrierInvoiceId?: string;
    shipmentId?: string;
    reason: string;
    resolutionNote?: string;
  }) {
    const id = "dsp_" + Math.random().toString(36).slice(2, 9);
    const disputeCode = "DSP-2026-" + Math.floor(1000 + Math.random() * 9000);
    const debitNoteNumber = "DN-2026-" + Math.floor(100 + Math.random() * 900);

    // Look up line details if available
    const lines = await db
      .select()
      .from(carrierInvoiceLines)
      .where(eq(carrierInvoiceLines.id, input.invoiceLineId));

    const line = lines[0];
    const claimed = line ? line.billedAmount : 1500;
    const expected = line ? line.expectedAmount : 1000;
    const disputed = Math.max(0, claimed - expected);

    const now = new Date().toISOString();

    await db.insert(freightAuditDisputes).values({
      id,
      disputeCode,
      invoiceLineId: input.invoiceLineId,
      carrierInvoiceId: input.carrierInvoiceId || (line ? line.carrierInvoiceId : null),
      shipmentId: input.shipmentId || (line ? line.shipmentId : null),
      claimedAmount: claimed,
      expectedAmount: expected,
      disputedAmount: disputed > 0 ? disputed : claimed,
      reason: input.reason,
      status: "OPEN",
      resolutionNote:
        input.resolutionNote ||
        `Discrepancia detectada en auditoría 3-Way Match (${input.reason}). Nota de Débito emitida.`,
      debitNoteNumber,
      createdAt: now,
    });

    if (line) {
      await db
        .update(carrierInvoiceLines)
        .set({
          disputeStatus: "DISPUTED",
          disputeReason: input.reason,
        })
        .where(eq(carrierInvoiceLines.id, input.invoiceLineId));
    }

    await domainEventBus.publish("control-tower:dispute-filed", id, {
      disputeId: id,
      disputeCode,
      carrierInvoiceId: input.carrierInvoiceId,
      disputedAmount: disputed,
      reason: input.reason,
    });

    return {
      id,
      disputeCode,
      debitNoteNumber,
      disputedAmount: disputed,
      status: "OPEN",
    };
  }

  /**
   * EU ICS2 & Customs Clearance Radar
   */
  public static async getCustomsRadar() {
    const list = await db
      .select()
      .from(customsIcs2Declarations)
      .orderBy(desc(customsIcs2Declarations.submittedAt));
    return list;
  }

  /**
   * Files a pre-arrival ENS customs declaration with automated risk circuit evaluation
   */
  public static async fileIcs2Declaration(input: {
    shipmentId?: string;
    declarantEori: string;
    customsOfficeCode: string;
    notes?: string;
  }) {
    const id = "ics2_" + Math.random().toString(36).slice(2, 9);
    const mrn =
      "26ES" +
      Math.floor(1000000000 + Math.random() * 9000000000).toString() +
      "A1";

    // Risk Circuit Simulator: Evaluates security assessment score
    const securityScore = Math.floor(65 + Math.random() * 35); // 65 to 100
    let riskCircuit: "GREEN" | "ORANGE" | "RED" = "GREEN";
    let filingStatus = "CLEARED";

    if (securityScore < 75) {
      riskCircuit = "RED";
      filingStatus = "HELD_FOR_INSPECTION";
    } else if (securityScore < 88) {
      riskCircuit = "ORANGE";
      filingStatus = "HELD_FOR_INSPECTION";
    }

    const now = new Date().toISOString();

    await db.insert(customsIcs2Declarations).values({
      id,
      mrn,
      shipmentId: input.shipmentId || null,
      declarationType: "ENS",
      filingStatus,
      riskCircuit,
      declarantEori: input.declarantEori,
      customsOfficeCode: input.customsOfficeCode,
      securityAssessmentScore: securityScore,
      submittedAt: now,
      clearedAt: riskCircuit === "GREEN" ? now : null,
      notes:
        input.notes ||
        (riskCircuit === "GREEN"
          ? "Levante automático otorgado por la AEAT sin discrepancias."
          : riskCircuit === "ORANGE"
            ? "Revisión documental requerida por el servicio aduanero."
            : "Inspección física / escáner asignado en muelle."),
      createdAt: now,
    });

    const created = await db
      .select()
      .from(customsIcs2Declarations)
      .where(eq(customsIcs2Declarations.id, id));

    return created[0];
  }

  /**
   * Algorithmic Door-to-Door Multimodal Spot Rate Calculator
   */
  public static calculateSpotRate(params: SpotRateParams): SpotRateBreakdown {
    const equipment = params.containerType || "40HC";
    const mode = params.transportMode || "OCEAN_FCL";
    const distance = Number(params.distanceKm || 650);
    const targetMargin = Number(params.targetMarginPct || 15);

    let baseFreight = 0;
    let baf = 0;
    let ets = 0;
    let originThc = 0;
    let destThc = 0;
    let drayageAndTolls = 0;
    let transitDays = 1;
    let co2eKg = 0;

    switch (mode) {
      case "OCEAN_FCL": {
        baseFreight = equipment === "20FT" ? 1450 : equipment === "40FT" ? 2300 : 2650;
        baf = 380;
        ets = 65; // EU ETS Maritime Carbon Surcharge
        originThc = 175;
        destThc = 210;
        // Last-mile drayage + Eurovignette toll
        drayageAndTolls = 220 + distance * 0.95;
        transitDays = 18;
        co2eKg = Math.round(distance * 0.12 * 100);
        break;
      }
      case "RAIL_INTERMODAL": {
        baseFreight = 950 + distance * 0.85;
        baf = 95;
        ets = 15;
        originThc = 110;
        destThc = 110;
        drayageAndTolls = 180 + distance * 0.35;
        transitDays = 4;
        co2eKg = Math.round(distance * 0.04 * 100); // 66% cleaner than road
        break;
      }
      case "AIR_CARGO": {
        const weight = params.weightKg || 1200;
        baseFreight = weight * 3.8;
        baf = weight * 0.95;
        ets = weight * 0.35;
        originThc = 140;
        destThc = 140;
        drayageAndTolls = 260;
        transitDays = 2;
        co2eKg = Math.round(weight * 0.65 * 10);
        break;
      }
      case "ROAD_EXPRESS":
      default: {
        baseFreight = 450 + distance * 1.45;
        baf = distance * 0.28;
        ets = 25;
        originThc = 0;
        destThc = 0;
        drayageAndTolls = distance * 0.22; // Eurovignette tolls
        transitDays = 2;
        co2eKg = Math.round(distance * 0.21 * 100);
        break;
      }
    }

    const customsFee = params.includeCustoms !== false ? 125 : 0;
    const buyRateTotal =
      baseFreight +
      baf +
      ets +
      originThc +
      destThc +
      drayageAndTolls +
      customsFee;

    const profitMarginAmount = Math.round((buyRateTotal * (targetMargin / 100)) * 100) / 100;
    const sellRateTotal = Math.round((buyRateTotal + profitMarginAmount) * 100) / 100;

    return {
      origin: params.origin,
      destination: params.destination,
      transportMode: mode,
      equipment,
      baseFreight: Math.round(baseFreight * 100) / 100,
      fuelSurchargeBaf: Math.round(baf * 100) / 100,
      carbonSurchargeEts: Math.round(ets * 100) / 100,
      originThc,
      destinationThc: destThc,
      destThc,
      inlandDrayageAndTolls: Math.round(drayageAndTolls * 100) / 100,
      customsClearanceFee: customsFee,
      buyRateTotal: Math.round(buyRateTotal * 100) / 100,
      profitMarginAmount,
      profitMarginPct: targetMargin,
      sellRateTotal,
      currency: "EUR",
      estimatedTransitDays: transitDays,
      co2eKg,
    };
  }
}
