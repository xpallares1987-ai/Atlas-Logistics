"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Leaf,
  Download,
  AlertTriangle,
  Wind,
  Anchor,
  Truck,
  Activity
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";

interface ShipmentCarbon {
  id: string;
  reference: string;
  mode: "Ocean" | "Air" | "Road";
  origin: string;
  destination: string;
  weightTons: number;
  distanceKm: number;
  co2eTonnes: number;
  date: string;
}

const MOCK_SHIPMENTS: ShipmentCarbon[] = [
  {
    id: "1",
    reference: "SHP-9921",
    mode: "Ocean",
    origin: "Shanghai, CN",
    destination: "Rotterdam, NL",
    weightTons: 24,
    distanceKm: 19500,
    co2eTonnes: 3.8,
    date: "2026-06-15",
  },
  {
    id: "2",
    reference: "SHP-9922",
    mode: "Air",
    origin: "Frankfurt, DE",
    destination: "New York, US",
    weightTons: 2.5,
    distanceKm: 6200,
    co2eTonnes: 14.2,
    date: "2026-06-18",
  },
  {
    id: "3",
    reference: "SHP-9923",
    mode: "Road",
    origin: "Madrid, ES",
    destination: "Paris, FR",
    weightTons: 18,
    distanceKm: 1250,
    co2eTonnes: 1.4,
    date: "2026-06-20",
  },
  {
    id: "4",
    reference: "SHP-9924",
    mode: "Ocean",
    origin: "Singapore, SG",
    destination: "Los Angeles, US",
    weightTons: 48,
    distanceKm: 14000,
    co2eTonnes: 6.7,
    date: "2026-06-25",
  },
  {
    id: "5",
    reference: "SHP-9925",
    mode: "Air",
    origin: "Hong Kong, HK",
    destination: "London, UK",
    weightTons: 1.2,
    distanceKm: 9600,
    co2eTonnes: 10.5,
    date: "2026-06-28",
  },
  {
    id: "6",
    reference: "SHP-9926",
    mode: "Road",
    origin: "Berlin, DE",
    destination: "Warsaw, PL",
    weightTons: 22,
    distanceKm: 570,
    co2eTonnes: 0.8,
    date: "2026-07-01",
  },
];

const COLORS = {
  Ocean: "#3b82f6",
  Air: "#8b5cf6",
  Road: "#10b981",
};

export function ESGCarbonTracker() {
  const [shipments, setShipments] = useState<ShipmentCarbon[]>(MOCK_SHIPMENTS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/esg/carbon')
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          setShipments(data.slice(0, 15));
        }
      })
      .catch(err => console.error("Could not fetch ESG data:", err))
      .finally(() => setIsLoading(false));
  }, []);

  const exportToCSV = (data: Record<string, any>[], filename: string) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((h) => {
            const val = row[h];
            const str = val === null || val === undefined ? "" : String(val);
            return str.includes(",") || str.includes('"') || str.includes("\n")
              ? `"${str.replace(/"/g, '""')}"`
              : str;
          })
          .join(","),
      ),
    ];
    const blob = new Blob([csvRows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const metrics = useMemo(() => {
    let totalCO2 = 0;
    let totalWeight = 0;
    let totalDistance = 0;

    const modeBreakdown = { Ocean: 0, Air: 0, Road: 0 };
    const monthlyData: Record<string, number> = {};

    shipments.forEach((s) => {
      totalCO2 += s.co2eTonnes;
      totalWeight += s.weightTons;
      totalDistance += s.distanceKm;
      if (modeBreakdown[s.mode] !== undefined) {
         modeBreakdown[s.mode] += s.co2eTonnes;
      }

      const month = s.date.substring(0, 7); // YYYY-MM
      monthlyData[month] = (monthlyData[month] || 0) + s.co2eTonnes;
    });

    const pieData = Object.entries(modeBreakdown).map(([name, value]) => ({
      name,
      value,
    })).filter(x => x.value > 0);

    const barData = Object.entries(monthlyData)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, co2]) => ({ month, co2: parseFloat(co2.toFixed(2)) }));

    return {
      totalCO2,
      totalWeight,
      avgIntensity:
        totalWeight > 0 ? ((totalCO2 / totalWeight) * 1000).toFixed(1) : "0.0", // kg CO2e per ton
      pieData,
      barData,
    };
  }, [shipments]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="esg-dashboard p-6 pb-24"
    >
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg backdrop-blur-sm border border-emerald-500/30">
               <Leaf className="text-emerald-400" size={28} />
            </div>
            ESG Carbon Intelligence
          </h2>
          <p className="text-slate-400 text-sm mt-2 max-w-2xl">
            Live monitoring of Greenhouse Gas (GHG) Protocol Scope 3 emissions across your active supply chain network.
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => exportToCSV(shipments, "ghg-report")}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-white/10 backdrop-blur-md border border-white/20 rounded-xl hover:bg-white/20 transition-all shadow-lg"
        >
          <Download size={16} />
          Export Audit Report
        </motion.button>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
      >
        <motion.div variants={itemVariants} className="glass-card p-6 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
          <span className="text-sm text-slate-400 font-medium flex justify-between items-center">
            Total Emissions YTD
            <Activity size={16} className="text-emerald-400/50" />
          </span>
          <h3 className="text-4xl font-bold text-white mt-3 flex items-baseline gap-2">
            {metrics.totalCO2.toFixed(1)}
            <span className="text-xl text-slate-500 font-normal">tCO2e</span>
          </h3>
        </motion.div>

        <motion.div variants={itemVariants} className="glass-card p-6 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
          <span className="text-sm text-slate-400 font-medium">
            Emissions Intensity
          </span>
          <h3 className="text-4xl font-bold text-white mt-3 flex items-baseline gap-2">
            {metrics.avgIntensity}
            <span className="text-xl text-slate-500 font-normal">kg/Ton</span>
          </h3>
        </motion.div>

        <motion.div variants={itemVariants} className="glass-card p-6 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="absolute top-0 left-0 w-1 h-full bg-purple-500" />
          <span className="text-sm text-slate-400 font-medium">
            Total Cargo Mass
          </span>
          <h3 className="text-4xl font-bold text-white mt-3 flex items-baseline gap-2">
            {metrics.totalWeight.toFixed(1)}
            <span className="text-xl text-slate-500 font-normal">Tons</span>
          </h3>
        </motion.div>

        <motion.div variants={itemVariants} className="glass-card p-6 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-20 transition-opacity duration-700">
            <AlertTriangle size={120} className="text-amber-500" />
          </div>
          <span className="text-sm text-slate-400 font-medium">
            Offset Status
          </span>
          <h3 className="text-4xl font-bold text-white mt-3">24%</h3>
          <p className="text-sm text-amber-400 mt-2 font-medium">Target: 50% by 2026</p>
        </motion.div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-7"
        >
          <h3 className="text-xl font-bold text-white mb-6">
            Emissions by Transport Mode
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={75}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${((percent || 0) * 100).toFixed(0)}%`
                  }
                  stroke="none"
                >
                  {metrics.pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[entry.name as keyof typeof COLORS] || "#64748b"}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.9)",
                    backdropFilter: "blur(8px)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    color: "#fff",
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
                  }}
                  itemStyle={{ color: "#fff", fontWeight: "bold" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-8 mt-4">
            {Object.keys(COLORS).map(mode => {
               const Icon = mode === 'Ocean' ? Anchor : mode === 'Air' ? Wind : Truck;
               return (
                <div key={mode} className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md" style={{ backgroundColor: `${COLORS[mode as keyof typeof COLORS]}30`}}>
                     <Icon size={16} color={COLORS[mode as keyof typeof COLORS]} />
                  </div>
                  <span className="text-sm font-medium text-slate-300">{mode}</span>
                </div>
               );
            })}
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-7"
        >
          <h3 className="text-xl font-bold text-white mb-6">
            Monthly Carbon Trend (tCO2e)
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={metrics.barData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="4 4"
                  stroke="rgba(255,255,255,0.05)"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  dx={-10}
                />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.05)" }}
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.9)",
                    backdropFilter: "blur(8px)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    color: "#fff",
                  }}
                />
                <Bar
                  dataKey="co2"
                  fill="#10b981"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={60}
                  animationDuration={1500}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass-panel overflow-hidden"
      >
        <div className="px-7 py-5 border-b border-slate-700/50 bg-slate-800/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="text-xl font-bold text-white">
            Recent Shipment Footprints
          </h3>
          {isLoading && <span className="text-emerald-400 text-sm animate-pulse">Syncing Network...</span>}
        </div>
        
        {/* Mobile View: Stacked Cards */}
        <div className="flex flex-col gap-4 p-4 md:hidden">
          <AnimatePresence>
            {shipments.map((s) => (
              <motion.div
                key={s.id}
                variants={itemVariants}
                layout
                className="bg-slate-800/20 border border-slate-700/50 rounded-2xl p-4 flex flex-col gap-4"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-slate-200">{s.reference}</p>
                    <p className="text-xs text-slate-500">{s.date}</p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border backdrop-blur-sm
                    ${s.mode === "Ocean" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : ""}
                    ${s.mode === "Air" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : ""}
                    ${s.mode === "Road" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : ""}
                    ${!["Ocean","Air","Road"].includes(s.mode) ? "bg-slate-500/10 text-slate-400 border-slate-500/20" : ""}
                  `}
                  >
                    {s.mode === "Ocean" && <Anchor size={12} />}
                    {s.mode === "Air" && <Wind size={12} />}
                    {s.mode === "Road" && <Truck size={12} />}
                    {s.mode}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-500 uppercase">Origin</span>
                    <span className="font-medium truncate max-w-[120px]">{s.origin}</span>
                  </div>
                  <span className="text-slate-600">&rarr;</span>
                  <div className="flex flex-col text-right">
                    <span className="text-xs text-slate-500 uppercase">Dest</span>
                    <span className="font-medium truncate max-w-[120px]">{s.destination}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center border-t border-slate-700/50 pt-3 mt-1">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-slate-500">Dist: <span className="text-slate-300 font-mono">{s.distanceKm.toLocaleString()}km</span></span>
                    <span className="text-xs text-slate-500">Wgt: <span className="text-slate-300 font-mono">{s.weightTons.toFixed(1)}T</span></span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-slate-500 uppercase tracking-wider mb-1">Emissions</span>
                    <span className="text-lg font-black text-emerald-400 font-mono leading-none">
                      {s.co2eTonnes.toFixed(2)}<span className="text-xs text-emerald-500/70 ml-1">tCO2e</span>
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {shipments.length === 0 && !isLoading && (
             <div className="p-8 text-center text-slate-500 font-medium">
               No shipment data available.
             </div>
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-800/30 text-slate-400 text-xs uppercase tracking-widest border-b border-slate-700/50">
                <th className="p-5 font-semibold">Reference</th>
                <th className="p-5 font-semibold">Date</th>
                <th className="p-5 font-semibold">Mode</th>
                <th className="p-5 font-semibold">Route</th>
                <th className="p-5 font-semibold text-right">Distance</th>
                <th className="p-5 font-semibold text-right">Weight</th>
                <th className="p-5 font-semibold text-right text-emerald-400">
                  Emissions (tCO2e)
                </th>
              </tr>
            </thead>
            <motion.tbody 
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="divide-y divide-slate-700/30"
            >
              <AnimatePresence>
                {shipments.map((s) => (
                  <motion.tr
                    key={s.id}
                    variants={itemVariants}
                    layout
                    className="hover:bg-white/[0.02] transition-colors group"
                  >
                    <td className="p-5 text-sm font-bold text-slate-200">
                      {s.reference}
                    </td>
                    <td className="p-5 text-sm text-slate-400 font-medium">{s.date}</td>
                    <td className="p-5 text-sm text-slate-300">
                      <span
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold border backdrop-blur-sm
                        ${s.mode === "Ocean" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : ""}
                        ${s.mode === "Air" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : ""}
                        ${s.mode === "Road" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : ""}
                        ${!["Ocean","Air","Road"].includes(s.mode) ? "bg-slate-500/10 text-slate-400 border-slate-500/20" : ""}
                      `}
                      >
                        {s.mode === "Ocean" && <Anchor size={14} />}
                        {s.mode === "Air" && <Wind size={14} />}
                        {s.mode === "Road" && <Truck size={14} />}
                        {s.mode}
                      </span>
                    </td>
                    <td
                      className="p-5 text-sm text-slate-300 truncate max-w-[200px]"
                      title={`${s.origin} → ${s.destination}`}
                    >
                      <div className="flex items-center gap-2">
                         <span className="font-medium text-white">{s.origin}</span>
                         <span className="text-slate-500">&rarr;</span>
                         <span className="font-medium text-white">{s.destination}</span>
                      </div>
                    </td>
                    <td className="p-5 text-sm text-slate-400 text-right font-mono">
                      {s.distanceKm.toLocaleString()} <span className="text-xs text-slate-500">km</span>
                    </td>
                    <td className="p-5 text-sm text-slate-400 text-right font-mono">
                      {s.weightTons.toFixed(1)} <span className="text-xs text-slate-500">T</span>
                    </td>
                    <td className="p-5 text-sm font-black text-emerald-400 text-right group-hover:text-emerald-300 font-mono text-base">
                      {s.co2eTonnes.toFixed(2)}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </motion.tbody>
          </table>
          {shipments.length === 0 && !isLoading && (
             <div className="p-12 text-center text-slate-500 font-medium">
               No shipment data available for ESG calculation.
             </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
