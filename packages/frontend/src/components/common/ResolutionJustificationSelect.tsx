import React from "react";
import {
  useResolutionNotesStore,
  ResolutionCategory,
} from "../../store/useResolutionNotesStore";
import { ShieldCheck, Settings2, FileText } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { Link } from "react-router-dom";

interface ResolutionJustificationSelectProps {
  value: string;
  onChange: (value: string) => void;
  categoryFilter?: ResolutionCategory;
  label?: string;
  required?: boolean;
  id?: string;
  className?: string;
}

export const ResolutionJustificationSelect: React.FC<
  ResolutionJustificationSelectProps
> = ({
  value,
  onChange,
  categoryFilter,
  label = "Resolution Justification Note",
  required = true,
  id = "resolution-justification-select",
  className = "",
}) => {
  const { notes } = useResolutionNotesStore();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN" || user?.role === "MANAGER";

  const filteredNotes = categoryFilter
    ? notes.filter((n) => n.category === categoryFilter)
    : notes;

  // Group by category
  const categories: { key: ResolutionCategory; label: string }[] = [
    { key: "ROUTING", label: "Multimodal Routing & Transit" },
    { key: "CUSTOMS", label: "Customs & Regulatory Clearance" },
    { key: "COLD_CHAIN", label: "Cold Chain & GDP Temperature" },
    { key: "DOCUMENTATION", label: "Documentation & Letters of Credit" },
    { key: "CARRIER", label: "Carrier, Demurrage & Freight Audit" },
    { key: "GENERAL", label: "General Operational Protocols" },
  ];

  const selectedNoteObj = notes.find((n) => n.text === value);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5"
        >
          <FileText size={14} className="text-indigo-400" />
          <span>{label}</span>
          {required && <span className="text-red-400 font-bold">*</span>}
        </label>

        {isAdmin && (
          <Link
            to="/settings#resolutions"
            className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
          >
            <Settings2 size={12} />
            <span>Manage Notes in System Panel</span>
          </Link>
        )}
      </div>

      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-inner"
        >
          <option value="" disabled>
            -- Select Authorized Predefined Justification --
          </option>
          {categories.map((cat) => {
            const catNotes = filteredNotes.filter(
              (n) => n.category === cat.key,
            );
            if (catNotes.length === 0) return null;
            return (
              <optgroup key={cat.key} label={`── ${cat.label} ──`}>
                {catNotes.map((note) => (
                  <option key={note.id} value={note.text}>
                    {note.label}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>
      </div>

      {/* Selected Justification Preview Banner */}
      {value ? (
        <div className="bg-indigo-950/20 border border-indigo-900/40 rounded-xl p-3 flex items-start gap-2 text-xs">
          <ShieldCheck size={16} className="text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              {selectedNoteObj?.label || "Authorized Protocol Justification"}
            </div>
            <p className="text-slate-300 text-xs leading-relaxed italic">
              "{value}"
            </p>
          </div>
        </div>
      ) : (
        <div className="text-[11px] text-slate-500 italic">
          Select an authorized predefined justification note from the list
          above.
        </div>
      )}
    </div>
  );
};
