import { ProfitabilityDashboard, ProfitabilityData } from '@atlas/ui/src/components/ProfitabilityDashboard';
import { motion } from 'framer-motion';
import { useApiQuery } from '../hooks/useApiQuery';

export default function ProfitabilityModule() {
  const { data, isLoading } = useApiQuery<{ data: ProfitabilityData[], alerts: string[] }>(['profitability'], '/profitability');

  if (isLoading) {
    return (
      <div className="w-full h-full bg-slate-50 p-8 flex items-center justify-center">
        <div className="text-slate-500 font-medium">Loading Profitability Data...</div>
      </div>
    );
  }

  const profitabilityData = data?.data || [];
  const alerts = data?.alerts || [];
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="w-full h-full bg-slate-50 p-8 overflow-y-auto"
    >
      <div className="max-w-6xl mx-auto">
        <ProfitabilityDashboard 
          data={profitabilityData} 
          alerts={alerts} 
        />
      </div>
    </motion.div>
  );
}

