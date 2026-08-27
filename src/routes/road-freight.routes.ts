import { FastifyPluginAsync } from "fastify";
import { AdrComplianceService } from "../services/road-freight/adr-compliance.service.js";
import { RoadRouteOptimizerService } from "../services/road-freight/route-optimizer.service.js";
import { RoadWaybillService } from "../services/road-freight/road-waybill.service.js";
import { PDFService } from "../services/pdf.service.js";

export const roadFreightRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/road-freight/consignments - List road freight consignments
   */
  fastify.get("/consignments", async (request, reply) => {
    const query = request.query as any;
    try {
      const consignments = await RoadWaybillService.listConsignments({
        status: query?.status,
        type: query?.type,
        search: query?.q,
      });
      return reply.send(consignments);
    } catch (err: any) {
      request.log.error(err);
      return reply
        .code(500)
        .send({ error: "Failed to list road consignments" });
    }
  });

  /**
   * GET /api/road-freight/consignments/:id - Get single consignment details
   */
  fastify.get("/consignments/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const consignment = await RoadWaybillService.getConsignmentById(id);
      if (!consignment) {
        return reply.code(404).send({ error: "Consignment not found" });
      }
      return reply.send(consignment);
    } catch (err: any) {
      request.log.error(err);
      return reply.code(500).send({ error: "Failed to fetch consignment" });
    }
  });

  /**
   * POST /api/road-freight/calculate-adr - Calculate ADR 1.1.3.6 points and exemptions
   */
  fastify.post("/calculate-adr", async (request, reply) => {
    const body = request.body as any;
    try {
      const items = Array.isArray(body?.items) ? body.items : [];
      const result = AdrComplianceService.calculateAdrExemption(items);
      return reply.send({ success: true, adr: result });
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  /**
   * POST /api/road-freight/calculate-route - Calculate tachograph driving time and trailer capacity
   */
  fastify.post("/calculate-route", async (request, reply) => {
    const body = request.body as any;
    if (!body?.originCity || !body?.destinationCity || !body?.distanceKm) {
      return reply.code(400).send({
        error: "originCity, destinationCity, and distanceKm are required",
      });
    }

    try {
      const result = RoadRouteOptimizerService.planRouteAndSchedule({
        originCity: body.originCity,
        destinationCity: body.destinationCity,
        distanceKm: Number(body.distanceKm),
        totalPallets: Number(body.totalPallets || 1),
        totalGrossWeightKg: Number(body.totalGrossWeightKg || 1000),
        departureTime: body.departureTime
          ? new Date(body.departureTime)
          : new Date(),
      });
      return reply.send({ success: true, route: result });
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  /**
   * POST /api/road-freight/consignments - Create a new road consignment
   */
  fastify.post("/consignments", async (request, reply) => {
    const body = request.body as any;
    if (
      !body?.consignmentType ||
      !body?.senderName ||
      !body?.consigneeName ||
      !body?.carrierName ||
      !body?.tractorPlate ||
      !body?.driverName ||
      !body?.originCity ||
      !body?.destinationCity ||
      !body?.totalDistanceKm ||
      !body?.totalPallets ||
      !body?.totalGrossWeightKg ||
      !body?.goodsDescription
    ) {
      return reply.code(400).send({
        error: "Missing required road consignment parameters",
      });
    }

    try {
      const result = await RoadWaybillService.createConsignment({
        shipmentId: body.shipmentId,
        consignmentType: body.consignmentType,
        senderName: body.senderName,
        senderAddress: body.senderAddress || "N/A",
        senderCountry: body.senderCountry || "ES",
        consigneeName: body.consigneeName,
        consigneeAddress: body.consigneeAddress || "N/A",
        consigneeCountry: body.consigneeCountry || "ES",
        carrierName: body.carrierName,
        carrierVat: body.carrierVat || "N/A",
        tractorPlate: body.tractorPlate,
        trailerPlate: body.trailerPlate || "N/A",
        driverName: body.driverName,
        driverLicense: body.driverLicense || "N/A",
        driverPhone: body.driverPhone,
        originCity: body.originCity,
        destinationCity: body.destinationCity,
        totalDistanceKm: Number(body.totalDistanceKm),
        pickupDate: body.pickupDate ? new Date(body.pickupDate) : new Date(),
        deliveryDate: body.deliveryDate
          ? new Date(body.deliveryDate)
          : undefined,
        totalPallets: Number(body.totalPallets),
        totalGrossWeightKg: Number(body.totalGrossWeightKg),
        goodsDescription: body.goodsDescription,
        specialInstructions: body.specialInstructions,
        cargoItems: body.cargoItems,
      });

      return reply.code(201).send(result);
    } catch (err: any) {
      request.log.error(err);
      return reply
        .code(400)
        .send({ error: err.message || "Failed to create consignment" });
    }
  });

  /**
   * GET /api/road-freight/consignments/:id/cmr-pdf - Download Geneva 24-box e-CMR PDF
   */
  fastify.get("/consignments/:id/cmr-pdf", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const c = await RoadWaybillService.getConsignmentById(id);
      if (!c) {
        return reply.code(404).send({ error: "Consignment not found" });
      }

      const pdfBuffer = await PDFService.generateEcmrWaybill({
        consignmentNumber: c.consignmentNumber,
        senderName: c.senderName,
        senderAddress: c.senderAddress,
        senderCountry: c.senderCountry,
        consigneeName: c.consigneeName,
        consigneeAddress: c.consigneeAddress,
        consigneeCountry: c.consigneeCountry,
        carrierName: c.carrierName,
        carrierVat: c.carrierVat,
        tractorPlate: c.tractorPlate,
        trailerPlate: c.trailerPlate,
        driverName: c.driverName,
        originCity: c.originCity,
        destinationCity: c.destinationCity,
        pickupDate: c.pickupDate,
        deliveryDate: c.deliveryDate || undefined,
        totalPallets: c.totalPallets,
        totalGrossWeightKg: c.totalGrossWeightKg,
        isAdrHazardous: c.isAdrHazardous,
        adrTotalPoints: c.adrTotalPoints,
        orangePlatesRequired: c.orangePlatesRequired,
        tunnelRestrictionCode: c.tunnelRestrictionCode,
        goodsDescription: c.goodsDescription,
        specialInstructions: c.specialInstructions,
      });

      reply.header("Content-Type", "application/pdf");
      reply.header(
        "Content-Disposition",
        `attachment; filename="e-CMR-${c.consignmentNumber}.pdf"`,
      );
      return reply.send(pdfBuffer);
    } catch (err: any) {
      request.log.error(err);
      return reply.code(500).send({ error: "Failed to generate e-CMR PDF" });
    }
  });

  /**
   * GET /api/road-freight/consignments/:id/carta-porte-pdf - Download Spanish Carta de Porte PDF
   */
  fastify.get("/consignments/:id/carta-porte-pdf", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const c = await RoadWaybillService.getConsignmentById(id);
      if (!c) {
        return reply.code(404).send({ error: "Consignment not found" });
      }

      const pdfBuffer = await PDFService.generateCartaDePorte({
        consignmentNumber: c.consignmentNumber,
        senderName: c.senderName,
        senderAddress: c.senderAddress,
        consigneeName: c.consigneeName,
        consigneeAddress: c.consigneeAddress,
        carrierName: c.carrierName,
        carrierVat: c.carrierVat,
        tractorPlate: c.tractorPlate,
        trailerPlate: c.trailerPlate,
        driverName: c.driverName,
        driverLicense: c.driverLicense,
        originCity: c.originCity,
        destinationCity: c.destinationCity,
        pickupDate: c.pickupDate,
        deliveryDate: c.deliveryDate || undefined,
        totalPallets: c.totalPallets,
        totalGrossWeightKg: c.totalGrossWeightKg,
        goodsDescription: c.goodsDescription,
        specialInstructions: c.specialInstructions,
      });

      reply.header("Content-Type", "application/pdf");
      reply.header(
        "Content-Disposition",
        `attachment; filename="CartaPorte-${c.consignmentNumber}.pdf"`,
      );
      return reply.send(pdfBuffer);
    } catch (err: any) {
      request.log.error(err);
      return reply
        .code(500)
        .send({ error: "Failed to generate Carta de Porte PDF" });
    }
  });
};
