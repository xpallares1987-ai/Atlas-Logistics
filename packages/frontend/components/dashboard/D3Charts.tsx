"use client";

import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

const monthlyVolumeData = [
  { month: "Ene", volume: 420 },
  { month: "Feb", volume: 380 },
  { month: "Mar", volume: 550 },
  { month: "Abr", volume: 610 },
  { month: "May", volume: 720 },
  { month: "Jun", volume: 850 },
  { month: "Jul", volume: 880 },
  { month: "Ago", volume: 920 },
];

const carrierProfitData = [
  { carrier: "MSC", profit: 45000 },
  { carrier: "Maersk", profit: 38000 },
  { carrier: "CMA CGM", profit: 32000 },
  { carrier: "Hapag", profit: 28000 },
  { carrier: "Evergreen", profit: 21000 },
];

export default function D3DashboardCharts() {
  const volumeRef = useRef<HTMLDivElement>(null);
  const profitRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const handleResize = () => {
      if (volumeRef.current) {
        setDimensions({
          width: volumeRef.current.clientWidth,
          height: 250, // Fixed height
        });
      }
    };

    // Initial size
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Render Volume Chart (Line/Area)
  useEffect(() => {
    if (!volumeRef.current || dimensions.width === 0) return;

    const { width, height } = dimensions;
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Clear previous
    d3.select(volumeRef.current).selectAll("*").remove();

    const svg = d3
      .select(volumeRef.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3
      .scalePoint()
      .domain(monthlyVolumeData.map((d) => d.month))
      .range([0, chartWidth])
      .padding(0.5);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(monthlyVolumeData, (d) => d.volume) || 1000])
      .nice()
      .range([chartHeight, 0]);

    // Grid lines
    svg
      .append("g")
      .attr("class", "grid")
      .call(
        d3
          .axisLeft(y)
          .tickSize(-chartWidth)
          .tickFormat(() => ""),
      )
      .selectAll("line")
      .attr("stroke", "#2d3748")
      .attr("stroke-dasharray", "3,3");
    svg.select(".domain").remove();

    // Axes
    svg
      .append("g")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(d3.axisBottom(x).tickSize(0).tickPadding(10))
      .select(".domain")
      .remove();
    svg
      .selectAll(".tick text")
      .attr("fill", "#a0aec0")
      .attr("font-size", "12px");

    svg
      .append("g")
      .call(d3.axisLeft(y).tickSize(0).tickPadding(10).ticks(5))
      .select(".domain")
      .remove();
    svg
      .selectAll(".tick text")
      .attr("fill", "#a0aec0")
      .attr("font-size", "12px");

    // Gradient
    const defs = svg.append("defs");
    const gradient = defs
      .append("linearGradient")
      .attr("id", "areaGradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");

    gradient
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#818cf8")
      .attr("stop-opacity", 0.4);
    gradient
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#818cf8")
      .attr("stop-opacity", 0);

    // Area
    const area = d3
      .area<{ month: string; volume: number }>()
      .x((d) => x(d.month) || 0)
      .y0(chartHeight)
      .y1((d) => y(d.volume))
      .curve(d3.curveMonotoneX);

    svg
      .append("path")
      .datum(monthlyVolumeData)
      .attr("fill", "url(#areaGradient)")
      .attr("d", area);

    // Line
    const line = d3
      .line<{ month: string; volume: number }>()
      .x((d) => x(d.month) || 0)
      .y((d) => y(d.volume))
      .curve(d3.curveMonotoneX);

    svg
      .append("path")
      .datum(monthlyVolumeData)
      .attr("fill", "none")
      .attr("stroke", "#818cf8")
      .attr("stroke-width", 2)
      .attr("d", line);

    // Tooltip interaction
    const tooltip = d3
      .select(volumeRef.current)
      .append("div")
      .attr(
        "class",
        "absolute invisible bg-[#111114] border border-gray-800 rounded px-3 py-2 text-white text-xs shadow-lg pointer-events-none transition-opacity duration-200 z-50",
      );

    svg
      .selectAll(".dot")
      .data(monthlyVolumeData)
      .enter()
      .append("circle")
      .attr("class", "dot")
      .attr("cx", (d) => x(d.month) || 0)
      .attr("cy", (d) => y(d.volume))
      .attr("r", 4)
      .attr("fill", "#111114")
      .attr("stroke", "#818cf8")
      .attr("stroke-width", 2)
      .on("mouseover", (event, d) => {
        d3.select(event.currentTarget).attr("r", 6).attr("fill", "#818cf8");
        tooltip
          .html(`<strong>${d.month}</strong><br/>Volumen: ${d.volume} TEUs`)
          .style("visibility", "visible");
      })
      .on("mousemove", (event) => {
        const [mx, my] = d3.pointer(event, volumeRef.current);
        tooltip.style("top", my - 40 + "px").style("left", mx + 15 + "px");
      })
      .on("mouseout", (event) => {
        d3.select(event.currentTarget).attr("r", 4).attr("fill", "#111114");
        tooltip.style("visibility", "hidden");
      });
  }, [dimensions]);

  // Render Profit Chart (Bar)
  useEffect(() => {
    if (!profitRef.current || dimensions.width === 0) return;

    const { width, height } = dimensions;
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    d3.select(profitRef.current).selectAll("*").remove();

    const svg = d3
      .select(profitRef.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3
      .scaleBand()
      .domain(carrierProfitData.map((d) => d.carrier))
      .range([0, chartWidth])
      .padding(0.3);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(carrierProfitData, (d) => d.profit) || 50000])
      .nice()
      .range([chartHeight, 0]);

    // Grid lines
    svg
      .append("g")
      .attr("class", "grid")
      .call(
        d3
          .axisLeft(y)
          .tickSize(-chartWidth)
          .tickFormat(() => ""),
      )
      .selectAll("line")
      .attr("stroke", "#2d3748")
      .attr("stroke-dasharray", "3,3");
    svg.select(".domain").remove();

    // Axes
    svg
      .append("g")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(d3.axisBottom(x).tickSize(0).tickPadding(10))
      .select(".domain")
      .remove();
    svg
      .selectAll(".tick text")
      .attr("fill", "#a0aec0")
      .attr("font-size", "12px");

    svg
      .append("g")
      .call(
        d3
          .axisLeft(y)
          .tickSize(0)
          .tickPadding(10)
          .ticks(5)
          .tickFormat((d) => `$${Number(d) / 1000}k`),
      )
      .select(".domain")
      .remove();
    svg
      .selectAll(".tick text")
      .attr("fill", "#a0aec0")
      .attr("font-size", "12px");

    const tooltip = d3
      .select(profitRef.current)
      .append("div")
      .attr(
        "class",
        "absolute invisible bg-[#111114] border border-gray-800 rounded px-3 py-2 text-white text-xs shadow-lg pointer-events-none transition-opacity duration-200 z-50",
      );

    // Bars
    svg
      .selectAll(".bar")
      .data(carrierProfitData)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (d) => x(d.carrier) || 0)
      .attr("y", (d) => y(d.profit))
      .attr("width", x.bandwidth())
      .attr("height", (d) => chartHeight - y(d.profit))
      .attr("fill", "#10b981")
      .attr("rx", 4)
      .on("mouseover", (event, d) => {
        d3.select(event.currentTarget).attr("fill", "#34d399");
        tooltip
          .html(
            `<strong>${d.carrier}</strong><br/>Beneficio: $${d.profit.toLocaleString()}`,
          )
          .style("visibility", "visible");
      })
      .on("mousemove", (event) => {
        const [mx, my] = d3.pointer(event, profitRef.current);
        tooltip.style("top", my - 40 + "px").style("left", mx + 15 + "px");
      })
      .on("mouseout", (event) => {
        d3.select(event.currentTarget).attr("fill", "#10b981");
        tooltip.style("visibility", "hidden");
      });
  }, [dimensions]);

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-[#16161A] p-6 rounded-xl border border-gray-800/40 w-full flex flex-col h-[350px]">
        <div className="mb-2">
          <h3 className="text-sm font-medium text-white">
            Volumen de Embarques (TEUs)
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Tendencia mensual de volumen
          </p>
        </div>
        <div className="flex-1 w-full min-h-0 relative" ref={volumeRef}></div>
      </div>

      <div className="bg-[#16161A] p-6 rounded-xl border border-gray-800/40 w-full flex flex-col h-[350px]">
        <div className="mb-2">
          <h3 className="text-sm font-medium text-white">
            Rentabilidad por Naviera
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Margen consolidado por transportista principal
          </p>
        </div>
        <div className="flex-1 w-full min-h-0 relative" ref={profitRef}></div>
      </div>
    </div>
  );
}
