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

export function mapDbDeclarationToStampingResult(
  dbDeclaration: any,
): CartaPorteStampingResult {
  return {
    uuid: dbDeclaration.uuidFiscal,
    cfdiVersion: "4.0",
    cartaPorteVersion: "3.1",
    idCCP: dbDeclaration.idCcp,
    qrCodeSatUrl: dbDeclaration.qrCodeSatUrl,
    stampedXml: dbDeclaration.xmlStamped,
    pacProvider: "Diverza SAT Autorizado (5819)",
    stampTimestamp: new Date(
      dbDeclaration.createdAt || Date.now(),
    ).toISOString(),
    selloDigitalCsd: "SAT-CSD-VALIDATED-SQLITE",
    selloSat: "SAT-SEAL-VALIDATED-SQLITE",
    cadenaOriginal: `||4.0|${dbDeclaration.cfdiFolio}||`,
    totalFreightMxn: dbDeclaration.distanceKm * 20 || 45000,
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
    declarations: any[];
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
      if (dbDeclaration.originDataJson && dbDeclaration.destinationDataJson) {
        try {
          const origin = JSON.parse(dbDeclaration.originDataJson);
          const dest = JSON.parse(dbDeclaration.destinationDataJson);
          setCartaPorteData((prev) => ({
            ...prev,
            shipmentRef: dbDeclaration.shipmentId,
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
    { success: boolean; declaration: any; document: any },
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
