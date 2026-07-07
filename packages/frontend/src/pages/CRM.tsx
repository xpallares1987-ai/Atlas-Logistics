import React from "react";
import {
  Building2,
  Users,
  Phone,
  Mail,
  MoreVertical,
  Search,
  Plus,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
} from "lucide-react";

const DEALS = [
  {
    id: 1,
    name: "Ocean Freight - Q3 2026",
    company: "Global Tech Industries",
    value: "$45,000",
    stage: "Negotiation",
    probability: 80,
    date: "Oct 12",
  },
  {
    id: 2,
    name: "Air Cargo Contract",
    company: "Nexus Logistics",
    value: "$12,500",
    stage: "Qualified",
    probability: 60,
    date: "Oct 14",
  },
  {
    id: 3,
    name: "Customs Clearance Retainer",
    company: "Apex Imports Ltd",
    value: "$8,200",
    stage: "Proposal",
    probability: 40,
    date: "Oct 15",
  },
];

const METRICS = [
  {
    title: "Total Active Deals",
    value: "$284,500",
    change: "+14%",
    trend: "up",
  },
  { title: "New Leads (This Week)", value: "34", change: "+5", trend: "up" },
  { title: "Win Rate", value: "48.2%", change: "-2.1%", trend: "down" },
  { title: "Active Clients", value: "1,204", change: "+12", trend: "up" },
];

export default function CRMPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Customer Relationship Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage leads, accounts, and deal pipelines across the network.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm">
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
            <Plus className="w-4 h-4" />
            New Deal
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {METRICS.map((metric, idx) => (
          <div
            key={idx}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-slate-500">
                {metric.title}
              </p>
              <span
                className={`flex items-center text-xs font-semibold ${metric.trend === "up" ? "text-emerald-600" : "text-red-500"}`}
              >
                {metric.trend === "up" ? (
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                ) : (
                  <ArrowDownRight className="w-3 h-3 mr-1" />
                )}
                {metric.change}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mt-2">
              {metric.value}
            </h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[500px]">
        {/* Main Deal Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800">
              Active Deals
            </h2>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search deals..."
                className="pl-9 pr-4 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow"
              />
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-50 z-10">
                <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  <th className="px-5 py-3">Deal Name</th>
                  <th className="px-5 py-3">Company</th>
                  <th className="px-5 py-3">Stage</th>
                  <th className="px-5 py-3 text-right">Value</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {DEALS.map((deal) => (
                  <tr
                    key={deal.id}
                    className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                  >
                    <td className="px-5 py-4 font-medium text-slate-800">
                      {deal.name}
                    </td>
                    <td className="px-5 py-4 text-slate-500 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      {deal.company}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                        {deal.stage}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-medium text-slate-700">
                      {deal.value}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button className="text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar Activity */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500" />
              Recent Activity
            </h2>
          </div>
          <div className="flex-1 overflow-auto p-5 space-y-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-4 relative">
                {i !== 4 && (
                  <div className="absolute top-8 left-4 w-px h-full bg-slate-200 -z-10" />
                )}
                <div className="w-8 h-8 rounded-full bg-blue-50 flex flex-shrink-0 items-center justify-center text-blue-600 shrink-0">
                  {i % 2 === 0 ? (
                    <Mail className="w-4 h-4" />
                  ) : (
                    <Phone className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {i % 2 === 0
                      ? "Email sent to Logistics Ltd."
                      : "Call with John Doe"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Discussed the upcoming Q4 volume requirements and potential
                    discount tiers.
                  </p>
                  <p className="text-xs text-slate-400 mt-2 font-medium">
                    {i} hour{i > 1 ? "s" : ""} ago
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
