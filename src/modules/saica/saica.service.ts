/**
 * @file saica.service.ts
 * @description Orchestration service for SAICA Logistics & FMS Platform (Corredor Book 012 · BCN.FE.FE01.012).
 */

import {
  SaicaAlbaran,
  SaicaException,
  SaicaCoil,
  SaicaStowageResult,
  SaicaWarehouse,
  SEED_SAICA_ALBARANES,
  SEED_SAICA_EXCEPTIONS,
  detectSaicaVehicle,
  verifySaicaContainerStowage,
  validateSaicaRoleAssignment,
  ISO_40HC_PAYLOAD_LIMIT_KG
} from '@atlas/shared';

export class SaicaService {
  private albaranes: SaicaAlbaran[] = JSON.parse(JSON.stringify(SEED_SAICA_ALBARANES));
  private exceptions: SaicaException[] = JSON.parse(JSON.stringify(SEED_SAICA_EXCEPTIONS));

  public getAlbaranes(): SaicaAlbaran[] {
    return this.albaranes;
  }

  public getAlbaran(id: string): SaicaAlbaran | undefined {
    return this.albaranes.find((a) => a.albaranId === id || a.albaranNumber === id);
  }

  public uploadAlbaran(input: {
    albaranNumber: string;
    factoryOrigin: string;
    destinationWarehouse: SaicaWarehouse;
    vehicleIdentifier: string;
    coils: SaicaCoil[];
    targetContainerNumber?: string;
  }): SaicaAlbaran {
    const vehicleDetection = detectSaicaVehicle(input.destinationWarehouse, input.vehicleIdentifier);

    const totalWeight = input.coils.reduce((acc, c) => acc + (c.grossWeightKg || 0), 0);

    const albaran: SaicaAlbaran = {
      albaranId: `ALB-SAICA-${Date.now()}`,
      albaranNumber: input.albaranNumber,
      factoryOrigin: input.factoryOrigin,
      destinationWarehouse: input.destinationWarehouse,
      expeditionDate: new Date().toISOString(),
      vehicleIdentifier: input.vehicleIdentifier.trim().toUpperCase(),
      vehicleDetection,
      coils: input.coils,
      totalNetWeightKg: totalWeight,
      targetContainerNumber: input.targetContainerNumber,
      status: 'UNLOADED_IN_STOCK'
    };

    this.albaranes.unshift(albaran);
    return albaran;
  }

  public getExceptions(): SaicaException[] {
    return this.exceptions;
  }

  public uploadException(input: {
    warehouse: SaicaWarehouse;
    exceptionType: any;
    severity: any;
    affectedCoilId?: string;
    affectedVehicleId?: string;
    description: string;
    reportedByRole: 'ESXPA' | 'ESACA';
    reportedByName: string;
  }): SaicaException {
    // Validate role governance
    const roleValidation = validateSaicaRoleAssignment(input.reportedByRole, input.reportedByName);
    if (!roleValidation.allowed) {
      throw new Error(roleValidation.reason || 'Rol no autorizado para reportar incidencias operativas.');
    }

    const exception: SaicaException = {
      exceptionId: `EXC-SAICA-${Date.now()}`,
      timestamp: new Date().toISOString(),
      warehouse: input.warehouse,
      exceptionType: input.exceptionType,
      severity: input.severity,
      affectedCoilId: input.affectedCoilId,
      affectedVehicleId: input.affectedVehicleId,
      description: input.description,
      reportedByRole: input.reportedByRole,
      reportedByName: input.reportedByName,
      resolved: false
    };

    this.exceptions.unshift(exception);
    return exception;
  }

  public verifyStowage(coils: SaicaCoil[], payloadLimitKg: number = ISO_40HC_PAYLOAD_LIMIT_KG): SaicaStowageResult {
    return verifySaicaContainerStowage(coils, payloadLimitKg);
  }

  public verifyAssignment(roleCode: string, personName: string): { allowed: boolean; reason?: string } {
    return validateSaicaRoleAssignment(roleCode, personName);
  }
}
