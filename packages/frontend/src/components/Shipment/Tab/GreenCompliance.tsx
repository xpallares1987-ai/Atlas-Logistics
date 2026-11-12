/**
 * @file GreenCompliance.tsx
 * @description Environmental sustainability, CBAM emissions accounting, and customs compliance tab.
 * Renders Scope 3 GLEC v3.0 emissions, FuelEU Maritime penalties, and customs single window clearance.
 * @module @atlas/frontend/components/Shipment/Tab
 */

import React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileCode,
  FileSignature,
  FileText,
  Leaf,
  Plane,
  RefreshCw,
  Scale,
  ShieldCheck,
  Ship,
  Trees,
  Truck,
} from "lucide-react";
import {
  MletrRecordSummary,
  OperationalShipment360View,
  ShipmentDocumentItem,
  ShipmentGreenComplianceReadModel,
} from "../../../types/shipment-workspace360.types";

export interface ShipmentGreenComplianceTabProps {
  shipmentDetail: OperationalShipment360View;
  greenCompliance: ShipmentGreenComplianceReadModel | null;
  greenLoading: boolean;
  fetchGreenCompliance: (id: string) => Promise<void>;
  shipmentDocuments: ShipmentDocumentItem[];
  mletrRecord: MletrRecordSummary | null;
  handleDownloadDoc: (
    endpoint:
      "carbon-certificate" | "cbam-report" | "cbam-xml" | "dua-pdf" | "dua-xml",
    filename: string,
    successMsg: string,
  ) => Promise<void>;
  downloadingDoc: string | null;
  offsetPercentage: number;
  setOffsetPercentage: (pct: number) => void;
  setActionSuccessMessage: (msg: string) => void;
}

export const GreenCompliance: React.FC<ShipmentGreenComplianceTabProps> = ({
  shipmentDetail,
  greenCompliance,
  greenLoading,
  fetchGreenCompliance,
  shipmentDocuments,
  mletrRecord,
  handleDownloadDoc,
  downloadingDoc,
  offsetPercentage,
  setOffsetPercentage,
  setActionSuccessMessage,
}) => {
  return (
    <div className="space-y-6">
      {/* Header & Quick Official Document Downloads */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Leaf className="w-5 h-5 text-emerald-400" />
              Finanzas Verdes, CBAM & Despacho Aduanero
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Marco GLEC v3 / ISO 14083 • Reglamento (UE) 2023/956 CBAM • DUA /
              SAD Agencia Tributaria
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => fetchGreenCompliance(shipmentDetail.shipmentId)}
              disabled={greenLoading}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${greenLoading ? "animate-spin" : ""}`}
              />
              Recalcular
            </button>
          </div>
        </div>

        {/* Official Document Downloads Strip */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2.5">
          <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1">
            <Download className="w-3.5 h-3.5 text-slate-400" />
            Documentación Oficial:
          </span>

          {/* Multimodal Transport Document (e-AWB, e-CMR, Ocean B/L) */}
          {(() => {
            const st = (shipmentDetail.serviceType || "").toUpperCase();
            const isAir = st.includes("AIR");
            const isRoad = st.includes("ROAD");
            const matchedDoc = shipmentDocuments.find(
              (d) =>
                (isAir && d.type === "AWB") ||
                (isRoad && d.type === "ECMR") ||
                (!isAir && !isRoad && (d.type === "HBL" || d.type === "BOL")),
            );

            if (isAir) {
              return matchedDoc ? (
                <a
                  href={`/api/documents/${matchedDoc.id}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
                  title={`SHA-256: ${matchedDoc.sha256Hash}`}
                >
                  <Plane className="w-3.5 h-3.5 text-sky-400" />
                  e-AWB Digital ({matchedDoc.documentReference || "Oficial"})
                  <ShieldCheck className="w-3 h-3 text-emerald-400 ml-0.5" />
                </a>
              ) : (
                <span
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800/40 text-slate-400 border border-slate-700/40 text-xs font-medium flex items-center gap-1.5 opacity-70"
                  title="Emita el e-AWB completando la tarea en Operations Cockpit"
                >
                  <Plane className="w-3.5 h-3.5 text-slate-400" />
                  e-AWB (Pendiente en Cockpit)
                </span>
              );
            }

            if (isRoad) {
              return matchedDoc ? (
                <a
                  href={`/api/documents/${matchedDoc.id}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
                  title={`SHA-256: ${matchedDoc.sha256Hash}`}
                >
                  <Truck className="w-3.5 h-3.5 text-emerald-400" />
                  e-CMR Digital ({matchedDoc.documentReference || "Oficial"})
                  <ShieldCheck className="w-3 h-3 text-emerald-400 ml-0.5" />
                </a>
              ) : (
                <span
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800/40 text-slate-400 border border-slate-700/40 text-xs font-medium flex items-center gap-1.5 opacity-70"
                  title="Emita el e-CMR completando la tarea en Operations Cockpit"
                >
                  <Truck className="w-3.5 h-3.5 text-slate-400" />
                  e-CMR (Pendiente en Cockpit)
                </span>
              );
            }

            // Ocean
            return matchedDoc ? (
              <a
                href={`/api/documents/${matchedDoc.id}/pdf`}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
                title={`SHA-256: ${matchedDoc.sha256Hash}`}
              >
                <Ship className="w-3.5 h-3.5 text-blue-400" />
                Ocean B/L ({matchedDoc.documentReference || "Oficial"})
                <ShieldCheck className="w-3 h-3 text-emerald-400 ml-0.5" />
              </a>
            ) : (
              <span
                className="px-2.5 py-1.5 rounded-lg bg-slate-800/40 text-slate-400 border border-slate-700/40 text-xs font-medium flex items-center gap-1.5 opacity-70"
                title="Emita el Bill of Lading completando la tarea en Operations Cockpit"
              >
                <Ship className="w-3.5 h-3.5 text-slate-400" />
                Ocean B/L (Pendiente en Cockpit)
              </span>
            );
          })()}

          {/* UNCITRAL MLETR Negotiable e-Title Transferable Record Chip */}
          {mletrRecord ? (
            <a
              href="/smart-contracts"
              className="px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
              title={`UNCITRAL MLETR e-Title: ${mletrRecord.status} | Tenedor Legal: ${mletrRecord.currentHolder} | Endosos: ${mletrRecord.totalEndorsements}`}
            >
              <FileSignature className="w-3.5 h-3.5 text-indigo-400" />
              <span>e-Título MLETR ({mletrRecord.status})</span>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-200 px-1.5 py-0.5 rounded font-mono">
                {mletrRecord.currentHolderRole}:{" "}
                {mletrRecord.currentHolder.length > 18
                  ? mletrRecord.currentHolder.slice(0, 18) + "..."
                  : mletrRecord.currentHolder}
              </span>
              <ShieldCheck className="w-3 h-3 text-emerald-400 ml-0.5" />
            </a>
          ) : (
            <a
              href="/smart-contracts"
              className="px-2.5 py-1.5 rounded-lg bg-slate-800/40 text-slate-400 hover:text-slate-200 border border-slate-700/40 text-xs font-medium flex items-center gap-1.5 transition"
              title="Gestionar emisión y endoso de títulos negociables en Smart Contracts"
            >
              <FileSignature className="w-3.5 h-3.5 text-slate-400" />
              e-Título MLETR
            </a>
          )}

          {/* Other Emitted Vault Documents */}
          {shipmentDocuments
            .filter((d) => !["AWB", "ECMR", "HBL", "BOL"].includes(d.type))
            .map((doc) => (
              <a
                key={doc.id}
                href={`/api/documents/${doc.id}/pdf`}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
                title={`SHA-256: ${doc.sha256Hash}`}
              >
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                {doc.name}
                <ShieldCheck className="w-3 h-3 text-emerald-400 ml-0.5" />
              </a>
            ))}

          <button
            onClick={() =>
              handleDownloadDoc(
                "carbon-certificate",
                `CERT-SCOPE3-${shipmentDetail.shipmentReference || shipmentDetail.shipmentId}.pdf`,
                "Certificado de Emisiones Scope 3 (PDF) descargado.",
              )
            }
            disabled={downloadingDoc === "carbon-certificate"}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            Certificado Scope 3 (PDF)
          </button>

          <button
            onClick={() =>
              handleDownloadDoc(
                "cbam-report",
                `CBAM-DECLARATION-${shipmentDetail.shipmentReference || shipmentDetail.shipmentId}.pdf`,
                "Informe CBAM Reg. 2023/956 (PDF) descargado.",
              )
            }
            disabled={downloadingDoc === "cbam-report"}
            className="px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-400" />
            Informe CBAM (PDF)
          </button>

          <button
            onClick={() =>
              handleDownloadDoc(
                "cbam-xml",
                `CBAM-REGISTRY-${shipmentDetail.shipmentReference || shipmentDetail.shipmentId}.xml`,
                "Declaración CBAM para Registro Transitorio UE (XML) descargada.",
              )
            }
            disabled={downloadingDoc === "cbam-xml"}
            className="px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <FileCode className="w-3.5 h-3.5 text-indigo-400" />
            CBAM XML (UE)
          </button>

          <button
            onClick={() =>
              handleDownloadDoc(
                "dua-pdf",
                `DUA-LEVANTE-${shipmentDetail.shipmentReference || shipmentDetail.shipmentId}.pdf`,
                "Documento Único Administrativo DUA (PDF) descargado.",
              )
            }
            disabled={downloadingDoc === "dua-pdf"}
            className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            DUA Aduanero (PDF)
          </button>

          <button
            onClick={() =>
              handleDownloadDoc(
                "dua-xml",
                `DUA-AEAT-${shipmentDetail.shipmentReference || shipmentDetail.shipmentId}.xml`,
                "Mensaje EDIFACT/XML de Despacho AEAT descargado.",
              )
            }
            disabled={downloadingDoc === "dua-xml"}
            className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <FileCode className="w-3.5 h-3.5 text-amber-400" />
            DUA XML (AEAT)
          </button>
        </div>
      </div>

      {greenLoading && !greenCompliance ? (
        <div className="p-12 text-center text-xs text-slate-500 bg-slate-900 rounded-2xl border border-slate-800">
          Calculando contabilidad verde y estado aduanero...
        </div>
      ) : !greenCompliance ? (
        <div className="p-12 text-center text-xs text-slate-500 bg-slate-900 rounded-2xl border border-slate-800">
          No hay datos disponibles de cumplimiento verde para este envío.
        </div>
      ) : (
        <>
          {/* Grid 1: Operational Calculation (GLEC v3.0 Scope 3 & Insetting) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Scope 3 Footprint Breakdown */}
            <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Leaf className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-sm font-bold text-white">
                    Huella de Carbono Scope 3 (GLEC v3 / ISO 14083)
                  </h4>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  {greenCompliance.glec.certificateNumber}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] font-semibold text-slate-400">
                    Total Well-to-Wheels (WTW)
                  </div>
                  <div className="text-lg font-bold text-emerald-400 mt-1">
                    {greenCompliance.glec.totalTco2eWtw.toFixed(3)}{" "}
                    <span className="text-[11px] font-normal text-slate-400">
                      tCO2e
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {(greenCompliance.glec.totalTco2eWtw * 1000).toFixed(0)} kg
                    CO2e
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] font-semibold text-slate-400">
                    Direct Tank-to-Wheels (TTW)
                  </div>
                  <div className="text-lg font-bold text-slate-200 mt-1">
                    {greenCompliance.glec.totalTco2eTtw.toFixed(3)}{" "}
                    <span className="text-[11px] font-normal text-slate-400">
                      tCO2e
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Operacional directo
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] font-semibold text-slate-400">
                    Upstream Well-to-Tank (WTT)
                  </div>
                  <div className="text-lg font-bold text-slate-200 mt-1">
                    {greenCompliance.glec.totalTco2eWtt.toFixed(3)}{" "}
                    <span className="text-[11px] font-normal text-slate-400">
                      tCO2e
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Producción combustible
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] font-semibold text-slate-400">
                    Intensidad de Carbono
                  </div>
                  <div className="text-lg font-bold text-cyan-400 mt-1">
                    {greenCompliance.glec.carbonIntensityGco2ePerTkm.toFixed(1)}{" "}
                    <span className="text-[11px] font-normal text-slate-400">
                      g/t-km
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Normalizada por carga
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
                <div>
                  <span className="font-semibold text-slate-300">
                    Modo de Transporte:
                  </span>{" "}
                  {greenCompliance.glec.transportMode}
                </div>
                <div>
                  <span className="font-semibold text-slate-300">
                    Distancia Corredor:
                  </span>{" "}
                  {greenCompliance.glec.totalDistanceKm.toLocaleString()} km
                </div>
                <div>
                  <span className="font-semibold text-slate-300">
                    Carga Útil:
                  </span>{" "}
                  {(greenCompliance.glec.totalWeightKg / 1000).toFixed(1)}{" "}
                  toneladas
                </div>
                <div className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {greenCompliance.glec.methodology}
                </div>
              </div>
            </div>

            {/* Operational Insetting & Carbon Neutrality Calculation */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-emerald-950/30 border border-emerald-500/30 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Trees className="w-4 h-4 text-emerald-400" />
                    Compensación & Neutralidad de Carbono
                  </h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Gold Standard
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Compense las emisiones Scope 3 de este viaje con créditos de
                  carbono verificados.
                </p>

                {/* Percentage selector */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">
                      Nivel de Compensación:
                    </span>
                    <span className="font-bold text-emerald-300 font-mono">
                      {offsetPercentage}%
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[50, 100, 150, 200].map((pct) => (
                      <button
                        key={pct}
                        onClick={() => setOffsetPercentage(pct)}
                        className={`py-1 text-xs font-semibold rounded-lg transition border ${
                          offsetPercentage === pct
                            ? "bg-emerald-500/30 text-emerald-200 border-emerald-500/50"
                            : "bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200"
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cost calculation */}
                <div className="p-3 rounded-xl bg-slate-950/80 border border-emerald-500/20 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Créditos Necesarios:</span>
                    <span className="font-bold text-slate-200 font-mono">
                      {(
                        (greenCompliance.glec.offsetRecommendation
                          ?.creditsNeededTons ||
                          greenCompliance.glec.totalTco2eWtw) *
                        (offsetPercentage / 100)
                      ).toFixed(2)}{" "}
                      tCO2e
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Benchmark Precio:</span>
                    <span className="font-mono text-slate-300">
                      €
                      {greenCompliance.glec.offsetRecommendation
                        ?.pricePerTonEur || 25.0}{" "}
                      / ton
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-200">
                      Inversión Estimada:
                    </span>
                    <span className="text-base font-bold text-emerald-400 font-mono">
                      €
                      {(
                        (greenCompliance.glec.offsetRecommendation
                          ?.creditsNeededTons ||
                          greenCompliance.glec.totalTco2eWtw) *
                        (offsetPercentage / 100) *
                        (greenCompliance.glec.offsetRecommendation
                          ?.pricePerTonEur || 25)
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-300">
                    Proyecto Destino:
                  </span>{" "}
                  {greenCompliance.glec.offsetRecommendation?.projectName ||
                    "Corredor Andino de Reforestación (VCS-1842)"}
                </div>
              </div>

              <button
                onClick={() =>
                  setActionSuccessMessage(
                    `Certificado de compensación verde simulación al ${offsetPercentage}% registrado con éxito.`,
                  )
                }
                className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50"
              >
                <Trees className="w-4 h-4" />
                Aplicar Insetting al {offsetPercentage}%
              </button>
            </div>
          </div>

          {/* Grid 2: EU CBAM Governance & Customs Clearance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* EU CBAM Card */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-indigo-400" />
                  <h4 className="text-sm font-bold text-white">
                    Pasivo Financiero CBAM (Reglamento UE 2023/956)
                  </h4>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    greenCompliance.cbam.isApplicable
                      ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                      : "bg-slate-800 text-slate-400 border border-slate-700"
                  }`}
                >
                  {greenCompliance.cbam.isApplicable
                    ? "Regulado Anexo I"
                    : "Exento"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] font-semibold text-slate-400">
                    Emisiones Embebidas Totales
                  </div>
                  <div className="text-lg font-bold text-slate-100 mt-1">
                    {greenCompliance.cbam.totalEmbeddedEmissionsTco2e.toFixed(
                      2,
                    )}{" "}
                    <span className="text-[11px] font-normal text-slate-400">
                      tCO2e
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Directas:{" "}
                    {greenCompliance.cbam.directEmissionsTco2e.toFixed(1)}t •
                    Indirectas:{" "}
                    {greenCompliance.cbam.indirectEmissionsTco2e.toFixed(1)}t
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] font-semibold text-slate-400">
                    Pasivo CBAM Estimado
                  </div>
                  <div className="text-lg font-bold text-indigo-400 mt-1">
                    €
                    {greenCompliance.cbam.estimatedCbamLiabilityEur.toLocaleString(
                      "es-ES",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      },
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    EU ETS Benchmark: €
                    {greenCompliance.cbam.euEtsBenchmarkPriceEur.toFixed(2)}/t
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Categoría Arancelaria:</span>
                  <span className="font-semibold text-slate-200">
                    {greenCompliance.cbam.productCategory}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">
                    Partidas Arancelarias (HS):
                  </span>
                  <span className="font-mono text-slate-300">
                    {greenCompliance.cbam.applicableHsCodes.join(", ")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">
                    Periodo de Notificación:
                  </span>
                  <span className="text-slate-300 font-semibold">
                    {greenCompliance.cbam.reportingPeriod}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                  <span className="text-slate-400">
                    Registro Transitorio UE:
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {greenCompliance.cbam.transitionalRegistryStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* Customs DUA / SAD Card */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <h4 className="text-sm font-bold text-white">
                    Despacho Aduanero & Levante (AEAT DUA / SAD)
                  </h4>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                    greenCompliance.customs.channel === "GREEN"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : greenCompliance.customs.channel === "ORANGE"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                  }`}
                >
                  CANAL {greenCompliance.customs.channel}
                </span>
              </div>

              {/* Active Hold Alert if present */}
              {greenCompliance.customs.hasActiveHold ? (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-1.5">
                  <div className="flex items-center gap-2 text-rose-300 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    Retención Aduanera Activa (Gating Operativo Activo)
                  </div>
                  <p className="text-xs text-rose-200">
                    {greenCompliance.customs.activeHoldReason ||
                      "Inspección física o revisión documental pendiente. El envío está bloqueado hasta la emisión del levante aduanero."}
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  Sin retenciones activas. Despacho en regla conforme a
                  normativa aduanera UE.
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="text-[10px] text-slate-400">
                    MRN de Despacho
                  </div>
                  <div className="font-mono font-bold text-slate-200 truncate">
                    {greenCompliance.customs.mrnNumber}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Régimen: {greenCompliance.customs.procedureType}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="text-[10px] text-slate-400">
                    Aduana Principal
                  </div>
                  <div className="font-bold text-slate-200">
                    {greenCompliance.customs.customsOfficeLocode}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    EORI: {greenCompliance.customs.declarantEori}
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">
                    Expedidor / Exportador:
                  </span>
                  <span className="font-semibold text-slate-200">
                    {greenCompliance.customs.exporterParty}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">
                    Destinatario / Importador:
                  </span>
                  <span className="font-semibold text-slate-200">
                    {greenCompliance.customs.importerParty}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                  <span className="text-slate-400">
                    Historial de Inspecciones:
                  </span>
                  <span className="text-slate-300">
                    {greenCompliance.customs.inspectionHoldsCount}{" "}
                    intervenciones registradas
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export const GreenComplianceTab = GreenCompliance;
export const ShipmentGreenComplianceTab = GreenCompliance;
