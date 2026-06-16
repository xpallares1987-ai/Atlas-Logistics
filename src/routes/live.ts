import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

const liveRoutes: FastifyPluginAsyncZod = async (server) => {
  server.get('/ws/updates', { websocket: true }, (connection, req) => {
    server.log.info('Client connected to live updates WebSocket');

    const interval = setInterval(() => {
      // Simulate live logistics updates
      connection.socket.send(JSON.stringify({
        type: 'LOGISTICS_UPDATE',
        timestamp: new Date().toISOString(),
        payload: {
          activeShipments: 124,
          pendingReceptions: 45,
          alerts: 3
        }
      }));
    }, 5000);

    connection.socket.on('close', () => {
      server.log.info('Client disconnected from live updates');
      clearInterval(interval);
    });
  });
};

export default liveRoutes;
