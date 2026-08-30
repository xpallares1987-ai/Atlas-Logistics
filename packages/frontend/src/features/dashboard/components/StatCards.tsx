import { motion } from "framer-motion";
import { Anchor, Ship, TrendingUp, AlertTriangle } from "lucide-react";
import { useApiQuery } from "../../../hooks/useApiQuery";

export function StatCards() {
  const { data: statsData } = useApiQuery<{
    totalShipments: number;
    totalRevenue: number;
    pendingInvoices: number;
    overdueInvoices: number;
  }>(["financialStats"], "/financial-stats");

  const stats = [
    {
      id: 1,
      name: "Total Shipments",
      value: statsData ? statsData.totalShipments.toLocaleString() : "...",
      change: "+12.5%",
      trend: "up",
      icon: Ship,
      color: "from-blue-500 to-indigo-500",
      bgColor: "bg-blue-500/10",
      iconColor: "text-blue-400",
    },
    {
      id: 2,
      name: "Port Congestion",
      value: "High",
      change: "3 Ports affected",
      trend: "neutral",
      icon: Anchor,
      color: "from-amber-500 to-orange-500",
      bgColor: "bg-amber-500/10",
      iconColor: "text-amber-400",
    },
    {
      id: 3,
      name: "Total Revenue",
      value: statsData
        ? `$${(statsData.totalRevenue / 1000000).toFixed(1)}M`
        : "...",
      change: "+8.2%",
      trend: "up",
      icon: TrendingUp,
      color: "from-emerald-500 to-teal-500",
      bgColor: "bg-emerald-500/10",
      iconColor: "text-emerald-400",
    },
    {
      id: 4,
      name: "Pending Invoices",
      value: statsData ? statsData.pendingInvoices.toString() : "...",
      change: statsData ? `${statsData.overdueInvoices} overdue` : "...",
      trend: statsData && statsData.overdueInvoices > 0 ? "down" : "neutral",
      icon: AlertTriangle,
      color: "from-rose-500 to-pink-500",
      bgColor: "bg-rose-500/10",
      iconColor: "text-rose-400",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.id}
            whileHover={{ y: -5, scale: 1.02 }}
            className="relative overflow-hidden rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-6 flex items-center gap-4 group transition-all duration-300 hover:border-white/20 hover:shadow-2xl hover:shadow-indigo-500/10"
          >
            {/* Ambient Background Glow */}
            <div
              className={`absolute -inset-4 bg-gradient-to-r ${stat.color} opacity-0 group-hover:opacity-10 blur-2xl transition-opacity duration-500`}
            />

            <div
              className={`p-4 rounded-xl ${stat.bgColor} border border-white/5 shadow-inner`}
            >
              <Icon className={`w-8 h-8 ${stat.iconColor}`} strokeWidth={1.5} />
            </div>

            <div className="z-10">
              <p className="text-sm font-medium text-slate-400 mb-1">
                {stat.name}
              </p>
              <p className="text-3xl font-bold text-white tracking-tight">
                {stat.value}
              </p>
              <div className="flex items-center mt-1">
                <span
                  className={`text-xs font-semibold ${stat.trend === "up" ? "text-emerald-400" : stat.trend === "down" ? "text-rose-400" : "text-amber-400"}`}
                >
                  {stat.change}
                </span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
