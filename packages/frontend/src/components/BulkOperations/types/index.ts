/**
 * @file index.ts
 * @description Types and domain contracts for bulk operations, draft surveys, IMSBC/Grain codes, and tanker ullage.
 * @module @atlas/frontend/components/BulkOperations/types
 */

export interface VesselOperationRecord {
  id: string;
  vesselName: string;
  imoNumber: string;
  callSign: string;
  vesselType: string;
  portName: string;
  terminalName: string;
  berthNumber: string;
  cargoCategory: string;
  operationType: string;
  targetCargoTonnage: number;
  status: string;
}

export type BulkTab = "draft_survey" | "imsbc_grain" | "tanker_ullage";

export interface DraftSurveyInputs {
  fp: number;
  fs: number;
  ap: number;
  asDraft: number;
  mp: number;
  ms: number;
  lbp: number;
  lcf: number;
  tpc: number;
  mtc: number;
  waterDensity: number;
  hydroDisp: number;
  ballastDed: number;
  fuelDed: number;
  initialNetDisp: number;
}

export interface ImsbcGrainInputs {
  imsbcCargoName: string;
  imsbcGroup: string;
  imsbcMoisture: number;
  imsbcFmp: number;
  grainType: string;
  grainTonnage: number;
  grainSf: number;
  grainVhm: number;
  grainDisp: number;
  grainGm0: number;
}

export interface TankerUllageInputs {
  ullageProduct: string;
  ullageObsTemp: number;
  ullageDensity15: number;
  ullageTov: number;
  ullageFreeWater: number;
}
