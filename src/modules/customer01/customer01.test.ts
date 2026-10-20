import { describe, it, expect, beforeAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import customer01Routes from './customer01.routes.js';

describe('Customer01 Logistics Module REST Ingestion & Service', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(customer01Routes, { prefix: '/api/customer01' });
    await app.ready();
  });

  it('GET /api/customer01/albaranes - should return seeded albaranes list', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/customer01/albaranes'
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.albaranes.length).toBeGreaterThanOrEqual(2);
  });

  it('POST /api/customer01/albaranes/upload - should ingest new rail albaran in CANTUNIS', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/customer01/albaranes/upload',
      payload: {
        albaranNumber: 'ALB-TEST01-NEW-99',
        factoryOrigin: 'Plant North',
        destinationWarehouse: 'CANTUNIS',
        vehicleIdentifier: '31 71 8899 001-4',
        coils: [
          {
            coilId: 'BOB-NEW-01',
            paperGrade: 'PRIMA 140',
            grossWeightKg: 2700,
            widthMm: 2400,
            diameterMm: 1250,
            factoryOrigin: 'Plant North',
            destinationWarehouse: 'CANTUNIS'
          }
        ]
      }
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.albaran.vehicleDetection.isRail).toBe(true);
    expect(body.albaran.vehicleDetection.co2eSavingsPercent).toBe(76.9);
  });

  it('POST /api/customer01/exceptions/upload - should register dock exception by TEST01', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/customer01/exceptions/upload',
      payload: {
        warehouse: 'CANTUNIS',
        exceptionType: 'HUMEDAD_DETECTADA',
        severity: 'HIGH',
        affectedCoilId: 'BOB-NEW-01',
        description: 'Sensor muelle 4 reporta condensación en bobina 1',
        reportedByRole: 'TEST01',
        reportedByName: 'Operator Lead'
      }
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.exception.reportedByRole).toBe('TEST01');
  });

  it('POST /api/customer01/exceptions/upload - should reject dock assignment by TEST02 (Operations Manager)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/customer01/exceptions/upload',
      payload: {
        warehouse: 'TLSA',
        exceptionType: 'DESCUADRE_PESO',
        severity: 'MEDIUM',
        description: 'Diferencia báscula 180 kg',
        reportedByRole: 'TEST02',
        reportedByName: 'Operations Manager'
      }
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(false);
    expect(body.message).toContain('Operations Manager');
  });

  it('POST /api/customer01/stowage/verify - should verify 40ft HC CoG and execute 2-opt rebalancing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/customer01/stowage/verify',
      payload: {
        coils: [
          { coilId: 'C1', grossWeightKg: 4000, xPositionM: 1.0, yPositionM: 1.176 },
          { coilId: 'C2', grossWeightKg: 4000, xPositionM: 2.0, yPositionM: 1.176 },
          { coilId: 'C3', grossWeightKg: 1000, xPositionM: 9.0, yPositionM: 1.176 }
        ]
      }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.stowage.twoOptRebalanced).toBe(true);
  });

  it('POST /api/customer01/assignments/verify - should validate team leader authorization', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/customer01/assignments/verify',
      payload: {
        roleCode: 'TEST01',
        personName: 'Operator Lead'
      }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.validation.allowed).toBe(true);
  });
});
