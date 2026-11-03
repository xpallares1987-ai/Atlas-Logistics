import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../lib/api";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Lock,
  PlusCircle,
  RefreshCw,
  Search,
  ShieldAlert,
  UserCheck,
  Zap,
} from "lucide-react";
import { ResolutionJustificationSelect } from "../components/common/ResolutionJustificationSelect";

export interface OperationalExceptionRecord {
  exceptionId: string;
  shipmentId: string;
  category:
    "CARRIER" | "DOCUMENTATION" | "CUSTOMS" | "EQUIPMENT" | "OPERATIONAL";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  title: string;
  description: string;
  isBlocking: boolean;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "IGNORED";
  assignedTo?: string | null;
  assignedToUserId?: string | null;
  assignedTeam?: string | null;
  raisedAt?: string;
  createdAt?: string;
  resolvedAt?: string | null;
  resolutionNote?: string | null;
  resolutionNotes?: string | null;
}

type ExceptionFilterTab = "OPEN" | "BLOCKING" | "ASSIGNED" | "RESOLVED";

export default function ExceptionCenterModule() {
  const navigate = useNavigate();

  const [exceptions, setExceptions] = useState<OperationalExceptionRecord[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [activeTab, setActiveTab] = useState<ExceptionFilterTab>("OPEN");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [severityFilter, setSeverityFilter] = useState("ALL");

  // In-situ resolve modal
  const [resolvingException, setResolvingException] =
    useState<OperationalExceptionRecord | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [resolvingSubmitting, setResolvingSubmitting] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<
    string | null
  >(null);

  // Raise exception modal
  const [showRaiseModal, setShowRaiseModal] = useState(false);
  const [newShipmentId, setNewShipmentId] = useState("");
  const [newCategory, setNewCategory] = useState("CARRIER");
  const [newSeverity, setNewSeverity] = useState("HIGH");
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newIsBlocking, setNewIsBlocking] = useState(true);
  const [raisingSubmitting, setRaisingSubmitting] = useState(false);

  // Fetch exceptions
  const fetchExceptions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await authFetch("/api/scm/v1/operational/exceptions");
      if (!res.ok)
        throw new Error(`HTTP error ${res.status}: Failed to fetch exceptions`);
      const data = await res.json();
      setExceptions(Array.isArray(data) ? data : (data?.items ?? []));
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Error loading operational exceptions",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExceptions();
  }, [fetchExceptions]);

  // Submit in-situ resolution
  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingException) return;

    try {
      setResolvingSubmitting(true);
      setError(null);
      const res = await authFetch(
        `/api/scm/v1/operational/exceptions/${resolvingException.exceptionId}/resolve`,
        {
          method: "POST",
          body: JSON.stringify({
            resolutionNote:
              resolutionNote.trim() ||
              "Resolved via Exception Center Portfolio",
          }),
        },
      );

      if (!res.ok) throw new Error("Failed to resolve exception");
      setActionSuccessMessage(
        `Exception '${resolvingException.title}' resolved. Invariants restored & outbox event propagated.`,
      );
      setResolvingException(null);
      setResolutionNote("");
      await fetchExceptions();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error resolving exception",
      );
    } finally {
      setResolvingSubmitting(false);
    }
  };

  // Submit new exception
  const handleRaiseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShipmentId || !newTitle) return;

    try {
      setRaisingSubmitting(true);
      setError(null);
      const res = await authFetch("/api/scm/v1/operational/exceptions", {
        method: "POST",
        body: JSON.stringify({
          shipmentId: newShipmentId.trim(),
          category: newCategory,
          severity: newSeverity,
          title: newTitle.trim(),
          description: newDescription.trim(),
          isBlocking: newIsBlocking,
        }),
      });

      if (!res.ok) throw new Error("Failed to raise operational exception");
      setActionSuccessMessage(
        `Exception logged against shipment ${newShipmentId}.`,
      );
      setShowRaiseModal(false);
      setNewShipmentId("");
      setNewTitle("");
      setNewDescription("");
      await fetchExceptions();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error raising exception");
    } finally {
      setRaisingSubmitting(false);
    }
  };

  // Tab filtering
  const openCount = exceptions.filter(
    (e) => e.status === "OPEN" || e.status === "IN_PROGRESS",
  ).length;
  const blockingCount = exceptions.filter(
    (e) => e.isBlocking && (e.status === "OPEN" || e.status === "IN_PROGRESS"),
  ).length;
  const assignedCount = exceptions.filter(
    (e) =>
      (e.status === "OPEN" || e.status === "IN_PROGRESS") &&
      Boolean(e.assignedTo || e.assignedToUserId || e.assignedTeam),
  ).length;
  const resolvedCount = exceptions.filter(
    (e) => e.status === "RESOLVED",
  ).length;

  const tabFiltered = exceptions.filter((e) => {
    switch (activeTab) {
      case "OPEN":
        return e.status === "OPEN" || e.status === "IN_PROGRESS";
      case "BLOCKING":
        return (
          e.isBlocking && (e.status === "OPEN" || e.status === "IN_PROGRESS")
        );
      case "ASSIGNED":
        return (
          (e.status === "OPEN" || e.status === "IN_PROGRESS") &&
          Boolean(e.assignedTo || e.assignedToUserId || e.assignedTeam)
        );
      case "RESOLVED":
        return e.status === "RESOLVED";
      default:
        return true;
    }
  });

  // Query & category & severity filtering
  const filteredExceptions = tabFiltered.filter((e) => {
    if (categoryFilter !== "ALL" && e.category !== categoryFilter) return false;
    if (severityFilter !== "ALL" && e.severity !== severityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        e.title.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.shipmentId.toLowerCase().includes(q) ||
        e.assignedTo?.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full min-h-screen bg-slate-950 text-slate-100">
      {/* Top Header */}
      <header className="px-6 py-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/30">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">
                Exception Center
              </h1>
              <span className="text-[10px] px-2 py-0.5 font-bold uppercase rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Portfolio View
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Cross-shipment operational risk mitigation, blocking impediment
              tracking & in-situ resolution
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowRaiseModal(true)}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 shadow-md shadow-rose-600/30 transition"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Raise Exception
          </button>

          <button
            onClick={fetchExceptions}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="p-6 space-y-6 max-w-7xl w-full mx-auto flex-1 overflow-y-auto">
        {actionSuccessMessage && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{actionSuccessMessage}</span>
            </div>
            <button
              onClick={() => setActionSuccessMessage(null)}
              className="text-emerald-400 hover:text-emerald-200 font-bold ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-xs text-rose-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-rose-400 hover:text-rose-200 font-bold ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {/* 4 Perspectives Filter Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              key: "OPEN",
              label: "Open Exceptions",
              count: openCount,
              icon: AlertCircle,
              color: "text-amber-400",
            },
            {
              key: "BLOCKING",
              label: "Blocking Imperatives",
              count: blockingCount,
              icon: Lock,
              color: "text-rose-400",
            },
            {
              key: "ASSIGNED",
              label: "Assigned Portfolio",
              count: assignedCount,
              icon: UserCheck,
              color: "text-indigo-400",
            },
            {
              key: "RESOLVED",
              label: "Resolved Archive",
              count: resolvedCount,
              icon: CheckCircle2,
              color: "text-emerald-400",
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as ExceptionFilterTab)}
                className={`p-4 rounded-2xl border text-left transition flex items-center justify-between ${
                  isActive
                    ? "bg-slate-900 border-indigo-500/60 shadow-lg shadow-indigo-500/5 ring-1 ring-indigo-500/30"
                    : "bg-slate-900/40 border-slate-800 hover:bg-slate-900/80"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                    <Icon className={`w-3.5 h-3.5 ${tab.color}`} />
                    <span>{tab.label}</span>
                  </div>
                  <div className="text-2xl font-black text-white">
                    {tab.count}
                  </div>
                </div>
                <ChevronRight
                  className={`w-5 h-5 ${isActive ? "text-indigo-400" : "text-slate-600"}`}
                />
              </button>
            );
          })}
        </div>

        {/* Filters Toolbar */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-[280px]">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                id="exception-center-search"
                name="exceptionSearch"
                aria-label="Search exceptions"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, description, shipment ID, owner..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Category Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <label
                htmlFor="filter-exception-category"
                className="text-slate-400"
              >
                Category:
              </label>
              <select
                id="filter-exception-category"
                name="filterCategory"
                aria-label="Filter by Category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="p-1.5 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Categories</option>
                <option value="CARRIER">Carrier</option>
                <option value="DOCUMENTATION">Documentation</option>
                <option value="CUSTOMS">Customs</option>
                <option value="EQUIPMENT">Equipment</option>
                <option value="OPERATIONAL">Operational</option>
              </select>
            </div>

            {/* Severity Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <label
                htmlFor="filter-exception-severity"
                className="text-slate-400"
              >
                Severity:
              </label>
              <select
                id="filter-exception-severity"
                name="filterSeverity"
                aria-label="Filter by Severity"
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="p-1.5 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Exceptions Feed / Table */}
        <div className="space-y-3">
          {loading ? (
            <div className="p-16 text-center text-xs text-slate-500">
              Loading portfolio exceptions...
            </div>
          ) : filteredExceptions.length === 0 ? (
            <div className="p-16 text-center text-xs text-slate-500 bg-slate-900/30 rounded-2xl border border-slate-800">
              No operational exceptions found matching the current filters.
            </div>
          ) : (
            filteredExceptions.map((ex) => {
              const isResolved = ex.status === "RESOLVED";
              return (
                <div
                  key={ex.exceptionId}
                  className={`p-5 rounded-2xl border transition flex flex-col md:flex-row md:items-center justify-between gap-5 ${
                    isResolved
                      ? "bg-slate-900/30 border-slate-800/80 opacity-70"
                      : ex.severity === "CRITICAL"
                        ? "bg-rose-500/5 border-rose-500/30 shadow-sm"
                        : "bg-slate-900 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-100">
                        {ex.title}
                      </span>

                      {/* Severity badge */}
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                          ex.severity === "CRITICAL"
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            : ex.severity === "HIGH"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-slate-800 text-slate-300 border border-slate-700"
                        }`}
                      >
                        {ex.severity}
                      </span>

                      {/* Blocking tag */}
                      {ex.isBlocking && (
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-red-950 text-red-400 border border-red-700 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" />
                          BLOCKING
                        </span>
                      )}

                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                        {ex.category}
                      </span>

                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800/80 text-slate-500 font-mono">
                        ID: {ex.exceptionId.slice(0, 10)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                      {ex.description}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                      <button
                        onClick={() =>
                          navigate(`/shipment-360?id=${ex.shipmentId}`)
                        }
                        className="text-indigo-400 hover:text-indigo-300 font-mono font-semibold flex items-center gap-1 underline underline-offset-2"
                      >
                        Shipment: {ex.shipmentId}
                        <ExternalLink className="w-3 h-3" />
                      </button>

                      <span>•</span>
                      <span>
                        Raised:{" "}
                        {ex.raisedAt || ex.createdAt
                          ? new Date(
                              ex.raisedAt || ex.createdAt!,
                            ).toLocaleString()
                          : "Recently"}
                      </span>

                      {(ex.assignedTo ||
                        ex.assignedToUserId ||
                        ex.assignedTeam) && (
                        <>
                          <span>•</span>
                          <span className="text-slate-300">
                            Owner:{" "}
                            {ex.assignedTo ||
                              ex.assignedToUserId ||
                              ex.assignedTeam}
                          </span>
                        </>
                      )}

                      {isResolved &&
                        (ex.resolutionNote || ex.resolutionNotes) && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-400 font-medium">
                              Resolution:{" "}
                              {ex.resolutionNote || ex.resolutionNotes}
                            </span>
                          </>
                        )}
                    </div>
                  </div>

                  {/* Actions column */}
                  <div className="flex items-center gap-3 shrink-0 justify-end">
                    {isResolved ? (
                      <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Resolved
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          setResolvingException(ex);
                          setResolutionNote("");
                        }}
                        className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        Resolve In-Situ
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* In-Situ Resolution Modal (Explain -> Decide -> Act -> Confirm) */}
      {resolvingException && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">
                  Resolve Operational Exception
                </h3>
              </div>
              <button
                onClick={() => setResolvingException(null)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Step 1: Explain */}
            <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-xs space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                1. Context & Gating Impact
              </div>
              <p className="font-semibold text-slate-200">
                {resolvingException.title}
              </p>
              <p className="text-slate-400">{resolvingException.description}</p>
              <div className="pt-1 text-[11px] text-slate-500 font-mono">
                Target Shipment: {resolvingException.shipmentId} • Severity:{" "}
                {resolvingException.severity}
              </div>
            </div>

            {/* Step 2: Decide & Act */}
            <form onSubmit={handleResolveSubmit} className="space-y-4">
              <ResolutionJustificationSelect
                id="resolve-justification"
                value={resolutionNote}
                onChange={setResolutionNote}
              />

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setResolvingException(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolvingSubmitting}
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition disabled:opacity-50"
                >
                  {resolvingSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />{" "}
                      Committing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Confirm & Restore
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Raise Exception Modal */}
      {showRaiseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-400" />
                <h3 className="text-base font-bold text-white">
                  Raise Operational Exception
                </h3>
              </div>
              <button
                onClick={() => setShowRaiseModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRaiseSubmit} className="space-y-3">
              <div>
                <label
                  htmlFor="raise-target-shipment"
                  className="block text-xs font-semibold text-slate-300 mb-1"
                >
                  Target Shipment ID
                </label>
                <input
                  id="raise-target-shipment"
                  name="shipmentId"
                  aria-label="Target Shipment ID"
                  type="text"
                  required
                  value={newShipmentId}
                  onChange={(e) => setNewShipmentId(e.target.value)}
                  placeholder="E.g., SHP-TEST-001 or UUID"
                  className="w-full p-2 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="raise-category"
                    className="block text-xs font-semibold text-slate-300 mb-1"
                  >
                    Category
                  </label>
                  <select
                    id="raise-category"
                    name="category"
                    aria-label="Category"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full p-2 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="CARRIER">CARRIER</option>
                    <option value="DOCUMENTATION">DOCUMENTATION</option>
                    <option value="CUSTOMS">CUSTOMS</option>
                    <option value="EQUIPMENT">EQUIPMENT</option>
                    <option value="OPERATIONAL">OPERATIONAL</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="raise-severity"
                    className="block text-xs font-semibold text-slate-300 mb-1"
                  >
                    Severity
                  </label>
                  <select
                    id="raise-severity"
                    name="severity"
                    aria-label="Severity"
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value)}
                    className="w-full p-2 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="raise-title"
                  className="block text-xs font-semibold text-slate-300 mb-1"
                >
                  Title
                </label>
                <input
                  id="raise-title"
                  name="title"
                  aria-label="Title"
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="E.g., Missing export customs release at terminal gate"
                  className="w-full p-2 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label
                  htmlFor="raise-description"
                  className="block text-xs font-semibold text-slate-300 mb-1"
                >
                  Description
                </label>
                <textarea
                  id="raise-description"
                  name="description"
                  aria-label="Description"
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Operational details, affected milestone deadlines, contact person..."
                  className="w-full p-2 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="blockingCheckCenter"
                  name="isBlocking"
                  aria-label="Mark as Blocking Exception"
                  checked={newIsBlocking}
                  onChange={(e) => setNewIsBlocking(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-rose-500 focus:ring-0"
                />
                <label
                  htmlFor="blockingCheckCenter"
                  className="text-xs text-slate-300 font-semibold cursor-pointer"
                >
                  Mark as Blocking (Directly halts task execution in the DAG)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRaiseModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={raisingSubmitting}
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 shadow-md shadow-rose-600/30 transition disabled:opacity-50"
                >
                  {raisingSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />{" "}
                      Emitting...
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4" />
                      Raise Exception
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
