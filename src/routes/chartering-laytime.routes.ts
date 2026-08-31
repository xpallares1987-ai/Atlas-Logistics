import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { eq, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import * as schema from "../db/schema/index.js";
import { NorTurnTimeService } from "../services/chartering/nor-turn-time.service.js";
import { LaytimeCalculationService } from "../services/chartering/laytime-calculation.service.js";
import { TimeCharterHireService } from "../services/chartering/time-charter-hire.service.js";
import { PDFService } from "../services/pdf.service.js";
import crypto from "crypto";

export const charteringLaytimeRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  // 1. List Charter Parties / Fixtures
  fastify.get("/fixtures", async (request, reply) => {
    try {
      const fixtures = await db
        .select()
        .from(schema.charterParties)
        .orderBy(desc(schema.charterParties.createdAt));
      return reply.send({ success: true, data: fixtures });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 2. Get Fixture Detail with SOFs & Calculations
  fastify.get("/fixtures/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const [fixture] = await db
        .select()
        .from(schema.charterParties)
        .where(eq(schema.charterParties.id, id));

      if (!fixture) {
        return reply
          .status(404)
          .send({ success: false, error: "Fixture not found" });
      }

      const sofs = await db
        .select()
        .from(schema.statementOfFacts)
        .where(eq(schema.statementOfFacts.charterPartyId, id));

      const calculations = await db
        .select()
        .from(schema.laytimeCalculations)
        .where(eq(schema.laytimeCalculations.charterPartyId, id));

      const offHires = await db
        .select()
        .from(schema.timeCharterOffHires)
        .where(eq(schema.timeCharterOffHires.charterPartyId, id));

      return reply.send({
        success: true,
        data: {
          ...fixture,
          sofs,
          calculations,
          offHires,
        },
      });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 3. Create Charter Party / Fixture
  fastify.post("/fixtures", async (request, reply) => {
    try {
      const body = request.body as any;
      const fixtureId = `cp_${crypto.randomUUID().slice(0, 8)}`;
      const ref =
        body.fixtureReference ||
        `CP-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;

      await db.insert(schema.charterParties).values({
        id: fixtureId,
        fixtureReference: ref,
        charterType: body.charterType || "VOYAGE_CHARTER",
        contractForm: body.contractForm || "GENCON_2022",
        ownerName: body.ownerName || "Naviera Cantábrica SA",
        chartererName:
          body.chartererName || "AgroGrain International Traders Ltd",
        brokerName: body.brokerName || "Braemar Shipbroking",
        vesselName: body.vesselName || "MV Northern Star",
        imoNumber: body.imoNumber || "9842109",
        flagState: body.flagState || "Malta",
        builtYear: body.builtYear || 2021,
        summerDwtMt: body.summerDwtMt || 45000,
        grossTonnage: body.grossTonnage || 28000,
        cargoDescription:
          body.cargoDescription || "Trigo a Granel (Bulk Wheat)",
        cargoQuantityMt: body.cargoQuantityMt || 35000,
        quantityMarginPercentage: body.quantityMarginPercentage ?? 5.0,
        loadingPort: body.loadingPort || "Puerto de Santander (ESSDR)",
        dischargingPort: body.dischargingPort || "Puerto de Alexandria (EGALY)",
        laycanStart: body.laycanStart || "2026-09-01",
        laycanEnd: body.laycanEnd || "2026-09-10",
        freightRateUsdPerMt: body.freightRateUsdPerMt ?? 32.5,
        dailyHireRateUsd: body.dailyHireRateUsd ?? 18500,
        demurrageRateUsdPerDay: body.demurrageRateUsdPerDay ?? 14000,
        despatchRateUsdPerDay: body.despatchRateUsdPerDay ?? 7000,
        despatchCalculationBasis:
          body.despatchCalculationBasis || "ATS_ALL_TIME_SAVED",
        laytimeTerms: body.laytimeTerms || "SHEX_EIU",
        laytimeAllowanceType:
          body.laytimeAllowanceType || "LOADING_DISCHARGING_RATES",
        totalAllowedLaytimeHours: body.totalAllowedLaytimeHours ?? null,
        loadRateMtPerDay: body.loadRateMtPerDay ?? 5000,
        dischargeRateMtPerDay: body.dischargeRateMtPerDay ?? 3500,
        turnTimeHours: body.turnTimeHours ?? 12,
        norOfficeHoursOnly: body.norOfficeHoursOnly !== false,
        norClausesJson:
          body.norClausesJson || '["WIPON","WIBON","WIFPON","WCCON"]',
        laytimeReversibility: body.laytimeReversibility || "NON_REVERSIBLE",
        status: body.status || "FIXED_ACTIVE",
        remarks: body.remarks || null,
      });

      const [newFixture] = await db
        .select()
        .from(schema.charterParties)
        .where(eq(schema.charterParties.id, fixtureId));

      return reply.status(201).send({ success: true, data: newFixture });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 4. List Statement of Facts (SOF)
  fastify.get("/sofs", async (request, reply) => {
    try {
      const sofs = await db
        .select()
        .from(schema.statementOfFacts)
        .orderBy(desc(schema.statementOfFacts.createdAt));
      return reply.send({ success: true, data: sofs });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 5. Get Single SOF with Chronological Events
  fastify.get("/sofs/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const [sof] = await db
        .select()
        .from(schema.statementOfFacts)
        .where(eq(schema.statementOfFacts.id, id));

      if (!sof) {
        return reply
          .status(404)
          .send({ success: false, error: "Statement of Facts not found" });
      }

      const events = await db
        .select()
        .from(schema.sofEvents)
        .where(eq(schema.sofEvents.statementOfFactsId, id))
        .orderBy(schema.sofEvents.eventStartTimestamp);

      return reply.send({ success: true, data: { ...sof, events } });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 6. Create Statement of Facts (SOF)
  fastify.post("/sofs", async (request, reply) => {
    try {
      const body = request.body as any;
      const sofId = `sof_${crypto.randomUUID().slice(0, 8)}`;
      const ref =
        body.sofReference ||
        `SOF-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;

      // Calculate NOR and Turn Time
      const norEval = NorTurnTimeService.validateAndComputeNor({
        norTenderedTimestamp:
          body.norTenderedTimestamp || new Date().toISOString(),
        turnTimeHours: body.turnTimeHours ?? 12,
        norOfficeHoursOnly: body.norOfficeHoursOnly !== false,
        actualOperationsCommencedTimestamp: body.commencedOperationsTimestamp,
      });

      await db.insert(schema.statementOfFacts).values({
        id: sofId,
        charterPartyId: body.charterPartyId,
        sofReference: ref,
        portOperation: body.portOperation || "LOADING",
        portCode: body.portCode || "ESSDR",
        portName: body.portName || "Santander Port",
        terminalBerth: body.terminalBerth || "Muelle de Raos 4",
        vesselAgentName: body.vesselAgentName || "Bergé Marítima",
        masterName: body.masterName || "Capt. Santiago Aranda",
        eospTimestamp: body.eospTimestamp || null,
        anchorageDropTimestamp: body.anchorageDropTimestamp || null,
        norTenderedTimestamp: norEval.effectiveNorTimestamp,
        norAcceptedTimestamp:
          body.norAcceptedTimestamp || norEval.effectiveNorTimestamp,
        turnTimeExpiryTimestamp: norEval.turnTimeExpiryTimestamp,
        allFastBerthingTimestamp: body.allFastBerthingTimestamp || null,
        commencedOperationsTimestamp:
          body.commencedOperationsTimestamp ||
          norEval.officialLaytimeCommencementTimestamp,
        completedOperationsTimestamp:
          body.completedOperationsTimestamp ||
          new Date(Date.now() + 86400000 * 4).toISOString(),
        actualCargoHandledMt: body.actualCargoHandledMt || 35000,
        isFinalized: Boolean(body.isFinalized),
        agentNotes: body.agentNotes || norEval.laytimeCommencementReason,
      });

      const [newSof] = await db
        .select()
        .from(schema.statementOfFacts)
        .where(eq(schema.statementOfFacts.id, sofId));

      return reply
        .status(201)
        .send({ success: true, data: newSof, norEvaluation: norEval });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 7. Add Event to SOF Timeline
  fastify.post("/sofs/:id/events", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = request.body as any;
      const eventId = `ev_${crypto.randomUUID().slice(0, 8)}`;

      const start = new Date(body.eventStartTimestamp).getTime();
      const end = new Date(body.eventEndTimestamp).getTime();
      const durMinutes = Math.max(0, Math.round((end - start) / (1000 * 60)));

      await db.insert(schema.sofEvents).values({
        id: eventId,
        statementOfFactsId: id,
        eventStartTimestamp: body.eventStartTimestamp,
        eventEndTimestamp: body.eventEndTimestamp,
        durationMinutes: durMinutes,
        eventType: body.eventType || "WORKING_OPERATIONS",
        laytimeCountingPercentage: body.laytimeCountingPercentage ?? 100,
        isCountedAgainstLaytime: body.isCountedAgainstLaytime !== false,
        affectedHatchesOrCranes: body.affectedHatchesOrCranes || null,
        interruptionReason: body.interruptionReason || null,
      });

      const [newEvent] = await db
        .select()
        .from(schema.sofEvents)
        .where(eq(schema.sofEvents.id, eventId));

      return reply.status(201).send({ success: true, data: newEvent });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 8. Calculate Laytime, Demurrage & Despatch
  fastify.post("/calculate-laytime", async (request, reply) => {
    try {
      const body = request.body as any;

      const calculation = LaytimeCalculationService.calculateLaytime({
        cargoQuantityMt: body.cargoQuantityMt || 35000,
        rateMtPerDay: body.rateMtPerDay || 5000,
        laytimeTerms: body.laytimeTerms || "SHEX_EIU",
        demurrageRateUsdPerDay: body.demurrageRateUsdPerDay || 14000,
        despatchRateUsdPerDay: body.despatchRateUsdPerDay || 7000,
        despatchCalculationBasis:
          body.despatchCalculationBasis || "ATS_ALL_TIME_SAVED",
        laytimeCommencedTimestamp:
          body.laytimeCommencedTimestamp || new Date().toISOString(),
        operationsCompletedTimestamp:
          body.operationsCompletedTimestamp ||
          new Date(Date.now() + 86400000 * 6).toISOString(),
        events: body.events || [],
        enforceOnceOnDemurrageRule: body.enforceOnceOnDemurrageRule !== false,
      });

      let savedRecord = null;
      if (
        body.saveCalculation &&
        body.charterPartyId &&
        body.statementOfFactsId
      ) {
        const calcId = `lay_${crypto.randomUUID().slice(0, 8)}`;
        const ref = `LAY-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;

        await db.insert(schema.laytimeCalculations).values({
          id: calcId,
          charterPartyId: body.charterPartyId,
          statementOfFactsId: body.statementOfFactsId,
          calculationReference: ref,
          portOperation: body.portOperation || "LOADING",
          laytimeCommencedTimestamp: body.laytimeCommencedTimestamp,
          laytimeCeasedTimestamp: body.operationsCompletedTimestamp,
          allowedLaytimeSeconds: calculation.allowedLaytimeSeconds,
          allowedLaytimeFormatted: calculation.allowedLaytimeFormatted,
          grossTimeUsedSeconds: calculation.grossTimeElapsedSeconds,
          deductionsSeconds: calculation.totalDeductionsSeconds,
          netLaytimeUsedSeconds: calculation.netLaytimeUsedSeconds,
          netLaytimeUsedFormatted: calculation.netLaytimeUsedFormatted,
          timeDifferenceSeconds: calculation.timeDifferenceSeconds,
          isDemurrage: calculation.isDemurrage,
          demurrageDaysDecimal: calculation.demurrageDaysDecimal,
          despatchDaysDecimal: calculation.despatchDaysDecimal,
          demurrageRatePerDayUsd: body.demurrageRateUsdPerDay || 14000,
          despatchRatePerDayUsd: body.despatchRateUsdPerDay || 7000,
          totalDemurrageAmountUsd: calculation.totalDemurrageAmountUsd,
          totalDespatchAmountUsd: calculation.totalDespatchAmountUsd,
          netFinancialPayableUsd: calculation.netFinancialPayableUsd,
          calculationMethod:
            body.despatchCalculationBasis || "ATS_ALL_TIME_SAVED",
          settlementStatus: "PENDING_AUDIT",
          auditorNotes: calculation.calculationSummary,
        });

        [savedRecord] = await db
          .select()
          .from(schema.laytimeCalculations)
          .where(eq(schema.laytimeCalculations.id, calcId));
      }

      return reply.send({
        success: true,
        calculation,
        savedRecord,
      });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 9. Calculate Time Charter Hire & Off-Hire
  fastify.post("/calculate-offhire", async (request, reply) => {
    try {
      const body = request.body as any;

      const hireStatement = TimeCharterHireService.calculateHireStatement({
        charterPeriodStart: body.charterPeriodStart || new Date().toISOString(),
        charterPeriodEnd:
          body.charterPeriodEnd ||
          new Date(Date.now() + 86400000 * 30).toISOString(),
        dailyHireRateUsd: body.dailyHireRateUsd || 18500,
        addressCommissionPercentage: body.addressCommissionPercentage ?? 2.5,
        brokeragePercentage: body.brokeragePercentage ?? 1.25,
        offHireEvents: body.offHireEvents || [],
      });

      return reply.send({ success: true, hireStatement });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 10. PDF Streaming: Charter Party Fixture Recap PDF
  fastify.get("/fixtures/:id/fixture-pdf", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const [fixture] = await db
        .select()
        .from(schema.charterParties)
        .where(eq(schema.charterParties.id, id));

      if (!fixture) {
        return reply
          .status(404)
          .send({ success: false, error: "Fixture not found" });
      }

      const pdfBuffer = await PDFService.generateCharterPartyPdf(fixture);
      reply.header("Content-Type", "application/pdf");
      reply.header(
        "Content-Disposition",
        `attachment; filename="Fixture_${fixture.fixtureReference}.pdf"`,
      );
      return reply.send(pdfBuffer);
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 11. PDF Streaming: Statement of Facts PDF
  fastify.get("/sofs/:id/sof-pdf", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const [sof] = await db
        .select()
        .from(schema.statementOfFacts)
        .where(eq(schema.statementOfFacts.id, id));

      if (!sof) {
        return reply
          .status(404)
          .send({ success: false, error: "Statement of Facts not found" });
      }

      const events = await db
        .select()
        .from(schema.sofEvents)
        .where(eq(schema.sofEvents.statementOfFactsId, id))
        .orderBy(schema.sofEvents.eventStartTimestamp);

      const pdfBuffer = await PDFService.generateStatementOfFactsPdf(
        sof,
        events,
      );
      reply.header("Content-Type", "application/pdf");
      reply.header(
        "Content-Disposition",
        `attachment; filename="SOF_${sof.sofReference}.pdf"`,
      );
      return reply.send(pdfBuffer);
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 12. PDF Streaming: Laytime Calculation Sheet PDF
  fastify.get("/laytime/:id/calculation-pdf", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const [calc] = await db
        .select()
        .from(schema.laytimeCalculations)
        .where(eq(schema.laytimeCalculations.id, id));

      if (!calc) {
        return reply
          .status(404)
          .send({ success: false, error: "Calculation not found" });
      }

      const [charter] = await db
        .select()
        .from(schema.charterParties)
        .where(eq(schema.charterParties.id, calc.charterPartyId));

      const events = await db
        .select()
        .from(schema.sofEvents)
        .where(
          eq(schema.sofEvents.statementOfFactsId, calc.statementOfFactsId),
        );

      const reCalc = LaytimeCalculationService.calculateLaytime({
        cargoQuantityMt: charter?.cargoQuantityMt || 35000,
        rateMtPerDay: charter?.loadRateMtPerDay || 5000,
        laytimeTerms: (charter?.laytimeTerms as any) || "SHEX_EIU",
        demurrageRateUsdPerDay: calc.demurrageRatePerDayUsd,
        despatchRateUsdPerDay: calc.despatchRatePerDayUsd,
        laytimeCommencedTimestamp: calc.laytimeCommencedTimestamp,
        operationsCompletedTimestamp: calc.laytimeCeasedTimestamp,
        events: events.map((e) => ({
          eventStartTimestamp: e.eventStartTimestamp,
          eventEndTimestamp: e.eventEndTimestamp,
          durationMinutes: e.durationMinutes,
          eventType: e.eventType,
          laytimeCountingPercentage: e.laytimeCountingPercentage,
          isCountedAgainstLaytime: e.isCountedAgainstLaytime,
          interruptionReason: e.interruptionReason || undefined,
        })),
      });

      const pdfBuffer = await PDFService.generateLaytimeCalculationSheetPdf(
        calc,
        charter,
        reCalc.eventBreakdowns,
      );
      reply.header("Content-Type", "application/pdf");
      reply.header(
        "Content-Disposition",
        `attachment; filename="Laytime_${calc.calculationReference}.pdf"`,
      );
      return reply.send(pdfBuffer);
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 13. PDF Streaming: Time Charter Hire Statement PDF
  fastify.get("/fixtures/:id/hire-statement-pdf", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const [fixture] = await db
        .select()
        .from(schema.charterParties)
        .where(eq(schema.charterParties.id, id));

      if (!fixture) {
        return reply
          .status(404)
          .send({ success: false, error: "Fixture not found" });
      }

      const offHires = await db
        .select()
        .from(schema.timeCharterOffHires)
        .where(eq(schema.timeCharterOffHires.charterPartyId, id));

      const hireCalc = TimeCharterHireService.calculateHireStatement({
        charterPeriodStart: fixture.laycanStart + "T00:00:00Z",
        charterPeriodEnd: fixture.laycanEnd + "T00:00:00Z",
        dailyHireRateUsd: fixture.dailyHireRateUsd || 18500,
        addressCommissionPercentage: 2.5,
        brokeragePercentage: 1.25,
        offHireEvents: offHires.map((o) => ({
          offHireReference: o.offHireReference,
          offHireReason: o.offHireReason,
          offHireStartTimestamp: o.offHireStartTimestamp,
          offHireEndTimestamp: o.offHireEndTimestamp,
          bunkerVlsfoConsumedMt: o.bunkerVlsfoConsumedMt || 0,
          bunkerMgoConsumedMt: o.bunkerMgoConsumedMt || 0,
        })),
      });

      const pdfBuffer = await PDFService.generateTimeCharterHireStatementPdf(
        fixture,
        hireCalc,
      );
      reply.header("Content-Type", "application/pdf");
      reply.header(
        "Content-Disposition",
        `attachment; filename="Hire_Statement_${fixture.fixtureReference}.pdf"`,
      );
      return reply.send(pdfBuffer);
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });
};
