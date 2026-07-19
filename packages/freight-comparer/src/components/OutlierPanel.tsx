/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useEffect, useRef } from "react";
import { AlertTriangle, Info, Activity } from "lucide-react";
import * as d3 from "d3";
import { FreightRate } from "../types";

interface OutlierPanelProps {
  filteredRates: FreightRate[];
}

export default function OutlierPanel({ filteredRates }: OutlierPanelProps) {
  const chartRef = useRef<SVGSVGElement>(null);

  const outliers = useMemo(() => {
    if (filteredRates.length < 5) return [];

    // Simple Z-score based outlier detection
    const mean =
      filteredRates.reduce((sum, r) => sum + r.total, 0) / filteredRates.length;
    const stdDev = Math.sqrt(
      filteredRates.reduce((sum, r) => sum + Math.pow(r.total - mean, 2), 0) /
        filteredRates.length,
    );

    return filteredRates
      .map((r) => ({
        ...r,
        zScore: Math.abs((r.total - mean) / stdDev),
      }))
      .filter((r) => r.zScore > 2.0) // 2.0+ is considered an outlier here
      .sort((a, b) => b.zScore - a.zScore);
  }, [filteredRates]);

  useEffect(() => {
    if (!chartRef.current || filteredRates.length === 0) return;

    const svg = d3.select(chartRef.current);
    svg.selectAll("*").remove();

    const width = 400;
    const height = 200;
    const margin = { top: 20, right: 30, bottom: 40, left: 50 };

    const x = d3
      .scaleLinear()
      .domain([0, filteredRates.length - 1])
      .range([margin.left, width - margin.right]);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(filteredRates, (d) => d.total) || 0])
      .nice()
      .range([height - margin.bottom, margin.top]);

    svg
      .append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(0));

    svg
      .append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(
        d3
          .axisLeft(y)
          .ticks(5)
          .tickFormat((d) => `$${d}`),
      );

    // Draw normal points
    svg
      .selectAll("circle.normal")
      .data(filteredRates)
      .join("circle")
      .attr("class", "normal")
      .attr("cx", (_, i) => x(i))
      .attr("cy", (d: FreightRate) => y(d.total))
      .attr("r", 3)
      .attr("fill", "#6366f1")
      .attr("opacity", 0.6);

    // Draw outliers
    svg
      .selectAll("circle.outlier")
      .data(outliers)
      .join("circle")
      .attr("class", "outlier")
      .attr("cx", (d: FreightRate) => {
        const idx = filteredRates.indexOf(d);
        return x(idx);
      })
      .attr("cy", (d: FreightRate) => y(d.total))
      .attr("r", 5)
      .attr("fill", "#ef4444")
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);
  }, [filteredRates, outliers]);

  if (filteredRates.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-800">
            Advanced Rate Audit (Phase 3)
          </h3>
        </div>
        <span className="text-[10px] px-2 py-0.5 bg-indigo-100 text-indigo-700 font-bold rounded-full">
          D3.js ENGINE
        </span>
      </div>

      <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            Using Statistical Z-Score analysis to identify pricing anomalies
            that might indicate negotiation opportunities or data entry errors.
          </p>

          <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
            <svg
              ref={chartRef}
              width="100%"
              height="200"
              viewBox="0 0 400 200"
              preserveAspectRatio="xMidYMid meet"
            ></svg>
            <div className="flex justify-center gap-6 mt-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 opacity-60"></div>
                <span className="text-[9px] font-bold text-slate-500 uppercase">
                  Standard Rate
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 border border-white"></div>
                <span className="text-[9px] font-bold text-red-500 uppercase">
                  Anomalous Rate (Outlier)
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle
              className={`h-4 w-4 ${outliers.length > 0 ? "text-amber-500" : "text-emerald-500"}`}
            />
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Detection Results
            </h4>
          </div>

          {outliers.length > 0 ? (
            <div className="space-y-2">
              {outliers.map((r, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-amber-50 border border-amber-100 rounded-lg flex items-center justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-slate-800 truncate">
                      {r.carrier}
                    </p>
                    <p className="text-[9px] text-slate-500">
                      {r.pol} → {r.pod}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-black text-amber-700">
                      ${r.total}
                    </p>
                    <p className="text-[8px] font-mono text-amber-500">
                      Z-Score: {r.zScore.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 border-2 border-dashed border-slate-100 rounded-xl flex flex-col items-center justify-center text-center">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full mb-2">
                <Info className="h-5 w-5" />
              </div>
              <p className="text-xs font-bold text-slate-800">
                No anomalies detected
              </p>
              <p className="text-[10px] text-slate-500 mt-1">
                Rates within this lane show standard distribution.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
