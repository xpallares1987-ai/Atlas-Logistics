import { ProfitabilityDashboard } from '@atlas/ui/src/components/ProfitabilityDashboard';
import { motion } from 'framer-motion';

export default function ProfitabilityModule() {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="w-full h-full bg-slate-950 overflow-y-auto"
    >
      {/* @ts-ignore */}
      <ProfitabilityDashboard data={[]} />
    </motion.div>
  );
}

