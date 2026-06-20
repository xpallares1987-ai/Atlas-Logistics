import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { broker } from '../services/broker.js';

const liveRoutes: FastifyPluginAsyncZod = async (server) => {
  server.get('/ws/updates', { websocket: true }, (connection, req) => {
    server.log.info('Client connected to live updates WebSocket');

    const unsubscribe = broker.subscribe('logistics-updates', (message) => {
      connection.socket.send(JSON.stringify({
        type: 'LOGISTICS_UPDATE',
        timestamp: new Date().toISOString(),
        payload: message
      }));
    });

    connection.socket.on('close', () => {
      server.log.info('Client disconnected from live updates');
      unsubscribe();
    });
  });
};

export default liveRoutes;
