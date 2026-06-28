import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '../db/client.js';
import { invoices, invoice_items } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { 
  invoiceSchema, 
  createInvoiceSchema, 
  updateInvoiceSchema 
} from '../schemas/financial.schema.js';

const financialRoutes: FastifyPluginAsyncZod = async (server) => {

  server.get('/api/financial/invoices', {
    schema: {
      tags: ['Financial'],
      summary: 'List Invoices',
      querystring: z.object({
        shipment_id: z.coerce.number().optional(),
        type: z.enum(['AR', 'AP']).optional()
      }),
      response: {
        200: z.array(invoiceSchema)
      }
    }
  }, async (request, reply) => {
    const { shipment_id, type } = request.query as { shipment_id?: number, type?: 'AR' | 'AP' };
    
    const queryResult = await db.query.invoices.findMany({
      where: (invoices, { eq, and }) => {
        const conditions = [];
        if (shipment_id) conditions.push(eq(invoices.shipment_id, shipment_id));
        if (type) conditions.push(eq(invoices.type, type));
        return conditions.length > 0 ? and(...conditions) : undefined;
      },
      with: {
        items: true
      }
    });

    return queryResult.map(inv => ({
      ...inv,
      total_amount: Number(inv.total_amount),
      created_at: inv.created_at.toISOString(),
      updated_at: inv.updated_at.toISOString(),
      items: inv.items.map(item => ({
        ...item,
        unit_price: Number(item.unit_price),
        total_price: Number(item.total_price)
      }))
    }));
  });

  server.post('/api/financial/invoices', {
    schema: {
      tags: ['Financial'],
      summary: 'Create Invoice with Items',
      body: createInvoiceSchema,
      response: {
        201: invoiceSchema
      }
    }
  }, async (request, reply) => {
    const body = request.body as z.infer<typeof createInvoiceSchema>;
    const { items, ...invoiceData } = body;

    const newInvoice = await db.transaction(async (tx) => {
      let computedTotal = 0;
      let finalItems: any[] = [];
      
      if (items && items.length > 0) {
        finalItems = items.map(item => {
          const itemTotal = item.quantity * item.unit_price;
          computedTotal += itemTotal;
          return {
            ...item,
            total_price: itemTotal
          };
        });
      }

      const [invoice] = await tx.insert(invoices)
        .values({
          ...invoiceData,
          status: 'Draft',
          total_amount: String(computedTotal),
        })
        .returning();

      let createdItems: any[] = [];
      if (finalItems.length > 0) {
        const itemsToInsert = finalItems.map(item => ({
          ...item,
          invoice_id: invoice.id,
          unit_price: String(item.unit_price),
          total_price: String(item.total_price)
        }));
        createdItems = await tx.insert(invoice_items).values(itemsToInsert).returning();
      }

      return {
        ...invoice,
        items: createdItems.map(i => ({
          ...i,
          unit_price: Number(i.unit_price),
          total_price: Number(i.total_price)
        }))
      };
    });

    reply.status(201);
    return {
      ...newInvoice,
      total_amount: Number(newInvoice.total_amount),
      created_at: newInvoice.created_at.toISOString(),
      updated_at: newInvoice.updated_at.toISOString(),
    };
  });

  server.get('/api/financial/invoices/:id', {
    schema: {
      tags: ['Financial'],
      summary: 'Get Invoice by ID',
      params: z.object({ id: z.coerce.number() }),
      response: {
        200: invoiceSchema,
        404: z.object({ error: z.string() })
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: number };
    
    const invoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, id),
      with: {
        items: true
      }
    });

    if (!invoice) return reply.status(404).send({ error: 'Invoice not found' });

    return {
      ...invoice,
      total_amount: Number(invoice.total_amount),
      created_at: invoice.created_at.toISOString(),
      updated_at: invoice.updated_at.toISOString(),
      items: invoice.items.map(item => ({
        ...item,
        unit_price: Number(item.unit_price),
        total_price: Number(item.total_price)
      }))
    };
  });

  server.patch('/api/financial/invoices/:id', {
    schema: {
      tags: ['Financial'],
      summary: 'Update Invoice Status',
      params: z.object({ id: z.coerce.number() }),
      body: updateInvoiceSchema,
      response: {
        200: invoiceSchema,
        404: z.object({ error: z.string() })
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: number };
    const body = request.body as z.infer<typeof updateInvoiceSchema>;

    const [updatedInvoice] = await db.update(invoices)
      .set({ ...body, updated_at: new Date() })
      .where(eq(invoices.id, id))
      .returning();

    if (!updatedInvoice) return reply.status(404).send({ error: 'Invoice not found' });

    // Fetch items manually since `returning()` doesn't eagerly load relations
    const itemsList = await db.select().from(invoice_items).where(eq(invoice_items.invoice_id, updatedInvoice.id));

    return {
      ...updatedInvoice,
      total_amount: Number(updatedInvoice.total_amount),
      created_at: updatedInvoice.created_at.toISOString(),
      updated_at: updatedInvoice.updated_at.toISOString(),
      items: itemsList.map(item => ({
        ...item,
        unit_price: Number(item.unit_price),
        total_price: Number(item.total_price)
      }))
    };
  });

  server.get('/api/financial/shipments/:shipmentId/pnl', {
    schema: {
      tags: ['Financial'],
      summary: 'Get Profit and Loss for a Shipment',
      params: z.object({ shipmentId: z.coerce.number() }),
      response: {
        200: z.object({
          shipment_id: z.number(),
          total_revenue: z.number(),
          total_costs: z.number(),
          profit: z.number(),
          margin_percentage: z.number(),
          currency: z.string()
        })
      }
    }
  }, async (request, reply) => {
    const { shipmentId } = request.params as { shipmentId: number };

    const shipmentInvoices = await db.query.invoices.findMany({
      where: eq(invoices.shipment_id, shipmentId)
    });

    let total_revenue = 0;
    let total_costs = 0;
    let currency = 'USD'; // Default fallback

    for (const inv of shipmentInvoices) {
      currency = inv.currency; // Assuming single currency for simplicity per shipment
      if (inv.type === 'AR') {
        total_revenue += Number(inv.total_amount);
      } else if (inv.type === 'AP') {
        total_costs += Number(inv.total_amount);
      }
    }

    const profit = total_revenue - total_costs;
    const margin_percentage = total_revenue > 0 ? (profit / total_revenue) * 100 : 0;

    return {
      shipment_id: shipmentId,
      total_revenue,
      total_costs,
      profit,
      margin_percentage,
      currency
    };
  });

};

export default financialRoutes;
