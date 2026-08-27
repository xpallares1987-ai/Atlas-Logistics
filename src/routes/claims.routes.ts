import { FastifyPluginAsync } from "fastify";
import { CarrierLiabilityService } from "../services/claims/carrier-liability.service.js";
import { CargoClaimService } from "../services/claims/cargo-claim.service.js";
import { PDFService } from "../services/pdf.service.js";

export const claimsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/claims - List cargo claims with optional filters
   */
  fastify.get("/", async (request, reply) => {
    const query = request.query as any;
    try {
      const claims = await CargoClaimService.listClaims({
        status: query?.status,
        convention: query?.convention,
        search: query?.q,
      });
      return reply.send(claims);
    } catch (err: any) {
      request.log.error(err);
      return reply.code(500).send({ error: "Failed to list cargo claims" });
    }
  });

  /**
   * GET /api/claims/:id - Get single claim details
   */
  fastify.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const claim = await CargoClaimService.getClaimById(id);
      if (!claim) {
        return reply.code(404).send({ error: "Cargo claim not found" });
      }
      return reply.send(claim);
    } catch (err: any) {
      request.log.error(err);
      return reply.code(500).send({ error: "Failed to fetch claim" });
    }
  });

  /**
   * POST /api/claims/calculate-liability - Calculate statutory SDR liability and notice deadlines
   */
  fastify.post("/calculate-liability", async (request, reply) => {
    const body = request.body as any;
    if (
      !body?.convention ||
      !body?.transportMode ||
      !body?.damagedWeightKg ||
      body?.claimedAmount === undefined
    ) {
      return reply.code(400).send({
        error:
          "convention, transportMode, damagedWeightKg, and claimedAmount are required",
      });
    }

    try {
      const result = CarrierLiabilityService.calculateStatutoryLiability({
        convention: body.convention,
        transportMode: body.transportMode,
        damagedWeightKg: Number(body.damagedWeightKg),
        packagesCount: Number(body.packagesCount || 1),
        claimedAmount: Number(body.claimedAmount),
        incidentDate: body.incidentDate || new Date(),
        noticeDate: body.noticeDate || new Date(),
        deliveryDate: body.deliveryDate,
      });
      return reply.send({ success: true, liability: result });
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  /**
   * POST /api/claims - Create a new cargo claim
   */
  fastify.post("/", async (request, reply) => {
    const body = request.body as any;
    if (
      !body?.transportDocNumber ||
      !body?.transportMode ||
      !body?.governingConvention ||
      !body?.incidentType ||
      !body?.claimantName ||
      !body?.carrierName ||
      !body?.damagedWeightKg ||
      !body?.claimedAmount
    ) {
      return reply.code(400).send({
        error: "Missing required fields for cargo claim registration",
      });
    }

    try {
      const result = await CargoClaimService.createClaim({
        shipmentId: body.shipmentId,
        transportDocNumber: body.transportDocNumber,
        transportMode: body.transportMode,
        governingConvention: body.governingConvention,
        incidentType: body.incidentType,
        incidentDate: body.incidentDate
          ? new Date(body.incidentDate)
          : new Date(),
        noticeDate: body.noticeDate ? new Date(body.noticeDate) : new Date(),
        deliveryDate: body.deliveryDate
          ? new Date(body.deliveryDate)
          : undefined,
        claimantName: body.claimantName,
        carrierName: body.carrierName,
        packagesDamaged: Number(body.packagesDamaged || 1),
        damagedWeightKg: Number(body.damagedWeightKg),
        claimedAmount: Number(body.claimedAmount),
        claimedCurrency: body.claimedCurrency || "EUR",
        insuranceInsuredValue: Number(body.insuranceInsuredValue || 0),
        insurancePolicyDeductible: Number(body.insurancePolicyDeductible || 0),
        incidentDescription:
          body.incidentDescription || "Cargo loss/damage incident",
        surveyorData: body.surveyorData,
      });

      return reply.code(201).send(result);
    } catch (err: any) {
      request.log.error(err);
      return reply
        .code(400)
        .send({ error: err.message || "Failed to create cargo claim" });
    }
  });

  /**
   * GET /api/claims/:id/protest-pdf - Generate Notice of Claim / Carrier Protest PDF
   */
  fastify.get("/:id/protest-pdf", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const claim = await CargoClaimService.getClaimById(id);
      if (!claim) {
        return reply.code(404).send({ error: "Claim not found" });
      }

      const pdfBuffer = await PDFService.generateCarrierProtestLetter({
        claimNumber: claim.claimNumber,
        transportDocNumber: claim.transportDocNumber,
        transportMode: claim.transportMode,
        governingConvention: claim.governingConvention,
        incidentType: claim.incidentType,
        incidentDate: claim.incidentDate,
        noticeDate: claim.noticeDate,
        deliveryDate: claim.deliveryDate || undefined,
        claimantName: claim.claimantName,
        carrierName: claim.carrierName,
        packagesDamaged: claim.packagesDamaged,
        damagedWeightKg: claim.damagedWeightKg,
        claimedAmount: claim.claimedAmount,
        claimedCurrency: claim.claimedCurrency || "EUR",
        statutoryLimitEur: claim.statutoryLimitEur,
        incidentDescription: claim.incidentDescription,
        surveyorData: claim.surveyorData,
      });

      reply.header("Content-Type", "application/pdf");
      reply.header(
        "Content-Disposition",
        `attachment; filename="Protest-${claim.claimNumber}.pdf"`,
      );
      return reply.send(pdfBuffer);
    } catch (err: any) {
      request.log.error(err);
      return reply.code(500).send({ error: "Failed to generate protest PDF" });
    }
  });

  /**
   * GET /api/claims/:id/subrogation-pdf - Generate Subrogation Receipt PDF
   */
  fastify.get("/:id/subrogation-pdf", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const claim = await CargoClaimService.getClaimById(id);
      if (!claim) {
        return reply.code(404).send({ error: "Claim not found" });
      }

      const pdfBuffer = await PDFService.generateSubrogationReceipt({
        claimNumber: claim.claimNumber,
        transportDocNumber: claim.transportDocNumber,
        claimantName: claim.claimantName,
        carrierName: claim.carrierName,
        claimedAmount: claim.claimedAmount,
        claimedCurrency: claim.claimedCurrency || "EUR",
        insurancePayoutAmount:
          claim.insurancePayoutAmount || claim.claimedAmount,
        incidentDate: claim.incidentDate,
        governingConvention: claim.governingConvention,
      });

      reply.header("Content-Type", "application/pdf");
      reply.header(
        "Content-Disposition",
        `attachment; filename="Subrogation-${claim.claimNumber}.pdf"`,
      );
      return reply.send(pdfBuffer);
    } catch (err: any) {
      request.log.error(err);
      return reply
        .code(500)
        .send({ error: "Failed to generate subrogation PDF" });
    }
  });
};
