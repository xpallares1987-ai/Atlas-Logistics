/**
 * @file FacilitiesHandling.tsx
 * @description Authorized Customs Facilities directory and UCC Art. 220 Usual Handling Validator.
 * @module @atlas/frontend/components/CustomsWarehouse/Tab
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import {
  Building2,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import type {
  CustomsFacility,
  UsualHandlingType,
} from "../../../types/customs-warehouse.types";

// ============================================================================
// 1. PROPS INTERFACE
// ============================================================================

export interface FacilitiesHandlingProps {
  facilities: CustomsFacility[];
  selectedHandlingType: UsualHandlingType;
  onHandlingTypeChange: (type: UsualHandlingType) => void;
}

// ============================================================================
// 2. COMPONENT
// ============================================================================

export function FacilitiesHandling({
  facilities,
  selectedHandlingType,
  onHandlingTypeChange,
}: FacilitiesHandlingProps) {
  return (
    <div className="flex-1 px-4 md:px-8 pb-8 space-y-6 overflow-y-auto z-10 relative">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Usual Handling Validator */}
        <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <ShieldCheck size={18} className="text-amber-400" />
            Validador de Manipulaciones Usuales (Art. 220 CAU)
          </h3>
          <p className="text-xs text-slate-400">
            Audita si una operación de reacondicionamiento o conservación está
            permitida en Depósito Aduanero sin requerir autorización de
            Perfeccionamiento Activo (Anexo 71-03).
          </p>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-300 block mb-1">
                Tipo de Manipulación Solicitada
              </label>
              <select
                value={selectedHandlingType}
                onChange={(e) =>
                  onHandlingTypeChange(e.target.value as UsualHandlingType)
                }
                className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="LABELING_MARKING">
                  Etiquetado, precintado y marcado CE (Pto. 11)
                </option>
                <option value="REPACKING_SORTING">
                  Reenvasado, clasificación y paletizado (Pto. 3)
                </option>
                <option value="PRESERVATION_CLEANING">
                  Conservación, limpieza y tratamiento anti-polvo (Pto. 1)
                </option>
                <option value="TESTING_SAMPLING">
                  Toma de muestras y ensayos de calidad (Pto. 8)
                </option>
                <option value="VENTILATION_DRYING">
                  Ventilación y secado higrométrico
                </option>
                <option value="ALTERATION_MANUFACTURING">
                  Transformación industrial / Fabricación (Prohibido en DA)
                </option>
              </select>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2">
              <div className="flex items-center gap-2">
                {selectedHandlingType !== "ALTERATION_MANUFACTURING" ? (
                  <>
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    <span className="font-bold text-emerald-400 text-xs">
                      MANIPULACIÓN USUAL AUTORIZADA (ART. 220 CAU)
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={16} className="text-rose-400" />
                    <span className="font-bold text-rose-400 text-xs">
                      NO AUTORIZADO EN DEPÓSITO ADUANERO ORDINARIO
                    </span>
                  </>
                )}
              </div>
              <p className="text-slate-300 text-[11px]">
                {selectedHandlingType !== "ALTERATION_MANUFACTURING"
                  ? "La operación no altera la clasificación arancelaria ni el valor de la mercancía. Se puede ejecutar con asiento previo en el Libro de Existencias."
                  : "Esta operación implica una transformación sustancial de la partida arancelaria. Requiere autorización expresa de Perfeccionamiento Activo (Régimen 5100)."}
              </p>
            </div>
          </div>
        </div>

        {/* Customs Facilities Catalog */}
        <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Building2 size={18} className="text-purple-400" />
            Red de Instalaciones Aduaneras Autorizadas ({facilities.length})
          </h3>
          <div className="space-y-2 overflow-y-auto max-h-[300px] text-xs pr-1">
            {facilities.map((f) => (
              <div
                key={f.id}
                className="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-1"
              >
                <div className="flex justify-between items-center">
                  <span className="font-black text-white">{f.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300">
                    {f.facilityType}
                  </span>
                </div>
                <p className="text-slate-300 text-[11px]">
                  Aut: {f.customsAuthorityAuthorizationRef} | {f.city}
                </p>
                <div className="flex justify-between text-[10px] text-slate-400 pt-0.5">
                  <span>
                    Capacidad: {f.totalPalletCapacity.toLocaleString()} pallets
                    ({f.totalVolumeM3} m3)
                  </span>
                  <span>
                    {f.maxStayDaysLimit
                      ? `Límite: ${f.maxStayDaysLimit} días`
                      : "Estancia Ilimitada"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
