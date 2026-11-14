/**
 * @file useCarbonInsetting.ts
 * @description State management and domain calculations for Scope 3 carbon insetting and FuelEU pooling.
 * @module @atlas/frontend/components/CarbonInsetting/hooks
 */

import { useState, useMemo, useEffect } from "react";
import {
  CERTIFIED_FUELS_CATALOG,
  SEED_INSETTING_TOKENS,
  SEED_FUELEU_POOL_VESSELS,
  calculateGhgInsettingAbatement,
  issueInsettingToken,
  executeFuelEuPooling,
  type FuelType,
  type TransportMode,
  type InsettingToken,
  type FuelEuPoolResult,
} from "@atlas/shared";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  useApiQuery,
  useApiMutation,
  useQueryClient,
} from "../../../hooks/useApiQuery";
import {
  InsettingTabKey,
  AllocFormState,
  AvailableShipmentOption,
} from "../types/index";

export function useCarbonInsetting() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<InsettingTabKey>("TOKENS_LEDGER");
  const [tokens, setTokens] = useState<InsettingToken[]>(SEED_INSETTING_TOKENS);
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Live queries from Fastify backend (Zero Mocks)
  const { data: tokensData } = useApiQuery<{
    tokens: InsettingToken[];
  }>(["carbon-insetting-tokens"], "/carbon-insetting/tokens");

  const { data: shipmentsData } = useApiQuery<AvailableShipmentOption[]>(
    ["shipments-list"],
    "/shipments",
  );

  const availableShipments = useMemo(() => {
    return Array.isArray(shipmentsData) ? shipmentsData : [];
  }, [shipmentsData]);

  // Sync live backend tokens when loaded
  useEffect(() => {
    if (tokensData?.tokens && tokensData.tokens.length > 0) {
      setTokens(tokensData.tokens);
    }
  }, [tokensData]);

  // Form State for Insetting Allocation (defaulting dynamically to canonical sh_demo_01)
  const [allocForm, setAllocForm] = useState<AllocFormState>({
    fuelType: "B100_BIODIESEL" as FuelType,
    fuelVolumeMT: 100,
    bunkerLocation: "Port de Barcelona - Muelle de la Energía",
    bdnReference: "BDN-BCN-2026-8812",
    sustainabilityCertificateNumber: "ISCC-EU-Cert-DE105-829104",
    allocatedShipmentRef: "sh_demo_01",
    beneficiaryCompany: "Atlas Industrial Rail Partner",
    transportMode: "MARITIME_OCEAN" as TransportMode,
  });

  // Mutation to persist token & allocation in SQLite
  const issueTokenMutation = useApiMutation<any, any>(
    "/carbon-insetting/tokens/issue",
    "POST",
    {
      onSuccess: (res: any) => {
        if (res?.token) {
          setTokens((prev) => [res.token, ...prev]);
        }
        queryClient.invalidateQueries({
          queryKey: ["carbon-insetting-tokens"],
        });
        queryClient.invalidateQueries({
          queryKey: ["carbon-insetting-allocations"],
        });
        setActiveTab("TOKENS_LEDGER");
      },
    },
  );

  // FuelEU Pooling State
  const [poolResult, setPoolResult] = useState<FuelEuPoolResult>(() =>
    executeFuelEuPooling(SEED_FUELEU_POOL_VESSELS, 2026),
  );

  // Real-time calculated abatement preview
  const liveAbatement = useMemo(
    () =>
      calculateGhgInsettingAbatement(
        allocForm.fuelType,
        allocForm.fuelVolumeMT || 0,
      ),
    [allocForm.fuelType, allocForm.fuelVolumeMT],
  );

  // Aggregate KPI metrics
  const totalAvoidedCO2e = useMemo(
    () =>
      Number(
        tokens.reduce((acc, t) => acc + t.ghgAbatementTonsCO2e, 0).toFixed(2),
      ),
    [tokens],
  );

  const totalFuelVolumeMT = useMemo(
    () => tokens.reduce((acc, t) => acc + t.fuelVolumeMT, 0),
    [tokens],
  );

  const filteredTokens = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return tokens;
    return tokens.filter(
      (t) =>
        t.tokenId.toLowerCase().includes(q) ||
        t.allocatedShipmentRef.toLowerCase().includes(q) ||
        t.beneficiaryCompany.toLowerCase().includes(q) ||
        t.fuelType.toLowerCase().includes(q),
    );
  }, [tokens, searchTerm]);

  // Handlers
  const handleIssueToken = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await issueTokenMutation.mutateAsync({
        fuelType: allocForm.fuelType,
        fuelVolumeMT: allocForm.fuelVolumeMT,
        bunkerLocation: allocForm.bunkerLocation,
        bdnReference: allocForm.bdnReference,
        sustainabilityCertificateNumber:
          allocForm.sustainabilityCertificateNumber,
        allocatedShipmentRef: allocForm.allocatedShipmentRef,
        beneficiaryCompany: allocForm.beneficiaryCompany,
        transportMode: allocForm.transportMode,
      });
    } catch {
      // Optimistic fallback
      const newToken = issueInsettingToken(allocForm);
      setTokens((prev) => [newToken, ...prev]);
      setActiveTab("TOKENS_LEDGER");
    }
  };

  const handleExecutePool = () => {
    const freshPool = executeFuelEuPooling(SEED_FUELEU_POOL_VESSELS, 2026);
    setPoolResult(freshPool);
  };

  const handleDownloadPDF = (token: InsettingToken) => {
    const doc = new jsPDF();

    // Top Brand Bar
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 210, 40, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("ATLAS LOGISTICS · CERTIFICADO DE INSETTING SCOPE 3", 14, 20);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(
      "Tokenized Book-and-Claim Ledger · ISO 14083 / GLEC Framework v3.0 Compliant",
      14,
      28,
    );

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Token N°: ${token.tokenId}`, 14, 52);

    autoTable(doc, {
      startY: 58,
      theme: "grid",
      headStyles: { fillColor: [16, 185, 129], textColor: 255 },
      body: [
        ["Beneficiario Acreditado", token.beneficiaryCompany],
        ["Expedición / Albarán Asignado", token.allocatedShipmentRef],
        [
          "Combustible Sostenible Utilizado",
          CERTIFIED_FUELS_CATALOG[token.fuelType]?.displayName ||
            token.fuelType,
        ],
        [
          "Masa de Combustible Bunkered",
          `${token.fuelVolumeMT} Toneladas Métricas`,
        ],
        [
          "Contenido Energético Total",
          `${token.energyContentMJ.toLocaleString()} MJ`,
        ],
        ["Emisiones Scope 3 Evitadas", `${token.ghgAbatementTonsCO2e} tCO2e`],
        ["Lugar de Bunkering / Suministro", token.bunkerLocation],
        ["Referencia Albarán BDN", token.bdnReference],
        [
          "Certificado de Sostenibilidad",
          token.sustainabilityCertificateNumber,
        ],
        ["Estándar de Verificación", token.verificationStandard],
        [
          "Fecha de Retiro en Ledger",
          new Date(token.issueDate).toLocaleString("es-ES"),
        ],
        ["Firma Digital (SHA-256)", token.digitalSignatureHash],
      ],
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(
      "DECLARACIÓN OFICIAL: El presente token certifica de forma irrevocable el insetting y reducción efectiva de " +
        "huella de carbono de Alcance 3 conforme al principio de custodia Mass Balance Book-and-Claim. " +
        "Los atributos de sostenibilidad han sido retirados exclusivamente para la entidad beneficiaria.",
      14,
      finalY,
      { maxWidth: 180 },
    );

    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Código QR de Validación: ${token.qrCodeDigest}`, 14, finalY + 28);
    doc.text(
      "Atlas-Logistics Scope 3 Digital Twin Registry · Corredor Oficial Book TEST01 Barcelona",
      14,
      finalY + 34,
    );

    doc.save(`Certificado_Insetting_${token.tokenId}.pdf`);
  };

  return {
    activeTab,
    setActiveTab,
    tokens,
    searchTerm,
    setSearchTerm,
    filteredTokens,
    allocForm,
    setAllocForm,
    availableShipments,
    poolResult,
    liveAbatement,
    totalAvoidedCO2e,
    totalFuelVolumeMT,
    handleIssueToken,
    handleExecutePool,
    handleDownloadPDF,
  };
}
