/**
 * @file cross-border.types.ts
 * @description Types and interfaces for the North American Cross-Border Corridor (SAT Carta Porte 3.1, USMCA RVC, IMMEX, Customs ML).
 * @module @atlas/frontend/types
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import type {
  CartaPorteInput,
  CartaPorteStampingResult,
  UsmcaRvcInput,
  UsmcaRvcResult,
  ImmexTariffOptimizationInput,
  ImmexTariffOptimizationResult,
  CustomsDwellPredictionInput,
  CustomsDwellPredictionResult,
} from "@atlas/shared";

export type CrossBorderTab = "CARTA_PORTE" | "USMCA_IMMEX" | "CUSTOMS_ML";

export interface CartaPorteTabProps {
  cartaPorteData: CartaPorteInput;
  stampingResult: CartaPorteStampingResult;
  copiedXml: boolean;
  copiedIdCCP: boolean;
  isStamping: boolean;
  onExecuteStamping: () => void;
  onCopyXml: () => void;
  onCopyIdCCP: () => void;
}

export interface UsmcaImmexTabProps {
  rvcInputData: UsmcaRvcInput;
  setRvcInputData: (v: UsmcaRvcInput) => void;
  rvcResult: UsmcaRvcResult;
  isCalculatingRvc: boolean;
  onExecuteRvc: () => void;
  immexInputData: ImmexTariffOptimizationInput;
  setImmexInputData: (v: ImmexTariffOptimizationInput) => void;
  immexResult: ImmexTariffOptimizationResult;
  isOptimizingImmex: boolean;
  onExecuteImmex: () => void;
}

export interface CustomsMlTabProps {
  dwellInputData: CustomsDwellPredictionInput;
  setDwellInputData: (v: CustomsDwellPredictionInput) => void;
  dwellResult: CustomsDwellPredictionResult;
  isPredictingCustoms: boolean;
  onExecuteCustomsPrediction: () => void;
}
