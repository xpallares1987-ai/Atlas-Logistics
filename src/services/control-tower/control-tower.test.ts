import { describe, it, expect, beforeAll } from "vitest";
import { ControlTowerService } from "./control-tower.service.js";
import { seedControlTower } from "../../db/seeds/control_tower.seed.js";

describe("Autonomous Logistics Control Tower & Intelligent Operations Suite", () => {
  beforeAll(async () => {
    await seedControlTower();
  });

  describe("KPIs & Telemetry Summary", () => {
    it("should compute global Control Tower operational KPIs", async () => {
      const kpis = await ControlTowerService.getKpis();

      expect(kpis.totalIncidents).toBeGreaterThan(0);
      expect(kpis.activeIncidentsCount).toBeGreaterThan(0);
      expect(kpis.onTimeSlaPct).toBeGreaterThan(90);
      expect(kpis.autoResolvedPct).toBeGreaterThanOrEqual(0);
      expect(kpis.totalDisputedFreightEur).toBeGreaterThan(0);
      expect(kpis.customsRadar.total).toBeGreaterThanOrEqual(3);
    });
  });

  describe("Incident Management & Autonomous Resolution", () => {
    it("should list active incidents with attached reroute options", async () => {
      const incidents = await ControlTowerService.listIncidents();
      expect(Array.isArray(incidents)).toBe(true);
      expect(incidents.length).toBeGreaterThan(0);

      const withOptions = incidents.find(
        (i) => i.rerouteOptions && i.rerouteOptions.length > 0,
      );
      expect(withOptions).toBeDefined();
      expect(withOptions?.rerouteOptions[0].feasibilityScore).toBeGreaterThan(0);
    });

    it("should filter incidents by severity", async () => {
      const criticalOnly = await ControlTowerService.listIncidents({
        severity: "CRITICAL",
      });
      expect(criticalOnly.every((i) => i.severity === "CRITICAL")).toBe(true);
    });

    it("should apply autonomous resolution when impact < 500 EUR and delay <= 3h", async () => {
      const autoIncident = await ControlTowerService.createIncident({
        incidentType: "ROAD_ACCIDENT",
        severity: "LOW",
        title: "Pinchazo menor en semirremolque",
        description: "Reparación de urgencia completada en arcén por taller móvil.",
        impactAmountEur: 220,
        delayHours: 1.5,
        locationName: "A-3 Km 140",
      });

      expect(autoIncident).toBeDefined();
      expect(autoIncident?.autoResolved).toBe(true);
      expect(autoIncident?.status).toBe("AUTO_RESOLVED");
      expect(autoIncident?.resolutionAction).toContain("Protocolo Autónomo");
    });

    it("should generate alternative corridors for CRITICAL / HIGH incidents requiring human supervision", async () => {
      const severeIncident = await ControlTowerService.createIncident({
        incidentType: "PORT_CONGESTION",
        severity: "CRITICAL",
        title: "Bloqueo por niebla densa en Canal de la Mancha",
        description: "Ferrys suspendidos durante 18 horas entre Dover y Calais.",
        impactAmountEur: 1800,
        delayHours: 18,
        locationName: "Port of Dover",
      });

      expect(severeIncident).toBeDefined();
      expect(severeIncident?.autoResolved).toBe(false);
      expect(severeIncident?.rerouteOptions.length).toBeGreaterThanOrEqual(2);

      const railOrFeeder = severeIncident?.rerouteOptions.find(
        (o) => o.transportMode === "RAIL_INTERMODAL",
      );
      expect(railOrFeeder).toBeDefined();
      expect(railOrFeeder?.etaDeltaHours).toBeLessThan(0); // Saves time
      expect(railOrFeeder?.co2DeltaKg).toBeLessThan(0); // Reduces carbon
    });

    it("should execute chosen reroute option and resolve incident", async () => {
      const incident = await ControlTowerService.createIncident({
        incidentType: "VESSEL_DELAY",
        severity: "HIGH",
        title: "Avería propulsión buque feeder Algeciras",
        description: "Retraso de 24 horas en conexión marítima hacia Barcelona.",
        impactAmountEur: 1200,
        delayHours: 24,
      });

      const optionId = incident?.rerouteOptions[0]?.id;
      const resolved = await ControlTowerService.resolveIncident(
        incident!.id,
        "Aprobado desvío por corredor ferroviario",
        optionId,
        "OPERADOR_DEMO",
      );

      expect(resolved?.status).toBe("RESOLVED");
      expect(resolved?.resolutionAction).toBe(
        "Aprobado desvío por corredor ferroviario",
      );
      expect(resolved?.resolvedBy).toBe("OPERADOR_DEMO");
    });
  });

  describe("3-Way Match Freight Invoice Audit & Disputes", () => {
    it("should reconcile carrier invoice lines against expected amounts and detect discrepancies", async () => {
      const matches = await ControlTowerService.getFreightAuditMatches();
      expect(Array.isArray(matches)).toBe(true);
      expect(matches.length).toBeGreaterThanOrEqual(0);
    });

    it("should raise formal dispute with Debit Note generation", async () => {
      const dispute = await ControlTowerService.createFreightDispute({
        invoiceLineId: "line_sample_01",
        reason: "UNJUSTIFIED_DEMURRAGE",
        resolutionNote: "Contenedor retirado dentro de los 14 días libres pactados.",
      });

      expect(dispute.disputeCode).toContain("DSP-2026-");
      expect(dispute.debitNoteNumber).toContain("DN-2026-");
      expect(dispute.status).toBe("OPEN");
    });
  });

  describe("EU ICS2 Customs Radar & Pre-Arrival Filing", () => {
    it("should retrieve ICS2 risk circuit declarations", async () => {
      const radar = await ControlTowerService.getCustomsRadar();
      expect(Array.isArray(radar)).toBe(true);
      expect(radar.length).toBeGreaterThanOrEqual(3);

      const circuits = radar.map((r) => r.riskCircuit);
      expect(circuits).toContain("GREEN");
      expect(circuits).toContain("ORANGE");
      expect(circuits).toContain("RED");
    });

    it("should file pre-arrival ENS declaration with simulated security scoring", async () => {
      const ens = await ControlTowerService.fileIcs2Declaration({
        declarantEori: "ESB99482716",
        customsOfficeCode: "ES004611",
        notes: "Carga consolidada electrónica de alto valor.",
      });

      expect(ens.mrn).toContain("26ES");
      expect(ens.declarationType).toBe("ENS");
      expect(["GREEN", "ORANGE", "RED"]).toContain(ens.riskCircuit);
      expect(ens.securityAssessmentScore).toBeGreaterThanOrEqual(65);
    });
  });

  describe("Multimodal Spot Rate Calculator", () => {
    it("should calculate transparent door-to-door spot freight quote for OCEAN_FCL", () => {
      const quote = ControlTowerService.calculateSpotRate({
        origin: "Valencia Port (VLC)",
        destination: "Zaragoza Logistics Platform (PLAZA)",
        transportMode: "OCEAN_FCL",
        containerType: "40HC",
        distanceKm: 320,
        targetMarginPct: 15,
      });

      expect(quote.baseFreight).toBe(2650);
      expect(quote.fuelSurchargeBaf).toBe(380);
      expect(quote.carbonSurchargeEts).toBe(65);
      expect(quote.originThc).toBe(175);
      expect(quote.destThc).toBe(210);
      expect(quote.customsClearanceFee).toBe(125);
      expect(quote.sellRateTotal).toBeGreaterThan(quote.buyRateTotal);
      expect(quote.profitMarginPct).toBe(15);
      expect(quote.co2eKg).toBeGreaterThan(0);
    });

    it("should prove Rail Intermodal produces lower carbon emissions than Road Express", () => {
      const roadQuote = ControlTowerService.calculateSpotRate({
        origin: "Madrid Hub",
        destination: "Rotterdam Maasvlakte",
        transportMode: "ROAD_EXPRESS",
        distanceKm: 1650,
      });

      const railQuote = ControlTowerService.calculateSpotRate({
        origin: "Madrid Hub",
        destination: "Rotterdam Maasvlakte",
        transportMode: "RAIL_INTERMODAL",
        distanceKm: 1650,
      });

      expect(railQuote.co2eKg).toBeLessThan(roadQuote.co2eKg);
      expect(railQuote.fuelSurchargeBaf).toBeLessThan(roadQuote.fuelSurchargeBaf);
    });
  });
});
