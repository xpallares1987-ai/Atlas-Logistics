/**
 * @file PortalVendorModule.tsx
 * @description Dedicated B2B Vendor & Supplier Portal page module (ADR 0035).
 * Supports Zero-Trust Magic Access Token (atk_vendor_*) and standard JWT authentication,
 * sanitized CQRS PO projection views, formal CRD confirmation, and decentralized milestone updates.
 * @module @atlas/frontend/pages/PortalVendorModule
 * @see {@link docs/adr/0035-b2b-customer-and-vendor-portal-architecture.md}
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Building2, RefreshCw, Key, AlertCircle } from "lucide-react";
import {
  Metrics,
  Table,
  Detail,
  ConfirmPo,
  RecordMilestone,
  TokenAuth,
  PortalPoProjectionDto,
  ConfirmPoPayload,
  RecordMilestonePayload,
  VendorPortalStats,
} from "../components/Portal/Vendor";

const STORAGE_KEY = "portal_vendor_magic_token";

export default function PortalVendorModule() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Token Management
  const queryToken = searchParams.get("token");
  const queryPoId = searchParams.get("poId");

  const [activeToken, setActiveToken] = useState<string | null>(() => {
    return queryToken || sessionStorage.getItem(STORAGE_KEY) || null;
  });

  // State
  const [orders, setOrders] = useState<PortalPoProjectionDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected Order & Modals
  const [selectedOrder, setSelectedOrder] =
    useState<PortalPoProjectionDto | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);

  // Sync token from URL param
  useEffect(() => {
    if (queryToken && queryToken !== activeToken) {
      setActiveToken(queryToken);
      sessionStorage.setItem(STORAGE_KEY, queryToken);
    }
  }, [queryToken, activeToken]);

  // Authorization Header
  const getAuthHeader = useCallback((): HeadersInit => {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    if (activeToken) {
      headers["Authorization"] = `Bearer ${activeToken}`;
    }
    return headers;
  }, [activeToken]);

  // Fetch Orders
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/portal/vendor/pos", {
        headers: getAuthHeader(),
      });

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error(
            "Access Unauthorized. Please provide a valid Magic Access Token ('atk_vendor_*') or log in as a supplier.",
          );
        }
        throw new Error(`Failed to load orders: HTTP ${res.status}`);
      }

      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setOrders(list);

      // If poId query param specified, automatically open that order
      if (queryPoId) {
        const found = list.find(
          (p: PortalPoProjectionDto) =>
            p.poId === queryPoId || p.id === queryPoId,
        );
        if (found) {
          setSelectedOrder(found);
          setIsDetailOpen(true);
        }
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Error connecting to vendor portal",
      );
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeader, queryPoId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Compute Statistics
  const stats: VendorPortalStats = useMemo(() => {
    let pending = 0;
    let confirmed = 0;
    let withExceptions = 0;

    for (const po of orders) {
      if (po.supplierConfirmationStatus === "PENDING") {
        pending++;
      } else if (po.supplierConfirmationStatus === "CONFIRMED") {
        confirmed++;
      }
      if (po.exceptionsSummaryJson && po.exceptionsSummaryJson.length > 0) {
        withExceptions++;
      }
    }

    return {
      totalOrders: orders.length,
      pendingConfirmation: pending,
      confirmed,
      withExceptions,
    };
  }, [orders]);

  // Handlers
  const handleSelectOrder = (order: PortalPoProjectionDto) => {
    setSelectedOrder(order);
    setIsDetailOpen(true);
  };

  const handleOpenConfirm = (order: PortalPoProjectionDto) => {
    setSelectedOrder(order);
    setIsConfirmOpen(true);
  };

  const handleOpenRecord = () => {
    if (selectedOrder) {
      setIsRecordOpen(true);
    }
  };

  const handleApplyToken = (newToken: string) => {
    setActiveToken(newToken);
    sessionStorage.setItem(STORAGE_KEY, newToken);
    // Update query param
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("token", newToken);
    setSearchParams(nextParams);
  };

  const handleClearToken = () => {
    setActiveToken(null);
    sessionStorage.removeItem(STORAGE_KEY);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("token");
    setSearchParams(nextParams);
  };

  // Confirm PO API Action
  const handleConfirmPo = async (payload: ConfirmPoPayload) => {
    if (!selectedOrder) return;

    const res = await fetch(
      `/api/portal/vendor/pos/${selectedOrder.poId}/confirm`,
      {
        method: "POST",
        headers: getAuthHeader(),
        body: JSON.stringify(payload),
      },
    );

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(
        data.message || `Confirmation failed (HTTP ${res.status})`,
      );
    }

    const updated = await res.json();
    setSelectedOrder(updated);
    setOrders((prev) =>
      prev.map((o) => (o.poId === updated.poId ? updated : o)),
    );
  };

  // Record Milestone API Action
  const handleRecordMilestone = async (payload: RecordMilestonePayload) => {
    if (!selectedOrder) return;

    const res = await fetch(
      `/api/portal/vendor/pos/${selectedOrder.poId}/milestones`,
      {
        method: "POST",
        headers: getAuthHeader(),
        body: JSON.stringify(payload),
      },
    );

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(
        data.message || `Recording milestone failed (HTTP ${res.status})`,
      );
    }

    const updated = await res.json();
    setSelectedOrder(updated);
    setOrders((prev) =>
      prev.map((o) => (o.poId === updated.poId ? updated : o)),
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-950/70 border border-indigo-800/60 rounded-xl text-indigo-400">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-100">
                Supplier & Vendor B2B Portal
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-950/70 text-emerald-400 border border-emerald-800/60">
                ADR 0035 Zero-Trust
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Decentralized factory milestones, PO confirmations, and sovereign
              visibility
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Token Status Badge / Button */}
          <button
            type="button"
            onClick={() => setIsTokenModalOpen(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors ${
              activeToken
                ? "bg-slate-950 text-indigo-300 border-indigo-800 hover:border-indigo-600"
                : "bg-amber-950/60 text-amber-300 border-amber-800 hover:border-amber-600"
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            {activeToken ? (
              <span className="font-mono">
                Token: {activeToken.slice(0, 14)}...
              </span>
            ) : (
              <span>Enter Magic Token</span>
            )}
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={fetchOrders}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-rose-950/50 border border-rose-800/80 rounded-xl flex items-start justify-between gap-3 text-rose-300 text-xs">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Authentication Required</p>
              <p className="mt-0.5 text-rose-400">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsTokenModalOpen(true)}
            className="px-3 py-1 rounded bg-rose-900/80 hover:bg-rose-800 text-white font-medium transition-colors shrink-0"
          >
            Set Token
          </button>
        </div>
      )}

      {/* KPI Metrics */}
      <Metrics stats={stats} />

      {/* Main Table */}
      <Table
        orders={orders}
        loading={loading}
        onSelectOrder={handleSelectOrder}
        onConfirmOrder={handleOpenConfirm}
      />

      {/* Detail Slide-Over Drawer */}
      <Detail
        isOpen={isDetailOpen}
        po={selectedOrder}
        onClose={() => setIsDetailOpen(false)}
        onOpenConfirmModal={() => setIsConfirmOpen(true)}
        onOpenRecordModal={handleOpenRecord}
      />

      {/* Confirm PO Modal */}
      <ConfirmPo
        isOpen={isConfirmOpen}
        po={selectedOrder}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmPo}
      />

      {/* Record Milestone Modal */}
      <RecordMilestone
        isOpen={isRecordOpen}
        po={selectedOrder}
        onClose={() => setIsRecordOpen(false)}
        onSubmit={handleRecordMilestone}
      />

      {/* Token Auth Modal */}
      <TokenAuth
        isOpen={isTokenModalOpen}
        currentToken={activeToken}
        onClose={() => setIsTokenModalOpen(false)}
        onApplyToken={handleApplyToken}
        onClearToken={handleClearToken}
      />
    </div>
  );
}
