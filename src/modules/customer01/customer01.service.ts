/**
 * @file customer01.service.ts
 * @description Orchestration service for Customer01 Logistics Platform (Corredor Book TEST01 · DEPT-TEST01).
 */

import {
  Customer01Albaran,
  Customer01Exception,
  Customer01Coil,
  Customer01StowageResult,
  Customer01Warehouse,
  SEED_CUSTOMER01_ALBARANES,
  SEED_CUSTOMER01_EXCEPTIONS,
  detectCustomer01Vehicle,
  verifyCustomer01ContainerStowage,
  validateCustomer01RoleAssignment,
  ISO_40HC_PAYLOAD_LIMIT_KG,
} from '@atlas/shared';

export class Customer01Service {
  private albaranes: Customer01Albaran[] = JSON.parse(JSON.stringify(SEED_CUSTOMER01_ALBARANES));
  private exceptions: Customer01Exception[] = JSON.parse(JSON.stringify(SEED_CUSTOMER01_EXCEPTIONS));

  public getAlbaranes(): Customer01Albaran[] {
    return this.albaranes;
  }

  public getAlbaran(id: string): Customer01Albaran | undefined {
    return this.albaranes.find((a) => a.albaranId === id || a.albaranNumber === id);
  }

  public uploadAlbaran(input: {
    albaranNumber: string;
    factoryOrigin: string;
    destinationWarehouse: Customer01Warehouse;
    vehicleIdentifier: string;
    coils: Customer01Coil[];
    targetContainerNumber?: string;
  }): Customer01Albaran {
    const vehicleDetection = detectCustomer01Vehicle(input.destinationWarehouse, input.vehicleIdentifier);

    const totalWeight = input.coils.reduce((acc, c) => acc + (c.grossWeightKg || 0), 0);

    const albaran: Customer01Albaran = {
      albaranId: `ALB-CUST01-${Date.now()}`,
      albaranNumber: input.albaranNumber,
      factoryOrigin: input.factoryOrigin,
      destinationWarehouse: input.destinationWarehouse,
      expeditionDate: new Date().toISOString(),
      vehicleIdentifier: input.vehicleIdentifier.trim().toUpperCase(),
      vehicleDetection,
      coils: input.coils,
      totalNetWeightKg: totalWeight,
      targetContainerNumber: input.targetContainerNumber,
      status: 'UNLOADED_IN_STOCK',
    };

    this.albaranes.unshift(albaran);
    return albaran;
  }

  public getExceptions(): Customer01Exception[] {
    return this.exceptions;
  }

  public uploadException(input: {
    warehouse: Customer01Warehouse;
    exceptionType: any;
    severity: any;
    affectedCoilId?: string;
    affectedVehicleId?: string;
    description: string;
    reportedByRole: 'ADMIN' | 'TEST01';
    reportedByName: string;
  }): Customer01Exception {
    // Validate role governance
    const roleValidation = validateCustomer01RoleAssignment(input.reportedByRole, input.reportedByName);
    if (!roleValidation.allowed) {
      throw new Error(roleValidation.reason || 'Rol no autorizado para reportar incidencias operativas.');
    }

    const exception: Customer01Exception = {
      exceptionId: `EXC-CUST01-${Date.now()}`,
      timestamp: new Date().toISOString(),
      warehouse: input.warehouse,
      exceptionType: input.exceptionType,
      severity: input.severity,
      affectedCoilId: input.affectedCoilId,
      affectedVehicleId: input.affectedVehicleId,
      description: input.description,
      reportedByRole: input.reportedByRole,
      reportedByName: input.reportedByName,
      resolved: false,
    };

    this.exceptions.unshift(exception);
    return exception;
  }

  public verifyStowage(coils: Customer01Coil[], payloadLimitKg: number = ISO_40HC_PAYLOAD_LIMIT_KG): Customer01StowageResult {
    return verifyCustomer01ContainerStowage(coils, payloadLimitKg);
  }

  public verifyAssignment(roleCode: string, personName: string): { allowed: boolean; reason?: string } {
    return validateCustomer01RoleAssignment(roleCode, personName);
  }
}

export const SaicaService = Customer01Service;
