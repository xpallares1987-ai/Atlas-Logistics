/**
 * @file CaeAudits.tsx
 * @description OEA / AEO audit dossier, CAE questionnaire (6 blocks under UCC Art. 39).
 * @module @atlas/frontend/components/AeoSecurity/Tab
 */

import { motion, Variants } from "framer-motion";
import {
  Search,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
} from "lucide-react";
import { Input } from "@atlas/ui";

export interface CaeAuditsProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  loadingAudits: boolean;
  filteredAudits: any[];
  selectedAudit: any;
  onSelectAudit: (audit: any) => void;
  itemVariants?: Variants;
}

export function CaeAudits({
  searchQuery,
  onSearchChange,
  loadingAudits,
  filteredAudits,
  selectedAudit,
  onSelectAudit,
  itemVariants,
}: CaeAuditsProps) {
  return (
    <motion.div variants={itemVariants} className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar por referencia de auditoría o auditor..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {loadingAudits ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Cargando expedientes de auditoría OEA...
            </div>
          ) : filteredAudits.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No se encontraron auditorías con los criterios indicados.
            </div>
          ) : (
            filteredAudits.map((audit: any) => (
              <div
                key={audit.id}
                onClick={() => onSelectAudit(audit)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                  selectedAudit?.id === audit.id
                    ? "bg-sky-50/50 dark:bg-sky-950/20 border-sky-500 dark:border-sky-500/50 shadow-md"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold text-xs">
                      {audit.aeoModality?.split("_")[0]}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {audit.auditReference}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {audit.leadAuditorName} • Fecha: {audit.auditDate}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-base font-bold text-sky-600 dark:text-sky-400">
                      {audit.overallReadinessScore}%
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        audit.complianceStatus === "CERTIFIED_APPROVED"
                          ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300"
                          : audit.complianceStatus === "AUDIT_READY"
                            ? "bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300"
                            : "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300"
                      }`}
                    >
                      {audit.complianceStatus}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                  <span>Estándar: {audit.targetStandard}</span>
                  <a
                    href={`/api/aeo-security/audits/${audit.id}/cae-report-pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 text-sky-600 hover:text-sky-700 font-medium"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Dossier CAE PDF
                  </a>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Audit Detail Panel */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-sky-500" />
            Desglose CAE por Bloques CAU Art. 39
          </h3>

          {selectedAudit ? (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Expediente:</span>
                  <span className="font-semibold">
                    {selectedAudit.auditReference}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Certificado OEA:</span>
                  <span className="font-semibold text-emerald-600">
                    {selectedAudit.aeoOfficialCertificateNumber ||
                      "En Tramitación"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Próxima Reevaluación:</span>
                  <span className="font-semibold">
                    {selectedAudit.nextReviewDate}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {[
                  { name: "B1: Información General", score: 100, ok: true },
                  {
                    name: "B2: Cumplimiento Aduanero (Art. 39a)",
                    score: selectedAudit.customsComplianceScore,
                    ok: selectedAudit.customsComplianceScore >= 90,
                  },
                  {
                    name: "B3: Registros Comerciales (Art. 39b)",
                    score: selectedAudit.commercialRecordsScore,
                    ok: selectedAudit.commercialRecordsScore >= 85,
                  },
                  {
                    name: "B4: Solvencia Financiera (Art. 39c)",
                    score: selectedAudit.financialSolvencyScore,
                    ok: selectedAudit.financialSolvencyScore >= 80,
                  },
                  {
                    name: "B5: Cualificación Profesional (Art. 39d)",
                    score: selectedAudit.competenceScore,
                    ok: selectedAudit.competenceScore >= 80,
                  },
                  {
                    name: "B6: Seguridad & Protección (Art. 39e)",
                    score: selectedAudit.securitySafetyScore,
                    ok: selectedAudit.securitySafetyScore >= 85,
                  },
                ].map((b, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 text-xs"
                  >
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      {b.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sky-600 dark:text-sky-400">
                        {b.score}%
                      </span>
                      {b.ok ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <a
                  href={`/api/aeo-security/audits/${selectedAudit.id}/cae-report-pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md shadow-sky-600/20 transition-all"
                >
                  <Download className="w-4 h-4" />
                  Descargar Informe Oficial CAE PDF
                </a>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-500">
              Selecciona una auditoría del listado para ver su desglose oficial
              de bloques.
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
