/**
 * @file NewNote.tsx
 * @description Modal dialog for authoring new authorized predefined resolution protocols.
 * @module @atlas/frontend/components/SystemPanel/Modal
 * @see {@link docs/adr/0020-frontend-modular-decomposition.md}
 */

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@atlas/ui";
import type { ResolutionCategory } from "../../../store/useResolutionNotesStore";

interface NewNoteProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (note: {
    category: ResolutionCategory;
    label: string;
    text: string;
  }) => void;
}

export function NewNote({ isOpen, onClose, onSubmit }: NewNoteProps) {
  const [newCategory, setNewCategory] = useState<ResolutionCategory>("GENERAL");
  const [newLabel, setNewLabel] = useState("");
  const [newText, setNewText] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim() || !newText.trim()) return;

    onSubmit({
      category: newCategory,
      label: newLabel.trim(),
      text: newText.trim(),
    });

    setNewLabel("");
    setNewText("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Plus size={18} className="text-indigo-400" />
            <span>Add Predefined Resolution Protocol</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div>
          <label className="text-xs font-bold uppercase text-slate-400 block mb-1">
            Domain Category
          </label>
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as any)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="ROUTING">Multimodal Routing & Transit</option>
            <option value="CUSTOMS">Customs & Regulatory Clearance</option>
            <option value="COLD_CHAIN">
              Cold Chain & Temperature Excursion
            </option>
            <option value="DOCUMENTATION">
              Documentation & Letters of Credit
            </option>
            <option value="CARRIER">Carrier, Demurrage & Freight Audit</option>
            <option value="GENERAL">General Operational Protocols</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-bold uppercase text-slate-400 block mb-1">
            Short Label / Title
          </label>
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="e.g., Feeder Vessel Rollover Accommodated"
            required
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="text-xs font-bold uppercase text-slate-400 block mb-1">
            Full Authorized Justification Text
          </label>
          <textarea
            rows={3}
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="e.g., Rolled booking accommodated on secondary feeder vessel ETA +24h, terminal gate appointment verified with zero demurrage impact."
            required
            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-slate-400"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            Save Protocol Note
          </Button>
        </div>
      </form>
    </div>
  );
}
