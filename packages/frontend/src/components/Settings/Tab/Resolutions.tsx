/**
 * @file Resolutions.tsx
 * @description Predefined operational exception resolution protocols and justification notes management.
 * @module @atlas/frontend/components/Settings/Tab/Resolutions
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

import React, { useState } from "react";
import { CheckCircle2, Plus, Sparkles, Trash2 } from "lucide-react";
import { Button, Input, Select } from "@atlas/ui";
import {
  ResolutionCategory,
  useResolutionNotesStore,
} from "../../../store/useResolutionNotesStore";

export const Resolutions: React.FC = () => {
  const { notes, addNote, deleteNote, resetToDefaults } =
    useResolutionNotesStore();
  const [selectedCategory, setSelectedCategory] = useState<
    ResolutionCategory | "ALL"
  >("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [category, setCategory] = useState<ResolutionCategory>("GENERAL");
  const [label, setLabel] = useState("");
  const [text, setText] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !text.trim()) return;

    addNote({
      category,
      label: label.trim(),
      text: text.trim(),
    });

    setLabel("");
    setText("");
    setIsAdding(false);
  };

  const filtered = notes.filter((n) => {
    const matchesCat =
      selectedCategory === "ALL" || n.category === selectedCategory;
    const matchesSearch =
      n.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.text.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const getCategoryColor = (cat: ResolutionCategory) => {
    switch (cat) {
      case "ROUTING":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "CUSTOMS":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "COLD_CHAIN":
        return "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20";
      case "DOCUMENTATION":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
      case "CARRIER":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "GENERAL":
      default:
        return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Predefined Resolution Justification Notes
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Pre-approved regulatory justifications enforced in Shipment 360,
            Exception Center, and Control Tower.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={resetToDefaults}
            className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900"
          >
            Reset Defaults
          </Button>
          <Button
            size="sm"
            onClick={() => setIsAdding(!isAdding)}
            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            {isAdding ? "Cancel" : "Add Justification Note"}
          </Button>
        </div>
      </div>

      {isAdding && (
        <form
          onSubmit={handleCreate}
          className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-indigo-200 dark:border-indigo-900/50 space-y-4"
        >
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            New Predefined Resolution Protocol
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Category
              </label>
              <Select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as ResolutionCategory)
                }
                className="w-full text-xs"
              >
                <option value="GENERAL">GENERAL</option>
                <option value="ROUTING">ROUTING</option>
                <option value="CUSTOMS">CUSTOMS</option>
                <option value="COLD_CHAIN">COLD_CHAIN</option>
                <option value="DOCUMENTATION">DOCUMENTATION</option>
                <option value="CARRIER">CARRIER</option>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Protocol Label
              </label>
              <Input
                required
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Customs Port Hold Clearance"
                className="w-full text-xs"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Standard Justification Text
            </label>
            <textarea
              required
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter the standardized regulatory explanation to be recorded in audit logs..."
              className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAdding(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-indigo-600 text-white"
            >
              Save Protocol
            </Button>
          </div>
        </form>
      )}

      {/* Filters and List */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-1">
          {[
            "ALL",
            "GENERAL",
            "ROUTING",
            "CUSTOMS",
            "COLD_CHAIN",
            "DOCUMENTATION",
            "CARRIER",
          ].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat as any)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                selectedCategory === cat
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="w-full sm:w-64">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search protocols..."
            className="w-full text-xs"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map((note) => (
          <div
            key={note.id}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex flex-col justify-between gap-3"
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getCategoryColor(
                    note.category,
                  )}`}
                >
                  {note.category}
                </span>
                <button
                  onClick={() => deleteNote(note.id)}
                  className="text-slate-400 hover:text-rose-500 transition p-1"
                  title="Delete protocol"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {note.label}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3">
                {note.text}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Resolutions;
