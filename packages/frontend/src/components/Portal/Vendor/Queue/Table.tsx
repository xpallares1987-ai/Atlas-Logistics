/**
 * @file Table.tsx
 * @description Data table for sanitized Purchase Order projections in B2B Vendor Portal (ADR 0035).
 * Enforces Zero-Leak masking, responsive sorting/search, and supplier confirmation actions.
 * @module @atlas/frontend/components/Portal/Vendor/Queue/Table
 * @see {@link docs/adr/0035-b2b-customer-and-vendor-portal-architecture.md}
 */

import React, { useState } from "react";
import {
  Search,
  CheckCircle2,
  Clock,
  Eye,
  CalendarCheck,
  ChevronRight,
  Package,
} from "lucide-react";
import type { PortalPoProjectionDto } from "../types";

interface TableProps {
  orders: PortalPoProjectionDto[];
  loading: boolean;
  onSelectOrder: (order: PortalPoProjectionDto) => void;
  onConfirmOrder: (order: PortalPoProjectionDto) => void;
}

export const Table: React.FC<TableProps> = ({
  orders,
  loading,
  onSelectOrder,
  onConfirmOrder,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Filtering
  const filteredOrders = orders.filter((po) => {
    const matchesSearch =
      po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.buyerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.incoterm.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "PENDING" &&
        po.supplierConfirmationStatus === "PENDING") ||
      (statusFilter === "CONFIRMED" &&
        po.supplierConfirmationStatus === "CONFIRMED");

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
      {/* Search and Filters Bar */}
      <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search by PO number, buyer, or incoterm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="vendorStatusFilter"
            className="text-xs text-slate-400 whitespace-nowrap"
          >
            Filter:
          </label>
          <select
            id="vendorStatusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Statuses ({orders.length})</option>
            <option value="PENDING">Pending Confirmation</option>
            <option value="CONFIRMED">Confirmed</option>
          </select>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/70 text-slate-400 font-semibold border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">PO Number</th>
              <th className="py-3 px-4">Buyer / Customer</th>
              <th className="py-3 px-4">Incoterm</th>
              <th className="py-3 px-4">Expected CRD</th>
              <th className="py-3 px-4">Promised CRD</th>
              <th className="py-3 px-4">Confirmation Status</th>
              <th className="py-3 px-4">SKUs / Items</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">
                  <div className="inline-flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <span>Loading purchase orders...</span>
                  </div>
                </td>
              </tr>
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">
                  No purchase orders found matching the criteria.
                </td>
              </tr>
            ) : (
              filteredOrders.map((po) => {
                const isPending = po.supplierConfirmationStatus === "PENDING";
                const isConfirmed =
                  po.supplierConfirmationStatus === "CONFIRMED";
                const itemCount = po.lineItemsSummaryJson?.length || 0;

                return (
                  <tr
                    key={po.id}
                    className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                    onClick={() => onSelectOrder(po)}
                  >
                    {/* PO Number */}
                    <td className="py-3 px-4 font-mono font-semibold text-slate-100 flex items-center gap-2">
                      <Package className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span>{po.poNumber}</span>
                    </td>

                    {/* Buyer Name */}
                    <td className="py-3 px-4 font-medium text-slate-300">
                      {po.buyerName}
                    </td>

                    {/* Incoterm */}
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded font-mono font-semibold text-[10px] bg-slate-800 text-slate-200 border border-slate-700">
                        {po.incoterm}
                      </span>
                    </td>

                    {/* Expected CRD */}
                    <td className="py-3 px-4 text-slate-400">
                      {po.expectedCargoReadyDate}
                    </td>

                    {/* Promised CRD */}
                    <td className="py-3 px-4">
                      {po.promisedCargoReadyDate ? (
                        <span className="font-semibold text-emerald-400 font-mono">
                          {po.promisedCargoReadyDate}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">Not set</span>
                      )}
                    </td>

                    {/* Confirmation Status */}
                    <td className="py-3 px-4">
                      {isPending && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-950/60 text-amber-400 border border-amber-800/60">
                          <Clock className="w-3.5 h-3.5" />
                          Pending Confirmation
                        </span>
                      )}
                      {isConfirmed && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Confirmed
                        </span>
                      )}
                      {!isPending && !isConfirmed && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-300">
                          {po.supplierConfirmationStatus}
                        </span>
                      )}
                    </td>

                    {/* SKU Count */}
                    <td className="py-3 px-4 text-slate-400">
                      {itemCount} {itemCount === 1 ? "line" : "lines"}
                    </td>

                    {/* Actions */}
                    <td
                      className="py-3 px-4 text-right space-x-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isPending && (
                        <button
                          type="button"
                          onClick={() => onConfirmOrder(po)}
                          className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors inline-flex items-center gap-1"
                        >
                          <CalendarCheck className="w-3.5 h-3.5" />
                          Confirm CRD
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onSelectOrder(po)}
                        className="px-2.5 py-1 rounded-md text-[11px] font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
