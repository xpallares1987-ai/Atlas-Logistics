import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '../db/client.js';
import { documents } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import PDFDocument from 'pdfkit';

const documentRoutes: FastifyPluginAsyncZod = async (server) => {
  server.get('/api/documents', {
    schema: {
      description: 'Get all SCM documents',
      tags: ['Documents'],
      security: [{ bearerAuth: [] }],
      response: {
        200: z.object({
          data: z.array(z.object({
            id: z.string(),
            bookingRef: z.string(),
            type: z.string(),
            documentNumber: z.string(),
            issueDate: z.string(),
            status: z.string(),
            payload: z.any(),
            createdAt: z.string(),
            updatedAt: z.string()
          }))
        })
      }
    },
    onRequest: [(server as any).authenticate]
  }, async (_request) => {
    const docs = await db.select().from(documents);
    return {
      data: docs.map(d => ({
        id: d.id,
        bookingRef: d.booking_ref,
        type: d.type,
        documentNumber: d.document_number,
        issueDate: d.issue_date,
        status: d.status,
        payload: d.payload,
        createdAt: d.created_at.toISOString(),
        updatedAt: d.updated_at.toISOString()
      }))
    };
  });

  server.post('/api/documents', {
    schema: {
      description: 'Create a draft document',
      tags: ['Documents'],
      security: [{ bearerAuth: [] }],
      body: z.object({
        bookingRef: z.string(),
        type: z.string(),
        payload: z.any()
      })
    },
    onRequest: [(server as any).authenticate]
  }, async (request, reply) => {
    const body = request.body as any;
    const docId = `DOC-${Date.now()}`;
    const docNum = `${body.type}-${Math.floor(100000 + Math.random() * 900000)}`;

    const [newDoc] = await db.insert(documents).values({
      id: docId,
      booking_ref: body.bookingRef,
      type: body.type,
      document_number: docNum,
      issue_date: new Date().toISOString().split('T')[0],
      status: 'DRAFT',
      payload: body.payload
    }).returning();

    return reply.status(201).send({
      id: newDoc.id,
      bookingRef: newDoc.booking_ref,
      type: newDoc.type,
      documentNumber: newDoc.document_number,
      issueDate: newDoc.issue_date,
      status: newDoc.status,
      payload: newDoc.payload,
      createdAt: newDoc.created_at.toISOString(),
      updatedAt: newDoc.updated_at.toISOString()
    });
  });

  server.patch('/api/documents/:id/issue', {
    schema: {
      description: 'Issue document as final',
      tags: ['Documents'],
      security: [{ bearerAuth: [] }],
      params: z.object({ id: z.string() })
    },
    onRequest: [(server as any).authenticate]
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const [updated] = await db.update(documents)
      .set({ status: 'ISSUED', updated_at: new Date() })
      .where(eq(documents.id, id))
      .returning();

    if (!updated) {
      return reply.status(404).send({ error: 'Document not found' });
    }

    return {
      id: updated.id,
      bookingRef: updated.booking_ref,
      type: updated.type,
      documentNumber: updated.document_number,
      issueDate: updated.issue_date,
      status: updated.status,
      payload: updated.payload,
      createdAt: updated.created_at.toISOString(),
      updatedAt: updated.updated_at.toISOString()
    };
  });

  server.get('/api/documents/:id/pdf', {
    schema: {
      description: 'Generate PDF for a document',
      tags: ['Documents'],
      security: [{ bearerAuth: [] }],
      params: z.object({ id: z.string() })
    },
    onRequest: [(server as any).authenticate]
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const [doc] = await db.select().from(documents).where(eq(documents.id, id));

    if (!doc) {
      return reply.status(404).send({ error: 'Document not found' });
    }

    const docStream = new PDFDocument({ margin: 50 });
    
    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `inline; filename="${doc.document_number}.pdf"`);

    // Stream the PDF to the reply
    reply.send(docStream);

    // Build the PDF content
    docStream
      .fontSize(24)
      .text('Atlas Logistics', { align: 'center' })
      .moveDown();

    docStream
      .fontSize(16)
      .text(`Document: ${doc.type} (${doc.status})`, { align: 'center' })
      .moveDown(2);

    docStream.fontSize(12);
    docStream.text(`Document No: ${doc.document_number}`);
    docStream.text(`Booking Ref: ${doc.booking_ref}`);
    docStream.text(`Issue Date: ${doc.issue_date}`);
    
    docStream.moveDown();
    docStream.text('--- Payload Data ---');
    docStream.moveDown();
    
    // Formatting JSON payload into a readable format for the PDF
    const payloadStr = JSON.stringify(doc.payload, null, 2) || 'No details provided';
    docStream.fontSize(10).font('Courier').text(payloadStr);

    // Finalize the PDF
    docStream.end();
  });
};

export default documentRoutes;
