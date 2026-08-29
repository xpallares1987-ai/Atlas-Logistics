import { FastifyPluginAsync } from "fastify";
import { db } from "../db/index.js";
import * as schema from "../db/schema/index.js";
import { eq, desc } from "drizzle-orm";
import {
  FuelEuCalculatorService,
  FuelConsumptionItem,
} from "../services/fueleu/fueleu-calculator.service.js";
import {
  EtsMaritimeService,
  MaritimeScope,
} from "../services/fueleu/ets-maritime.service.js";
import { ThetisMrvXmlService } from "../services/fueleu/thetis-mrv-xml.service.js";
import { PDFService } from "../services/pdf.service.js";

export const fuelEuRoutes: FastifyPluginAsync = async (fastify) => {
  // Authentication hook
  fastify.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.status(401).send({ error: "Unauthorized" });
    }
  });

  // 1. GET /api/fueleu/fuels - List Marine Fuels Catalog
  fastify.get("/fuels", async (_request, reply) => {
    const fuels = await db
      .select()
      .from(schema.marineFuels)
      .orderBy(schema.marineFuels.fuelCategory);
    return reply.send(fuels);
  });

  // 2. GET /api/fueleu/vessels - List Merchant Fleet
  fastify.get("/vessels", async (_request, reply) => {
    const vessels = await db
      .select()
      .from(schema.marineVessels)
      .orderBy(schema.marineVessels.vesselName);
    return reply.send(vessels);
  });

  // 3. GET /api/fueleu/voyages - List Marine Voyages & Consumption
  fastify.get("/voyages", async (request, reply) => {
    const { vesselId, scope } = request.query as {
      vesselId?: string;
      scope?: string;
    };

    const query = db.select().from(schema.marineVoyages);

    const voyages = await query.orderBy(
      desc(schema.marineVoyages.departureDate),
    );

    let filtered = voyages;
    if (vesselId && vesselId !== "ALL") {
      filtered = filtered.filter((v) => v.vesselId === vesselId);
    }
    if (scope && scope !== "ALL") {
      filtered = filtered.filter((v) => v.geographicScope === scope);
    }

    return reply.send(filtered);
  });

  // 4. GET /api/fueleu/voyages/:id - Voyage detail with vessel and fuel info
  fastify.get("/voyages/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const [voyage] = await db
      .select()
      .from(schema.marineVoyages)
      .where(eq(schema.marineVoyages.id, id));

    if (!voyage) {
      return reply.status(404).send({ error: "Voyage not found" });
    }

    const [vessel] = await db
      .select()
      .from(schema.marineVessels)
      .where(eq(schema.marineVessels.id, voyage.vesselId));

    const [fuel] = await db
      .select()
      .from(schema.marineFuels)
      .where(eq(schema.marineFuels.id, voyage.fuelId));

    return reply.send({
      ...voyage,
      vessel,
      fuel,
    });
  });

  // 5. GET /api/fueleu/accounts - FuelEU Compliance Accounts
  fastify.get("/accounts", async (_request, reply) => {
    const accounts = await db
      .select()
      .from(schema.fuelEuComplianceAccounts)
      .orderBy(desc(schema.fuelEuComplianceAccounts.reportingYear));
    return reply.send(accounts);
  });

  // 6. GET /api/fueleu/pools - Fleet Compliance Pools
  fastify.get("/pools", async (_request, reply) => {
    const pools = await db
      .select()
      .from(schema.fuelEuPools)
      .orderBy(desc(schema.fuelEuPools.reportingYear));
    return reply.send(pools);
  });

  // 7. POST /api/fueleu/calculate-fueleu - Simulator for GHG intensity, CB & Penalty
  fastify.post("/calculate-fueleu", async (request, reply) => {
    const body = request.body as {
      reportingYear: number;
      fuelConsumptions: FuelConsumptionItem[];
      opsElectricityKwh?: number;
    };

    if (!body.reportingYear || !Array.isArray(body.fuelConsumptions)) {
      return reply
        .status(400)
        .send({ error: "Invalid calculation parameters" });
    }

    const ghgResult = FuelEuCalculatorService.calculateGhgIntensity(
      body.fuelConsumptions,
      body.opsElectricityKwh || 0,
    );

    const cbResult = FuelEuCalculatorService.calculateComplianceBalance(
      body.reportingYear,
      ghgResult.calculatedGhgIntensityGco2eqPerMj,
      ghgResult.totalEnergyConsumedMj,
    );

    return reply.send({
      success: true,
      ghgMetrics: ghgResult,
      complianceMetrics: cbResult,
    });
  });

  // 8. POST /api/fueleu/calculate-ets - Simulator for EU ETS & Green BAF per TEU
  fastify.post("/calculate-ets", async (request, reply) => {
    const body = request.body as {
      co2EmissionsTonnes: number;
      ch4EmissionsTonnes?: number;
      n2oEmissionsTonnes?: number;
      scope: MaritimeScope;
      euaPriceEurPerTonne?: number;
      carriedTeus?: number;
      fueleuPenaltyEur?: number;
    };

    if (body.co2EmissionsTonnes === undefined || !body.scope) {
      return reply
        .status(400)
        .send({ error: "Invalid ETS calculation parameters" });
    }

    const etsResult = EtsMaritimeService.calculateEtsLiability({
      co2EmissionsTonnes: Number(body.co2EmissionsTonnes),
      ch4EmissionsTonnes: Number(body.ch4EmissionsTonnes || 0),
      n2oEmissionsTonnes: Number(body.n2oEmissionsTonnes || 0),
      scope: body.scope,
      euaPriceEurPerTonne: body.euaPriceEurPerTonne,
    });

    const greenBafResult = EtsMaritimeService.calculateGreenBaf({
      carriedTeus: Number(body.carriedTeus || 1),
      fueleuPenaltyOrFuelPremiumEur: Number(body.fueleuPenaltyEur || 0),
      etsFinancialLiabilityEur: etsResult.totalEtsFinancialLiabilityEur,
    });

    return reply.send({
      success: true,
      etsLiability: etsResult,
      greenBaf: greenBafResult,
    });
  });

  // 9. POST /api/fueleu/simulate-pool - Fleet Pooling Simulator (Art. 21)
  fastify.post("/simulate-pool", async (request, reply) => {
    const body = request.body as {
      poolCode: string;
      vessels: {
        vesselId: string;
        vesselName: string;
        complianceBalanceGco2eq: number;
      }[];
    };

    if (!body.poolCode || !Array.isArray(body.vessels)) {
      return reply.status(400).send({ error: "Invalid pool simulation input" });
    }

    const poolResult = FuelEuCalculatorService.evaluatePoolBalance(
      body.poolCode,
      body.vessels,
    );

    return reply.send({
      success: true,
      poolResult,
    });
  });

  // 10. POST /api/fueleu/voyages/:id/status - Update voyage verification status
  fastify.post("/voyages/:id/status", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      status: "PLANNED" | "UNDERWAY" | "COMPLETED_VERIFIED" | "AUDITED_THETIS";
      leadAuditorVerifier?: string;
    };

    await db
      .update(schema.marineVoyages)
      .set({
        status: body.status,
        leadAuditorVerifier:
          body.leadAuditorVerifier || "DNV Marine Lead Auditor",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.marineVoyages.id, id));

    return reply.send({ success: true, status: body.status });
  });

  // 11. GET /api/fueleu/voyages/:id/thetis-xml - Export EMSA THETIS-MRV XML
  fastify.get("/voyages/:id/thetis-xml", async (request, reply) => {
    const { id } = request.params as { id: string };

    const [voyage] = await db
      .select()
      .from(schema.marineVoyages)
      .where(eq(schema.marineVoyages.id, id));

    if (!voyage) {
      return reply.status(404).send({ error: "Voyage not found" });
    }

    const [vessel] = await db
      .select()
      .from(schema.marineVessels)
      .where(eq(schema.marineVessels.id, voyage.vesselId));

    const [fuel] = await db
      .select()
      .from(schema.marineFuels)
      .where(eq(schema.marineFuels.id, voyage.fuelId));

    const xml = ThetisMrvXmlService.generateThetisVoyageXml({
      voyageReferenceNumber: voyage.voyageReferenceNumber,
      vesselImoNumber: vessel?.imoNumber || "0000000",
      vesselName: vessel?.vesselName || "Unknown Vessel",
      flagState: vessel?.flagState || "ES",
      grossTonnageGt: vessel?.grossTonnageGt || 5000,
      departurePortLocode: voyage.departurePortLocode,
      departurePortName: voyage.departurePortName,
      arrivalPortLocode: voyage.arrivalPortLocode,
      arrivalPortName: voyage.arrivalPortName,
      geographicScope: voyage.geographicScope,
      distanceNauticalMiles: voyage.distanceNauticalMiles,
      departureDate: voyage.departureDate,
      arrivalDate: voyage.arrivalDate,
      navigationHours: voyage.navigationHours,
      berthHours: voyage.berthHours,
      fuelCode: fuel?.fuelCode || "FOSSIL_VLSFO",
      fuelName: fuel?.fuelName || "VLSFO",
      fuelConsumedTonnes: voyage.fuelConsumedTonnes,
      opsElectricityConsumedKwh: voyage.opsElectricityConsumedKwh,
      totalEnergyConsumedMj: voyage.totalEnergyConsumedMj,
      calculatedGhgIntensityGco2eqPerMj:
        voyage.calculatedGhgIntensityGco2eqPerMj,
      co2EmissionsTonnes: voyage.co2EmissionsTonnes,
      ch4EmissionsTonnes: voyage.ch4EmissionsTonnes,
      n2oEmissionsTonnes: voyage.n2oEmissionsTonnes,
      totalGhgEmissionsScopeTco2eq: voyage.totalGhgEmissionsScopeTco2eq,
      etsApplicableScopeEmissionsTco2eq:
        voyage.etsApplicableScopeEmissionsTco2eq,
      carriedTeuCount: voyage.carriedTeuCount,
      leadAuditorVerifier: voyage.leadAuditorVerifier,
    });

    reply.header("Content-Type", "application/xml; charset=utf-8");
    reply.header(
      "Content-Disposition",
      `attachment; filename="THETIS-MRV-${voyage.voyageReferenceNumber}.xml"`,
    );
    return reply.send(xml);
  });

  // 12. GET /api/fueleu/accounts/:id/certificate-pdf - Stream FuelEU Compliance Certificate PDF
  fastify.get("/accounts/:id/certificate-pdf", async (request, reply) => {
    const { id } = request.params as { id: string };

    const [account] = await db
      .select()
      .from(schema.fuelEuComplianceAccounts)
      .where(eq(schema.fuelEuComplianceAccounts.id, id));

    if (!account) {
      return reply.status(404).send({ error: "Compliance account not found" });
    }

    const [vessel] = await db
      .select()
      .from(schema.marineVessels)
      .where(eq(schema.marineVessels.id, account.vesselId));

    let pool = null;
    if (account.poolId) {
      const [p] = await db
        .select()
        .from(schema.fuelEuPools)
        .where(eq(schema.fuelEuPools.id, account.poolId));
      pool = p;
    }

    const pdfBuffer = await PDFService.generateFuelEuComplianceCertificatePdf(
      account,
      vessel || {
        vesselName: "Unknown Vessel",
        imoNumber: "9811012",
        flagState: "ES",
        grossTonnageGt: 100000,
        mainEngineType: "TWO_STROKE_SLOW_SPEED_DIESEL",
        operatingShippingLine: "Atlas Mediterranean Line",
        docHolderCompany: "Atlas Maritime Shipmanagement",
        classificationSociety: "DNV",
        hasOpsConnectionInstalled: true,
      },
      pool,
    );

    reply.header("Content-Type", "application/pdf");
    reply.header(
      "Content-Disposition",
      `inline; filename="FuelEU-Compliance-Certificate-${account.reportingYear}.pdf"`,
    );
    return reply.send(pdfBuffer);
  });

  // 13. GET /api/fueleu/voyages/:id/bdn-pdf - Stream BDN & Voyage Emissions PDF
  fastify.get("/voyages/:id/bdn-pdf", async (request, reply) => {
    const { id } = request.params as { id: string };

    const [voyage] = await db
      .select()
      .from(schema.marineVoyages)
      .where(eq(schema.marineVoyages.id, id));

    if (!voyage) {
      return reply.status(404).send({ error: "Voyage not found" });
    }

    const [vessel] = await db
      .select()
      .from(schema.marineVessels)
      .where(eq(schema.marineVessels.id, voyage.vesselId));

    const [fuel] = await db
      .select()
      .from(schema.marineFuels)
      .where(eq(schema.marineFuels.id, voyage.fuelId));

    const pdfBuffer = await PDFService.generateBunkerDeliveryNoteAuditPdf(
      voyage,
      vessel || {
        vesselName: "Atlas Mediterranean",
        imoNumber: "9811012",
      },
      fuel || {
        fuelName: "VLSFO",
        fuelCode: "FOSSIL_VLSFO",
        fuelCategory: "FOSSIL_LIQUID",
        lowerCalorificValueMjPerGram: 0.041,
        totalWtwFactorGco2eqPerMj: 91.16,
      },
    );

    reply.header("Content-Type", "application/pdf");
    reply.header(
      "Content-Disposition",
      `inline; filename="BDN-Audit-Report-${voyage.voyageReferenceNumber}.pdf"`,
    );
    return reply.send(pdfBuffer);
  });
};
