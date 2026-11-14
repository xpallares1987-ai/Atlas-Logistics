/**
 * @file PartnersRisk.tsx
 * @description Partner risk screening simulator (ISO 28000) and partner security census directory.
 * @module @atlas/frontend/components/AeoSecurity/Tab
 */

import { motion, Variants } from "framer-motion";
import { ShieldCheck, Building2, Download } from "lucide-react";
import { Input } from "@atlas/ui";

export interface PartnersRiskProps {
  partnerName: string;
  setPartnerName: (value: string) => void;
  partnerType: string;
  setPartnerType: (value: string) => void;
  hasAeo: boolean;
  setHasAeo: (val: boolean) => void;
  hasCtpat: boolean;
  setHasCtpat: (val: boolean) => void;
  hasIso28000: boolean;
  setHasIso28000: (val: boolean) => void;
  partnerScore: number;
  setPartnerScore: (val: number) => void;
  monthsAudit: number;
  setMonthsAudit: (val: number) => void;
  screeningResult: any;
  onSimulateScreening: () => void;
  partners: any[];
  itemVariants?: Variants;
}

export function PartnersRisk({
  partnerName,
  setPartnerName,
  partnerType,
  setPartnerType,
  hasAeo,
  setHasAeo,
  hasCtpat,
  setHasCtpat,
  hasIso28000,
  setHasIso28000,
  partnerScore,
  setPartnerScore,
  monthsAudit,
  setMonthsAudit,
  screeningResult,
  onSimulateScreening,
  partners,
  itemVariants,
}: PartnersRiskProps) {
  return (
    <motion.div variants={itemVariants} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Screening Simulator */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-500" />
            Cribado & Evaluación de Riesgo de Proveedor (ISO 28000)
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-500 block mb-1 font-medium">
                Nombre de la Empresa
              </label>
              <Input
                value={partnerName}
                onChange={(e) => setPartnerName(e.target.value)}
                className="text-xs"
              />
            </div>

            <div>
              <label className="text-slate-500 block mb-1 font-medium">
                Tipo de Actividad
              </label>
              <select
                value={partnerType}
                onChange={(e) => setPartnerType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
              >
                <option value="HAULIER_CARRIER">
                  Transportista por Carretera
                </option>
                <option value="CUSTOMS_BROKER">Agencia de Aduanas</option>
                <option value="WAREHOUSE_KEEPER">Operador de Almacén</option>
                <option value="SUPPLIER_PACKER">Empacador / Proveedor</option>
              </select>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                Acreditaciones de Seguridad:
              </span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasAeo}
                  onChange={(e) => setHasAeo(e.target.checked)}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span>Certificado OEA (AEOF / AEOS / AEOC) (+35 pts)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasCtpat}
                  onChange={(e) => setHasCtpat(e.target.checked)}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span>Certificación US C-TPAT (+15 pts)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasIso28000}
                  onChange={(e) => setHasIso28000(e.target.checked)}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span>Norma ISO 28000 Cadena de Suministro (+10 pts)</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="text-slate-500 block mb-1 font-medium">
                  Score Cuestionario (%)
                </label>
                <Input
                  type="number"
                  value={partnerScore}
                  onChange={(e) => setPartnerScore(Number(e.target.value))}
                  className="text-xs"
                />
              </div>
              <div>
                <label className="text-slate-500 block mb-1 font-medium">
                  Meses desde Auditoría
                </label>
                <Input
                  type="number"
                  value={monthsAudit}
                  onChange={(e) => setMonthsAudit(Number(e.target.value))}
                  className="text-xs"
                />
              </div>
            </div>

            <button
              onClick={onSimulateScreening}
              className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold shadow-md shadow-teal-600/20 transition-all text-xs"
            >
              Calcular Nivel de Riesgo & Homologación
            </button>

            {screeningResult && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-2 border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Puntuación Calculada:</span>
                  <span className="font-bold text-teal-600">
                    {screeningResult.calculatedRiskScore} / 100
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Nivel de Riesgo:</span>
                  <span
                    className={`font-bold ${
                      screeningResult.riskLevel === "LOW_RISK"
                        ? "text-emerald-600"
                        : screeningResult.riskLevel === "MEDIUM_RISK"
                          ? "text-amber-600"
                          : "text-red-600"
                    }`}
                  >
                    {screeningResult.riskLevel}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Estado:</span>
                  <span className="font-semibold">
                    {screeningResult.recommendedStatus}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Partners Master Table */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-teal-500" />
              Censo de Socios Comerciales & Cadena de Custodia
            </h3>
            <a
              href="/api/aeo-security/partners/risk-matrix-pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 font-semibold"
            >
              <Download className="w-3.5 h-3.5" />
              Descargar Matriz PDF
            </a>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400">
                  <th className="pb-2">Empresa</th>
                  <th className="pb-2">Tipo</th>
                  <th className="pb-2">Acreditación OEA</th>
                  <th className="pb-2">Puntuación</th>
                  <th className="pb-2">Riesgo</th>
                  <th className="pb-2 text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {partners.map((p: any) => (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                  >
                    <td className="py-2.5 font-semibold">{p.partnerName}</td>
                    <td className="py-2.5">
                      {p.partnerType?.replace(/_/g, " ")}
                    </td>
                    <td className="py-2.5">
                      {p.hasAeoCertification ? (
                        <span className="text-emerald-600 font-medium">
                          {p.aeoCertificateNumber || "Sí"}
                        </span>
                      ) : (
                        <span className="text-slate-400">No OEA</span>
                      )}
                    </td>
                    <td className="py-2.5 font-bold text-teal-600">
                      {p.securityQuestionnaireScore}%
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          p.riskLevel === "LOW_RISK"
                            ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300"
                            : p.riskLevel === "MEDIUM_RISK"
                              ? "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300"
                              : "bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300"
                        }`}
                      >
                        {p.riskLevel}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-medium">
                      {p.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
