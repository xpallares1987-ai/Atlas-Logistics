/**
 * @file port-congestion.service.ts
 * @description Orchestration service for Predictive Port Congestion & AIS Berth Delay Early Warning Engine.
 * Manages spatial geofencing, active vessel AIS telemetry, deterministic berth collision forecasting,
 * landside drayage/rail appointments, and FMC/OSRA D&D suspension notices for Iberian ports.
 */

import {
  IberianPortHub,
  VesselAisPosition,
  ScheduledBerthCall,
  BerthCollision,
  DrayageAppointment,
  DDSuspensionCertificate,
  IBERIAN_PORT_HUBS,
  SEED_AIS_VESSELS,
  SEED_BERTH_CALLS,
  SEED_DRAYAGE_APPOINTMENTS,
  detectBerthWindowCollisions,
  recalculateDrayageAppointments,
  generateDDSuspensionCertificate
} from '@atlas/shared';

export class PortCongestionService {
  private hubs: IberianPortHub[] = JSON.parse(JSON.stringify(IBERIAN_PORT_HUBS));
  private vessels: VesselAisPosition[] = JSON.parse(JSON.stringify(SEED_AIS_VESSELS));
  private berthCalls: ScheduledBerthCall[] = JSON.parse(JSON.stringify(SEED_BERTH_CALLS));
  private drayageAppointments: DrayageAppointment[] = JSON.parse(JSON.stringify(SEED_DRAYAGE_APPOINTMENTS));
  private certificates: DDSuspensionCertificate[] = [];

  constructor() {
    // Seed initial demo certificate
    this.certificates.push(
      generateDDSuspensionCertificate({
        portCode: 'ESBCN',
        terminalName: 'BEST',
        vesselName: 'MSC ISABELLA',
        containerNo: 'MSCU7821903',
        reason: 'PORT_CONGESTION_ANCHORAGE_DWELL',
        dwellOrDelayHours: 52.0,
        issuer: 'ESXPA (SuperAdmin / Systems Lead)'
      })
    );
  }

  /**
   * Retrieves all certified Iberian port hubs.
   */
  public getHubs(): IberianPortHub[] {
    return this.hubs;
  }

  /**
   * Retrieves a specific port hub by UN/LOCODE (e.g. ESBCN, ESVLC, ESALG).
   */
  public getHub(portCode: string): IberianPortHub | undefined {
    return this.hubs.find((h) => h.portCode === portCode.toUpperCase());
  }

  /**
   * Retrieves active vessel AIS telemetry, optionally filtered by destination port.
   */
  public getVessels(portCode?: string): VesselAisPosition[] {
    if (!portCode) return this.vessels;
    return this.vessels.filter((v) => v.destinationPortCode === portCode.toUpperCase());
  }

  /**
   * Detects deterministic berth window collisions.
   */
  public getBerthCollisions(portCode?: string, bufferMinutes: number = 120): BerthCollision[] {
    const collisions = detectBerthWindowCollisions(this.berthCalls, bufferMinutes);
    if (!portCode) return collisions;
    return collisions.filter((c) => c.portCode === portCode.toUpperCase());
  }

  /**
   * Resolves a detected berth collision by shifting the second vessel's ETA.
   */
  public resolveCollision(collisionId: string): { success: boolean; message: string; collision?: BerthCollision } {
    const collisions = detectBerthWindowCollisions(this.berthCalls, 120);
    const target = collisions.find((c) => c.collisionId === collisionId);

    if (!target) {
      return { success: false, message: `Colisión ${collisionId} no encontrada.` };
    }

    // Shift planned ETA and ETD of vesselB by the projected delay
    const callB = this.berthCalls.find((c) => c.callId === target.vesselB.callId);
    if (callB) {
      const delayMs = target.projectedDelayHours * 60 * 60 * 1000;
      callB.etaPlanned = new Date(new Date(callB.etaPlanned).getTime() + delayMs).toISOString();
      callB.etdPlanned = new Date(new Date(callB.etdPlanned).getTime() + delayMs).toISOString();
    }

    target.resolved = true;
    return {
      success: true,
      message: `Atraque de ${target.vesselB.vesselName} reprogramado exitosamente (+${target.projectedDelayHours}h). Conflicto resuelto.`,
      collision: target
    };
  }

  /**
   * Retrieves landside drayage and rail appointments.
   */
  public getDrayageAppointments(portCode?: string): DrayageAppointment[] {
    if (!portCode) return this.drayageAppointments;
    return this.drayageAppointments.filter((a) => a.targetPortCode === portCode.toUpperCase());
  }

  /**
   * Recalculates and adjusts landside drayage/rail appointments based on active berth collisions.
   */
  public rebalanceDrayageAppointments(portCode?: string): DrayageAppointment[] {
    const collisions = this.getBerthCollisions(portCode);
    this.drayageAppointments = recalculateDrayageAppointments(this.drayageAppointments, collisions);
    return this.getDrayageAppointments(portCode);
  }

  /**
   * Generates and stores a new FMC/OSRA D&D Free-Time Suspension Certificate.
   */
  public generateDDCertificate(params: {
    portCode: string;
    terminalName: string;
    vesselName: string;
    containerNo: string;
    reason: 'PORT_CONGESTION_ANCHORAGE_DWELL' | 'BERTH_COLLISION_DELAY' | 'TERMINAL_GATE_APPOINTMENT_UNAVAILABLE';
    dwellOrDelayHours: number;
    issuer?: 'ESXPA (SuperAdmin / Systems Lead)' | 'ESACA (Team Leader SAICA)';
  }): DDSuspensionCertificate {
    const cert = generateDDSuspensionCertificate(params);
    this.certificates.unshift(cert);
    return cert;
  }

  /**
   * Retrieves all issued D&D suspension certificates.
   */
  public getDDCertificates(): DDSuspensionCertificate[] {
    return this.certificates;
  }
}
