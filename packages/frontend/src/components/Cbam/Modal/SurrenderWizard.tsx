/**
 * @file SurrenderWizardModal.tsx
 * @description Two-step wizard modal for executing definitive CBAM certificate surrender with accredited verifier validation and SHA-256 seal.
 * @module @atlas/frontend/components/Cbam/Modal/SurrenderWizardModal
 * @see {@link docs/adr/0042-maritime-decarbonization-and-cbam-financial-ledger.md}
 */

import React, { useState, useMemo } from "react";
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Lock,
  Copy,
  Check,
  Scale,
} from "lucide-react";
import {
  CbamCertificateLot,
  CbamDeclaration,
  CbamSurrenderResult,
} from "../../../types/cbam.types";

export interface SurrenderWizardProps {
  isOpen: boolean;
  onClose: () => void;
  declarations: CbamDeclaration[];
  certificateLots: CbamCertificateLot[];
  activeEtsPrice?: number;
  onConfirmSurrender: (params: {
    declarationId: string;
    verifierName: string;
    verifierAccreditationNumber: string;
    verificationReportId: string;
  }) => Promise<CbamSurrenderResult>;
}

export type SurrenderWizardModalProps = SurrenderWizardProps;

export const SurrenderWizard: React.FC<SurrenderWizardProps> = ({
  isOpen,
  onClose,
  declarations,
  certificateLots,
  activeEtsPrice = 85.5,
  onConfirmSurrender,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedDeclarationId, setSelectedDeclarationId] =
    useState<string>("");
  const [verifierName, setVerifierName] = useState(
    "SGS International Verification SA",
  );
  const [verifierAccreditationNumber, setVerifierAccreditationNumber] =
    useState("ENAC-045/V-012");
  const [verificationReportId, setVerificationReportId] = useState(
    () => `VER-CBAM-2026-${Date.now().toString().slice(-4)}`,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [surrenderResult, setSurrenderResult] =
    useState<CbamSurrenderResult | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);

  // Filter declarations eligible for surrender
  const eligibleDeclarations = useMemo(() => {
    return declarations.filter(
      (d) =>
        d.status === "VALIDATED" ||
        d.status === "SUBMITTED_REGISTRY" ||
        d.status === "PENDING_SURRENDER",
    );
  }, [declarations]);

  // Set default selected declaration
  React.useEffect(() => {
    if (eligibleDeclarations.length > 0 && !selectedDeclarationId) {
      setSelectedDeclarationId(eligibleDeclarations[0].id);
    }
  }, [eligibleDeclarations, selectedDeclarationId]);

  const selectedDeclaration = useMemo(() => {
    return declarations.find((d) => d.id === selectedDeclarationId) || null;
  }, [declarations, selectedDeclarationId]);

  // Total certificates needed: ceil(netCarbonLiabilityEur / etsPrice)
  const certsRequired = useMemo(() => {
    if (!selectedDeclaration) return 0;
    return Math.ceil(
      Math.max(0, selectedDeclaration.netCarbonLiabilityEur / activeEtsPrice),
    );
  }, [selectedDeclaration, activeEtsPrice]);

  // Total available in active lots
  const activeLots = useMemo(() => {
    return certificateLots.filter(
      (l) => l.status === "ACTIVE" && l.quantityAvailable > 0,
    );
  }, [certificateLots]);

  const totalAvailable = useMemo(() => {
    return activeLots.reduce((acc, l) => acc + l.quantityAvailable, 0);
  }, [activeLots]);

  const hasInsufficientCertificates = certsRequired > totalAvailable;

  // FIFO Simulation
  const fifoSimulation = useMemo(() => {
    let remaining = certsRequired;
    const allocations: Array<{
      lotReference: string;
      unitPriceEur: number;
      available: number;
      toConsume: number;
      exhausts: boolean;
    }> = [];

    for (const lot of activeLots) {
      if (remaining <= 0) break;
      const toConsume = Math.min(lot.quantityAvailable, remaining);
      allocations.push({
        lotReference: lot.lotReference,
        unitPriceEur: lot.unitPriceEur,
        available: lot.quantityAvailable,
        toConsume,
        exhausts: toConsume === lot.quantityAvailable,
      });
      remaining -= toConsume;
    }

    return allocations;
  }, [certsRequired, activeLots]);

  if (!isOpen) return null;

  const handleStep1Next = () => {
    if (!selectedDeclaration) {
      setErrorMessage("Selecciona una declaración válida.");
      return;
    }
    if (hasInsufficientCertificates) {
      setErrorMessage(
        `Saldo insuficiente: Se requieren ${certsRequired} certificados pero solo hay ${totalAvailable} disponibles en cartera. Adquiere lotes adicionales antes de liquidar.`,
      );
      return;
    }
    setErrorMessage(null);
    setStep(2);
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (
      !verifierName ||
      !verifierAccreditationNumber ||
      !verificationReportId
    ) {
      setErrorMessage(
        "Todos los campos del verificador independiente (Art. 8) son obligatorios.",
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await onConfirmSurrender({
        declarationId: selectedDeclarationId,
        verifierName,
        verifierAccreditationNumber,
        verificationReportId,
      });
      setSurrenderResult(res);
      setStep(3);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Error al ejecutar entrega de certificados",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyHash = () => {
    if (surrenderResult?.surrenderPayloadHashSha256) {
      navigator.clipboard.writeText(surrenderResult.surrenderPayloadHashSha256);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-emerald-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-gradient-to-r from-emerald-950/40 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Asistente de Entrega de Certificados (Surrender Wizard)
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Paso {step} de 3
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Liquidación definitiva y sellado criptográfico no repudiable
                (Reg. UE 2023/956 Art. 8 & 22)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-medium">
              {errorMessage}
            </div>
          )}

          {/* STEP 1: Declaration Selection & FIFO Allocation Preview */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Seleccionar Declaración a Liquidar
                </label>
                {eligibleDeclarations.length === 0 ? (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                    No hay declaraciones en estado VALIDADO pendientes de
                    entrega de certificados.
                  </div>
                ) : (
                  <select
                    value={selectedDeclarationId}
                    onChange={(e) => setSelectedDeclarationId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500/50"
                  >
                    {eligibleDeclarations.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.declarationNumber} — Periodo {d.reportingPeriod} (
                        {d.importerName})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {selectedDeclaration && (
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <p className="text-[11px] text-slate-400">Masa Neta</p>
                      <p className="text-sm font-bold text-white">
                        {selectedDeclaration.totalNetMassTonnes.toLocaleString()}{" "}
                        t
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400">
                        Emisiones Directas
                      </p>
                      <p className="text-sm font-bold text-emerald-400">
                        {selectedDeclaration.totalDirectEmissionsTco2e.toLocaleString()}{" "}
                        tCO2e
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400">
                        Deuda Neta Liquidable
                      </p>
                      <p className="text-sm font-bold text-rose-400">
                        {selectedDeclaration.netCarbonLiabilityEur.toLocaleString()}{" "}
                        €
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400">
                        Certificados Requeridos
                      </p>
                      <p className="text-base font-black text-amber-300">
                        {certsRequired} certs
                      </p>
                    </div>
                  </div>

                  {/* Stock Availability Indicator */}
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      Saldo en Cartera:{" "}
                      <strong className="text-white">
                        {totalAvailable} certs
                      </strong>
                    </span>
                    {hasInsufficientCertificates ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-rose-400 font-bold">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Déficit de {certsRequired - totalAvailable} certificados
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Cobertura 100% disponible
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* FIFO Allocation Preview Table */}
              {fifoSimulation.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-emerald-400" />
                    Simulación de Consumo FIFO de Lotes
                  </h4>
                  <div className="rounded-xl border border-white/10 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-800/80 text-slate-400">
                        <tr>
                          <th className="px-3 py-2">Lote</th>
                          <th className="px-3 py-2">Precio Adquisición</th>
                          <th className="px-3 py-2">Saldo Disponible</th>
                          <th className="px-3 py-2">A Deducir</th>
                          <th className="px-3 py-2">Estado Post-Entrega</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {fifoSimulation.map((sim) => (
                          <tr
                            key={sim.lotReference}
                            className="hover:bg-white/5"
                          >
                            <td className="px-3 py-2 font-mono text-emerald-400">
                              {sim.lotReference}
                            </td>
                            <td className="px-3 py-2 text-white">
                              {sim.unitPriceEur.toFixed(2)} €
                            </td>
                            <td className="px-3 py-2 text-slate-300">
                              {sim.available} certs
                            </td>
                            <td className="px-3 py-2 font-bold text-amber-300">
                              -{sim.toConsume} certs
                            </td>
                            <td className="px-3 py-2">
                              {sim.exhausts ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-700 text-slate-400">
                                  AGOTADO
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                                  {sim.available - sim.toConsume} REMANENTE
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleStep1Next}
                  disabled={hasInsufficientCertificates || !selectedDeclaration}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white shadow-lg shadow-emerald-600/25 transition-all flex items-center gap-2"
                >
                  Siguiente: Acreditación Verificador
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Verifier Accreditation & Audit Details */}
          {step === 2 && (
            <form onSubmit={handleStep2Submit} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs">
                <strong>Requisito Artículo 8 (Reg. UE 2023/956):</strong> La
                entrega de certificados exige dictamen emitido por un
                verificador independiente acreditado conforme al Reglamento de
                Ejecución (UE) 2018/2067.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nombre de la Entidad Verificadora Acreditada
                </label>
                <input
                  type="text"
                  value={verifierName}
                  onChange={(e) => setVerifierName(e.target.value)}
                  required
                  placeholder="ej. SGS International Verification SA"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Nº de Acreditación Oficial (ENAC, DAkkS, COFRAC)
                  </label>
                  <input
                    type="text"
                    value={verifierAccreditationNumber}
                    onChange={(e) =>
                      setVerifierAccreditationNumber(e.target.value)
                    }
                    required
                    placeholder="ENAC-045/V-012"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    ID Dictamen / Informe de Verificación
                  </label>
                  <input
                    type="text"
                    value={verificationReportId}
                    onChange={(e) => setVerificationReportId(e.target.value)}
                    required
                    placeholder="VER-CBAM-2026-993"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Atrás
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/25 transition-all flex items-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  {isSubmitting
                    ? "Sellando Transacción..."
                    : "Liquidar y Sellar Criptográficamente"}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Non-Repudiation Confirmation & SHA-256 Seal Display */}
          {step === 3 && surrenderResult && (
            <div className="space-y-4 text-center py-2 animate-fade-in">
              <div className="inline-flex p-3 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  Certificados CBAM Entregados con Éxito
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Declaración {surrenderResult.declarationNumber} actualizada a
                  estado CERTIFICATES_SURRENDERED.
                </p>
              </div>

              {/* SHA-256 Non-Repudiation Seal Card */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-emerald-500/30 text-left space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    Sello Criptográfico Inmutable (SHA-256)
                  </span>
                  <button
                    onClick={handleCopyHash}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs flex items-center gap-1 transition-all"
                  >
                    {copiedHash ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    {copiedHash ? "Copiado" : "Copiar Hash"}
                  </button>
                </div>
                <p className="font-mono text-xs text-slate-300 break-all bg-slate-900 p-2.5 rounded-xl border border-white/5">
                  {surrenderResult.surrenderPayloadHashSha256}
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 pt-1">
                  <div>
                    Ref. Entrega:{" "}
                    <strong className="text-white">
                      {surrenderResult.surrenderReference}
                    </strong>
                  </div>
                  <div>
                    Certificados Entregados:{" "}
                    <strong className="text-white">
                      {surrenderResult.totalCertificatesSurrendered}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-all"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const SurrenderWizardModal = SurrenderWizard;
