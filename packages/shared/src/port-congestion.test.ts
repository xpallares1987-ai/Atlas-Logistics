import { describe, it, expect } from 'vitest';
import {
  pointInPolygon,
  haversineDistanceNM,
  classifyVesselZone,
  detectBerthWindowCollisions,
  recalculateDrayageAppointments,
  generateDDSuspensionCertificate,
  IBERIAN_PORT_HUBS,
  SEED_AIS_VESSELS,
  SEED_BERTH_CALLS,
  SEED_DRAYAGE_APPOINTMENTS,
  type GeoPoint,
  type GeoPolygon,
  type ScheduledBerthCall
} from './port-congestion.js';

describe('Predictive Port Congestion & AIS Berth Delay Early Warning Engine', () => {
  const bcnHub = IBERIAN_PORT_HUBS.find((h) => h.portCode === 'ESBCN')!;
  const anchorageZone = bcnHub.zones.find((z) => z.id === 'BCN-ANCH-01')!;

  describe('Spatial Geofencing & Point-In-Polygon Ray-Casting', () => {
    it('should correctly detect a point inside the Barcelona anchorage polygon', () => {
      const insidePoint: GeoPoint = [2.180, 41.315];
      expect(pointInPolygon(insidePoint, anchorageZone.coordinates)).toBe(true);
    });

    it('should correctly detect a point outside the Barcelona anchorage polygon', () => {
      const outsidePoint: GeoPoint = [2.300, 41.400]; // Far offshore North
      expect(pointInPolygon(outsidePoint, anchorageZone.coordinates)).toBe(false);
    });

    it('should handle invalid or degenerate polygon inputs gracefully', () => {
      const point: GeoPoint = [2.180, 41.315];
      expect(pointInPolygon(point, [] as unknown as GeoPolygon)).toBe(false);
      expect(pointInPolygon(point, [[0, 0], [1, 1]] as GeoPolygon)).toBe(false);
    });

    it('should calculate Haversine distance in nautical miles with great-circle precision', () => {
      const bcnCentroid = bcnHub.centroid;
      const vlcHub = IBERIAN_PORT_HUBS.find((h) => h.portCode === 'ESVLC')!;
      const distance = haversineDistanceNM(bcnCentroid, vlcHub.centroid);

      // Barcelona to Valencia is approximately 160 - 170 nautical miles by sea
      expect(distance).toBeGreaterThan(150);
      expect(distance).toBeLessThan(180);
      expect(haversineDistanceNM(bcnCentroid, bcnCentroid)).toBe(0);
    });
  });

  describe('Vessel Zone Classification & Anchorage Dwell Evaluation', () => {
    it('should classify vessel as ANCHORED_DWELL with warning when SOG < 0.5 kn and dwell > 24h', () => {
      const pos: GeoPoint = [2.180, 41.315];
      const entryTime = new Date(Date.now() - 36 * 3600 * 1000).toISOString(); // 36 hours ago

      const result = classifyVesselZone(pos, 0.2, bcnHub.zones, entryTime);
      expect(result.zone?.id).toBe('BCN-ANCH-01');
      expect(result.operationalStatus).toBe('ANCHORED_DWELL');
      expect(result.dwellHours).toBeGreaterThanOrEqual(35.9);
      expect(result.isDwellWarning).toBe(true);
      expect(result.isDwellCritical).toBe(false);
    });

    it('should classify vessel as CRITICAL dwell when dwell > 48h', () => {
      const pos: GeoPoint = [2.195, 41.320];
      const entryTime = new Date(Date.now() - 52 * 3600 * 1000).toISOString(); // 52 hours ago

      const result = classifyVesselZone(pos, 0.1, bcnHub.zones, entryTime);
      expect(result.operationalStatus).toBe('ANCHORED_DWELL');
      expect(result.dwellHours).toBeGreaterThanOrEqual(51.9);
      expect(result.isDwellWarning).toBe(true);
      expect(result.isDwellCritical).toBe(true);
    });

    it('should classify vessel as AT_BERTH when inside terminal berth polygon', () => {
      const pos: GeoPoint = [2.148, 41.348]; // Inside BCN-BERTH-BEST
      const result = classifyVesselZone(pos, 0.0, bcnHub.zones);

      expect(result.zone?.id).toBe('BCN-BERTH-BEST');
      expect(result.operationalStatus).toBe('AT_BERTH');
      expect(result.isDwellWarning).toBe(false);
    });

    it('should classify vessel as UNDERWAY_CHANNEL when navigating entry fairway', () => {
      const pos: GeoPoint = [2.165, 41.340]; // Inside BCN-CHAN-01
      const result = classifyVesselZone(pos, 6.8, bcnHub.zones);

      expect(result.zone?.id).toBe('BCN-CHAN-01');
      expect(result.operationalStatus).toBe('UNDERWAY_CHANNEL');
    });
  });

  describe('Deterministic Berth Window Collision Radar', () => {
    it('should detect berth collision between MADRID MAERSK and MSC ISABELLA at BEST Berth-01', () => {
      const collisions = detectBerthWindowCollisions(SEED_BERTH_CALLS, 120);

      const bcnCollision = collisions.find(
        (c) => c.portCode === 'ESBCN' && c.vesselB.vesselName === 'MSC ISABELLA'
      );
      expect(bcnCollision).toBeDefined();
      expect(bcnCollision?.berthId).toBe('BERTH-01');
      expect(bcnCollision?.vesselA.vesselName).toBe('MADRID MAERSK');
      expect(bcnCollision?.overlapMinutes).toBeGreaterThan(0);
      expect(bcnCollision?.projectedDelayHours).toBeGreaterThan(0);
      expect(bcnCollision?.resolutionRecommendation).toContain('Atrasar atraque');
    });

    it('should return empty collision list when calls do not overlap', () => {
      const nonOverlappingCalls: ScheduledBerthCall[] = [
        {
          callId: 'TEST-001',
          portCode: 'ESBCN',
          terminalName: 'BEST',
          berthId: 'BERTH-01',
          vesselName: 'VESSEL A',
          imo: '1111111',
          carrier: 'MAERSK',
          etaPlanned: new Date(Date.now() + 10 * 3600 * 1000).toISOString(),
          etdPlanned: new Date(Date.now() + 20 * 3600 * 1000).toISOString(),
          movesEstimatedTeu: 1000,
          craneGangs: 4
        },
        {
          callId: 'TEST-002',
          portCode: 'ESBCN',
          terminalName: 'BEST',
          berthId: 'BERTH-01',
          vesselName: 'VESSEL B',
          imo: '2222222',
          carrier: 'MSC',
          etaPlanned: new Date(Date.now() + 24 * 3600 * 1000).toISOString(), // 4h after ETD + 2h buffer
          etdPlanned: new Date(Date.now() + 34 * 3600 * 1000).toISOString(),
          movesEstimatedTeu: 1000,
          craneGangs: 4
        }
      ];

      const collisions = detectBerthWindowCollisions(nonOverlappingCalls, 120);
      expect(collisions.length).toBe(0);
    });
  });

  describe('Landside Drayage & Intermodal Rebalancing', () => {
    it('should shift drayage appointment slots for delayed vessels and set warning status', () => {
      const collisions = detectBerthWindowCollisions(SEED_BERTH_CALLS, 120);
      const recalculated = recalculateDrayageAppointments(SEED_DRAYAGE_APPOINTMENTS, collisions);

      const isabellaApt = recalculated.find((a) => a.vesselName === 'MSC ISABELLA');
      expect(isabellaApt).toBeDefined();
      expect(isabellaApt?.status).toBe('ADJUSTED_WARNING');
      expect(new Date(isabellaApt!.adjustedSlotStart).getTime()).toBeGreaterThan(
        new Date(isabellaApt!.originalSlotStart).getTime()
      );
      expect(isabellaApt?.terminalGateWaitMinutesEstimate).toBeGreaterThan(35);
    });

    it('should keep unaffected appointments in original scheduled state', () => {
      const collisions = detectBerthWindowCollisions(SEED_BERTH_CALLS, 120);
      const recalculated = recalculateDrayageAppointments(SEED_DRAYAGE_APPOINTMENTS, collisions);

      const maerskApt = recalculated.find((a) => a.vesselName === 'MADRID MAERSK');
      expect(maerskApt).toBeDefined();
      expect(maerskApt?.status).toBe('SCHEDULED');
      expect(maerskApt?.adjustedSlotStart).toBe(maerskApt?.originalSlotStart);
    });
  });

  describe('FMC / OSRA D&D Free-Time Suspension Notice Generation', () => {
    it('should generate certified D&D suspension certificate with SHA-256 seal', () => {
      const cert = generateDDSuspensionCertificate({
        portCode: 'ESBCN',
        terminalName: 'BEST',
        vesselName: 'MSC ISABELLA',
        containerNo: 'MSCU7821903',
        reason: 'PORT_CONGESTION_ANCHORAGE_DWELL',
        dwellOrDelayHours: 52.0
      });

      expect(cert.certificateId).toContain('CERT-FMC-SUSP-ESBCN-');
      expect(cert.portName).toBe('Port de Barcelona');
      expect(cert.regulatoryBasis).toBe('FMC 46 CFR Part 541 / OSRA 2022');
      expect(cert.freeTimeClockStatus).toBe('TOLLED_SUSPENDED');
      expect(cert.digitalSignatureHash).toMatch(/^SHA256-[0-9a-f]{24}$/);
      expect(cert.qrCodeDigest).toContain('ATLAS-FMC://ESBCN/');
      expect(cert.legalNoticeText).toContain('SUSPENDIDO legalmente');
      expect(cert.legalNoticeText).toContain('MSCU7821903');
    });
  });

  describe('Iberian Port Hubs & Presets Integrity', () => {
    it('should provide certified presets for Barcelona, Valencia, and Algeciras', () => {
      expect(IBERIAN_PORT_HUBS.length).toBe(3);
      const codes = IBERIAN_PORT_HUBS.map((h) => h.portCode);
      expect(codes).toContain('ESBCN');
      expect(codes).toContain('ESVLC');
      expect(codes).toContain('ESALG');

      const bcn = IBERIAN_PORT_HUBS.find((h) => h.portCode === 'ESBCN')!;
      expect(bcn.landsideFacilities).toContain('CANTUNIS');
      expect(bcn.landsideFacilities).toContain('TLSA');

      const vlc = IBERIAN_PORT_HUBS.find((h) => h.portCode === 'ESVLC')!;
      expect(vlc.landsideFacilities).toContain('BERRIO');
    });
  });
});
