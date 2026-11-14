/**
 * @file FilterBar.tsx
 * @description Multimodal transport and urgency bucket filter controls for the Cockpit queue.
 * @module @atlas/frontend/components/Cockpit/Queue/FilterBar
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

import React from "react";
import { Briefcase, Compass, Plane, Search, Ship, Truck } from "lucide-react";
import type {
  StatusFilter,
  TransportMode,
  UrgencyBucketFilter,
} from "../../../types/cockpit.types";
import type { Department } from "../../../store/useOrganizationStore.js";

// ============================================================================
// 1. COMPONENT PROPS
// ============================================================================

interface FilterBarProps {
  modeFilter: TransportMode;
  onModeFilterChange: (mode: TransportMode) => void;
  countAll: number;
  countOcean: number;
  countAir: number;
  countRoad: number;
  selectedBucket: string;
  onSelectBucket: (bucket: string) => void;
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (status: StatusFilter) => void;
  departments?: Department[];
  activeDepartmentId?: string;
  onDepartmentChange?: (deptId: string) => void;
}

const URGENCY_BUCKETS: UrgencyBucketFilter[] = [
  "ALL",
  "IMMEDIATE_ACTION",
  "DUE_TODAY",
  "UPCOMING",
  "BLOCKED",
];

// ============================================================================
// 2. COMPONENT IMPLEMENTATION
// ============================================================================

export const FilterBar: React.FC<FilterBarProps> = ({
  modeFilter,
  onModeFilterChange,
  countAll,
  countOcean,
  countAir,
  countRoad,
  selectedBucket,
  onSelectBucket,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  departments,
  activeDepartmentId = "ALL",
  onDepartmentChange,
}) => {
  return (
    <div className="flex flex-col gap-3">
      {/* Multimodal Transport Mode Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-indigo-400" /> Transport Mode:
          </span>
          <button
            onClick={() => onModeFilterChange("ALL")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
              modeFilter === "ALL"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            <span>All</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/60 text-slate-300">
              {countAll}
            </span>
          </button>
          <button
            onClick={() => onModeFilterChange("OCEAN")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
              modeFilter === "OCEAN"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            <Ship className="w-3.5 h-3.5 text-blue-400" />
            <span>Ocean</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/60 text-slate-300">
              {countOcean}
            </span>
          </button>
          <button
            onClick={() => onModeFilterChange("AIR")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
              modeFilter === "AIR"
                ? "bg-sky-600 text-white shadow-md shadow-sky-600/30"
                : "bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            <Plane className="w-3.5 h-3.5 text-sky-400" />
            <span>Air</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/60 text-slate-300">
              {countAir}
            </span>
          </button>
          <button
            onClick={() => onModeFilterChange("ROAD")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
              modeFilter === "ROAD"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                : "bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            <Truck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Road</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/60 text-slate-300">
              {countRoad}
            </span>
          </button>
        </div>
      </div>

      {/* Department Filter Chips (when departments exist for station scope) */}
      {departments && departments.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
          <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-indigo-400" /> Department:
          </span>
          <button
            onClick={() => onDepartmentChange?.("ALL")}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
              activeDepartmentId === "ALL"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-800/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            All Departments
          </button>
          {departments.map((dept) => {
            const isSelected =
              activeDepartmentId === dept.id ||
              activeDepartmentId === dept.code;
            const displayName = dept.name.includes(" - ")
              ? dept.name.split(" - ")[1]
              : dept.name;
            return (
              <button
                key={dept.id}
                onClick={() => onDepartmentChange?.(dept.code || dept.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-indigo-600 text-white font-semibold shadow-sm"
                    : "bg-slate-800/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                <span>{displayName}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Urgency & Search Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          {URGENCY_BUCKETS.map((bucket) => (
            <button
              key={bucket}
              onClick={() => onSelectBucket(bucket)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                selectedBucket === bucket
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              {bucket.replace(/_/g, " ")}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              id="cockpit-search-input"
              name="cockpitSearch"
              aria-label="Search reference, task, hold..."
              type="text"
              placeholder="Search reference, task, hold..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center bg-slate-950 rounded-lg border border-slate-800 p-0.5">
            <button
              onClick={() => onStatusFilterChange("OPEN")}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
                statusFilter === "OPEN"
                  ? "bg-indigo-600 text-white font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Open
            </button>
            <button
              onClick={() => onStatusFilterChange("COMPLETED")}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
                statusFilter === "COMPLETED"
                  ? "bg-indigo-600 text-white font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Completed
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
