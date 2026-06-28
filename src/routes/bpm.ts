import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '../db/client.js';
import { diagram_versions } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';

const bpmRoutes: FastifyPluginAsyncZod = async (server) => {
  server.get(
    '/api/bpm/versions/:diagram_id',
    {
      schema: {
        description: 'Get diagram version history',
        tags: ['BPM'],
        params: z.object({
          diagram_id: z.string()
        }),
        response: {
          200: z.array(z.object({
            id: z.number(),
            diagram_id: z.string(),
            author_id: z.string().nullable(),
            xml: z.any(),
            label: z.string().nullable(),
            created_at: z.string()
          }))
        }
      }
    },
    async (request, reply) => {
      const { diagram_id } = request.params as { diagram_id: string };
      try {
        const versions = await db.select()
          .from(diagram_versions)
          .where(eq(diagram_versions.diagram_id, diagram_id))
          .orderBy(desc(diagram_versions.created_at));
        
        return reply.status(200).send(versions.map(v => ({
          ...v,
          created_at: v.created_at.toISOString()
        })));
      } catch (error) {
        server.log.error(error);
        return (reply as any).status(500).send({ error: 'Failed to fetch diagram versions' });
      }
    }
  );

  server.post(
    '/api/bpm/versions',
    {
      schema: {
        description: 'Save a new diagram version',
        tags: ['BPM'],
        body: z.object({
          diagram_id: z.string(),
          author_id: z.string().optional(),
          xml: z.any(),
          label: z.string().optional()
        }),
        response: {
          201: z.object({
            id: z.number(),
            message: z.string()
          })
        }
      }
    },
    async (request, reply) => {
      const { diagram_id, author_id, xml, label } = request.body as { diagram_id: string, author_id?: string, xml: any, label?: string };
      try {
        const [newVersion] = await db.insert(diagram_versions)
          .values({
            diagram_id,
            author_id: author_id || null,
            xml,
            label: label || null
          })
          .returning({ id: diagram_versions.id });
          
        return reply.status(201).send({
          id: newVersion.id,
          message: 'Version saved successfully'
        });
      } catch (error) {
        server.log.error(error);
        return (reply as any).status(500).send({ error: 'Failed to save diagram version' });
      }
    }
  );
};

export default bpmRoutes;
