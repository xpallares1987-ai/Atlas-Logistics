/**
 * @file Header.tsx
 * @description Header hero banner, AEO compliance KPIs, and tab controls.
 * @module @atlas/frontend/components/AeoSecurity
 */

import { motion, Variants } from "framer-motion";
import {
  ShieldCheck,
  Download,
  CheckCircle2,
  Lock,
  Building2,
  FileText,
  Truck,
  ClipboardList,
} from "lucide-react";
import { AeoTabKey } from "./types/index";

export interface HeaderProps {
  activeTab: AeoTabKey;
  onTabChange: (tab: AeoTabKey) => void;
  inspectionsCount: number;
  sealsCount: number;
  partnersCount: number;
  itemVariants?: Variants;
}

export function Header({
  activeTab,
  onTabChange,
  inspectionsCount,
  sealsCount,
  partnersCount,
  itemVariants,
}: HeaderProps) {
  return (
    <>
      {/* Top Banner */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-900 via-sky-950 to-blue-900 p-6 rounded-2xl border border-sky-800/40 shadow-xl shadow-sky-950/20 text-white"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/20 border border-sky-400/30 rounded-xl text-sky-300">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Operador Económico Autorizado (OEA / AEO) & Seguridad
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30 font-medium">
                  CAU Art. 38-39 / C-TPAT / ISO 28000
                </span>
              </h1>
              <p className="text-sm text-slate-300">
                Auditoría continua CAE (AEAT / DG TAXUD), protocolo de
                inspección en 7 puntos, precintos ISO 17712 y homologación de
                cadena logística
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/api/aeo-security/partners/risk-matrix-pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-lg shadow-teal-900/30 transition-all border border-teal-400/30"
          >
            <Download className="w-4 h-4" />
            Matriz de Riesgo Socios PDF
          </a>
        </div>
      </motion.div>

      {/* Top KPI Cards */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Score Global OEA (% CAE)
            </span>
            <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              94.5%
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Estatuto OEAF Plenamente Acreditado
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Inspecciones 7 Puntos
            </span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <ClipboardList className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {inspectionsCount} Unidades
            </div>
            <p className="text-xs text-sky-600 dark:text-sky-400 mt-1 flex items-center gap-1 font-medium">
              C-TPAT / OEAS Protocolo Activo
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Precintos ISO 17712 (Clase H)
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <Lock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {sealsCount} Precintos
            </div>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 flex items-center gap-1 font-medium">
              100% Mecánicos de Alta Seguridad
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Socios Homologados ISO 28000
            </span>
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {partnersCount} Socios
            </div>
            <p className="text-xs text-teal-600 dark:text-teal-400 mt-1 flex items-center gap-1 font-medium">
              Cadena de Custodia Segura
            </p>
          </div>
        </div>
      </motion.div>

      {/* Tabs Navigation */}
      <motion.div
        variants={itemVariants}
        className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2"
      >
        <button
          onClick={() => onTabChange("CAE_AUDITS")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "CAE_AUDITS"
              ? "bg-sky-600 text-white shadow-md shadow-sky-600/30"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          <FileText className="w-4 h-4" />
          Auditoría OEA & Cuestionario CAE (6 Bloques)
        </button>

        <button
          onClick={() => onTabChange("SEVEN_POINT_SEALS")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "SEVEN_POINT_SEALS"
              ? "bg-sky-600 text-white shadow-md shadow-sky-600/30"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          <Lock className="w-4 h-4" />
          Inspección en 7 Puntos & Precintos ISO 17712
        </button>

        <button
          onClick={() => onTabChange("PARTNERS_RISK")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "PARTNERS_RISK"
              ? "bg-sky-600 text-white shadow-md shadow-sky-600/30"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          <Truck className="w-4 h-4" />
          Homologación de Socios & Riesgo ISO 28000
        </button>
      </motion.div>
    </>
  );
}
