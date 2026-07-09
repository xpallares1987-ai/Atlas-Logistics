"use client";

import { useState } from "react";
import { Zap, AlertTriangle, ShieldCheck, Clock, Loader2 } from "lucide-react";
import { MilestoneStepper, getStandardOceanMilestones } from "@atlas/ui";

interface AIPrediction {
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  predictedDelayDays: number;
  adjustedEta: string;
  reasoning: string;
  confidenceScore: number;
}

interface AIPredictiveTrackerProps {
  shipment: any; // Mapped shipment
}

export function AIPredictiveTracker({ shipment }: AIPredictiveTrackerProps) {
  const [prediction, setPrediction] = useState<AIPrediction | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handlePredict = async () => {
    setIsLoading(true);
    try {
      const { getApp } = await import("firebase/app");
      const { getFunctions, httpsCallable } = await import("firebase/functions");
      const app = getApp();
      const functions = getFunctions(app);
      
      const predictETA = httpsCallable(functions, "predictETA");
      
      const result = await predictETA({
        shipmentData: {
          trackingNumber: shipment?.shipment_ref || "UNK-000",
          origin: shipment?.pol || "Shanghai",
          destination: shipment?.pod || "Rotterdam",
          status: shipment?.status || "IN_TRANSIT",
          weight: shipment?.weight_kg || 15000,
        }
      });
      
      const data = result.data as any;
      if (data.success && data.data) {
        setPrediction(data.data);
      }
    } catch (err) {
      console.error("Error predicting ETA:", err);
      // Fallback for demo if backend fails or no API key
      setPrediction({
        riskLevel: Math.random() > 0.5 ? "MEDIUM" : "LOW",
        predictedDelayDays: Math.floor(Math.random() * 5),
        adjustedEta: new Date(Date.now() + 86400000 * 15).toISOString().split('T')[0],
        reasoning: "Posible congestión portuaria debido a temporal en ruta. (Fallback Simulation)",
        confidenceScore: 85
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case "HIGH":
        return <span className="flex items-center gap-1.5 bg-rose-500/20 border border-rose-500/40 text-rose-400 px-3 py-1 rounded-full text-xs font-bold shadow-[0_0_15px_-3px_rgba(244,63,94,0.4)]"><AlertTriangle size={14}/> Riesgo Alto</span>;
      case "MEDIUM":
        return <span className="flex items-center gap-1.5 bg-amber-500/20 border border-amber-500/40 text-amber-400 px-3 py-1 rounded-full text-xs font-bold shadow-[0_0_15px_-3px_rgba(245,158,11,0.4)]"><Clock size={14}/> Riesgo Medio</span>;
      default:
        return <span className="flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold shadow-[0_0_15px_-3px_rgba(16,185,129,0.4)]"><ShieldCheck size={14}/> En Tiempo</span>;
    }
  };

  const mockMilestones = getStandardOceanMilestones(shipment?.pol || "Shanghai", shipment?.pod || "Rotterdam", prediction?.adjustedEta || shipment?.eta || "2026-07-15");

  return (
    <div className="relative overflow-hidden bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl transition-all">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 opacity-50" />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-black text-white flex items-center gap-3">
            Embarque: <span className="font-mono text-emerald-400">{shipment?.shipment_ref || "N/A"}</span>
            {prediction && getRiskBadge(prediction.riskLevel)}
          </h3>
          <p className="text-slate-400 text-sm font-medium mt-1">
            {shipment?.pol || "Unknown"} → {shipment?.pod || "Unknown"} · {(shipment?.weight_kg || 0).toLocaleString()} kg
          </p>
        </div>
        
        <button 
          onClick={handlePredict}
          disabled={isLoading}
          className="group relative flex items-center gap-2 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/50 text-indigo-300 font-bold px-4 py-2 rounded-xl transition-all disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 size={18} className="animate-spin text-indigo-400" />
          ) : (
            <Zap size={18} className="text-indigo-400 group-hover:scale-110 transition-transform" />
          )}
          <span>{prediction ? "Actualizar Predicción" : "Predecir con Gemini AI"}</span>
          <div className="absolute inset-0 rounded-xl ring-2 ring-indigo-500/0 group-hover:ring-indigo-500/30 transition-all pointer-events-none" />
        </button>
      </div>

      <div className="mb-8">
        <MilestoneStepper milestones={mockMilestones} currentStepIndex={2} orientation="horizontal" />
      </div>

      {prediction && (
        <div className="relative p-5 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 backdrop-blur-md overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-indigo-500/20 blur-3xl rounded-full pointer-events-none" />
          <div className="flex items-start gap-4 relative z-10">
            <div className="p-3 bg-indigo-500/20 rounded-xl border border-indigo-500/30 text-indigo-400">
              <Zap size={24} />
            </div>
            <div>
              <h4 className="text-white font-bold mb-1 flex items-center gap-2">
                Análisis Predictivo de IA
                <span className="text-[10px] uppercase tracking-wider text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/30">Gemini 2.5</span>
              </h4>
              <p className="text-sm text-slate-300 leading-relaxed mb-3">
                {prediction.reasoning}
              </p>
              <div className="flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
                  <span className="text-slate-400">ETA Original:</span>
                  <span className="text-slate-200 font-mono">{shipment?.eta ? new Date(shipment.eta).toISOString().split('T')[0] : "N/A"}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-indigo-900/40 px-3 py-1.5 rounded-lg border border-indigo-500/30">
                  <span className="text-indigo-300">ETA Ajustado:</span>
                  <span className="text-indigo-100 font-mono font-bold">{prediction.adjustedEta}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-900/30 px-3 py-1.5 rounded-lg border border-emerald-500/30">
                  <span className="text-emerald-400">Confianza:</span>
                  <span className="text-emerald-100 font-bold">{prediction.confidenceScore}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
