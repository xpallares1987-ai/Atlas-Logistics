/**
 * @file carbon-insetting.service.ts
 * @description Orchestration service for Scope 3 Carbon Insetting and FuelEU Maritime Pooling.
 */

import {
  FuelType,
  TransportMode,
  LifeCycleFuelData,
  InsettingToken,
  PoolVesselInput,
  FuelEuPoolResult,
  CERTIFIED_FUELS_CATALOG,
  SEED_INSETTING_TOKENS,
  SEED_FUELEU_POOL_VESSELS,
  issueInsettingToken,
  executeFuelEuPooling
} from '@atlas/shared';

export class CarbonInsettingService {
  private tokens: InsettingToken[] = JSON.parse(JSON.stringify(SEED_INSETTING_TOKENS));
  private poolVessels: PoolVesselInput[] = JSON.parse(JSON.stringify(SEED_FUELEU_POOL_VESSELS));
  private executedPools: FuelEuPoolResult[] = [];

  constructor() {
    // Seed initial executed pool for 2026
    this.executedPools.push(executeFuelEuPooling(this.poolVessels, 2026));
  }

  public getFuelsCatalog(): Record<FuelType, LifeCycleFuelData> {
    return CERTIFIED_FUELS_CATALOG;
  }

  public getInsettingTokens(): InsettingToken[] {
    return this.tokens;
  }

  public issueToken(params: {
    fuelType: FuelType;
    fuelVolumeMT: number;
    bunkerLocation: string;
    bdnReference: string;
    sustainabilityCertificateNumber: string;
    allocatedShipmentRef: string;
    beneficiaryCompany: string;
    transportMode: TransportMode;
  }): InsettingToken {
    const token = issueInsettingToken(params);
    this.tokens.unshift(token);
    return token;
  }

  public getPoolVessels(): PoolVesselInput[] {
    return this.poolVessels;
  }

  public executePooling(vessels?: PoolVesselInput[], reportingYear: number = 2026): FuelEuPoolResult {
    const targetVessels = vessels && vessels.length > 0 ? vessels : this.poolVessels;
    const pool = executeFuelEuPooling(targetVessels, reportingYear);
    this.executedPools.unshift(pool);
    return pool;
  }

  public getPoolHistory(): FuelEuPoolResult[] {
    return this.executedPools;
  }
}
