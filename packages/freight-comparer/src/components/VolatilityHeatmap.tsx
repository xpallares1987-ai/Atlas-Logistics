/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import {
  Chart as ChartJS,
  Tooltip,
  Legend,
  Title,
  LinearScale,
  CategoryScale,
} from "chart.js";
import { MatrixController, MatrixElement } from "chartjs-chart-matrix";
import { Chart } from "react-chartjs-2";
import { FreightRate } from "../types";

ChartJS.register(
  MatrixController,
  MatrixElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Title,
);

interface VolatilityHeatmapProps {
  rates: FreightRate[];
}

export default function VolatilityHeatmap({ rates }: VolatilityHeatmapProps) {
  // Simple data processing to aggregate rates by Month and Carrier for heatmap
  const data = {
    datasets: [
      {
        label: "Price Volatility",
        data: rates.map((r) => ({
          x: r.mes,
          y: r.carrier,
          v: r.total, // Heat value
        })),
        backgroundColor(context: any) {
          const value = (context.dataset.data[context.dataIndex] as any).v || 0;
          const alpha = Math.min(value / 1000, 1);
          return `rgba(99, 102, 241, ${alpha})`;
        },
        width: (ctx: any) =>
          ctx.chart.chartArea ? ctx.chart.chartArea.width / 12 - 1 : 10,
        height: (ctx: any) =>
          ctx.chart.chartArea ? ctx.chart.chartArea.height / 5 - 1 : 10,
      },
    ],
  };

  const options = {
    scales: {
      x: {
        type: "category" as const,
        labels: [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ],
      },
      y: { type: "category" as const },
    },
  };

  return (
    <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
        Price Volatility Heatmap
      </h3>
      <Chart type="matrix" data={data} options={options} />
    </div>
  );
}
