import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import portCongestionRoutes from './port-congestion.routes.js';

describe('Port Congestion Module: Fastify API Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(portCongestionRoutes, { prefix: '/api/port-congestion' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/port-congestion/hubs - should return Iberian port hubs', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/port-congestion/hubs'
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.count).toBe(3);
    const codes = body.hubs.map((h: any) => h.portCode);
    expect(codes).toContain('ESBCN');
    expect(codes).toContain('ESVLC');
    expect(codes).toContain('ESALG');
  });

  it('GET /api/port-congestion/hubs/:portCode - should return a specific port hub', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/port-congestion/hubs/ESBCN'
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.hub.portCode).toBe('ESBCN');
    expect(body.hub.name).toBe('Port de Barcelona');
    expect(body.hub.landsideFacilities).toContain('CANTUNIS');
  });

  it('GET /api/port-congestion/vessels - should return AIS vessel telemetry list', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/port-congestion/vessels?portCode=ESBCN'
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.vessels.length).toBeGreaterThan(0);
    expect(body.vessels.every((v: any) => v.destinationPortCode === 'ESBCN')).toBe(true);
  });

  it('GET /api/port-congestion/collisions - should detect deterministic berth window collisions', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/port-congestion/collisions?portCode=ESBCN&bufferMinutes=120'
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.collisions.length).toBeGreaterThan(0);
    const col = body.collisions[0];
    expect(col.portCode).toBe('ESBCN');
    expect(col.projectedDelayHours).toBeGreaterThan(0);
  });

  it('POST /api/port-congestion/collisions/resolve - should resolve collision and shift ETA', async () => {
    // First get a collision ID
    const getRes = await app.inject({
      method: 'GET',
      url: '/api/port-congestion/collisions?portCode=ESBCN'
    });
    const col = JSON.parse(getRes.body).collisions[0];

    const resolveRes = await app.inject({
      method: 'POST',
      url: '/api/port-congestion/collisions/resolve',
      payload: { collisionId: col.collisionId }
    });

    expect(resolveRes.statusCode).toBe(200);
    const body = JSON.parse(resolveRes.body);
    expect(body.success).toBe(true);
    expect(body.collision.resolved).toBe(true);
  });

  it('POST /api/port-congestion/rebalance-drayage - should recalculate and adjust drayage appointments', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/port-congestion/rebalance-drayage',
      payload: { portCode: 'ESBCN' }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.appointments.length).toBeGreaterThan(0);
  });

  it('POST /api/port-congestion/generate-dd-notice - should create official FMC/OSRA D&D suspension certificate', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/port-congestion/generate-dd-notice',
      payload: {
        portCode: 'ESBCN',
        terminalName: 'BEST',
        vesselName: 'MADRID MAERSK',
        containerNo: 'TCLU9283710',
        reason: 'PORT_CONGESTION_ANCHORAGE_DWELL',
        dwellOrDelayHours: 36.5,
        issuer: 'ESXPA (SuperAdmin / Systems Lead)'
      }
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.certificate.certificateId).toContain('CERT-FMC-SUSP-ESBCN');
    expect(body.certificate.freeTimeClockStatus).toBe('TOLLED_SUSPENDED');
    expect(body.certificate.digitalSignatureHash).toBeDefined();
  });

  it('GET /api/port-congestion/dd-notices - should list all generated certificates', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/port-congestion/dd-notices'
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.certificates.length).toBeGreaterThan(0);
  });
});
