import { ProfitabilityDashboard } from '@atlas/ui/src/components/ProfitabilityDashboard';
import { motion } from 'framer-motion';

const MOCK_PROFITABILITY_DATA = [
  { category: 'Ocean Freight', ap: 45000, ar: 58000 },
  { category: 'Customs Brokerage', ap: 5200, ar: 8500 },
  { category: 'Drayage', ap: 12000, ar: 14500 },
  { category: 'Warehousing', ap: 8500, ar: 12000 },
  { category: 'Insurance', ap: 1500, ar: 2500 },
];

export default function ProfitabilityModule() {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="w-full h-full bg-slate-50 p-8 overflow-y-auto"
    >
      <div className="max-w-6xl mx-auto">
        <ProfitabilityDashboard 
          data={MOCK_PROFITABILITY_DATA} 
          alerts={["Missing AP invoice for Drayage on BL-99482"]} 
        />
      </div>
    </motion.div>
  );
}

