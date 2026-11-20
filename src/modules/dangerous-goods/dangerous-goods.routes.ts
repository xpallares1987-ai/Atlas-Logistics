/**
 * @file dangerous-goods.routes.ts
 * @description Fastify routes for Multimodal Dangerous Goods (IMDG / ADR / IATA DGR) shipments, UN chemical segregation matrices, ADR 1.1.3.6 points calculation, lithium battery classification, and DGD/EmS/Packing Certificate PDFs.
 * @module @atlas/api/modules/dangerous-goods/routes
 */

import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { eq, desc } from "drizzle-orm";
import { db } from "../../db/index.js";
import * as schema from "../../db/schema/index.js";
import { DgCatalogSegregationService } from "./dg-catalog-segregation.service.js";
import { DgPackagingExemptionService } from "./dg-packaging-exemption.service.js";
import { PDFService } from "../../services/pdf.service.js";
import crypto from "crypto";
import {
  OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
  OPENAPI_ID_PARAMS_SCHEMA,
  buildErrorResponses,
  getErrorMessage,
} from "../../routes/openapi.schemas.js";

// ============================================================================
// 1. DOMAIN PAYLOAD INTERFACES
// ============================================================================

type DgShipmentInsert = typeof schema.dgShipments.$inferInsert;
type DgItemInsert = typeof schema.dgConsignmentItems.$inferInsert;
type AuditSegregationInput = Parameters<
  typeof DgCatalogSegregationService.auditContainerSegregation
>[0];
type CalculateAdrPointsInput = Parameters<
  typeof DgPackagingExemptionService.calculateAdrPoints
>[0];
type ClassifyLithiumBatteryInput = Parameters<
  typeof DgPackagingExemptionService.classifyLithiumBattery
>[0];

type CreateDgShipmentBody = Partial<DgShipmentInsert>;
type CreateDgItemBody = Partial<DgItemInsert>;
type ValidateSegregationBody = Partial<AuditSegregationInput>;
interface CalculateAdrPointsBody {
  items?: CalculateAdrPointsInput;
}

// ============================================================================
// 2. FASTIFY ROUTE PLUGIN REGISTRATION
// ============================================================================

export const dangerousGoodsRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  // 1. List Dangerous Goods Shipments
  fastify.get(
    "/shipments",
    {
      schema: {
        tags: ["Dangerous Goods (IMDG/ADR/DGR)"],
        summary:
          "List all Multimodal Dangerous Goods declarations and shipments",
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const shipments = await db
          .select()
          .from(schema.dgShipments)
          .orderBy(desc(schema.dgShipments.createdAt));
        return reply.send({ success: true, data: shipments });
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .status(500)
          .send({ success: false, error: getErrorMessage(err) });
      }
    },
  );

  // 2. Get Shipment Details with Items, Segregation Audit, Emergency Card & Packing Cert
  fastify.get(
    "/shipments/:id",
    {
      schema: {
        tags: ["Dangerous Goods (IMDG/ADR/DGR)"],
        summary:
          "Retrieve Dangerous Goods shipment detail with items, segregation audits, EmS cards, and packing certificates",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const [shipment] = await db
          .select()
          .from(schema.dgShipments)
          .where(eq(schema.dgShipments.id, id));

        if (!shipment) {
          return reply.status(404).send({
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
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .status(500)
          .send({ success: false, error: getErrorMessage(err) });
      }
    },
  );

  // 3. Create Dangerous Goods Shipment
  fastify.post(
    "/shipments",
    {
      schema: {
        tags: ["Dangerous Goods (IMDG/ADR/DGR)"],
        summary: "Create a new Multimodal Dangerous Goods shipment declaration",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const body = (request.body as CreateDgShipmentBody | undefined) || {};
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
          emergencyContactPhone:
            body.emergencyContactPhone || "+34 91 562 04 20",
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
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .status(500)
          .send({ success: false, error: getErrorMessage(err) });
      }
    },
  );

  // 4. Add Dangerous Goods Item to Shipment
  fastify.post(
    "/shipments/:id/items",
    {
      schema: {
        tags: ["Dangerous Goods (IMDG/ADR/DGR)"],
        summary:
          "Add a UN hazardous consignment item to a Dangerous Goods shipment",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = (request.body as CreateDgItemBody | undefined) || {};
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

        const adrCategory = (body.adrTransportCategory ??
          substance.adrTransportCategory) as CalculateAdrPointsInput[number]["transportCategory"];
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
            body.technicalChemicalName ||
            substance.technicalNameDefault ||
            null,
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
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .status(500)
          .send({ success: false, error: getErrorMessage(err) });
      }
    },
  );

  // 5. Validate Container Chemical Segregation (IMDG 7.2.4)
  fastify.post(
    "/validate-segregation",
    {
      schema: {
        tags: ["Dangerous Goods (IMDG/ADR/DGR)"],
        summary:
          "Validate IMDG 7.2.4 chemical segregation compatibility inside a container",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const body =
          (request.body as ValidateSegregationBody | undefined) || {};
        const result = DgCatalogSegregationService.auditContainerSegregation({
          containerOrVehicleNumber:
            body.containerOrVehicleNumber || "CONTAINER-001",
          items: body.items || [],
        });
        return reply.send({ success: true, auditResult: result });
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .status(500)
          .send({ success: false, error: getErrorMessage(err) });
      }
    },
  );

  // 6. Calculate ADR 1.1.3.6 Points
  fastify.post(
    "/calculate-adr-points",
    {
      schema: {
        tags: ["Dangerous Goods (IMDG/ADR/DGR)"],
        summary: "Calculate ADR 1.1.3.6 1,000-point threshold exemption",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const body = (request.body as CalculateAdrPointsBody | undefined) || {};
        const result = DgPackagingExemptionService.calculateAdrPoints(
          body.items || [],
        );
        return reply.send({ success: true, adrCalculation: result });
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .status(500)
          .send({ success: false, error: getErrorMessage(err) });
      }
    },
  );

  // 7. Classify Lithium Battery (IATA DGR)
  fastify.post(
    "/classify-lithium-battery",
    {
      schema: {
        tags: ["Dangerous Goods (IMDG/ADR/DGR)"],
        summary:
          "Classify Lithium-Ion/Metal battery consignment under IATA DGR Packing Instructions",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const body = request.body as ClassifyLithiumBatteryInput;
        const result = DgPackagingExemptionService.classifyLithiumBattery(body);
        return reply.send({ success: true, batteryClassification: result });
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .status(500)
          .send({ success: false, error: getErrorMessage(err) });
      }
    },
  );

  // 8. PDF: Multimodal Dangerous Goods Declaration Form (IMO DGD / ADR)
  fastify.get(
    "/shipments/:id/dgd-pdf",
    {
      schema: {
        tags: ["Dangerous Goods (IMDG/ADR/DGR)"],
        summary:
          "Download Multimodal Dangerous Goods Declaration (IMO DGD) PDF",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
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
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .status(500)
          .send({ success: false, error: getErrorMessage(err) });
      }
    },
  );

  // 9. PDF: IATA Shipper's Declaration for Dangerous Goods (Air Cargo DGR)
  fastify.get(
    "/shipments/:id/iata-dgd-pdf",
    {
      schema: {
        tags: ["Dangerous Goods (IMDG/ADR/DGR)"],
        summary:
          "Download IATA Shipper's Declaration for Dangerous Goods (DGR) PDF",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
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
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .status(500)
          .send({ success: false, error: getErrorMessage(err) });
      }
    },
  );

  // 10. PDF: Dangerous Goods Emergency Response Card (EmS)
  fastify.get(
    "/shipments/:id/emergency-card-pdf",
    {
      schema: {
        tags: ["Dangerous Goods (IMDG/ADR/DGR)"],
        summary:
          "Download Dangerous Goods Emergency Response Card (EmS / ADR Tremcard) PDF",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
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

        const pdfBuffer =
          await PDFService.generateDangerousGoodsEmergencyCardPdf(
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
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .status(500)
          .send({ success: false, error: getErrorMessage(err) });
      }
    },
  );

  // 11. PDF: Container / Vehicle Packing Certificate (IMDG 5.4.2)
  fastify.get(
    "/shipments/:id/packing-cert-pdf",
    {
      schema: {
        tags: ["Dangerous Goods (IMDG/ADR/DGR)"],
        summary:
          "Download Container/Vehicle Packing Certificate (IMDG Code 5.4.2) PDF",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
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

        const pdfBuffer =
          await PDFService.generateContainerPackingCertificatePdf(
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
      } catch (err: unknown) {
        request.log.error(err);
        return reply
          .status(500)
          .send({ success: false, error: getErrorMessage(err) });
      }
    },
  );
};
