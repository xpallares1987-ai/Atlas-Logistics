import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import saicaRoutes from './saica.routes.js';

describe('SAICA Logistics Platform: Fastify REST API Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(saicaRoutes, { prefix: '/api/saica' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/saica/albaranes - should return seeded albaranes', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/saica/albaranes'
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.albaranes.length).toBeGreaterThan(0);
    expect(body.albaranes[0].destinationWarehouse).toBeDefined();
  });

  it('POST /api/saica/albaranes/upload - should ingest albaran with UIC rail wagon at CANTUNIS', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/saica/albaranes/upload',
      payload: {
        albaranNumber: 'ALB-012-TEST-RAIL',
        factoryOrigin: 'Zaragoza El Burgo',
        destinationWarehouse: 'CANTUNIS',
        vehicleIdentifier: '31 71 4556 999-1',
        coils: [
          {
            coilId: 'BOB-TEST-001',
            paperGrade: 'SAICA PRIMA 140',
            grossWeightKg: 2700,
            widthMm: 2400,
            diameterMm: 1250,
            factoryOrigin: 'Zaragoza El Burgo',
            destinationWarehouse: 'CANTUNIS'
          }
        ],
        targetContainerNumber: 'MSKU-112233-4'
      }
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.albaran.vehicleDetection.transportMode).toBe('TREN_VAGONES');
    expect(body.albaran.vehicleDetection.isRail).toBe(true);
    expect(body.albaran.vehicleDetection.co2eSavingsPercent).toBe(76.9);
  });

  it('POST /api/saica/albaranes/upload - should ingest albaran with road plate at CANTUNIS', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/saica/albaranes/upload',
      payload: {
        albaranNumber: 'ALB-012-TEST-TRUCK',
        factoryOrigin: 'Zaragoza El Burgo',
        destinationWarehouse: 'CANTUNIS',
        vehicleIdentifier: '9876-XYZ',
        coils: [
          {
            coilId: 'BOB-TEST-002',
            paperGrade: 'SAICA MEDIUM 110',
            grossWeightKg: 2500,
            widthMm: 2400,
            diameterMm: 1250,
            factoryOrigin: 'Zaragoza El Burgo',
            destinationWarehouse: 'CANTUNIS'
          }
        ]
      }
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.albaran.vehicleDetection.transportMode).toBe('CAMION_LONA');
    expect(body.albaran.vehicleDetection.isRail).toBe(false);
  });

  it('POST /api/saica/albaranes/upload - should strictly reject TMZa references', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/saica/albaranes/upload',
      payload: {
        albaranNumber: 'ALB-TMZA-REJECT',
        factoryOrigin: 'Zaragoza Centro',
        destinationWarehouse: 'CANTUNIS',
        vehicleIdentifier: 'TMZa Terminal Zaragoza',
        coils: []
      }
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.message).toContain('PROHIBICIÓN ESTRICTA: TMZa');
  });

  it('POST /api/saica/exceptions/upload - should register dock exception by ESACA', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/saica/exceptions/upload',
      payload: {
        warehouse: 'TLSA',
        exceptionType: 'BOBINA_DANADA',
        severity: 'HIGH',
        affectedCoilId: 'BOB-SAICA-2026-101',
        description: 'Rozadura en lateral izquierdo producida durante descarga de camión-lona.',
        reportedByRole: 'ESACA',
        reportedByName: 'Ariel Catalano'
      }
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.exception.reportedByRole).toBe('ESACA');
  });

  it('POST /api/saica/exceptions/upload - should reject dock assignment by ESRSE (Raquel Serrano)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/saica/exceptions/upload',
      payload: {
        warehouse: 'CANTUNIS',
        exceptionType: 'RETRASO_FERROVIARIO',
        severity: 'MEDIUM',
        description: 'Intento de registro táctico por supervisión gerencial.',
        reportedByRole: 'ESRSE',
        reportedByName: 'Raquel Serrano'
      }
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.message).toContain('Raquel Serrano');
  });

  it('POST /api/saica/stowage/verify - should calculate 40ft HC legal load and 2-opt rebalancing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/saica/stowage/verify',
      payload: {
        coils: [
          {
            coilId: 'C1',
            paperGrade: 'SAICA PRIMA 140',
            grossWeightKg: 5000,
            widthMm: 2400,
            diameterMm: 1250,
            factoryOrigin: 'Zaragoza El Burgo',
            destinationWarehouse: 'CANTUNIS',
            xPositionM: 1.0
          },
          {
            coilId: 'C2',
            paperGrade: 'SAICA PRIMA 140',
            grossWeightKg: 5000,
            widthMm: 2400,
            diameterMm: 1250,
            factoryOrigin: 'Zaragoza El Burgo',
            destinationWarehouse: 'CANTUNIS',
            xPositionM: 2.0
          },
          {
            coilId: 'C3',
            paperGrade: 'SAICA MEDIUM 110',
            grossWeightKg: 2000,
            widthMm: 2400,
            diameterMm: 1250,
            factoryOrigin: 'Zaragoza El Burgo',
            destinationWarehouse: 'CANTUNIS',
            xPositionM: 9.0
          }
        ]
      }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.stowage.containerPayloadLimitKg).toBe(26500);
    expect(body.stowage.twoOptRebalanced).toBe(true);
    expect(body.stowage.longitudinalStatus).toBe('BALANCED');
  });

  it('POST /api/saica/assignments/verify - should enforce Jose Miguel Gomez exclusion', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/saica/assignments/verify',
      payload: {
        roleCode: 'ESACA',
        personName: 'Jose Miguel Gomez'
      }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.validation.allowed).toBe(false);
    expect(body.validation.reason).toContain('Jose Miguel Gomez');
  });
});
