/**
 * @file Table.tsx
 * @description Interactive data table for PO list, status filters, search, and detail selection (ADR 0032).
 * @module @atlas/frontend/components/PurchaseOrders/Queue/Table
 */

import React from "react";
import { Search, Filter, Eye, Plus } from "lucide-react";

export interface PurchaseOrderRow {
  id: string;
  poNumber: string;
  buyerName: string;
  supplierName: string;
  incoterm: string;
  expectedCargoReadyDate: string;
  status: string;
  totalItemsCount: number;
  totalQuantity: string;
  totalAllocatedQuantity: string;
  remainingQuantity: string;
}

interface TableProps {
  orders: PurchaseOrderRow[];
  loading: boolean;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  onSelectOrder: (id: string) => void;
  onOpenCreateModal: () => void;
}

const STATUS_BADGES: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  ISSUED: {
    label: "Issued",
    bg: "bg-slate-700/50",
    text: "text-slate-300",
    border: "border-slate-600",
  },
  ACKNOWLEDGED: {
    label: "Acknowledged",
    bg: "bg-blue-900/30",
    text: "text-blue-300",
    border: "border-blue-700",
  },
  IN_PRODUCTION: {
    label: "In Production",
    bg: "bg-amber-900/30",
    text: "text-amber-300",
    border: "border-amber-700",
  },
  CARGO_READY: {
    label: "Cargo Ready",
    bg: "bg-emerald-900/30",
    text: "text-emerald-300",
    border: "border-emerald-700",
  },
  PARTIALLY_BOOKED: {
    label: "Partially Booked",
    bg: "bg-indigo-900/30",
    text: "text-indigo-300",
    border: "border-indigo-700",
  },
  BOOKED: {
    label: "Booked",
    bg: "bg-cyan-900/30",
    text: "text-cyan-300",
    border: "border-cyan-700",
  },
  SHIPPED: {
    label: "Shipped",
    bg: "bg-purple-900/30",
    text: "text-purple-300",
    border: "border-purple-700",
  },
  CANCELLED: {
    label: "Cancelled",
    bg: "bg-rose-900/30",
    text: "text-rose-300",
    border: "border-rose-700",
  },
};

export const Table: React.FC<TableProps> = ({
  orders,
  loading,
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onSelectOrder,
  onOpenCreateModal,
}) => {
  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.buyerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.supplierName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl overflow-hidden shadow-sm backdrop-blur-sm">
      {/* Controls Bar */}
      <div className="p-4 border-b border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
          {/* Search Box */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search PO #, buyer or supplier..."
              className="w-full bg-slate-900/80 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              aria-label="Filter by PO Status"
              className="bg-slate-900/80 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ISSUED">Issued</option>
              <option value="ACKNOWLEDGED">Acknowledged</option>
              <option value="IN_PRODUCTION">In Production</option>
              <option value="CARGO_READY">Cargo Ready</option>
              <option value="PARTIALLY_BOOKED">Partially Booked</option>
              <option value="BOOKED">Booked</option>
            </select>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={onOpenCreateModal}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Purchase Order</span>
        </button>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-700/60 bg-slate-900/40 text-slate-400 text-xs uppercase tracking-wider font-semibold">
              <th className="py-3 px-4">PO Number</th>
              <th className="py-3 px-4">Buyer Company</th>
              <th className="py-3 px-4">Supplier Partner</th>
              <th className="py-3 px-4 text-center">Incoterm</th>
              <th className="py-3 px-4">Ready Date</th>
              <th className="py-3 px-4 text-right">Items / Qty</th>
              <th className="py-3 px-4 text-right">Allocated</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/40 text-sm">
            {loading ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent" />
                  <p className="mt-2 text-xs">Loading purchase orders...</p>
                </td>
              </tr>
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400">
                  <p className="text-sm font-medium">
                    No purchase orders found
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Try adjusting search filters or create a new order.
                  </p>
                </td>
              </tr>
            ) : (
              filteredOrders.map((po) => {
                const badge = STATUS_BADGES[po.status] || {
                  label: po.status,
                  bg: "bg-slate-700",
                  text: "text-slate-300",
                  border: "border-slate-600",
                };
                return (
                  <tr
                    key={po.id}
                    onClick={() => onSelectOrder(po.id)}
                    className="hover:bg-slate-700/30 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-semibold text-blue-400">
                      {po.poNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-200 font-medium">
                      {po.buyerName}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {po.supplierName}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300 border border-slate-600">
                        {po.incoterm}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-mono text-xs">
                      {po.expectedCargoReadyDate}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-slate-200 font-medium">
                        {po.totalQuantity}
                      </span>
                      <span className="text-slate-500 text-xs block">
                        ({po.totalItemsCount} SKUs)
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs">
                      <span className="text-cyan-400 font-medium">
                        {po.totalAllocatedQuantity}
                      </span>
                      <span className="text-slate-500 text-xs block">
                        Rem: {po.remainingQuantity}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badge.bg} ${badge.text} ${badge.border}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectOrder(po.id);
                        }}
                        className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-blue-400 transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
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
