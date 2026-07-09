import { Chart, registerables, ChartType } from "chart.js";
import { DataRow } from "../types";
import { BLACK_FILTERS, PALETTES } from "../config";
import { escapeHTML, hexToRgbA } from "@atlas/ui";

Chart.register(...registerables);

let chartInstances: Chart[] = [];

export const chartBuilder = {
  clear() {
    chartInstances.forEach((c) => c.destroy());
    chartInstances = [];
    const container = document.getElementById("chartsGrid");
    if (container) container.innerHTML = "";
  },

  build(data: DataRow[]) {
    this.clear();
    if (!data.length) return;

    const headers = Object.keys(data[0]).filter(
      (h) => !BLACK_FILTERS.includes(h),
    );
    const numericHeaders = headers.filter(
      (h) => typeof data[0][h] === "number",
    );
    const categoryHeaders = headers.filter(
      (h) => typeof data[0][h] === "string",
    );

    if (categoryHeaders.length >= 1 && numericHeaders.length >= 1) {
      const cat = categoryHeaders[0];
      const met = numericHeaders[0];

      const dataGroup = this.aggregate(data, cat, met);
      const id = createContainer(`Distribución de ${met} por ${cat}`);
      renderCJS(
        id,
        "doughnut",
        dataGroup.labels,
        dataGroup.values,
        met,
        PALETTES.primary[0],
      );
    }

    if (categoryHeaders.length >= 2 && numericHeaders.length >= 1) {
      const cat2 = categoryHeaders[1];
      const met2 = numericHeaders[0];
      const isDistinct = ["ID", "Reference", "Carrier"].includes(met2);

      const dataGroup = this.aggregate(data, cat2, met2, isDistinct);
      const id = createContainer(
        `Rendimiento por ${cat2} (${isDistinct ? "Únicos" : met2})`,
      );
      renderCJS(
        id,
        "bar",
        dataGroup.labels,
        dataGroup.values,
        met2,
        PALETTES.primary[1],
        false,
        true,
      );
    }
  },

  aggregate(data: DataRow[], cat: string, met: string, distinct = false) {
    const map: Record<string, number> = {};
    const seen: Record<string, Set<unknown>> = {};

    data.forEach((r) => {
      const key = String(r[cat] || "N/A");
      const val = Number(r[met]) || 0;

      if (!map[key]) {
        map[key] = 0;
        seen[key] = new Set();
      }

      if (distinct) {
        if (!seen[key].has(r[met])) {
          seen[key].add(r[met]);
          map[key]++;
        }
      } else {
        map[key] += val;
      }
    });

    const sorted = Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    return {
      labels: sorted.map((s) => s[0]),
      values: sorted.map((s) => s[1]),
    };
  },
};

function createContainer(title: string): string {
  const id = `chart-${Math.random().toString(36).substr(2, 9)}`;
  const grid = document.getElementById("chartsGrid");
  if (grid) {
    const div = document.createElement("div");
    div.className = "chart-card";
    div.innerHTML = `
            <div class="chart-header">
                <h4 style="margin:0;">${escapeHTML(title)}</h4>
                <button class="btn btn-secondary btn-download" style="padding: 0.25rem 0.5rem; font-size: 0.7rem;" data-chart-id="${id}">
                    💾 Descargar
                </button>
            </div>
            <div class="chart-wrapper" style="flex:1; min-height:300px;">
                <canvas id="${id}"></canvas>
            </div>
        `;
    grid.appendChild(div);

    const btn = div.querySelector(".btn-download") as HTMLButtonElement;
    btn.onclick = () => {
      const canvas = document.getElementById(id) as HTMLCanvasElement;
      if (canvas) {
        const link = document.createElement("a");
        link.download = `${title.replace(/ /g, "_")}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      }
    };
  }
  return id;
}

function renderCJS(
  id: string,
  type: ChartType,
  labels: string[],
  values: number[],
  label: string,
  color: string,
  horizontal = false,
  stacked = false,
) {
  const ctx = document.getElementById(id) as HTMLCanvasElement;
  if (!ctx) return;

  const isDark = document.body.getAttribute("data-theme") === "dark";
  const gridColor = isDark
    ? "rgba(255, 255, 255, 0.05)"
    : "rgba(0, 0, 0, 0.05)";
  const textColor = isDark ? "#94a3b8" : "#64748b";

  const chart = new Chart(ctx, {
    type,
    data: {
      labels,
      datasets: [
        {
          label,
          data: values,
          backgroundColor:
            type === "doughnut" ? PALETTES.primary : hexToRgbA(color, 0.7),
          borderColor: color,
          borderWidth: 1,
        },
      ],
    },
    options: {
      indexAxis: horizontal ? "y" : "x",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: type === "doughnut",
          labels: { color: textColor },
        },
        tooltip: {
          backgroundColor: isDark
            ? "rgba(15, 23, 42, 0.9)"
            : "rgba(255, 255, 255, 0.9)",
          titleColor: isDark ? "#fff" : "#0f172a",
          bodyColor: isDark ? "#94a3b8" : "#475569",
          padding: 12,
          cornerRadius: 8,
          borderColor: gridColor,
          borderWidth: 1,
        },
      },
      scales:
        type !== "doughnut"
          ? {
              y: {
                beginAtZero: true,
                stacked,
                grid: { color: gridColor },
                ticks: { color: textColor },
              },
              x: {
                stacked,
                grid: { display: false },
                ticks: { color: textColor },
              },
            }
          : {},
    },
  });
  chartInstances.push(chart);
}

export function buildDynamicCharts(data: DataRow[]) {
  chartBuilder.build(data);
}
