/**
 * @file useBulkOperations.ts
 * @description Hook managing maritime bulk terminal operations, draft surveys, and regulatory calculations.
 * @module @atlas/frontend/components/BulkOperations/hooks
 */

import { useState } from "react";
import {
  VesselOperationRecord,
  BulkTab,
  DraftSurveyInputs,
  ImsbcGrainInputs,
  TankerUllageInputs,
} from "../types/index";

export const INITIAL_VESSEL_OPS: VesselOperationRecord[] = [
  {
    id: "bulk_op_capesize_01",
    vesselName: "MV Cape Finisterre",
    imoNumber: "9482012",
    callSign: "EABF",
    vesselType: "CAPESIZE_BULKER",
    portName: "Puerto de Gijón (ESGIJ)",
    terminalName: "Terminal de Graneles Sólidos El Musel",
    berthNumber: "Muelle de Graneles 1",
    cargoCategory: "SOLID_MINERAL_BULK",
    operationType: "LOADING",
    targetCargoTonnage: 120000.0,
    status: "OPERATIONS_IN_PROGRESS",
  },
  {
    id: "bulk_op_grain_01",
    vesselName: "MV Ceres Grain",
    imoNumber: "9321845",
    callSign: "C6XY8",
    vesselType: "PANAMAX_BULKER",
    portName: "Puerto de Valencia (ESVLC)",
    terminalName: "Terminal Agroalimentaria Silval",
    berthNumber: "Muelle de la Xitxarra",
    cargoCategory: "AGRICULTURAL_GRAIN_BULK",
    operationType: "LOADING",
    targetCargoTonnage: 65000.0,
    status: "OPERATIONS_IN_PROGRESS",
  },
  {
    id: "bulk_op_tanker_01",
    vesselName: "MT Atlantic Energy",
    imoNumber: "9610234",
    callSign: "IBEZ",
    vesselType: "PRODUCT_TANKER",
    portName: "Puerto de Huelva (ESHUV)",
    terminalName: "Terminal de Hidrocarburos Decal",
    berthNumber: "Muelle Petrolero Pantalán 2",
    cargoCategory: "CLEAN_LIQUID_BULK",
    operationType: "DISCHARGING",
    targetCargoTonnage: 35000.0,
    status: "OPERATIONS_IN_PROGRESS",
  },
];

export function useBulkOperations() {
  const [activeTab, setActiveTab] = useState<BulkTab>("draft_survey");
  const [vesselOps] = useState<VesselOperationRecord[]>(INITIAL_VESSEL_OPS);
  const [selectedOp, setSelectedOp] = useState<VesselOperationRecord>(
    vesselOps[0],
  );

  // Tab 1: Draft Survey State
  const [draftInputs, setDraftInputs] = useState<DraftSurveyInputs>({
    fp: 15.6,
    fs: 15.64,
    ap: 16.1,
    asDraft: 16.14,
    mp: 15.86,
    ms: 15.9,
    lbp: 220.0,
    lcf: -0.8,
    tpc: 82.0,
    mtc: 1100.0,
    waterDensity: 1.022,
    hydroDisp: 137800.0,
    ballastDed: 1200.0,
    fuelDed: 1350.0,
    initialNetDisp: 14343.34,
  });

  // Tab 2: IMSBC & Grain State
  const [imsbcGrainInputs, setImsbcGrainInputs] = useState<ImsbcGrainInputs>({
    imsbcCargoName: "IRON ORE CONCENTRATE",
    imsbcGroup: "GROUP_A_LIQUEFACTION",
    imsbcMoisture: 8.5,
    imsbcFmp: 11.0,
    grainType: "WHEAT",
    grainTonnage: 65000,
    grainSf: 1.35,
    grainVhm: 12500,
    grainDisp: 82000,
    grainGm0: 1.15,
  });

  // Tab 3: Tanker Ullage ASTM State
  const [ullageInputs, setUllageInputs] = useState<TankerUllageInputs>({
    ullageProduct: "AVIATION TURBINE FUEL JET A-1",
    ullageObsTemp: 22.0,
    ullageDensity15: 0.7985,
    ullageTov: 44000.0,
    ullageFreeWater: 20.0,
  });

  // Draft Survey Computations
  const fm = (draftInputs.fp + draftInputs.fs) / 2;
  const am = (draftInputs.ap + draftInputs.asDraft) / 2;
  const mm = (draftInputs.mp + draftInputs.ms) / 2;
  const apparentTrim = am - fm;
  const dqm = (fm + 6 * mm + am) / 8;
  const c1 =
    draftInputs.lbp > 0
      ? (apparentTrim * draftInputs.lcf * draftInputs.tpc * 100) /
        draftInputs.lbp
      : 0;
  const c2 =
    draftInputs.lbp > 0
      ? (50 * Math.pow(apparentTrim, 2) * 0.05) / draftInputs.lbp
      : 0;
  const densityFactor = draftInputs.waterDensity / 1.025;
  const correctedDisp =
    Math.round((draftInputs.hydroDisp + c1 + c2) * densityFactor * 100) / 100;
  const totalDeductibles =
    draftInputs.ballastDed + draftInputs.fuelDed + 180 + 250;
  const netDisp = Math.round((correctedDisp - totalDeductibles) * 100) / 100;
  const cargoLoaded =
    Math.round(Math.max(0, netDisp - draftInputs.initialNetDisp) * 100) / 100;

  // IMSBC Computations
  const tml =
    imsbcGrainInputs.imsbcFmp > 0
      ? Math.round(imsbcGrainInputs.imsbcFmp * 0.9 * 100) / 100
      : undefined;
  const isImsbcOk =
    tml !== undefined ? imsbcGrainInputs.imsbcMoisture <= tml : true;

  // Grain Computations
  const grainHm =
    Math.round(
      (imsbcGrainInputs.grainVhm /
        (imsbcGrainInputs.grainSf * imsbcGrainInputs.grainDisp)) *
        1000,
    ) / 1000;
  const grainTheta =
    Math.round(
      Math.atan(grainHm / Math.max(0.01, imsbcGrainInputs.grainGm0)) *
        (180 / Math.PI) *
        100,
    ) / 100;
  const isGrainOk = grainTheta <= 12.0 && imsbcGrainInputs.grainGm0 >= 0.3;

  // Ullage Computations
  const gov = Math.max(
    0,
    ullageInputs.ullageTov - ullageInputs.ullageFreeWater,
  );
  const deltaT = ullageInputs.ullageObsTemp - 15.0;
  const alpha15 = 613.9723 / Math.pow(ullageInputs.ullageDensity15 * 1000, 2);
  const vcf =
    Math.round(
      Math.exp(-alpha15 * deltaT * (1 + 0.8 * alpha15 * deltaT)) * 10000,
    ) / 10000;
  const gsv = Math.round(gov * vcf * 100) / 100;
  const massAir =
    Math.round(gsv * Math.max(0, ullageInputs.ullageDensity15 - 0.0011) * 100) /
    100;

  return {
    activeTab,
    setActiveTab,
    vesselOps,
    selectedOp,
    setSelectedOp,
    draftInputs,
    setDraftInputs,
    imsbcGrainInputs,
    setImsbcGrainInputs,
    ullageInputs,
    setUllageInputs,
    // Derived computations
    draftCalculations: {
      fm,
      am,
      mm,
      apparentTrim,
      dqm,
      c1,
      c2,
      densityFactor,
      correctedDisp,
      totalDeductibles,
      netDisp,
      cargoLoaded,
    },
    imsbcCalculations: {
      tml,
      isImsbcOk,
    },
    grainCalculations: {
      grainHm,
      grainTheta,
      isGrainOk,
    },
    ullageCalculations: {
      gov,
      deltaT,
      alpha15,
      vcf,
      gsv,
      massAir,
    },
  };
}
