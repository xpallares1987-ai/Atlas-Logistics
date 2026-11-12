/**
 * @file Manifest.tsx
 * @description Cargo manifest item list and interactive quick-add package form tab.
 * @module @atlas/frontend/components/ContainerPlanner/Tab
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, Input } from "@atlas/ui";
import { CargoItemInput, StowageOptimizationResult } from "@atlas/shared";

// ============================================================================
// 1. PROPS INTERFACE
// ============================================================================

export interface ManifestProps {
  cargoList: CargoItemInput[];
  optResult: StowageOptimizationResult;
  selectedId: string | null;
  onSelectId: (id: string) => void;
  onRemoveItem: (id: string) => void;
  onAddItem: (e: React.FormEvent) => void;
  newItemName: string;
  onChangeNewItemName: (val: string) => void;
  newItemLength: number;
  onChangeNewItemLength: (val: number) => void;
  newItemWidth: number;
  onChangeNewItemWidth: (val: number) => void;
  newItemHeight: number;
  onChangeNewItemHeight: (val: number) => void;
  newItemWeight: number;
  onChangeNewItemWeight: (val: number) => void;
  newItemStackable: boolean;
  onChangeNewItemStackable: (val: boolean) => void;
  newItemHazard: string;
  onChangeNewItemHazard: (val: string) => void;
}

// ============================================================================
// 2. COMPONENT IMPLEMENTATION
// ============================================================================

export const Manifest: React.FC<ManifestProps> = ({
  cargoList,
  optResult,
  selectedId,
  onSelectId,
  onRemoveItem,
  onAddItem,
  newItemName,
  onChangeNewItemName,
  newItemLength,
  onChangeNewItemLength,
  newItemWidth,
  onChangeNewItemWidth,
  newItemHeight,
  onChangeNewItemHeight,
  newItemWeight,
  onChangeNewItemWeight,
  newItemStackable,
  onChangeNewItemStackable,
  newItemHazard,
  onChangeNewItemHazard,
}) => {
  return (
    <div className="space-y-4">
      <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
        <span className="text-xs font-bold text-white uppercase tracking-wider">
          Bultos del Manifiesto ({cargoList.length})
        </span>
        <span className="text-[10px] font-mono text-emerald-400">
          {optResult.packedItems.length} estibados •{" "}
          {optResult.unpackedItems.length} pendientes
        </span>
      </div>

      {/* Items List */}
      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
        {cargoList.map((item) => (
          <div
            key={item.id}
            onClick={() => onSelectId(item.id)}
            className={`p-2.5 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
              selectedId === item.id
                ? "bg-indigo-600/20 border-indigo-500 text-white"
                : "bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: item.color || "#3b82f6" }}
              />
              <div>
                <div className="text-xs font-bold text-white">{item.name}</div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {item.lengthM}m × {item.widthM}m × {item.heightM}m •{" "}
                  {item.weightKg} kg
                  {item.hazardClass && (
                    <span className="text-amber-400 font-bold ml-1.5">
                      [IMO {item.hazardClass}]
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveItem(item.id);
              }}
              className="text-slate-500 hover:text-rose-400 p-1"
              title="Eliminar Bulto"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      {/* Quick Add Form */}
      <form
        onSubmit={onAddItem}
        className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 space-y-2 text-xs"
      >
        <div className="font-bold text-white text-[11px] uppercase tracking-wider">
          Añadir Bulto al Manifiesto
        </div>
        <Input
          placeholder="Descripción (ej. Pallet Repuestos A)"
          value={newItemName}
          onChange={(e: any) => onChangeNewItemName(e.target.value)}
          className="bg-slate-900 border-slate-800 text-xs py-1"
        />
        <div className="grid grid-cols-4 gap-1.5 font-mono text-[10px]">
          <div>
            <span className="text-slate-500 block">Largo (m)</span>
            <input
              type="number"
              step="0.1"
              value={newItemLength}
              onChange={(e) => onChangeNewItemLength(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1 text-white"
            />
          </div>
          <div>
            <span className="text-slate-500 block">Ancho (m)</span>
            <input
              type="number"
              step="0.1"
              value={newItemWidth}
              onChange={(e) => onChangeNewItemWidth(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1 text-white"
            />
          </div>
          <div>
            <span className="text-slate-500 block">Alto (m)</span>
            <input
              type="number"
              step="0.1"
              value={newItemHeight}
              onChange={(e) => onChangeNewItemHeight(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1 text-white"
            />
          </div>
          <div>
            <span className="text-slate-500 block">Peso (kg)</span>
            <input
              type="number"
              step="50"
              value={newItemWeight}
              onChange={(e) => onChangeNewItemWeight(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1 text-white"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-1.5 text-[11px] text-slate-300">
            <input
              type="checkbox"
              checked={newItemStackable}
              onChange={(e) => onChangeNewItemStackable(e.target.checked)}
              className="rounded bg-slate-900 border-slate-800"
            />
            Apilable
          </label>
          <Input
            placeholder="IMO Clase (ej. 3, 5.1)"
            value={newItemHazard}
            onChange={(e: any) => onChangeNewItemHazard(e.target.value)}
            className="bg-slate-900 border-slate-800 text-[10px] w-32 py-0.5"
          />
        </div>

        <Button
          type="submit"
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1.5 rounded-xl text-xs flex items-center justify-center gap-1 mt-1"
        >
          <Plus size={13} /> Añadir y Re-optimizar
        </Button>
      </form>
    </div>
  );
};

export default Manifest;
