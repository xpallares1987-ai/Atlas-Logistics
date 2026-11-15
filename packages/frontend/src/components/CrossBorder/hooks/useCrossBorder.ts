/**
 * @file useCrossBorder.ts
 * @description Custom React hook encapsulating SAT Carta Porte 3.1, USMCA RVC, IMMEX, and Customs ML state & SQLite bindings.
 * @module @atlas/frontend/components/CrossBorder/hooks
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { useState, useEffect } from "react";
import { useApiMutation, useApiQuery } from "../../../hooks/useApiQuery";
import { useShipments } from "../../../hooks/useShipments";
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
import {
  USMCA_DEMO_PRESETS,
  buildAndStampCartaPorte31,
  calculateUsmcaRegionalValueContent,
  calculateImmexTariffOptimization,
  predictCustomsDwellTime,
} from "@atlas/shared";
import type { CrossBorderTab } from "../../../types/cross-border.types";

export interface CrossBorderDeclarationRecord {
  id?: string;
  shipmentId?: string;
  distanceKm?: number;
  originDataJson?: string;
  destinationDataJson?: string;
  uuidFiscal?: string;
  idCcp?: string;
  qrCodeSatUrl?: string;
  xmlStamped?: string;
  cfdiFolio?: string;
  createdAt?: string | number;
  [key: string]: unknown;
}

export function mapDbDeclarationToStampingResult(
  dbDeclaration: CrossBorderDeclarationRecord,
): CartaPorteStampingResult {
  return {
    uuid: (dbDeclaration.uuidFiscal as string) || "UUID-MOCK",
    cfdiVersion: "4.0",
    cartaPorteVersion: "3.1",
    idCCP: (dbDeclaration.idCcp as string) || "CCP-MOCK",
    qrCodeSatUrl: (dbDeclaration.qrCodeSatUrl as string) || "",
    stampedXml: (dbDeclaration.xmlStamped as string) || "",
    pacProvider: "Diverza SAT Autorizado (5819)",
    stampTimestamp: new Date(
      (dbDeclaration.createdAt as string | number) || Date.now(),
    ).toISOString(),
    selloDigitalCsd: "SAT-CSD-VALIDATED-SQLITE",
    selloSat: "SAT-SEAL-VALIDATED-SQLITE",
    cadenaOriginal: `||4.0|${dbDeclaration.cfdiFolio || ""}||`,
    totalFreightMxn: Number(dbDeclaration.distanceKm) * 20 || 45000,
    totalWeightKg: 24000,
  };
}

export function useCrossBorder() {
  const [activeTab, setActiveTab] = useState<CrossBorderTab>("CARTA_PORTE");
  const [selectedShipmentId, setSelectedShipmentId] =
    useState<string>("sh_demo_01");
  const [copiedXml, setCopiedXml] = useState(false);
  const [copiedIdCCP, setCopiedIdCCP] = useState(false);

  const { data: shipments = [] } = useShipments();
  const activeShipment =
    shipments.find((s) => s.id === selectedShipmentId) || shipments[0];

  const { data: declarationsData, refetch: refetchDeclarations } = useApiQuery<{
    success: boolean;
    declarations: CrossBorderDeclarationRecord[];
  }>(
    ["cross-border-declarations", selectedShipmentId],
    `/cross-border/declarations?shipmentId=${selectedShipmentId}`,
  );
  const dbDeclaration = declarationsData?.declarations?.[0];

  const basePreset = USMCA_DEMO_PRESETS["laredo_automotive_immex"];
  const [cartaPorteData, setCartaPorteData] = useState<CartaPorteInput>(
    basePreset.cartaPorteInput as CartaPorteInput,
  );
  const [stampingResult, setStampingResult] =
    useState<CartaPorteStampingResult>(
      buildAndStampCartaPorte31(basePreset.cartaPorteInput as CartaPorteInput),
    );

  useEffect(() => {
    if (dbDeclaration) {
      setStampingResult(mapDbDeclarationToStampingResult(dbDeclaration));
      if (
        typeof dbDeclaration.originDataJson === "string" &&
        typeof dbDeclaration.destinationDataJson === "string"
      ) {
        try {
          const origin = JSON.parse(dbDeclaration.originDataJson);
          const dest = JSON.parse(dbDeclaration.destinationDataJson);
          setCartaPorteData((prev) => ({
            ...prev,
            shipmentRef: dbDeclaration.shipmentId || prev.shipmentRef,
            distanciaRecorridaKm:
              dbDeclaration.distanceKm || prev.distanciaRecorridaKm,
            origen: { ...prev.origen, ...origin },
            destino: { ...prev.destino, ...dest },
          }));
        } catch {
          // ignore parsing error
        }
      }
    }
  }, [dbDeclaration]);

  const [rvcInputData, setRvcInputData] = useState<UsmcaRvcInput>(
    basePreset.rvcInput as UsmcaRvcInput,
  );
  const [rvcResult, setRvcResult] = useState<UsmcaRvcResult>(
    calculateUsmcaRegionalValueContent(basePreset.rvcInput as UsmcaRvcInput),
  );

  const [immexInputData, setImmexInputData] =
    useState<ImmexTariffOptimizationInput>(
      basePreset.immexInput as ImmexTariffOptimizationInput,
    );
  const [immexResult, setImmexResult] = useState<ImmexTariffOptimizationResult>(
    calculateImmexTariffOptimization(
      basePreset.immexInput as ImmexTariffOptimizationInput,
    ),
  );

  const [dwellInputData, setDwellInputData] =
    useState<CustomsDwellPredictionInput>(
      basePreset.dwellInput as CustomsDwellPredictionInput,
    );
  const [dwellResult, setDwellResult] = useState<CustomsDwellPredictionResult>(
    predictCustomsDwellTime(
      basePreset.dwellInput as CustomsDwellPredictionInput,
    ),
  );

  const generateMutation = useApiMutation<
    {
      success: boolean;
      declaration: Record<string, unknown>;
      document: Record<string, unknown>;
    },
    { shipmentId: string }
  >("/cross-border/carta-porte/generate-for-shipment", "POST", {
    onSuccess: (res) => {
      refetchDeclarations();
      if (res?.declaration) {
        setStampingResult(mapDbDeclarationToStampingResult(res.declaration));
      }
    },
  });

  const stampMutation = useApiMutation<
    { success: boolean; data: CartaPorteStampingResult },
    CartaPorteInput
  >("/cross-border/carta-porte/stamp", "POST", {
    onSuccess: (res) => {
      setStampingResult(res.data);
      refetchDeclarations();
    },
  });

  const rvcMutation = useApiMutation<
    { success: boolean; data: UsmcaRvcResult },
    UsmcaRvcInput
  >("/cross-border/usmca/rvc", "POST", {
    onSuccess: (res) => setRvcResult(res.data),
  });

  const immexMutation = useApiMutation<
    { success: boolean; data: ImmexTariffOptimizationResult },
    ImmexTariffOptimizationInput
  >("/cross-border/immex/optimize", "POST", {
    onSuccess: (res) => setImmexResult(res.data),
  });

  const customsMutation = useApiMutation<
    { success: boolean; data: CustomsDwellPredictionResult },
    CustomsDwellPredictionInput
  >("/cross-border/customs/predict", "POST", {
    onSuccess: (res) => setDwellResult(res.data),
  });

  const handleCopyXml = () => {
    if (stampingResult?.stampedXml) {
      navigator.clipboard.writeText(stampingResult.stampedXml);
      setCopiedXml(true);
      setTimeout(() => setCopiedXml(false), 2000);
    }
  };

  const handleCopyIdCCP = () => {
    if (stampingResult?.idCCP) {
      navigator.clipboard.writeText(stampingResult.idCCP);
      setCopiedIdCCP(true);
      setTimeout(() => setCopiedIdCCP(false), 2000);
    }
  };

  return {
    activeTab,
    setActiveTab,
    selectedShipmentId,
    setSelectedShipmentId,
    copiedXml,
    copiedIdCCP,
    shipments,
    activeShipment,
    dbDeclaration,
    cartaPorteData,
    stampingResult,
    rvcInputData,
    setRvcInputData,
    rvcResult,
    immexInputData,
    setImmexInputData,
    immexResult,
    dwellInputData,
    setDwellInputData,
    dwellResult,
    generateMutation,
    stampMutation,
    rvcMutation,
    immexMutation,
    customsMutation,
    handleCopyXml,
    handleCopyIdCCP,
    handleExecuteStamping: () => stampMutation.mutate(cartaPorteData),
    handleExecuteRvc: () => rvcMutation.mutate(rvcInputData),
    handleExecuteImmex: () => immexMutation.mutate(immexInputData),
    handleExecuteCustomsPrediction: () =>
      customsMutation.mutate(dwellInputData),
  };
}
