import { FastifyPluginAsync } from "fastify";
import {
  IncotermsMatrixService,
  IncotermCode,
} from "../services/incoterms/incoterms-matrix.service.js";
import { CustomsNormalizerService } from "../services/incoterms/customs-normalizer.service.js";
import { CommercialContractService } from "../services/incoterms/contract.service.js";
import { PDFService } from "../services/pdf.service.js";

export const incotermsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/incoterms/rules - List all 11 official ICC Incoterms 2020 rules
   */
  fastify.get("/rules", async (request, reply) => {
    try {
      const rules = IncotermsMatrixService.getAllRules();
      return reply.send({ success: true, count: rules.length, rules });
    } catch (err: any) {
      request.log.error(err);
      return reply
        .code(500)
        .send({ error: "Failed to retrieve Incoterms rules" });
    }
  });

  /**
   * GET /api/incoterms/rules/:code - Get single Incoterm rule definition
   */
  fastify.get("/rules/:code", async (request, reply) => {
    const { code } = request.params as { code: string };
    try {
      const rule = IncotermsMatrixService.getRule(
        code.toUpperCase() as IncotermCode,
      );
      return reply.send({ success: true, rule });
    } catch (err: any) {
      return reply.code(404).send({ error: err.message || "Rule not found" });
    }
  });

  /**
   * POST /api/incoterms/validate-mode - Check transport mode and container compatibility
   */
  fastify.post("/validate-mode", async (request, reply) => {
    const body = request.body as any;
    if (!body?.incotermCode || !body?.transportMode) {
      return reply
        .code(400)
        .send({ error: "incotermCode and transportMode are required" });
    }

    try {
      const result = IncotermsMatrixService.validateModeCompatibility({
        incotermCode: body.incotermCode.toUpperCase() as IncotermCode,
        transportMode: body.transportMode.toUpperCase(),
        isContainerized: Boolean(body.isContainerized),
      });
      return reply.send({ success: true, validation: result });
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  /**
   * POST /api/incoterms/calculate-insurance - Calculate mandatory minimum insurance
   */
  fastify.post("/calculate-insurance", async (request, reply) => {
    const body = request.body as any;
    if (!body?.incotermCode || body?.goodsValue === undefined) {
      return reply
        .code(400)
        .send({ error: "incotermCode and goodsValue are required" });
    }

    try {
      const result = IncotermsMatrixService.calculateInsuranceObligation({
        incotermCode: body.incotermCode.toUpperCase() as IncotermCode,
        goodsValue: Number(body.goodsValue),
        freightCost: Number(body.freightCost || 0),
        currency: body.currency || "EUR",
      });
      return reply.send({ success: true, insurance: result });
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  /**
   * POST /api/incoterms/normalize-customs-value - Compute DUA Box 46 / TARIC valuation adjustments
   */
  fastify.post("/normalize-customs-value", async (request, reply) => {
    const body = request.body as any;
    if (!body?.incotermCode || body?.invoiceValue === undefined) {
      return reply
        .code(400)
        .send({ error: "incotermCode and invoiceValue are required" });
    }

    try {
      const result = CustomsNormalizerService.normalizeCustomsValue({
        incotermCode: body.incotermCode.toUpperCase() as IncotermCode,
        invoiceValue: Number(body.invoiceValue),
        currency: body.currency || "EUR",
        preCarriageCost: Number(body.preCarriageCost || 0),
        exportFormalitiesCost: Number(body.exportFormalitiesCost || 0),
        internationalFreightCost: Number(body.internationalFreightCost || 0),
        insuranceCost: Number(body.insuranceCost || 0),
        destinationHandlingCost: Number(body.destinationHandlingCost || 0),
        importDutyCost: Number(body.importDutyCost || 0),
        importVatCost: Number(body.importVatCost || 0),
        exchangeRateToEur: Number(body.exchangeRateToEur || 1.0),
      });
      return reply.send({ success: true, normalization: result });
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  /**
   * GET /api/incoterms/contracts - List commercial freight contracts
   */
  fastify.get("/contracts", async (request, reply) => {
    const query = request.query as any;
    try {
      const contracts = await CommercialContractService.listContracts({
        incoterm: query?.incoterm,
        status: query?.status,
        search: query?.q,
      });
      return reply.send(contracts);
    } catch (err: any) {
      request.log.error(err);
      return reply.code(500).send({ error: "Failed to list contracts" });
    }
  });

  /**
   * GET /api/incoterms/contracts/:id - Get single contract by ID
   */
  fastify.get("/contracts/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const contract = await CommercialContractService.getContractById(id);
      if (!contract) {
        return reply.code(404).send({ error: "Contract not found" });
      }
      return reply.send(contract);
    } catch (err: any) {
      request.log.error(err);
      return reply.code(500).send({ error: "Failed to fetch contract" });
    }
  });

  /**
   * POST /api/incoterms/contracts - Create a new Commercial Contract
   */
  fastify.post("/contracts", async (request, reply) => {
    const body = request.body as any;
    if (
      !body?.title ||
      !body?.incotermCode ||
      !body?.namedPlace ||
      !body?.goodsValue
    ) {
      return reply.code(400).send({
        error: "title, incotermCode, namedPlace, and goodsValue are required",
      });
    }

    try {
      const result = await CommercialContractService.createContract({
        title: body.title,
        sellerCompanyId: body.sellerCompanyId,
        buyerCompanyId: body.buyerCompanyId,
        sellerData: body.sellerData,
        buyerData: body.buyerData,
        forwarderData: body.forwarderData,
        incotermCode: body.incotermCode.toUpperCase() as IncotermCode,
        namedPlace: body.namedPlace,
        transportMode: body.transportMode || "MULTIMODAL",
        currency: body.currency || "EUR",
        goodsValue: Number(body.goodsValue),
        freightEstimatedCost: Number(body.freightEstimatedCost || 0),
        insuranceEstimatedCost: Number(body.insuranceEstimatedCost || 0),
        customsEstimatedDuty: Number(body.customsEstimatedDuty || 0),
        effectiveDate: body.effectiveDate
          ? new Date(body.effectiveDate)
          : new Date(),
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : undefined,
        governingLaw: body.governingLaw,
        disputeJurisdiction: body.disputeJurisdiction,
      });

      return reply.code(201).send(result);
    } catch (err: any) {
      request.log.error(err);
      return reply
        .code(400)
        .send({ error: err.message || "Failed to create contract" });
    }
  });

  /**
   * GET /api/incoterms/contracts/:id/pdf - Generate bilingual commercial contract PDF
   */
  fastify.get("/contracts/:id/pdf", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const contract = await CommercialContractService.getContractById(id);
      if (!contract) {
        return reply.code(404).send({ error: "Contract not found" });
      }

      const pdfBuffer = await PDFService.generateCommercialContract({
        contractNumber: contract.contractNumber,
        title: contract.title,
        incotermCode: contract.incotermCode,
        namedPlace: contract.namedPlace,
        transportMode: contract.transportMode,
        currency: contract.currency || "EUR",
        goodsValue: contract.goodsValue,
        freightEstimatedCost: contract.freightEstimatedCost || 0,
        insuranceEstimatedCost: contract.insuranceEstimatedCost || 0,
        customsEstimatedDuty: contract.customsEstimatedDuty || 0,
        effectiveDate: contract.effectiveDate,
        expiryDate: contract.expiryDate || undefined,
        governingLaw: contract.governingLaw,
        disputeJurisdiction: contract.disputeJurisdiction,
        sellerData: contract.sellerData,
        buyerData: contract.buyerData,
        forwarderData: contract.forwarderData,
        milestonesData: (contract.milestonesData as any[]) || [],
      });

      reply.header("Content-Type", "application/pdf");
      reply.header(
        "Content-Disposition",
        `attachment; filename="Contract-${contract.contractNumber}.pdf"`,
      );
      return reply.send(pdfBuffer);
    } catch (err: any) {
      request.log.error(err);
      return reply.code(500).send({ error: "Failed to generate contract PDF" });
    }
  });
};
