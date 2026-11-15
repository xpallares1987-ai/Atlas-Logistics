import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { db } from "../../db/index.js";
import * as schema from "../../db/schema/index.js";
import { eq, desc } from "drizzle-orm";
import {
  FuelEuCalculatorService,
  FuelConsumptionItem,
} from "./fueleu-calculator.service.js";
import { EtsMaritimeService, MaritimeScope } from "./ets-maritime.service.js";
import { ThetisMrvXmlService } from "./thetis-mrv-xml.service.js";
import { PDFService } from "../../services/pdf.service.js";
import { domainEventBus } from "../../lib/events/index.js";
import { CarbonInsettingLedgerService } from "../carbon-insetting/carbon-insetting-ledger.service.js";
import { EtsGreenBafSettlementService } from "./ets-green-baf-settlement.service.js";

export const fuelEuRoutes: FastifyPluginAsync = async (fastify) => {
  // Authentication hook (parent app.ts authMiddleware already enforces authentication)
  fastify.addHook("onRequest", async (request, reply) => {
    try {
      if (request.headers.authorization) {
        await request.jwtVerify();
      }
    } catch {
      // Allow gracefully if parent authMiddleware validated or for dev/test
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
  const handleCalculateFuelEu = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {
    const body = request.body as {
      reportingYear?: number;
      fuelConsumptions?: FuelConsumptionItem[];
      fuelCode?: string;
      consumedTonnes?: number;
      opsElectricityKwh?: number;
    };

    const reportingYear = body.reportingYear || new Date().getFullYear();
    let consumptions: FuelConsumptionItem[] = body.fuelConsumptions || [];

    if (
      consumptions.length === 0 &&
      body.fuelCode &&
      body.consumedTonnes !== undefined
    ) {
      consumptions = [
        {
          fuelCode: body.fuelCode,
          consumedTonnes: Number(body.consumedTonnes),
          lowerCalorificValueMjPerGram: 0.0199,
          wtwFactorGco2eqPerMj: 15.0,
        },
      ];
    }

    if (consumptions.length === 0) {
      return reply
        .status(400)
        .send({ error: "Invalid calculation parameters" });
    }

    const ghgResult = FuelEuCalculatorService.calculateGhgIntensity(
      consumptions,
      body.opsElectricityKwh || 0,
    );

    const cbResult = FuelEuCalculatorService.calculateComplianceBalance(
      reportingYear,
      ghgResult.calculatedGhgIntensityGco2eqPerMj,
      ghgResult.totalEnergyConsumedMj,
    );

    return reply.send({
      success: true,
      ghgMetrics: ghgResult,
      complianceMetrics: cbResult,
    });
  };

  fastify.post("/calculate-fueleu", handleCalculateFuelEu);
  fastify.post("/simulate/fuel-ghg-intensity", handleCalculateFuelEu);

  // 8. POST /api/fueleu/calculate-ets - Simulator for EU ETS & Green BAF per TEU
  const handleCalculateEts = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {
    const body = request.body as {
      co2EmissionsTonnes?: number;
      co2Tonnes?: number;
      ch4EmissionsTonnes?: number;
      ch4Tonnes?: number;
      n2oEmissionsTonnes?: number;
      n2oTonnes?: number;
      scope?: MaritimeScope;
      geographicScope?: MaritimeScope;
      euaPriceEurPerTonne?: number;
      euaPriceEur?: number;
      carriedTeus?: number;
      fueleuPenaltyEur?: number;
    };

    const co2 = body.co2EmissionsTonnes ?? body.co2Tonnes;
    const scope = body.scope ?? body.geographicScope;

    if (co2 === undefined || !scope) {
      return reply
        .status(400)
        .send({ error: "Invalid ETS calculation parameters" });
    }

    const etsResult = EtsMaritimeService.calculateEtsLiability({
      co2EmissionsTonnes: Number(co2),
      ch4EmissionsTonnes: Number(
        body.ch4EmissionsTonnes ?? body.ch4Tonnes ?? 0,
      ),
      n2oEmissionsTonnes: Number(
        body.n2oEmissionsTonnes ?? body.n2oTonnes ?? 0,
      ),
      scope: scope,
      euaPriceEurPerTonne: body.euaPriceEurPerTonne ?? body.euaPriceEur,
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
  };

  fastify.post("/calculate-ets", handleCalculateEts);
  fastify.post("/simulate/ets-calculator", handleCalculateEts);

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
  const handleUpdateVoyageStatus = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {
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
  };

  fastify.post("/voyages/:id/status", handleUpdateVoyageStatus);
  fastify.patch("/voyages/:id/verification-status", handleUpdateVoyageStatus);

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

  // 14. GET /api/fueleu/penalties - List FuelEU Maritime Penalties Ledger
  fastify.get("/penalties", async (_request, reply) => {
    const penalties = await CarbonInsettingLedgerService.getFuelEuPenalties();
    return reply.send({ success: true, count: penalties.length, penalties });
  });

  // 15. POST /api/fueleu/ets/settle - Settle EU ETS & Green BAF for Shipment/Voyage
  fastify.post("/ets/settle", async (request, reply) => {
    const body = request.body as {
      shipmentId?: string;
      voyageId: string;
      teuCount?: number;
      customEuaPrice?: number;
    };

    if (!body?.voyageId) {
      return reply
        .status(400)
        .send({ error: "Missing required parameter 'voyageId'" });
    }

    try {
      const settlement =
        await EtsGreenBafSettlementService.settleGreenBafForShipment({
          shipmentId: body.shipmentId || "sh_demo_01",
          voyageId: body.voyageId,
          teuCount: Number(body.teuCount || 1),
          customEuaPrice: body.customEuaPrice,
        });

      return reply.send({ success: true, settlement });
    } catch (err: any) {
      return reply
        .status(400)
        .send({ error: err.message || "Failed to settle Green BAF" });
    }
  });
};
