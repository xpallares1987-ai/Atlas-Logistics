
import { Plus, Search, Filter } from 'lucide-react';
import { motion } from 'framer-motion';

export function QuickActions() {
  return (
    <div className="flex items-center gap-3">
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
        className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
      >
        <Filter className="w-5 h-5" />
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
