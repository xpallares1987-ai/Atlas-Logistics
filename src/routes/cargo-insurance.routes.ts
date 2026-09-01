import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { eq, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import * as schema from "../db/schema/index.js";
import { InsuredValueCalculatorService } from "../services/cargo-insurance/insured-value-calculator.service.js";
import { ActuarialPremiumRatingService } from "../services/cargo-insurance/actuarial-premium-rating.service.js";
import { ClaimAdjustmentSettlementService } from "../services/cargo-insurance/claim-adjustment-settlement.service.js";
import { PDFService } from "../services/pdf.service.js";
import crypto from "crypto";

export const cargoInsuranceRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  // 1. List Open Cover Policies
  fastify.get("/open-policies", async (request, reply) => {
    try {
      const policies = await db
        .select()
        .from(schema.insuranceOpenPolicies)
        .orderBy(desc(schema.insuranceOpenPolicies.createdAt));
      return reply.send({ success: true, data: policies });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 2. Get Open Policy Details with Certificates & Bordereaux
  fastify.get("/open-policies/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const [policy] = await db
        .select()
        .from(schema.insuranceOpenPolicies)
        .where(eq(schema.insuranceOpenPolicies.id, id));

      if (!policy) {
        return reply
          .status(404)
          .send({ success: false, error: "Open Policy not found" });
      }

      const certificates = await db
        .select()
        .from(schema.insuranceCertificates)
        .where(eq(schema.insuranceCertificates.openPolicyId, id));

      const bordereaux = await db
        .select()
        .from(schema.insuranceBordereaux)
        .where(eq(schema.insuranceBordereaux.openPolicyId, id));

      return reply.send({
        success: true,
        data: {
          ...policy,
          certificates,
          bordereaux,
        },
      });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 3. Create Open Cover Policy
  fastify.post("/open-policies", async (request, reply) => {
    try {
      const body = request.body as any;
      const policyId = `open_pol_${crypto.randomUUID().slice(0, 8)}`;
      const polNumber =
        body.policyNumber ||
        `POL-MAR-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;

      await db.insert(schema.insuranceOpenPolicies).values({
        id: policyId,
        policyNumber: polNumber,
        insurerName: body.insurerName || "Zurich Insurance plc",
        brokerName: body.brokerName || "Aon Marine",
        policyHolderName:
          body.policyHolderName || "Atlas Logistics Forwarding SL",
        policyHolderTaxId: body.policyHolderTaxId || "B-99201452",
        currency: body.currency || "EUR",
        startDate: body.startDate || "2026-01-01",
        endDate: body.endDate || "2026-12-31",
        conveyanceLimitAmount: body.conveyanceLimitAmount || 2500000.0,
        annualEstimatedTurnover: body.annualEstimatedTurnover || 15000000.0,
        baseRatePercentage: body.baseRatePercentage || 0.2,
        warStrikeRatePercentage: body.warStrikeRatePercentage || 0.04,
        defaultDeductibleAmount: body.defaultDeductibleAmount || 500.0,
        deductibleType: body.deductibleType || "FIXED_AMOUNT",
        minPremiumPerShipment: body.minPremiumPerShipment || 50.0,
        status: body.status || "ACTIVE",
        termsAndConditionsText: body.termsAndConditionsText || null,
      });

      const [newPolicy] = await db
        .select()
        .from(schema.insuranceOpenPolicies)
        .where(eq(schema.insuranceOpenPolicies.id, policyId));

      return reply.status(201).send({ success: true, data: newPolicy });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 4. List Insurance Certificates
  fastify.get("/certificates", async (request, reply) => {
    try {
      const certs = await db
        .select()
        .from(schema.insuranceCertificates)
        .orderBy(desc(schema.insuranceCertificates.createdAt));
      return reply.send({ success: true, data: certs });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 5. Get Certificate by ID with Claims
  fastify.get("/certificates/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const [cert] = await db
        .select()
        .from(schema.insuranceCertificates)
        .where(eq(schema.insuranceCertificates.id, id));

      if (!cert) {
        return reply
          .status(404)
          .send({ success: false, error: "Insurance Certificate not found" });
      }

      const claims = await db
        .select()
        .from(schema.insuranceClaimsSettlements)
        .where(eq(schema.insuranceClaimsSettlements.certificateId, id));

      return reply.send({ success: true, data: { ...cert, claims } });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 6. Issue New Insurance Certificate
  fastify.post("/certificates", async (request, reply) => {
    try {
      const body = request.body as any;
      const certId = `ins_cert_${crypto.randomUUID().slice(0, 8)}`;
      const certNum =
        body.certificateNumber ||
        `INS-CERT-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;

      // Calculate Insured Value (110% CIF)
      const insuredValRes = InsuredValueCalculatorService.calculateInsuredValue(
        {
          commercialInvoiceValue: body.commercialInvoiceValue || 100000,
          freightAmount: body.freightAmount || 0,
          estimatedInsuranceAmount: body.estimatedInsuranceAmount || 0,
          markupPercentage: body.markupPercentage || 10.0,
        },
      );

      // Calculate Premium
      const premiumRes = ActuarialPremiumRatingService.calculatePremium({
        insuredValue: insuredValRes.totalInsuredValue,
        coverageClause: body.coverageClause || "ICC_A_ALL_RISKS_2009",
        commodityType: body.commodityType || "GENERAL_CARGO",
        transportMode: body.transportMode || "MARITIME_OCEAN_FCL",
        hasWarStrikesCover: body.hasWarStrikesCover !== false,
      });

      await db.insert(schema.insuranceCertificates).values({
        id: certId,
        openPolicyId: body.openPolicyId || null,
        certificateNumber: certNum,
        shipmentReference: body.shipmentReference || "SH-2026-001",
        transportMode: body.transportMode || "MARITIME_OCEAN",
        carrierName: body.carrierName || "Ocean Carrier",
        vesselOrFlightOrVehiclePlate:
          body.vesselOrFlightOrVehiclePlate || "MV Vessel",
        voyageNumber: body.voyageNumber || "V.2608W",
        originPortOrCountry:
          body.originPortOrCountry || "Puerto de Valencia (ESVLC)",
        destinationPortOrCountry:
          body.destinationPortOrCountry || "Puerto de Singapur (SGSIN)",
        departureDate:
          body.departureDate || new Date().toISOString().substring(0, 10),
        estimatedArrivalDate: body.estimatedArrivalDate || null,
        insuredPartyName:
          body.insuredPartyName || "Iberica Export Solutions SL",
        insuredPartyAddress: body.insuredPartyAddress || "Valencia, Spain",
        consigneeOrToOrderName: body.consigneeOrToOrderName || "TO ORDER",
        claimSurveyAgentNameAddress:
          body.claimSurveyAgentNameAddress ||
          "Lloyd's Agency, Destination Port",
        claimPayableAtCity: body.claimPayableAtCity || "Madrid",
        goodsDescription: body.goodsDescription || "General Cargo",
        packageCount: body.packageCount || 1,
        grossWeightKg: body.grossWeightKg || 1000,
        commercialInvoiceValue: insuredValRes.commercialInvoiceValue,
        commercialCurrency: body.commercialCurrency || "EUR",
        freightAmount: insuredValRes.freightAmount,
        estimatedInsuranceAmount: body.estimatedInsuranceAmount || 0,
        markupPercentage: insuredValRes.markupPercentage,
        totalInsuredValue: insuredValRes.totalInsuredValue,
        coverageClause: body.coverageClause || "ICC_A_ALL_RISKS_2009",
        hasWarStrikesCover: Boolean(body.hasWarStrikesCover !== false),
        hasCyberExclusionCl380: Boolean(body.hasCyberExclusionCl380 !== false),
        hasSanctionsClauseJc2010: Boolean(
          body.hasSanctionsClauseJc2010 !== false,
        ),
        appliedRatePercentage: premiumRes.totalAppliedRatePercentage,
        netPremiumAmount: premiumRes.netPremiumFinal,
        ipsTaxPercentage: premiumRes.ipsTaxPercentage,
        ccsConsorcioSurchargePercentage: premiumRes.ccsConsorcioPercentage,
        grossPremiumPayable: premiumRes.grossPremiumPayable,
        deductibleAmount: body.deductibleAmount || 500.0,
        issueDate: body.issueDate || new Date().toISOString().substring(0, 10),
        status: body.status || "ISSUED_CERTIFIED",
      });

      const [newCert] = await db
        .select()
        .from(schema.insuranceCertificates)
        .where(eq(schema.insuranceCertificates.id, certId));

      return reply.status(201).send({ success: true, data: newCert });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 7. Calculate Insured Value (UCP 600)
  fastify.post("/calculate-insured-value", async (request, reply) => {
    try {
      const body = request.body as any;
      const res = InsuredValueCalculatorService.calculateInsuredValue(body);
      return reply.send({ success: true, calculation: res });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 8. Calculate Actuarial Premium
  fastify.post("/calculate-premium", async (request, reply) => {
    try {
      const body = request.body as any;
      const res = ActuarialPremiumRatingService.calculatePremium(body);
      return reply.send({ success: true, rating: res });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 9. Adjust & Settle Claim
  fastify.post("/adjust-claim", async (request, reply) => {
    try {
      const body = request.body as any;
      const res = ClaimAdjustmentSettlementService.adjustClaim(body);
      return reply.send({ success: true, claimAdjustment: res });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 10. PDF: Cargo Insurance Certificate PDF
  fastify.get("/certificates/:id/certificate-pdf", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const [cert] = await db
        .select()
        .from(schema.insuranceCertificates)
        .where(eq(schema.insuranceCertificates.id, id));

      if (!cert) {
        return reply
          .status(404)
          .send({ success: false, error: "Certificate not found" });
      }

      let openPolicy = null;
      if (cert.openPolicyId) {
        const [pol] = await db
          .select()
          .from(schema.insuranceOpenPolicies)
          .where(eq(schema.insuranceOpenPolicies.id, cert.openPolicyId));
        openPolicy = pol;
      }

      const pdfBuffer = await PDFService.generateCargoInsuranceCertificatePdf(
        cert,
        openPolicy,
      );
      reply.header("Content-Type", "application/pdf");
      reply.header(
        "Content-Disposition",
        `attachment; filename="Insurance_Certificate_${cert.certificateNumber}.pdf"`,
      );
      return reply.send(pdfBuffer);
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 11. PDF: Open Policy Schedule PDF
  fastify.get("/open-policies/:id/policy-pdf", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const [policy] = await db
        .select()
        .from(schema.insuranceOpenPolicies)
        .where(eq(schema.insuranceOpenPolicies.id, id));

      if (!policy) {
        return reply
          .status(404)
          .send({ success: false, error: "Open Policy not found" });
      }

      const pdfBuffer =
        await PDFService.generateOpenCoverPolicySchedulePdf(policy);
      reply.header("Content-Type", "application/pdf");
      reply.header(
        "Content-Disposition",
        `attachment; filename="Open_Policy_${policy.policyNumber}.pdf"`,
      );
      return reply.send(pdfBuffer);
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 12. PDF: Bordereau PDF
  fastify.get("/bordereaux/:id/bordereau-pdf", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const [bdx] = await db
        .select()
        .from(schema.insuranceBordereaux)
        .where(eq(schema.insuranceBordereaux.id, id));

      if (!bdx) {
        return reply
          .status(404)
          .send({ success: false, error: "Bordereau not found" });
      }

      const [policy] = await db
        .select()
        .from(schema.insuranceOpenPolicies)
        .where(eq(schema.insuranceOpenPolicies.id, bdx.openPolicyId));

      const lines = await db
        .select()
        .from(schema.insuranceBordereauLines)
        .where(eq(schema.insuranceBordereauLines.bordereauId, id));

      const pdfBuffer = await PDFService.generateInsuranceBordereauPdf(
        bdx,
        policy,
        lines,
      );
      reply.header("Content-Type", "application/pdf");
      reply.header(
        "Content-Disposition",
        `attachment; filename="Bordereau_${bdx.bordereauReference}.pdf"`,
      );
      return reply.send(pdfBuffer);
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 13. PDF: Claim Adjustment Statement PDF
  fastify.get("/claims/:id/adjustment-pdf", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const [claim] = await db
        .select()
        .from(schema.insuranceClaimsSettlements)
        .where(eq(schema.insuranceClaimsSettlements.id, id));

      if (!claim) {
        return reply
          .status(404)
          .send({ success: false, error: "Claim Settlement not found" });
      }

      const [cert] = await db
        .select()
        .from(schema.insuranceCertificates)
        .where(eq(schema.insuranceCertificates.id, claim.certificateId));

      const pdfBuffer = await PDFService.generateInsuranceClaimAdjustmentPdf(
        claim,
        cert,
      );
      reply.header("Content-Type", "application/pdf");
      reply.header(
        "Content-Disposition",
        `attachment; filename="Claim_Adjustment_${claim.claimReference}.pdf"`,
      );
      return reply.send(pdfBuffer);
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });
};
