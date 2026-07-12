import React from "react";
import {
  Package,
  MapPin,
  Search,
  ArrowRightLeft,
  Truck,
  AlertTriangle,
  CheckCircle2,
  Box,
  Filter,
  MoreHorizontal,
} from "lucide-react";

const INVENTORY = [
  {
    id: "PAL-2849",
    sku: "ELEC-9932",
    desc: "Lithium Ion Batteries (Pallet)",
    location: "A-12-Rack-3",
    status: "Available",
    qty: 24,
    lastMoved: "Today, 08:30 AM",
  },
  {
    id: "PAL-2850",
    sku: "MECH-1029",
    desc: "Industrial Valving Set",
    location: "B-04-Floor",
    status: "Allocated",
    qty: 12,
    lastMoved: "Yesterday",
  },
  {
    id: "PAL-2851",
    sku: "ELEC-4401",
    desc: "Solar Panel Array v2",
    location: "C-01-Rack-1",
    status: "In Transit",
    qty: 8,
    lastMoved: "Oct 14, 2026",
  },
  {
    id: "PAL-2852",
    sku: "CONS-002",
    desc: "Office Supplies Bulk",
    location: "A-10-Rack-2",
    status: "Low Stock",
    qty: 3,
    lastMoved: "Oct 10, 2026",
  },
];

export default function WMSPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Warehouse Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time inventory tracking, space utilization, and fulfillment.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm">
            <ArrowRightLeft className="w-4 h-4" />
            Stock Transfer
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
            <Box className="w-4 h-4" />
            Receive Goods
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">
              Available Capacity
            </p>
            <h3 className="text-xl font-bold text-slate-800 mt-1">
              42% (1,204 Pallets)
            </h3>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Inbound Today</p>
            <h3 className="text-xl font-bold text-slate-800 mt-1">
              24 Shipments
            </h3>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">
              Outbound Orders
            </p>
            <h3 className="text-xl font-bold text-slate-800 mt-1">
              156 Lines Picked
            </h3>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-red-100 p-5 shadow-sm flex items-start gap-4 bg-red-50/30">
          <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-red-800">Alerts</p>
            <h3 className="text-xl font-bold text-red-900 mt-1">
              3 Items Low Stock
            </h3>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-base font-semibold text-slate-800">
              Inventory Overview
            </h2>
            <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
            <div className="flex gap-2">
              <span className="px-3 py-1 rounded-full bg-slate-100 text-xs font-medium text-slate-600 cursor-pointer hover:bg-slate-200">
                All Locations
              </span>
              <span className="px-3 py-1 rounded-full bg-transparent text-xs font-medium text-slate-500 cursor-pointer hover:bg-slate-100">
                Zone A
              </span>
              <span className="px-3 py-1 rounded-full bg-transparent text-xs font-medium text-slate-500 cursor-pointer hover:bg-slate-100">
                Zone B
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search SKU or LPN..."
                className="pl-9 pr-4 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow w-full sm:w-64"
              />
            </div>
            <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-md border border-slate-200">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-slate-50/50">
              <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <th className="px-5 py-4">LPN / Pallet ID</th>
                <th className="px-5 py-4">SKU & Description</th>
                <th className="px-5 py-4">Location</th>
                <th className="px-5 py-4">Qty</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {INVENTORY.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50/80 transition-colors group"
                >
                  <td className="px-5 py-4 font-medium text-slate-900">
                    {item.id}
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-medium text-slate-800">{item.sku}</div>
                    <div className="text-slate-500 text-xs mt-0.5">
                      {item.desc}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {item.location}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-medium text-slate-700">
                    {item.qty} units
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border
                      ${item.status === "Available" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : ""}
                      ${item.status === "Allocated" ? "bg-blue-50 text-blue-700 border-blue-200" : ""}
                      ${item.status === "In Transit" ? "bg-amber-50 text-amber-700 border-amber-200" : ""}
                      ${item.status === "Low Stock" ? "bg-red-50 text-red-700 border-red-200" : ""}
                    `}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition-colors">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
