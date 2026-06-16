import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { evaluateSurcharges } from '../bpm/zeebe-client.js';

const freightRoutes: FastifyPluginAsyncZod = async (server) => {
  server.post(
    '/api/freight-rates/calculate',
    {
      schema: {
        description: 'Calculate freight rates with dynamic surcharges from Zeebe DMN',
        tags: ['Freight'],
        security: [{ bearerAuth: [] }],
        body: z.object({
          origin: z.string().length(5),
          destination: z.string().length(5),
          carrier: z.string()
        }),
        response: {
          200: z.object({
            rate: z.number(),
            surcharges: z.array(z.object({
              name: z.string(),
              amount: z.number()
            }))
          })
        }
      },
      onRequest: [(server as any).authenticate]
    },
    async (request, reply) => {
      const { carrier } = request.body as { carrier: string };
      let baf = 100, thc = 200, isps = 15;

      try {
        const decisionOutput = await evaluateSurcharges(carrier);
        if (decisionOutput) {
          baf = (decisionOutput as any).baf as number;
          thc = (decisionOutput as any).thc as number;
          isps = (decisionOutput as any).isps as number;
        }
      } catch (error) {
        server.log.warn(`Fallback defaults for ${carrier}. Error: ${(error as Error).message}`);
      }

      const baseRate = Math.floor(Math.random() * (3000 - 1000 + 1) + 1000);
      const surcharges = [
        { name: 'BAF', amount: baf },
        { name: 'THC', amount: thc },
        { name: 'ISPS', amount: isps }
      ];

      return reply.status(200).send({ rate: baseRate, surcharges });
    }
  );
};

export default freightRoutes;
