import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { eq, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import * as schema from "../db/schema/index.js";
import { DgCatalogSegregationService } from "../services/dangerous-goods/dg-catalog-segregation.service.js";
import { DgPackagingExemptionService } from "../services/dangerous-goods/dg-packaging-exemption.service.js";
import { DgEmergencyResponseService } from "../services/dangerous-goods/dg-emergency-response.service.js";
import { DgTransportDocumentService } from "../services/dangerous-goods/dg-transport-document.service.js";
import { PDFService } from "../services/pdf.service.js";
import crypto from "crypto";

export const dangerousGoodsRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  // 1. List Dangerous Goods Shipments
  fastify.get("/shipments", async (request, reply) => {
    try {
      const shipments = await db
        .select()
        .from(schema.dgShipments)
        .orderBy(desc(schema.dgShipments.createdAt));
      return reply.send({ success: true, data: shipments });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 2. Get Shipment Details with Items, Segregation Audit, Emergency Card & Packing Cert
  fastify.get("/shipments/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const [shipment] = await db
        .select()
        .from(schema.dgShipments)
        .where(eq(schema.dgShipments.id, id));

      if (!shipment) {
        return reply
          .status(404)
          .send({
            success: false,
            error: "Dangerous Goods Shipment not found",
          });
      }

      const items = await db
        .select()
        .from(schema.dgConsignmentItems)
        .where(eq(schema.dgConsignmentItems.dgShipmentId, id));

      const segregationAudits = await db
        .select()
        .from(schema.dgSegregationAudits)
        .where(eq(schema.dgSegregationAudits.dgShipmentId, id));

      const emergencyCards = await db
        .select()
        .from(schema.dgEmergencyCards)
        .where(eq(schema.dgEmergencyCards.dgShipmentId, id));

      const packingCertificates = await db
        .select()
        .from(schema.dgPackingCertificates)
        .where(eq(schema.dgPackingCertificates.dgShipmentId, id));

      return reply.send({
        success: true,
        data: {
          ...shipment,
          items,
          segregationAudits,
          emergencyCards,
          packingCertificates,
        },
      });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 3. Create Dangerous Goods Shipment
  fastify.post("/shipments", async (request, reply) => {
    try {
      const body = request.body as any;
      const shipId = `dg_ship_${crypto.randomUUID().slice(0, 8)}`;
      const ref =
        body.shipmentReference ||
        `DGD-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;

      await db.insert(schema.dgShipments).values({
        id: shipId,
        shipmentReference: ref,
        transportMode: body.transportMode || "MARITIME_OCEAN",
        carrierName: body.carrierName || "Ocean Carrier",
        vesselOrFlightOrVehiclePlate:
          body.vesselOrFlightOrVehiclePlate || "MV Valencia Bridge",
        voyageOrFlightNumber: body.voyageOrFlightNumber || "V.2608W",
        originPortOrLocation:
          body.originPortOrLocation || "Puerto de Valencia (ESVLC)",
        destinationPortOrLocation:
          body.destinationPortOrLocation || "Puerto de Singapur (SGSIN)",
        shipperName: body.shipperName || "Iberica Chemical Solutions SL",
        shipperAddress: body.shipperAddress || "Valencia, Spain",
        consigneeName: body.consigneeName || "Asia Pacific Polymers Ltd",
        consigneeAddress: body.consigneeAddress || "Singapore",
        emergencyContactName: body.emergencyContactName || "CHEMTREC",
        emergencyContactPhone: body.emergencyContactPhone || "+34 91 562 04 20",
        aircraftType: body.aircraftType || "NOT_APPLICABLE",
        totalPackages: body.totalPackages || 1,
        totalNetQuantityKg: body.totalNetQuantityKg || 100,
        totalGrossMassKg: body.totalGrossMassKg || 120,
        hasRadioactiveMaterials: Boolean(body.hasRadioactiveMaterials),
        hasMarinePollutants: Boolean(body.hasMarinePollutants),
        hasLithiumBatteries: Boolean(body.hasLithiumBatteries),
        segregationStatus: body.segregationStatus || "PENDING_AUDIT",
        status: body.status || "DRAFT",
        declarationRemarks: body.declarationRemarks || null,
      });

      const [newShipment] = await db
        .select()
        .from(schema.dgShipments)
        .where(eq(schema.dgShipments.id, shipId));

      return reply.status(201).send({ success: true, data: newShipment });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 4. Add Dangerous Goods Item to Shipment
  fastify.post("/shipments/:id/items", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = request.body as any;
      const itemId = `dg_item_${crypto.randomUUID().slice(0, 8)}`;

      const substance = DgCatalogSegregationService.getSubstance(
        body.unNumber || "UN 1203",
      );
      const unNumber = body.unNumber || substance.unNumber;
      const properShippingName =
        body.properShippingName || substance.properShippingName;
      const primaryHazardClass =
        body.primaryHazardClass || substance.primaryClass;
      const packingGroup = body.packingGroup || substance.packingGroup;
      const flashPointCelsius =
        body.flashPointCelsius !== undefined
          ? body.flashPointCelsius
          : substance.flashPointCelsius;
      const isMarinePollutant =
        body.isMarinePollutant !== undefined
          ? Boolean(body.isMarinePollutant)
          : substance.isMarinePollutant;

      const packageCount = body.packageCount || 1;
      const netQtyPerPkg = body.netQuantityPerPackage || 100;
      const totalNet = packageCount * netQtyPerPkg;
      const totalGross = body.totalGrossMassKg || totalNet * 1.15;

      const adrCategory =
        body.adrTransportCategory ?? substance.adrTransportCategory;
      const adrPoints = DgPackagingExemptionService.calculateAdrPoints([
        {
          unNumber,
          transportCategory: adrCategory,
          netQuantityKgOrL: totalNet,
        },
      ]).totalPoints;

      await db.insert(schema.dgConsignmentItems).values({
        id: itemId,
        dgShipmentId: id,
        unNumber,
        properShippingName,
        technicalChemicalName:
          body.technicalChemicalName || substance.technicalNameDefault || null,
        primaryHazardClass,
        subsidiaryHazardClasses: body.subsidiaryHazardClasses || null,
        packingGroup,
        flashPointCelsius: flashPointCelsius ?? null,
        isMarinePollutant,
        packageCount,
        packageTypeDescription:
          body.packageTypeDescription || "Tambores de acero (1A1)",
        packageUnCode: body.packageUnCode || "1A1",
        netQuantityPerPackage: netQtyPerPkg,
        unitOfMeasure: body.unitOfMeasure || "LITERS",
        totalNetQuantity: totalNet,
        totalGrossMassKg: totalGross,
        netExplosiveMassKg: body.netExplosiveMassKg || 0,
        isLimitedQuantityLq: Boolean(body.isLimitedQuantityLq),
        exceptedQuantityCode: body.exceptedQuantityCode || substance.eqCode,
        adrTransportCategory: adrCategory,
        adrPointsCalculated: adrPoints,
        adrTunnelRestrictionCode:
          body.adrTunnelRestrictionCode || substance.adrTunnelCode,
        kemlerHazardIdNumber:
          body.kemlerHazardIdNumber || substance.kemlerNumber,
        emsFireCode: body.emsFireCode || substance.emsFire,
        emsSpillageCode: body.emsSpillageCode || substance.emsSpillage,
        iataPackingInstruction:
          body.iataPackingInstruction ||
          substance.iataPackingInstructionCargo ||
          null,
        lithiumBatterySection: body.lithiumBatterySection || "NOT_APPLICABLE",
        lithiumStateOfChargePercentage:
          body.lithiumStateOfChargePercentage ?? null,
      });

      const [newItem] = await db
        .select()
        .from(schema.dgConsignmentItems)
        .where(eq(schema.dgConsignmentItems.id, itemId));

      return reply.status(201).send({ success: true, data: newItem });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 5. Validate Container Chemical Segregation (IMDG 7.2.4)
  fastify.post("/validate-segregation", async (request, reply) => {
    try {
      const body = request.body as any;
      const result = DgCatalogSegregationService.auditContainerSegregation({
        containerOrVehicleNumber:
          body.containerOrVehicleNumber || "CONTAINER-001",
        items: body.items || [],
      });
      return reply.send({ success: true, auditResult: result });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 6. Calculate ADR 1.1.3.6 Points
  fastify.post("/calculate-adr-points", async (request, reply) => {
    try {
      const body = request.body as any;
      const result = DgPackagingExemptionService.calculateAdrPoints(
        body.items || [],
      );
      return reply.send({ success: true, adrCalculation: result });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 7. Classify Lithium Battery (IATA DGR)
  fastify.post("/classify-lithium-battery", async (request, reply) => {
    try {
      const body = request.body as any;
      const result = DgPackagingExemptionService.classifyLithiumBattery(body);
      return reply.send({ success: true, batteryClassification: result });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 8. PDF: Multimodal Dangerous Goods Declaration Form (IMO DGD / ADR)
  fastify.get("/shipments/:id/dgd-pdf", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const [shipment] = await db
        .select()
        .from(schema.dgShipments)
        .where(eq(schema.dgShipments.id, id));

      if (!shipment) {
        return reply
          .status(404)
          .send({ success: false, error: "Shipment not found" });
      }

      const items = await db
        .select()
        .from(schema.dgConsignmentItems)
        .where(eq(schema.dgConsignmentItems.dgShipmentId, id));

      const pdfBuffer =
        await PDFService.generateMultimodalDangerousGoodsDeclarationPdf(
          shipment,
          items,
        );
      reply.header("Content-Type", "application/pdf");
      reply.header(
        "Content-Disposition",
        `attachment; filename="IMO_DGD_${shipment.shipmentReference}.pdf"`,
      );
      return reply.send(pdfBuffer);
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 9. PDF: IATA Shipper's Declaration for Dangerous Goods (Air Cargo DGR)
  fastify.get("/shipments/:id/iata-dgd-pdf", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const [shipment] = await db
        .select()
        .from(schema.dgShipments)
        .where(eq(schema.dgShipments.id, id));

      if (!shipment) {
        return reply
          .status(404)
          .send({ success: false, error: "Shipment not found" });
      }

      const items = await db
        .select()
        .from(schema.dgConsignmentItems)
        .where(eq(schema.dgConsignmentItems.dgShipmentId, id));

      const pdfBuffer = await PDFService.generateIataShippersDeclarationPdf(
        shipment,
        items,
      );
      reply.header("Content-Type", "application/pdf");
      reply.header(
        "Content-Disposition",
        `attachment; filename="IATA_DGD_${shipment.shipmentReference}.pdf"`,
      );
      return reply.send(pdfBuffer);
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 10. PDF: Dangerous Goods Emergency Response Card (EmS)
  fastify.get("/shipments/:id/emergency-card-pdf", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const [shipment] = await db
        .select()
        .from(schema.dgShipments)
        .where(eq(schema.dgShipments.id, id));

      if (!shipment) {
        return reply
          .status(404)
          .send({ success: false, error: "Shipment not found" });
      }

      const [card] = await db
        .select()
        .from(schema.dgEmergencyCards)
        .where(eq(schema.dgEmergencyCards.dgShipmentId, id));

      const items = await db
        .select()
        .from(schema.dgConsignmentItems)
        .where(eq(schema.dgConsignmentItems.dgShipmentId, id));

      const pdfBuffer = await PDFService.generateDangerousGoodsEmergencyCardPdf(
        card || {
          cardReference: `EMC-${shipment.shipmentReference}`,
          unNumbersSummary: items.map((i) => i.unNumber).join(", "),
          emergencyPhone24h: shipment.emergencyContactPhone,
        },
        shipment,
        items,
      );

      reply.header("Content-Type", "application/pdf");
      reply.header(
        "Content-Disposition",
        `attachment; filename="Emergency_Card_${shipment.shipmentReference}.pdf"`,
      );
      return reply.send(pdfBuffer);
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 11. PDF: Container / Vehicle Packing Certificate (IMDG 5.4.2)
  fastify.get("/shipments/:id/packing-cert-pdf", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const [shipment] = await db
        .select()
        .from(schema.dgShipments)
        .where(eq(schema.dgShipments.id, id));

      if (!shipment) {
        return reply
          .status(404)
          .send({ success: false, error: "Shipment not found" });
      }

      const [cert] = await db
        .select()
        .from(schema.dgPackingCertificates)
        .where(eq(schema.dgPackingCertificates.dgShipmentId, id));

      const pdfBuffer = await PDFService.generateContainerPackingCertificatePdf(
        cert || {
          certificateReference: `CPC-${shipment.shipmentReference}`,
          containerOrVehicleNumber: shipment.vesselOrFlightOrVehiclePlate,
          sealNumberIso17712: "ES-VAL-H-992104",
          declarantName: "Javier Navarro",
        },
        shipment,
      );

      reply.header("Content-Type", "application/pdf");
      reply.header(
        "Content-Disposition",
        `attachment; filename="Packing_Cert_${shipment.shipmentReference}.pdf"`,
      );
      return reply.send(pdfBuffer);
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: err.message });
    }
  });
};
