import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { zbc } from '../bpm/zeebe-client.js';

const processRoutes: FastifyPluginAsyncZod = async (server) => {
  server.post(
    '/api/processes/deploy',
    {
      schema: {
        description: 'Deploy BPMN diagram to Zeebe (Camunda 8)',
        tags: ['Processes'],
        security: [{ bearerAuth: [] }],
        body: z.object({
          xml: z.string()
        }),
        response: {
          200: z.object({
            status: z.string(),
            data: z.any()
          }),
          500: z.object({
            error: z.string()
          })
        }
      },
      onRequest: [(server as any).authenticate]
    },
    async (request, reply) => {
      const { xml } = request.body as { xml: string };
      try {
        const deployResult = await zbc.deployResource({
          process: Buffer.from(xml),
          name: `DynamicDeployment_${Date.now()}.bpmn`
        });
        return reply.status(200).send({ status: 'Deployed', data: deployResult });
      } catch (error) {
        server.log.error(error);
        return reply.status(500).send({ error: 'BPMN deployment to Zeebe failed' });
      }
    }
  );
};

export default processRoutes;
