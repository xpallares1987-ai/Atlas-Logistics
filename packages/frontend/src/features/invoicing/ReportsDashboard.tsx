import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { motion } from "framer-motion";

interface Invoice {
  id: string;
  invoiceNumber: string;
  type: "AR" | "AP" | "CN" | "DN";
  party: string;
  amount: number;
  currency: string;
  status: "Draft" | "Issued" | "Pending" | "Paid" | "Overdue" | "Cancelled";
  dueDate: string;
}

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#f43f5e"];

export function ReportsDashboard({ invoices }: { invoices: Invoice[] }) {
  const agingData = useMemo(() => {
    const buckets = {
      Current: 0,
      "1-30 Days": 0,
      "31-60 Days": 0,
      "61-90 Days": 0,
      "90+ Days": 0,
    };

    const now = new Date();

    invoices.forEach((inv) => {
      // Only consider AR that is not paid
      if (
        inv.type === "AR" &&
        inv.status !== "Paid" &&
        inv.status !== "Cancelled"
      ) {
        const due = new Date(inv.dueDate);
        const diffTime = now.getTime() - due.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 0) {
          buckets["Current"] += inv.amount;
        } else if (diffDays <= 30) {
          buckets["1-30 Days"] += inv.amount;
        } else if (diffDays <= 60) {
          buckets["31-60 Days"] += inv.amount;
        } else if (diffDays <= 90) {
          buckets["61-90 Days"] += inv.amount;
        } else {
          buckets["90+ Days"] += inv.amount;
        }
      }
    });

    return Object.keys(buckets).map((key) => ({
      name: key,
      amount: buckets[key as keyof typeof buckets],
    }));
  }, [invoices]);

  const statusData = useMemo(() => {
    const statusCounts = invoices
      .filter((inv) => inv.type === "AR")
      .reduce(
        (acc, inv) => {
          acc[inv.status] = (acc[inv.status] || 0) + inv.amount;
          return acc;
        },
        {} as Record<string, number>,
      );

    return Object.keys(statusCounts).map((key) => ({
      name: key,
      value: statusCounts[key],
    }));
  }, [invoices]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl">
          <p className="text-white font-bold">{label}</p>
          <p className="text-indigo-400">
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
            }).format(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-2 w-full h-full">
      {/* AR Aging Bar Chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900/50 backdrop-blur-2xl border border-white/10 p-6 rounded-3xl shadow-2xl flex flex-col"
      >
        <h3 className="text-lg font-bold text-white mb-6">A/R Aging Summary</h3>
        <div className="flex-1 min-h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={agingData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <XAxis
                dataKey="name"
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) =>
                  `$${value >= 1000 ? (value / 1000).toFixed(0) + "k" : value}`
                }
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "rgba(255,255,255,0.05)" }}
              />
              <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                {agingData.map((entry, index) => {
                  let color = "#3b82f6"; // default blue
                  if (entry.name === "Current") color = "#10b981"; // green
                  if (entry.name === "90+ Days") color = "#f43f5e"; // red
                  if (entry.name === "61-90 Days") color = "#f59e0b"; // orange
                  if (entry.name === "31-60 Days") color = "#eab308"; // yellow
                  return <Cell key={`cell-${index}`} fill={color} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Status Breakdown Pie Chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-slate-900/50 backdrop-blur-2xl border border-white/10 p-6 rounded-3xl shadow-2xl flex flex-col"
      >
        <h3 className="text-lg font-bold text-white mb-6">A/R by Status</h3>
        <div className="flex-1 min-h-[300px] flex items-center justify-center relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={110}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {statusData.map((_entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col gap-3 pointer-events-none">
            {statusData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-sm font-medium text-slate-300">
                  {entry.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
