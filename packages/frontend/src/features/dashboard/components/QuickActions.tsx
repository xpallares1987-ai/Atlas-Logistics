import { Plus, Search, X } from "lucide-react";
import { motion } from "framer-motion";
import { useDashboardStore } from "../store";
import { useState } from "react";

export function QuickActions() {
  const { setDateRange, clearDateRange } = useDashboardStore();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const handleApply = () => {
    if (start && end) {
      setDateRange(start, end);
    }
  };

  const handleClear = () => {
    setStart("");
    setEnd("");
    clearDateRange();
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 bg-slate-900/50 p-1.5 rounded-xl border border-white/10">
        <input
          type="date"
          className="bg-transparent text-sm text-slate-300 px-2 py-1 outline-none"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
        <span className="text-slate-500">to</span>
        <input
          type="date"
          className="bg-transparent text-sm text-slate-300 px-2 py-1 outline-none"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
        />
        <button
          onClick={handleApply}
          className="text-xs bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-lg transition-colors ml-1"
        >
          Apply
        </button>
        {(start || end) && (
          <button
            onClick={handleClear}
            className="text-slate-400 hover:text-rose-400 p-1 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
      >
        <Search className="w-5 h-5" />
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-emerald-500 text-white font-medium shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 border border-white/10 flex items-center gap-2 transition-all"
      >
        <Plus className="w-5 h-5" />
        New Shipment
      </motion.button>
    </div>
  );
}
