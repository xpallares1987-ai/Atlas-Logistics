import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

const ediRoutes: FastifyPluginAsyncZod = async (server) => {
  server.post('/api/edi/generate', {
    schema: {
      description: 'Generate simulated EDIFACT message from document payload',
      tags: ['EDI'],
      security: [{ bearerAuth: [] }],
      body: z.object({
        documentId: z.string(),
        documentType: z.string(), // e.g., 'INVOICE', 'AWB', 'BL'
        payload: z.any()
      })
    },
    onRequest: [(server as any).authenticate]
  }, async (request, reply) => {
    const { documentId, documentType, payload } = request.body as any;

    // Simulate EDIFACT translation based on Document Type
    let ediMessageType = 'UNKNOWN';
    if (documentType === 'INVOICE' || documentType === 'AR' || documentType === 'AP') {
      ediMessageType = 'INVOIC';
    } else if (documentType === 'AWB' || documentType === 'BL') {
      ediMessageType = 'IFTMIN'; // Instruction message
    } else if (documentType === 'CUSTOMS') {
      ediMessageType = 'CUSDEC'; // Customs declaration
    }

    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    
    // Create a mock EDIFACT envelope structure
    const ediString = `UNB+UNOA:1+ATLAS+PARTNER+${timestamp}+${Math.floor(Math.random() * 10000)}'
UNH+1+${ediMessageType}:D:96A:UN'
BGM+380+${documentId}+9'
DTM+137:${timestamp}:204'
NAD+BY+BUYER_ID::9'
NAD+SU+SELLER_ID::9'
LIN+1++PRODUCT_SKU:SA'
UNT+7+1'
UNZ+1+${Math.floor(Math.random() * 10000)}'`;

    return reply.status(200).send({
      success: true,
      documentId,
      ediMessageType,
      content: ediString
    });
  });

  server.post('/api/edi/transmit', {
    schema: {
      description: 'Simulate transmitting an EDI message to an external party',
      tags: ['EDI'],
      security: [{ bearerAuth: [] }],
      body: z.object({
        ediMessage: z.string(),
        destinationEndpoint: z.string().optional()
      })
    },
    onRequest: [(server as any).authenticate]
  }, async (request, reply) => {
    const { ediMessage, destinationEndpoint = 'VAN_DEFAULT' } = request.body as any;

    // Simulate transmission delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Simulate random transmission success/failure logic (90% success)
    const isSuccess = Math.random() > 0.1;

    if (!isSuccess) {
      return reply.status(502).send({
        success: false,
        error: 'EDI Transmission Gateway Timeout. Connection dropped by VAN.'
      });
    }

    return reply.status(200).send({
      success: true,
      transmissionId: `TX-${Date.now()}`,
      status: 'ACKNOWLEDGED',
      destination: destinationEndpoint,
      timestamp: new Date().toISOString()
    });
  });
};

export default ediRoutes;
