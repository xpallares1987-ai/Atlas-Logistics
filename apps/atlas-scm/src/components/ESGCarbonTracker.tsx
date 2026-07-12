"use client";

import { useState, useMemo } from "react";
import {
  Leaf,
  DownloadCloud,
  AlertTriangle,
  Wind,
  Anchor,
  Truck,
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
  const [shipments] = useState<ShipmentCarbon[]>(MOCK_SHIPMENTS);

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
      modeBreakdown[s.mode] += s.co2eTonnes;

      const month = s.date.substring(0, 7); // YYYY-MM
      monthlyData[month] = (monthlyData[month] || 0) + s.co2eTonnes;
    });

    const pieData = Object.entries(modeBreakdown).map(([name, value]) => ({
      name,
      value,
    }));

    // Sort months chronologically
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

  return (
    <div className="esg-dashboard">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Leaf className="text-emerald-400" />
            ESG Carbon Footprint Tracker
          </h2>
          <p className="text-slate-400 text-sm">
            Monitor Greenhouse Gas (GHG) Protocol Scope 3 emissions across your
            supply chain.
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors">
          <DownloadCloud size={16} />
          Export GHG Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg border-l-4 border-l-emerald-500">
          <span className="text-sm text-slate-400 font-medium">
            Total Emissions YTD
          </span>
          <h3 className="text-3xl font-bold text-white mt-1">
            {metrics.totalCO2.toFixed(1)}{" "}
            <span className="text-lg text-slate-500">tCO2e</span>
          </h3>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg border-l-4 border-l-blue-500">
          <span className="text-sm text-slate-400 font-medium">
            Emissions Intensity
          </span>
          <h3 className="text-3xl font-bold text-white mt-1">
            {metrics.avgIntensity}{" "}
            <span className="text-lg text-slate-500">kg/Ton</span>
          </h3>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg border-l-4 border-l-purple-500">
          <span className="text-sm text-slate-400 font-medium">
            Total Cargo Mass
          </span>
          <h3 className="text-3xl font-bold text-white mt-1">
            {metrics.totalWeight.toFixed(1)}{" "}
            <span className="text-lg text-slate-500">Tons</span>
          </h3>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg border-l-4 border-l-amber-500 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-10">
            <AlertTriangle size={80} />
          </div>
          <span className="text-sm text-slate-400 font-medium">
            Offset Status
          </span>
          <h3 className="text-3xl font-bold text-white mt-1">24%</h3>
          <p className="text-xs text-amber-400 mt-1">Target: 50% by 2026</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <h3 className="text-lg font-semibold text-white mb-4">
            Emissions by Transport Mode (tCO2e)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${((percent || 0) * 100).toFixed(0)}%`
                  }
                >
                  {metrics.pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[entry.name as keyof typeof COLORS]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "none",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                  itemStyle={{ color: "#fff" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-2">
            <div className="flex items-center gap-2">
              <Anchor size={14} color={COLORS.Ocean} />{" "}
              <span className="text-sm text-slate-300">Ocean</span>
            </div>
            <div className="flex items-center gap-2">
              <Wind size={14} color={COLORS.Air} />{" "}
              <span className="text-sm text-slate-300">Air</span>
            </div>
            <div className="flex items-center gap-2">
              <Truck size={14} color={COLORS.Road} />{" "}
              <span className="text-sm text-slate-300">Road</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <h3 className="text-lg font-semibold text-white mb-4">
            Monthly Carbon Trend
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={metrics.barData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#334155"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: "#334155", opacity: 0.4 }}
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "none",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                />
                <Bar
                  dataKey="co2"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={50}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-800/30">
          <h3 className="text-lg font-semibold text-white">
            Recent Shipment Footprints
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                <th className="p-4 font-medium">Reference</th>
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Mode</th>
                <th className="p-4 font-medium">Route</th>
                <th className="p-4 font-medium text-right">Distance (km)</th>
                <th className="p-4 font-medium text-right">Weight (Tons)</th>
                <th className="p-4 font-medium text-right text-emerald-400">
                  Emissions (tCO2e)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {shipments.map((s) => (
                <tr
                  key={s.id}
                  className="hover:bg-slate-800/30 transition-colors group"
                >
                  <td className="p-4 text-sm font-medium text-slate-200">
                    {s.reference}
                  </td>
                  <td className="p-4 text-sm text-slate-400">{s.date}</td>
                  <td className="p-4 text-sm text-slate-300">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border
                      ${s.mode === "Ocean" ? "bg-blue-900/30 text-blue-400 border-blue-800" : ""}
                      ${s.mode === "Air" ? "bg-purple-900/30 text-purple-400 border-purple-800" : ""}
                      ${s.mode === "Road" ? "bg-emerald-900/30 text-emerald-400 border-emerald-800" : ""}
                    `}
                    >
                      {s.mode === "Ocean" && <Anchor size={12} />}
                      {s.mode === "Air" && <Wind size={12} />}
                      {s.mode === "Road" && <Truck size={12} />}
                      {s.mode}
                    </span>
                  </td>
                  <td
                    className="p-4 text-sm text-slate-300 truncate max-w-[200px]"
                    title={`${s.origin} → ${s.destination}`}
                  >
                    {s.origin} &rarr; {s.destination}
                  </td>
                  <td className="p-4 text-sm text-slate-400 text-right">
                    {s.distanceKm.toLocaleString()}
                  </td>
                  <td className="p-4 text-sm text-slate-400 text-right">
                    {s.weightTons.toFixed(1)}
                  </td>
                  <td className="p-4 text-sm font-bold text-emerald-400 text-right group-hover:text-emerald-300">
                    {s.co2eTonnes.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
