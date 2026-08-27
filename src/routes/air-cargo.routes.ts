import { FastifyPluginAsync } from "fastify";
import { db } from "../db/index.js";
import { iataAirports, dgrRegistry } from "../db/schema/air_cargo.js";
import { like, or } from "drizzle-orm";
import { AirwayBillService } from "../services/air-cargo/airwaybill.service.js";
import { AirCargoRatingService } from "../services/air-cargo/rating.service.js";
import { AirCargoComplianceService } from "../services/air-cargo/compliance.service.js";
import { AirwayBillXmlService } from "../services/air-cargo/airwaybill-xml.service.js";
import { PDFService } from "../services/pdf.service.js";

const airCargoRoutes: FastifyPluginAsync = async (fastify, _opts) => {
  // 1. List Airway Bills (with consolidation hierarchy)
  fastify.get("/air-cargo/awb", async (request, reply) => {
    try {
      const query = request.query as any;
      const awbs = await AirwayBillService.listAirwayBills({
        type: query.type,
        status: query.status,
        airport: query.airport,
        search: query.search || query.q,
      });

      return reply.send(awbs);
    } catch (err: any) {
      request.log.error(err);
      return reply
        .code(500)
        .send({ error: err.message || "Failed to list Airway Bills" });
    }
  });

  // 2. Get Single Airway Bill by ID
  fastify.get("/air-cargo/awb/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const awb = await AirwayBillService.getAirwayBillById(id);

      if (!awb) {
        return reply.code(404).send({ error: "Airway Bill not found" });
      }

      return reply.send(awb);
    } catch (err: any) {
      request.log.error(err);
      return reply
        .code(500)
        .send({ error: err.message || "Failed to retrieve Airway Bill" });
    }
  });

  // 3. Compute Volumetric Weight & Air Cargo Rating
  fastify.post("/air-cargo/calculate-rating", async (request, reply) => {
    try {
      const body = request.body as any;

      if (
        !body.pieces ||
        !Array.isArray(body.pieces) ||
        body.pieces.length === 0
      ) {
        return reply
          .code(400)
          .send({ error: "Pieces array with dimensions is required" });
      }

      const rating = AirCargoRatingService.calculateRating({
        originAirport: body.originAirport || "MAD",
        destinationAirport: body.destinationAirport || "JFK",
        pieces: body.pieces,
        actualGrossWeightKg: Number(body.actualGrossWeightKg || 0),
        customRatePerKg: body.customRatePerKg
          ? Number(body.customRatePerKg)
          : undefined,
        currency: body.currency || "EUR",
        fuelRatePerKg: body.fuelRatePerKg
          ? Number(body.fuelRatePerKg)
          : undefined,
        securityRatePerKg: body.securityRatePerKg
          ? Number(body.securityRatePerKg)
          : undefined,
        awbDocFee: body.awbDocFee ? Number(body.awbDocFee) : undefined,
        terminalHandlingRatePerKg: body.terminalHandlingRatePerKg
          ? Number(body.terminalHandlingRatePerKg)
          : undefined,
      });

      return reply.send(rating);
    } catch (err: any) {
      request.log.error(err);
      return reply
        .code(500)
        .send({ error: err.message || "Failed to compute air rating" });
    }
  });

  // 4. Screen DGR & Special Handling Codes
  fastify.post("/air-cargo/screen-dgr", async (request, reply) => {
    try {
      const body = request.body as any;
      if (!body.natureOfGoods && !body.unNumber) {
        return reply
          .code(400)
          .send({ error: "Nature of goods or UN number is required" });
      }

      const result = await AirCargoComplianceService.screenCompliance({
        natureOfGoods: body.natureOfGoods,
        unNumber: body.unNumber,
        grossWeightKg: Number(body.grossWeightKg || 0),
        declaredValuePerKg: body.declaredValuePerKg
          ? Number(body.declaredValuePerKg)
          : undefined,
        isTempControlled: body.isTempControlled,
        tempRange: body.tempRange,
        isLithiumBattery: body.isLithiumBattery,
        batteryType: body.batteryType,
        batteryConfig: body.batteryConfig,
        batterySection: body.batterySection,
        hasDryIce: body.hasDryIce,
        dryIceNetWeightKg: body.dryIceNetWeightKg
          ? Number(body.dryIceNetWeightKg)
          : undefined,
      });

      return reply.send(result);
    } catch (err: any) {
      request.log.error(err);
      return reply
        .code(500)
        .send({ error: err.message || "Failed to screen DGR compliance" });
    }
  });

  // 5. Create Airway Bill
  fastify.post("/air-cargo/awb", async (request, reply) => {
    try {
      const body = request.body as any;

      if (
        !body.awbNumber ||
        !body.originAirport ||
        !body.destinationAirport ||
        !body.shipperData ||
        !body.consigneeData
      ) {
        return reply.code(400).send({
          error:
            "awbNumber, originAirport, destinationAirport, shipperData, and consigneeData are required",
        });
      }

      const newAwb = await AirwayBillService.createAirwayBill(body);
      return reply.code(201).send(newAwb);
    } catch (err: any) {
      request.log.error(err);
      return reply
        .code(400)
        .send({ error: err.message || "Failed to create Airway Bill" });
    }
  });

  // 6. Stream Official IATA Standard Printable PDF
  fastify.get("/air-cargo/awb/:id/pdf", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const awb = await AirwayBillService.getAirwayBillById(id);

      if (!awb) {
        return reply.code(404).send({ error: "Airway Bill not found" });
      }

      const pdfBuffer = await PDFService.generateAirWaybill(awb as any);

      reply.header("Content-Type", "application/pdf");
      reply.header(
        "Content-Disposition",
        `inline; filename="IATA_AWB_${awb.awbNumber.replace(/[\s-]/g, "_")}.pdf"`,
      );
      return reply.send(pdfBuffer);
    } catch (err: any) {
      request.log.error(err);
      return reply
        .code(500)
        .send({ error: err.message || "Failed to generate AWB PDF" });
    }
  });

  // 7. Stream IATA Cargo-XML (XFWB / XFHL)
  fastify.get("/air-cargo/awb/:id/cargo-xml", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const awb = await AirwayBillService.getAirwayBillById(id);

      if (!awb) {
        return reply.code(404).send({ error: "Airway Bill not found" });
      }

      const xmlContent = AirwayBillXmlService.generateCargoXml(awb as any);

      reply.header("Content-Type", "application/xml; charset=utf-8");
      reply.header(
        "Content-Disposition",
        `attachment; filename="IATA_${awb.type === "HAWB" ? "XFHL" : "XFWB"}_${awb.awbNumber.replace(/[\s-]/g, "_")}.xml"`,
      );
      return reply.send(xmlContent);
    } catch (err: any) {
      request.log.error(err);
      return reply
        .code(500)
        .send({ error: err.message || "Failed to generate Cargo-XML" });
    }
  });

  // 8. Stream IATA Cargo-IMP (FWB / FHL)
  fastify.get("/air-cargo/awb/:id/cargo-imp", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const awb = await AirwayBillService.getAirwayBillById(id);

      if (!awb) {
        return reply.code(404).send({ error: "Airway Bill not found" });
      }

      const impContent = AirwayBillXmlService.generateCargoImp(awb as any);

      reply.header("Content-Type", "text/plain; charset=utf-8");
      reply.header(
        "Content-Disposition",
        `attachment; filename="IATA_${awb.type === "HAWB" ? "FHL" : "FWB"}_${awb.awbNumber.replace(/[\s-]/g, "_")}.txt"`,
      );
      return reply.send(impContent);
    } catch (err: any) {
      request.log.error(err);
      return reply
        .code(500)
        .send({ error: err.message || "Failed to generate Cargo-IMP" });
    }
  });

  // 9. IATA Airport Catalog
  fastify.get("/air-cargo/airports", async (request, reply) => {
    try {
      const query = request.query as any;
      const q = query.q || query.search;

      if (q) {
        const results = await db
          .select()
          .from(iataAirports)
          .where(
            or(
              like(iataAirports.code, `%${q.toUpperCase()}%`),
              like(iataAirports.name, `%${q}%`),
              like(iataAirports.city, `%${q}%`),
            ),
          );
        return reply.send(results);
      }

      const airports = await db.select().from(iataAirports);
      return reply.send(airports);
    } catch (err: any) {
      request.log.error(err);
      return reply
        .code(500)
        .send({ error: err.message || "Failed to list IATA airports" });
    }
  });

  // 10. DGR Registry Search
  fastify.get("/air-cargo/dgr-registry", async (request, reply) => {
    try {
      const query = request.query as any;
      const q = query.q || query.search;

      if (q) {
        const results = await db
          .select()
          .from(dgrRegistry)
          .where(
            or(
              like(dgrRegistry.unNumber, `%${q.toUpperCase()}%`),
              like(dgrRegistry.properShippingName, `%${q.toUpperCase()}%`),
            ),
          );
        return reply.send(results);
      }

      const dgrItems = await db.select().from(dgrRegistry);
      return reply.send(dgrItems);
    } catch (err: any) {
      request.log.error(err);
      return reply
        .code(500)
        .send({ error: err.message || "Failed to list DGR registry" });
    }
  });
};

export default airCargoRoutes;
