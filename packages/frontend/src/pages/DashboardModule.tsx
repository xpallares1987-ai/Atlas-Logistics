import { motion, Variants } from 'framer-motion';
import { StatCards } from '../features/dashboard/components/StatCards';
import { RevenueChart } from '../features/dashboard/components/RevenueChart';
import { ShipmentVolumeChart } from '../features/dashboard/components/ShipmentVolumeChart';
import { ActiveShipments } from '../features/dashboard/components/ActiveShipments';
import { GlobeWidget } from '../features/dashboard/components/GlobeWidget';
import { QuickActions } from '../features/dashboard/components/QuickActions';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

export function DashboardModule() {
  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 overflow-x-hidden">
      <motion.div
        className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div>
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-emerald-400 to-emerald-200 mb-2 tracking-tight">
            Command Center
          </h1>
          <p className="text-slate-400 font-medium">Real-time overview of your global logistics operations.</p>
        </div>
        <QuickActions />
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-12 gap-6"
      >
        {/* Top Row: Stats (Spans full width) */}
        <motion.div variants={itemVariants} className="col-span-1 md:col-span-12">
          <StatCards />
        </motion.div>

        {/* Second Row: 3D Globe */}
        <motion.div variants={itemVariants} className="col-span-1 md:col-span-12 h-[450px]">
          <GlobeWidget />
        </motion.div>
        
        {/* Third Row: Charts */}
        <motion.div variants={itemVariants} className="col-span-1 lg:col-span-6 h-[400px]">
          <RevenueChart />
        </motion.div>
        <motion.div variants={itemVariants} className="col-span-1 lg:col-span-6 h-[400px]">
          <ShipmentVolumeChart />
        </motion.div>

        {/* Bottom Row: Active Shipments */}
        <motion.div variants={itemVariants} className="col-span-1 md:col-span-12">
          <ActiveShipments />
        </motion.div>
      </motion.div>
    </div>
  );
}

export default DashboardModule;
