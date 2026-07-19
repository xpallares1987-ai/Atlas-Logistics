/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState } from "react";
import {
  Sparkles,
  RefreshCw,
  AlertCircle,
  TrendingDown,
  Users,
  Activity,
  FileDown,
} from "lucide-react";
import { FreightRate } from "../types";
import { getLogisticsInsights } from "../services/geminiService";
import { generateExecutiveReport } from "../services/reportService";

interface AIInsightsPanelProps {
  rates: FreightRate[];
}

const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({ rates }) => {
  const [insights, setInsights] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateInsights = async () => {
    if (rates.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getLogisticsInsights(rates);
      setInsights(result);
    } catch (err) {
      setError("No se pudo conectar con el servicio de IA.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!insights) return;
    setIsExporting(true);
    try {
      await generateExecutiveReport(rates, insights);
    } catch (err) {
      console.error("PDF Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      id="ai-insights-container"
      className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              Análisis Estratégico IA (Phase 4)
            </h3>
            <p className="text-[10px] text-slate-400 font-medium">
              Reportes ejecutivos e insights generados mediante Gemini 1.5
              Flash.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {insights && (
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-100"
            >
              {isExporting ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileDown className="h-3.5 w-3.5" />
              )}
              EXPORT PDF
            </button>
          )}
          <button
            onClick={generateInsights}
            disabled={loading || rates.length === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              loading || rates.length === 0
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200"
            }`}
          >
            {loading ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Activity className="h-3.5 w-3.5" />
            )}
            {insights ? "RE-ANALIZAR" : "GENERAR INSIGHTS"}
          </button>
        </div>
      </div>

      {!insights && !loading && !error && (
        <div className="border-2 border-dashed border-slate-100 rounded-2xl p-10 text-center">
          <Sparkles className="h-8 w-8 text-slate-200 mx-auto mb-3" />
          <p className="text-xs text-slate-400 font-medium max-w-xs mx-auto">
            Haga clic en el botón superior para realizar un análisis avanzado de
            las tarifas cargadas actualmente.
          </p>
        </div>
      )}

      {loading && (
        <div className="space-y-4 animate-pulse">
          <div className="h-3 bg-slate-100 rounded w-3/4"></div>
          <div className="h-3 bg-slate-100 rounded w-5/6"></div>
          <div className="h-3 bg-slate-100 rounded w-2/3"></div>
          <div className="h-3 bg-slate-100 rounded w-1/2"></div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-50 text-rose-700 rounded-xl border border-rose-100">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-xs font-bold">{error}</p>
        </div>
      )}

      {insights && !loading && (
        <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-5">
          <div className="prose prose-slate prose-sm max-w-none">
            <div className="text-slate-700 text-xs leading-relaxed space-y-3 whitespace-pre-line">
              {insights}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-150 grid grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-[9px] font-black text-slate-400 uppercase">
                Ahorro Estimado
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-indigo-500" />
              <span className="text-[9px] font-black text-slate-400 uppercase">
                Competencia Detectada
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-[9px] font-black text-slate-400 uppercase">
                Volatilidad de Rutas
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIInsightsPanel;
