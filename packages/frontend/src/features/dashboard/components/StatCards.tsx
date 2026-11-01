import { motion } from "framer-motion";
import { Anchor, Ship, TrendingUp, AlertTriangle } from "lucide-react";
import { useApiQuery } from "../../../hooks/useApiQuery";
import { useDashboardStore } from "../store";

export function StatCards() {
  const { dateRange } = useDashboardStore();
  const queryStr = dateRange
    ? `?start=${dateRange.start}&end=${dateRange.end}`
    : "";
  const { data } = useApiQuery<any>(
    ["dashboard", dateRange],
    `/dashboard${queryStr}`,
  );
  const statsData = data?.data?.stats;

  const stats = [
    {
      id: 1,
      name: "Active Shipments",
      value: statsData ? statsData.activeShipments.toLocaleString() : "...",
      change: "+12.5%",
      trend: "up",
      icon: Ship,
      color: "from-blue-500 to-indigo-500",
      bgColor: "bg-blue-500/10",
      iconColor: "text-blue-400",
    },
    {
      id: 2,
      name: "Completed Shipments",
      value: statsData ? statsData.completedShipments.toLocaleString() : "...",
      change: "On time delivery",
      trend: "neutral",
      icon: Anchor,
      color: "from-amber-500 to-orange-500",
      bgColor: "bg-amber-500/10",
      iconColor: "text-amber-400",
    },
    {
      id: 3,
      name: "Total Revenue",
      value: statsData ? `$${(statsData.revenue / 1000).toFixed(1)}k` : "...",
      change: "+8.2%",
      trend: "up",
      icon: TrendingUp,
      color: "from-emerald-500 to-teal-500",
      bgColor: "bg-emerald-500/10",
      iconColor: "text-emerald-400",
    },
    {
      id: 4,
      name: "Customer Satisfaction",
      value: statsData ? `${statsData.satisfaction}%` : "...",
      change: "Based on feedback",
      trend: "up",
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
            whileHover={{ y: -4 }}
            className="relative overflow-hidden rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-5 flex items-center gap-4 group min-h-[104px] transition-transform duration-200 will-change-transform hover:shadow-2xl hover:shadow-indigo-500/10"
          >
            {/* Ambient Background Glow */}
            <div
              className={`absolute -inset-4 bg-gradient-to-r ${stat.color} opacity-0 group-hover:opacity-10 blur-2xl transition-opacity duration-500`}
            />

            <div
              className={`p-3 rounded-xl ${stat.bgColor} border border-white/5 shadow-inner shrink-0`}
            >
              <Icon
                className={`w-6 h-6 ${stat.iconColor}`}
                strokeWidth={1.75}
              />
            </div>

            <div className="z-10 min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-400 truncate mb-0.5">
                {stat.name}
              </p>
              <p className="text-2xl font-bold text-white tracking-tight">
                {stat.value}
              </p>
              <div className="flex items-center mt-1">
                <span
                  className={`text-xs font-medium truncate ${stat.trend === "up" ? "text-emerald-400" : stat.trend === "down" ? "text-rose-400" : "text-amber-400"}`}
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
