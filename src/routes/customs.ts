import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '../db/client.js';
import { hs_codes, customs_declarations, customs_declaration_items } from '../db/schema.js';
import { eq, ilike } from 'drizzle-orm';
import { 
  hsCodeSchema,
  createHsCodeSchema,
  customsDeclarationSchema, 
  createCustomsDeclarationSchema, 
  updateCustomsStatusSchema 
} from '../schemas/customs.schema.js';

const customsRoutes: FastifyPluginAsyncZod = async (server) => {

  // HS Codes

  server.get('/api/customs/hs-codes', {
    schema: {
      tags: ['Customs'],
      summary: 'List HS Codes',
      querystring: z.object({
        search: z.string().optional()
      }),
      response: {
        200: z.array(hsCodeSchema)
      }
    }
  }, async (request, _reply) => {
    const { search } = request.query as { search?: string };
    
    let query = db.select().from(hs_codes);
    
    if (search) {
      query = query.where(ilike(hs_codes.description, `%${search}%`)) as any;
    }

    const results = await query;
    return results.map(r => ({
      ...r,
      duty_rate: Number(r.duty_rate)
    }));
  });

  server.post('/api/customs/hs-codes', {
    schema: {
      tags: ['Customs'],
      summary: 'Create HS Code',
      body: createHsCodeSchema,
      response: {
        201: hsCodeSchema
      }
    }
  }, async (request, reply) => {
    const body = request.body as z.infer<typeof createHsCodeSchema>;

    const [newHsCode] = await db.insert(hs_codes)
      .values({
        ...body,
        duty_rate: String(body.duty_rate)
      })
      .returning();

    reply.status(201);
    return {
      ...newHsCode,
      duty_rate: Number(newHsCode.duty_rate)
    };
  });

  // Declarations

  server.get('/api/customs/declarations', {
    schema: {
      tags: ['Customs'],
      summary: 'List Declarations',
      querystring: z.object({
        shipment_id: z.coerce.number().optional()
      }),
      response: {
        200: z.array(customsDeclarationSchema)
      }
    }
  }, async (request, _reply) => {
    const { shipment_id } = request.query as { shipment_id?: number };
    
    const queryResult = await db.query.customs_declarations.findMany({
      where: shipment_id ? eq(customs_declarations.shipment_id, shipment_id) : undefined,
      with: {
        items: true
      }
    });

    return queryResult.map(dec => ({
      ...dec,
      submission_date: dec.submission_date?.toISOString(),
      clearance_date: dec.clearance_date?.toISOString(),
      created_at: dec.created_at.toISOString(),
      updated_at: dec.updated_at.toISOString(),
      items: dec.items.map(item => ({
        ...item,
        declared_value: Number(item.declared_value),
        weight_kg: Number(item.weight_kg)
      }))
    }));
  });

  server.post('/api/customs/declarations', {
    schema: {
      tags: ['Customs'],
      summary: 'Create Customs Declaration with Items',
      body: createCustomsDeclarationSchema,
      response: {
        201: customsDeclarationSchema
      }
    }
  }, async (request, reply) => {
    const body = request.body as z.infer<typeof createCustomsDeclarationSchema>;
    const { items, ...declarationData } = body;

    const newDeclaration = await db.transaction(async (tx) => {
      const [declaration] = await tx.insert(customs_declarations)
        .values({
          ...declarationData,
          status: 'Pending',
        })
        .returning();

      let createdItems: any[] = [];
      if (items && items.length > 0) {
        const itemsToInsert = items.map(item => ({
          ...item,
          declaration_id: declaration.id,
          declared_value: String(item.declared_value),
          weight_kg: String(item.weight_kg)
        }));
        createdItems = await tx.insert(customs_declaration_items).values(itemsToInsert).returning();
      }

      return {
        ...declaration,
        items: createdItems.map(i => ({
          ...i,
          declared_value: Number(i.declared_value),
          weight_kg: Number(i.weight_kg)
        }))
      };
    });

    reply.status(201);
    return {
      ...newDeclaration,
      submission_date: newDeclaration.submission_date?.toISOString(),
      clearance_date: newDeclaration.clearance_date?.toISOString(),
      created_at: newDeclaration.created_at.toISOString(),
      updated_at: newDeclaration.updated_at.toISOString(),
    };
  });

  server.get('/api/customs/declarations/:id', {
    schema: {
      tags: ['Customs'],
      summary: 'Get Declaration by ID',
      params: z.object({ id: z.coerce.number() }),
      response: {
        200: customsDeclarationSchema,
        404: z.object({ error: z.string() })
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: number };
    
    const declaration = await db.query.customs_declarations.findFirst({
      where: eq(customs_declarations.id, id),
      with: {
        items: true
      }
    });

    if (!declaration) return reply.status(404).send({ error: 'Declaration not found' });

    return {
      ...declaration,
      submission_date: declaration.submission_date?.toISOString(),
      clearance_date: declaration.clearance_date?.toISOString(),
      created_at: declaration.created_at.toISOString(),
      updated_at: declaration.updated_at.toISOString(),
      items: declaration.items.map(item => ({
        ...item,
        declared_value: Number(item.declared_value),
        weight_kg: Number(item.weight_kg)
      }))
    };
  });

  server.patch('/api/customs/declarations/:id/status', {
    schema: {
      tags: ['Customs'],
      summary: 'Update Declaration Status',
      params: z.object({ id: z.coerce.number() }),
      body: updateCustomsStatusSchema,
      response: {
        200: customsDeclarationSchema,
        404: z.object({ error: z.string() })
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: number };
    const body = request.body as z.infer<typeof updateCustomsStatusSchema>;

    const updatePayload: any = { status: body.status, updated_at: new Date() };
    if (body.submission_date) updatePayload.submission_date = new Date(body.submission_date);
    if (body.clearance_date) updatePayload.clearance_date = new Date(body.clearance_date);

    const [updatedDeclaration] = await db.update(customs_declarations)
      .set(updatePayload)
      .where(eq(customs_declarations.id, id))
      .returning();

    if (!updatedDeclaration) return reply.status(404).send({ error: 'Declaration not found' });

    const itemsList = await db.select().from(customs_declaration_items).where(eq(customs_declaration_items.declaration_id, updatedDeclaration.id));

    return {
      ...updatedDeclaration,
      submission_date: updatedDeclaration.submission_date?.toISOString(),
      clearance_date: updatedDeclaration.clearance_date?.toISOString(),
      created_at: updatedDeclaration.created_at.toISOString(),
      updated_at: updatedDeclaration.updated_at.toISOString(),
      items: itemsList.map(item => ({
        ...item,
        declared_value: Number(item.declared_value),
        weight_kg: Number(item.weight_kg)
      }))
    };
  });

};

export default customsRoutes;
