import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import carbonInsettingRoutes from './carbon-insetting.routes.js';

describe('Carbon Insetting Module: Fastify API Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(carbonInsettingRoutes, { prefix: '/api/carbon-insetting' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/carbon-insetting/fuels - should return certified alternative fuels catalog', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/carbon-insetting/fuels'
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.fuels.B100_BIODIESEL).toBeDefined();
    expect(body.fuels.E_METHANOL).toBeDefined();
  });

  it('GET /api/carbon-insetting/tokens - should return active insetting tokens', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/carbon-insetting/tokens'
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.tokens.length).toBeGreaterThan(0);
  });

  it('POST /api/carbon-insetting/tokens/issue - should issue and seal a new insetting token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/carbon-insetting/tokens/issue',
      payload: {
        fuelType: 'B100_BIODIESEL',
        fuelVolumeMT: 100,
        bunkerLocation: 'Port de Barcelona - Muelle Adosado',
        bdnReference: 'BDN-BCN-2026-TEST',
        sustainabilityCertificateNumber: 'ISCC-EU-Cert-TEST-999',
        allocatedShipmentRef: 'SHP-BCN-CUST01-TEST',
        beneficiaryCompany: 'Customer01 Paper España',
        transportMode: 'MARITIME_OCEAN'
      }
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.token.tokenId).toContain('INSET-');
    expect(body.token.ghgAbatementTonsCO2e).toBeGreaterThan(200);
    expect(body.token.digitalSignatureHash).toBeDefined();
  });

  it('GET /api/carbon-insetting/fueleu/vessels - should return fleet vessels and intensities', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/carbon-insetting/fueleu/vessels'
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.vessels.length).toBeGreaterThan(0);
  });

  it('POST /api/carbon-insetting/fueleu/pool - should execute and seal FuelEU pooling agreement', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/carbon-insetting/fueleu/pool',
      payload: {
        reportingYear: 2026
      }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.pool.isCompliant).toBe(true);
    expect(body.pool.totalPenaltyAvoidedEur).toBeGreaterThan(0);
  });
});
