import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import iataOneRecordRoutes from './iata-one-record.routes.js';

describe('IATA ONE Record Module: Fastify API Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(iataOneRecordRoutes, { prefix: '/api/one-record' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/one-record/waybills - should return seeded ONE Record waybills list', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/one-record/waybills'
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.waybills.length).toBeGreaterThan(0);
    expect(body.waybills[0].fullAwbNumber).toBe('075-82910482');
    expect(body.waybills[0]['@context']).toBe('https://onerecord.iata.org/ns/cargo#');
  });

  it('GET /api/one-record/waybills/:waybillId - should return a single waybill by AWB', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/one-record/waybills/075-82910482'
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.waybill.originAirport).toBe('BCN');
    expect(body.waybill.destinationAirport).toBe('JFK');
  });

  it('GET /api/one-record/waybills/:waybillId - should return 404 for nonexistent AWB', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/one-record/waybills/999-00000000'
    });

    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
  });

  it('GET /api/one-record/milestones/:awbNumber - should return Cargo iQ milestones', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/one-record/milestones/075-82910482'
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.milestones.length).toBe(8);
    const codes = body.milestones.map((m: { milestoneCode: string }) => m.milestoneCode);
    expect(codes).toContain('FWB');
    expect(codes).toContain('RCS');
    expect(codes).toContain('DEP');
    expect(codes).toContain('DLV');
  });

  it('POST /api/one-record/milestones/event - should update a Cargo iQ milestone timestamp and SLA', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/one-record/milestones/event',
      payload: {
        awbNumber: '075-82910482',
        milestoneCode: 'RCS',
        eventRemarks: 'Mercancía recibida y pesada en rampa BCN Terminal Carga'
      }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.updatedMilestone.milestoneCode).toBe('RCS');
    expect(body.updatedMilestone.actualTimestamp).toBeDefined();
    expect(body.updatedMilestone.eventRemarks).toContain('BCN Terminal Carga');
  });

  it('POST /api/one-record/milestones/event - should return 400 on missing arguments', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/one-record/milestones/event',
      payload: {
        awbNumber: '075-82910482'
      }
    });

    expect(res.statusCode).toBe(400);
  });

  it('POST /api/one-record/edgd/validate - should validate compliant UN1845 Dry Ice DG declaration', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/one-record/edgd/validate',
      payload: {
        unNumber: 'UN1845',
        properShippingName: 'CARBON DIOXIDE, SOLID (DRY ICE)',
        hazardClass: '9',
        packageQuantity: 4,
        netQuantityPerPackageKg: 25,
        totalNetQuantityKg: 100,
        packingInstruction: 'PI 954',
        aircraftRestriction: 'CARGO_AIRCRAFT_ONLY'
      }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.validation.isCompliant).toBe(true);
    expect(body.validation.violations.length).toBe(0);
    expect(body.validation.handlingAdvisories.length).toBeGreaterThan(0);
    expect(body.validation.validationSealHash).toMatch(/^IATA-DGR-[0-9a-f]{24}$/);
  });

  it('POST /api/one-record/edgd/validate - should detect violations for mismatched packing instruction', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/one-record/edgd/validate',
      payload: {
        unNumber: 'UN1845',
        properShippingName: 'CARBON DIOXIDE, SOLID (DRY ICE)',
        hazardClass: '3', // Invalid class (should be 9)
        packageQuantity: 1,
        netQuantityPerPackageKg: 10,
        totalNetQuantityKg: 10,
        packingInstruction: 'PI 305', // Invalid instruction
        aircraftRestriction: 'PAX_AND_CARGO'
      }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.validation.isCompliant).toBe(false);
    expect(body.validation.violations.length).toBe(2);
  });
});
