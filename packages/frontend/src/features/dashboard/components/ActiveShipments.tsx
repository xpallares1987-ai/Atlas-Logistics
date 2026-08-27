import { motion } from "framer-motion";
import { Box, ArrowRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@atlas/ui";

import { useApiQuery } from "../../../hooks/useApiQuery";
import { useDashboardStore } from "../store";

export function ActiveShipments() {
  const { dateRange } = useDashboardStore();
  const queryStr = dateRange
    ? `?start=${dateRange.start}&end=${dateRange.end}`
    : "";
  const { data } = useApiQuery<any>(
    ["dashboard", dateRange],
    `/dashboard${queryStr}`,
  );
  const shipments: any[] = data?.activeList || [];

  // Map backend shipments to UI format
  // If no shipments exist, we could provide some visual defaults, but let's just map real data.
  const activeShipments = shipments.slice(0, 5).map((s: any) => {
    // Generate some display logic based on status
    const isTransit = s.status === "In Transit" || s.status === "Completed";
    const progress = s.status === "Completed" ? 100 : isTransit ? 65 : 20;

    return {
      id: s.referenceNumber || s.id?.substring(0, 8).toUpperCase(),
      origin: s.origin || "Unknown",
      destination: s.destination || "Unknown",
      status: s.status || "Pending",
      progress,
      eta: s.status === "Completed" ? "Delivered" : "Pending",
      vessel: s.vessel || "TBA",
      type: s.equipment || "Ocean",
    };
  });
  return (
    <div className="rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-6 shadow-xl h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white tracking-tight">
          Active Shipments
        </h2>
        <button className="text-indigo-400 text-sm font-medium hover:text-indigo-300 transition-colors flex items-center gap-1">
          View All <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 w-full">
        {/* Mobile View: Stacked Cards */}
        <div className="flex flex-col gap-4 md:hidden">
          {activeShipments.map((shipment: any, idx: number) => (
            <motion.div
              key={shipment.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 + 0.4 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-4"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                    <Box className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-200 text-base">
                      {shipment.id}
                    </p>
                    <p className="text-xs text-slate-500">{shipment.vessel}</p>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border ${
                    shipment.status === "In Transit"
                      ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      : shipment.status === "Pending"
                        ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                        : shipment.status === "Confirmed"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  }`}
                >
                  {shipment.status}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm text-slate-300">
                <div className="flex flex-col">
                  <span className="text-xs text-slate-500 uppercase">
                    Origin
                  </span>
                  <span className="font-medium truncate max-w-[120px]">
                    {shipment.origin}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600" />
                <div className="flex flex-col text-right">
                  <span className="text-xs text-slate-500 uppercase">Dest</span>
                  <span className="font-medium truncate max-w-[120px]">
                    {shipment.destination}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Progress</span>
                  <span className="text-slate-200 font-bold">
                    {shipment.progress}%
                  </span>
                </div>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      shipment.status === "In Transit"
                        ? "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                        : shipment.status === "Pending"
                          ? "bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                          : shipment.status === "Confirmed"
                            ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                            : "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                    }`}
                    style={{ width: `${shipment.progress}%` }}
                  />
                </div>
              </div>

              <div className="flex justify-between items-center mt-2 border-t border-white/5 pt-3">
                <span className="text-xs text-slate-500">
                  Transport:{" "}
                  <span className="text-slate-300">{shipment.type}</span>
                </span>
                <span className="text-xs text-slate-500">
                  ETA:{" "}
                  <span className="text-slate-200 font-bold">
                    {shipment.eta}
                  </span>
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block">
          <Table className="text-left">
            <TableHeader>
              <TableRow className="border-b border-white/5 hover:bg-transparent">
                <TableHead className="text-slate-400">Reference</TableHead>
                <TableHead className="text-slate-400">Route</TableHead>
                <TableHead className="text-slate-400">Transport</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="text-slate-400 text-right">ETA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeShipments.map((shipment: any) => (
                <TableRow
                  key={shipment.id}
                  className="hover:bg-white/5 transition-colors group cursor-pointer border-white/5"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                        <Box className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-200">
                          {shipment.id}
                        </p>
                        <p className="text-xs text-slate-500">
                          {shipment.vessel}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <span className="truncate max-w-[100px]">
                        {shipment.origin}
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-600" />
                      <span className="truncate max-w-[100px]">
                        {shipment.destination}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-medium text-slate-300">
                      {shipment.type}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center text-xs">
                        <span
                          className={`${
                            shipment.status === "In Transit"
                              ? "text-blue-400"
                              : shipment.status === "Pending"
                                ? "text-purple-400"
                                : shipment.status === "Confirmed"
                                  ? "text-amber-400"
                                  : "text-emerald-400"
                          } font-medium`}
                        >
                          {shipment.status}
                        </span>
                        <span className="text-slate-500">
                          {shipment.progress}%
                        </span>
                      </div>
                      <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            shipment.status === "In Transit"
                              ? "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                              : shipment.status === "Customs Hold"
                                ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                                : "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                          }`}
                          style={{ width: `${shipment.progress}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-sm font-bold text-slate-200">
                      {shipment.eta}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
