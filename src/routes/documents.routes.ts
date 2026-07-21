import { FastifyPluginAsync } from "fastify";
import { PDFService, HBLData } from "../services/pdf.service.js";

const documentsRoutes: FastifyPluginAsync = async (fastify, opts) => {
  fastify.post("/hbl", async (request, reply) => {
    try {
      const data: HBLData = request.body as HBLData;

      if (!data.shipmentId || !data.shipper || !data.consignee) {
        reply.code(400).send({ error: "Missing required HBL fields" });
        return;
      }

      const pdfBuffer = await PDFService.generateHBL(data);

      reply.header("Content-Type", "application/pdf");
      reply.header("Content-Disposition", `attachment; filename=HBL-${data.shipmentId}.pdf`);
      reply.send(pdfBuffer);
    } catch (error: any) {
      fastify.log.error("PDF Generation Error:", error);
      reply.code(500).send({ error: "Failed to generate PDF" });
    }
  });
};

export default documentsRoutes;
