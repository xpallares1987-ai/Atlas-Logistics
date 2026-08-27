import { useState, useEffect, useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
  ScriptableContext,
} from "chart.js";
import { Line } from "react-chartjs-2";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Loader2,
} from "lucide-react";
import { useAppStore } from "../shared/store";
import { drizzleRateService } from "../services/drizzleRateService";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

interface RouteAnalyticsChartProps {
  origin: string;
  destination: string;
  currentLowestRate: number;
}

export default function RouteAnalyticsChart({
  origin,
  destination,
  currentLowestRate,
}: RouteAnalyticsChartProps) {
  const store = useAppStore() as any;
  const activeCurrency = store.currency || "USD";
  const exchangeRates = { EUR: 0.92, USD: 1.0 };

  const convertAmount = (amount: number) => {
    if (activeCurrency === "USD") return amount;
    return Math.round(amount * exchangeRates.EUR);
  };

  const [data, setData] = useState<{
    months: string[];
    marketRates: number[];
    atlasRates: number[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    drizzleRateService
      .fetchAnalytics(origin, destination)
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        console.error("Failed to fetch chart data", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [origin, destination]);

  const { chartData, chartOptions, trend, savingsPercent } = useMemo(() => {
    if (!data)
      return {
        chartData: null,
        chartOptions: null,
        trend: "flat",
        savingsPercent: 0,
      };

    let { months, marketRates, atlasRates } = data;

    // Apply currency conversions
    marketRates = marketRates.map(convertAmount);
    atlasRates = atlasRates.map(convertAmount);

    // Ensure the last point matches the actual current lowest rate precisely
    const convertedCurrentLowest = convertAmount(currentLowestRate);
    atlasRates[atlasRates.length - 1] = convertedCurrentLowest;

    const currentMarketRate = marketRates[marketRates.length - 1];
    const savingsPercent =
      currentMarketRate > 0
        ? Math.round(
            ((currentMarketRate - convertedCurrentLowest) / currentMarketRate) *
              100,
          )
        : 0;

    const trend =
      savingsPercent > 0 ? "down" : savingsPercent < 0 ? "up" : "flat";

    const chartData = {
      labels: months,
      datasets: [
        {
          label: "Market Average",
          data: marketRates,
          borderColor: "rgba(148, 163, 184, 0.5)", // Slate 400
          backgroundColor: "transparent",
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
          tension: 0.4,
        },
        {
          label: "Atlas Lowest Rate",
          data: atlasRates,
          borderColor: "rgba(99, 102, 241, 1)", // Indigo 500
          backgroundColor: (context: ScriptableContext<"line">) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 200);
            gradient.addColorStop(0, "rgba(99, 102, 241, 0.5)"); // Start opaque
            gradient.addColorStop(1, "rgba(99, 102, 241, 0.0)"); // Fade out
            return gradient;
          },
          borderWidth: 3,
          pointBackgroundColor: "rgba(99, 102, 241, 1)",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.4,
        },
      ],
    };

    const chartOptions: ChartOptions<"line"> = {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 1000,
        easing: "easeOutQuart",
      },
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: "top",
          align: "end",
          labels: {
            usePointStyle: true,
            boxWidth: 8,
            color: "#94a3b8", // slate-400
            font: {
              family: "'Inter', sans-serif",
              size: 11,
              weight: "bold",
            },
          },
        },
        tooltip: {
          backgroundColor: "rgba(15, 23, 42, 0.9)", // slate-900
          titleColor: "#fff",
          bodyColor: "#cbd5e1", // slate-300
          borderColor: "rgba(51, 65, 85, 0.5)", // slate-700
          borderWidth: 1,
          padding: 12,
          boxPadding: 6,
          usePointStyle: true,
          callbacks: {
            label: function (context) {
              let label = context.dataset.label || "";
              if (label) {
                label += ": ";
              }
              if (context.parsed.y !== null) {
                label += `${activeCurrency} ${context.parsed.y.toLocaleString()}`;
              }
              return label;
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            color: "#64748b", // slate-500
            font: {
              family: "'Inter', sans-serif",
              size: 11,
            },
          },
          border: {
            display: false,
          },
        },
        y: {
          beginAtZero: false,
          grace: "10%",
          grid: {
            color: "rgba(51, 65, 85, 0.3)", // slate-700 with opacity
          },
          ticks: {
            color: "#64748b",
            font: {
              family: "'Inter', sans-serif",
              size: 11,
            },
            callback: function (value) {
              return `${activeCurrency} ${value.toLocaleString()}`;
            },
          },
          border: {
            display: false,
          },
        },
      },
    };

    return { chartData, chartOptions, trend, savingsPercent };
  }, [currentLowestRate, activeCurrency, data]);

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden mb-6">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3" />

      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
            <Activity className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white tracking-tight">
              Market Price Trends
            </h3>
            <p className="text-xs font-medium text-slate-400">
              6-Month historical analysis for{" "}
              <span className="text-slate-300 font-bold">
                {origin.split(",")[0]}
              </span>{" "}
              to{" "}
              <span className="text-slate-300 font-bold">
                {destination.split(",")[0]}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">
              Atlas Advantage
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-white">
                {activeCurrency}{" "}
                {convertAmount(currentLowestRate).toLocaleString()}
              </span>
              <div
                className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                  trend === "down"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : trend === "up"
                      ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                }`}
              >
                {trend === "down" && <TrendingDown className="w-3 h-3" />}
                {trend === "up" && <TrendingUp className="w-3 h-3" />}
                {trend === "flat" && <Minus className="w-3 h-3" />}
                {Math.abs(savingsPercent)}% vs Market
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full h-[220px] relative z-10 flex items-center justify-center transition-opacity duration-500">
        {isLoading || !chartData ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
            <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">
              Loading Analytics...
            </p>
          </div>
        ) : (
          <Line data={chartData} options={chartOptions!} />
        )}
      </div>
    </div>
  );
}
