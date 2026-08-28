import { FastifyPluginAsync } from "fastify";
import { db } from "../db/index.js";
import {
  cbamGoodsCatalog,
  cbamInstallations,
  cbamDeclarations,
  cbamDeclarationLines,
} from "../db/schema/index.js";
import { eq, desc } from "drizzle-orm";
import {
  CbamCalculatorService,
  CbamEmissionInput,
} from "../services/cbam/cbam-calculator.service.js";
import {
  CbamFinancialService,
  CbamLiabilityInput,
} from "../services/cbam/cbam-financial.service.js";
import { CbamXmlService } from "../services/cbam/cbam-xml.service.js";
import { PDFService } from "../services/pdf.service.js";

export const cbamRoutes: FastifyPluginAsync = async (fastify) => {
  // Authentication hook
  fastify.addHook("onRequest", async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply
        .status(401)
        .send({ error: "Unauthorized", message: "Invalid or missing token" });
    }
  });

  // GET /api/cbam/catalog
  fastify.get("/catalog", async (req, reply) => {
    try {
      const catalog = await db.select().from(cbamGoodsCatalog);
      return reply.send(catalog);
    } catch (err: any) {
      req.log.error(err);
      return reply
        .status(500)
        .send({ error: "Database error", message: err.message });
    }
  });

  // GET /api/cbam/installations
  fastify.get("/installations", async (req, reply) => {
    try {
      const installations = await db.select().from(cbamInstallations);
      return reply.send(installations);
    } catch (err: any) {
      req.log.error(err);
      return reply
        .status(500)
        .send({ error: "Database error", message: err.message });
    }
  });

  // GET /api/cbam/declarations
  fastify.get("/declarations", async (req, reply) => {
    const { period, status, q } = req.query as {
      period?: string;
      status?: string;
      q?: string;
    };

    try {
      const declarationsList = await db
        .select()
        .from(cbamDeclarations)
        .orderBy(desc(cbamDeclarations.createdAt));

      let filtered = declarationsList;
      if (period && period !== "ALL") {
        filtered = filtered.filter((d) => d.reportingPeriod === period);
      }
      if (status && status !== "ALL") {
        filtered = filtered.filter((d) => d.status === status);
      }
      if (q) {
        const query = q.toLowerCase();
        filtered = filtered.filter(
          (d) =>
            d.declarationNumber.toLowerCase().includes(query) ||
            d.importerName.toLowerCase().includes(query) ||
            d.importerVat.toLowerCase().includes(query) ||
            d.declarantName.toLowerCase().includes(query),
        );
      }

      return reply.send(filtered);
    } catch (err: any) {
      req.log.error(err);
      return reply
        .status(500)
        .send({ error: "Database error", message: err.message });
    }
  });

  // GET /api/cbam/declarations/:id
  fastify.get("/declarations/:id", async (req, reply) => {
    const { id } = req.params as { id: string };

    try {
      const declaration = await db
        .select()
        .from(cbamDeclarations)
        .where(eq(cbamDeclarations.id, id))
        .get();

      if (!declaration) {
        return reply.status(404).send({ error: "CBAM Declaration not found" });
      }

      const lines = await db
        .select()
        .from(cbamDeclarationLines)
        .where(eq(cbamDeclarationLines.declarationId, id));

      return reply.send({
        ...declaration,
        lines,
      });
    } catch (err: any) {
      req.log.error(err);
      return reply
        .status(500)
        .send({ error: "Database error", message: err.message });
    }
  });

  // POST /api/cbam/calculate-emissions
  fastify.post("/calculate-emissions", async (req, reply) => {
    const input = req.body as CbamEmissionInput;

    if (!input || input.netWeightTonnes === undefined) {
      return reply
        .status(400)
        .send({ error: "netWeightTonnes and factors are required" });
    }

    const result = CbamCalculatorService.calculateEmbeddedEmissions(input);
    return reply.send({
      success: true,
      result,
    });
  });

  // POST /api/cbam/calculate-liability
  fastify.post("/calculate-liability", async (req, reply) => {
    const input = req.body as CbamLiabilityInput;

    if (!input || input.totalEmbeddedEmissionsTco2e === undefined) {
      return reply
        .status(400)
        .send({ error: "totalEmbeddedEmissionsTco2e is required" });
    }

    const result = CbamFinancialService.calculateCarbonLiability(input);
    return reply.send({
      success: true,
      result,
    });
  });

  // POST /api/cbam/declarations/:id/status
  fastify.post("/declarations/:id/status", async (req, reply) => {
    const { id } = req.params as { id: string };
    const { status, remarks } = req.body as {
      status: "DRAFT" | "VALIDATED" | "SUBMITTED_REGISTRY" | "AMENDED";
      remarks?: string;
    };

    if (!status) {
      return reply.status(400).send({ error: "status is required" });
    }

    try {
      const declaration = await db
        .select()
        .from(cbamDeclarations)
        .where(eq(cbamDeclarations.id, id))
        .get();

      if (!declaration) {
        return reply.status(404).send({ error: "Declaration not found" });
      }

      await db
        .update(cbamDeclarations)
        .set({
          status,
          remarks: remarks || declaration.remarks,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(cbamDeclarations.id, id));

      return reply.send({
        success: true,
        message: `Declaration ${declaration.declarationNumber} updated to ${status}`,
      });
    } catch (err: any) {
      req.log.error(err);
      return reply
        .status(500)
        .send({ error: "Database error", message: err.message });
    }
  });

  // GET /api/cbam/declarations/:id/xml
  fastify.get("/declarations/:id/xml", async (req, reply) => {
    const { id } = req.params as { id: string };

    try {
      const declaration = await db
        .select()
        .from(cbamDeclarations)
        .where(eq(cbamDeclarations.id, id))
        .get();

      if (!declaration) {
        return reply.status(404).send({ error: "Declaration not found" });
      }

      const lines = await db
        .select()
        .from(cbamDeclarationLines)
        .where(eq(cbamDeclarationLines.declarationId, id));

      const xmlString = CbamXmlService.generateTransitionalRegistryXml(
        declaration,
        lines,
      );

      return reply
        .header("Content-Type", "application/xml")
        .header(
          "Content-Disposition",
          `attachment; filename="CBAM_Transitional_Report_${declaration.declarationNumber}.xml"`,
        )
        .send(xmlString);
    } catch (err: any) {
      req.log.error(err);
      return reply
        .status(500)
        .send({ error: "XML Generation Error", message: err.message });
    }
  });

  // GET /api/cbam/declarations/:id/pdf
  fastify.get("/declarations/:id/pdf", async (req, reply) => {
    const { id } = req.params as { id: string };

    try {
      const declaration = await db
        .select()
        .from(cbamDeclarations)
        .where(eq(cbamDeclarations.id, id))
        .get();

      if (!declaration) {
        return reply.status(404).send({ error: "Declaration not found" });
      }

      const lines = await db
        .select()
        .from(cbamDeclarationLines)
        .where(eq(cbamDeclarationLines.declarationId, id));

      const pdfBuffer = await PDFService.generateCbamDeclarationCertificate(
        declaration,
        lines,
      );

      return reply
        .header("Content-Type", "application/pdf")
        .header(
          "Content-Disposition",
          `inline; filename="CBAM_Declaration_${declaration.declarationNumber}.pdf"`,
        )
        .send(pdfBuffer);
    } catch (err: any) {
      req.log.error(err);
      return reply
        .status(500)
        .send({ error: "PDF Generation Error", message: err.message });
    }
  });
};
