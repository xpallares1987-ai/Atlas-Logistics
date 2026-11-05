import { useState, useEffect } from "react";
import {
  ShieldCheck,
  Server,
  Users,
  Network,
  BellRing,
  Key,
  Plus,
  Trash2,
  CheckCircle2,
  RotateCcw,
  Sliders,
  Search,
  Database,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Layers,
  Cpu,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "@atlas/ui";
import {
  useResolutionNotesStore,
  ResolutionCategory,
} from "../store/useResolutionNotesStore";

export type SystemSubTab =
  | "RESOLUTIONS"
  | "RBAC"
  | "DATABASE_SEED"
  | "INTEGRATIONS"
  | "CONTROL_PLANE"
  | "SECURITY_VAULT"
  | "WEBHOOKS";

export default function SystemPanelModule() {
  const { user } = useAuth();
  const role = user?.role || "OPERATIONS";

  // Role permissions check
  const isAdmin = role === "ADMIN";
  const isManagerOrAdmin =
    role === "ADMIN" || role === "MANAGER" || role === "EXECUTIVE";

  const [activeSubTab, setActiveSubTab] = useState<SystemSubTab>("RESOLUTIONS");

  // Predefined notes store
  const { notes, addNote, deleteNote, resetToDefaults } =
    useResolutionNotesStore();

  // New Note Modal
  const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState<ResolutionCategory>("GENERAL");
  const [newLabel, setNewLabel] = useState("");
  const [newText, setNewText] = useState("");
  const [noteSearch, setNoteSearch] = useState("");

  const [isRebuilding, setIsRebuilding] = useState(false);
  const [rebuildSuccess, setRebuildSuccess] = useState(false);

  // Database Seed Management State
  const [seedStatus, setSeedStatus] = useState<{
    phase1: { shipments: number; incidents: number; drayageOrders: number };
    phase2: {
      coldChainShipments: number;
      temperatureReadings: number;
      dangerousGoods: number;
      cbamDeclarations: number;
    };
    phase3: { invoices: number; tradeCreditInstruments: number };
    phase4?: {
      cartaPorteDeclarations: number;
      efirmaAuditStamps: number;
      smartEscrowContracts: number;
      erpPurchaseOrders: number;
    };
  } | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [activeSeedingPhase, setActiveSeedingPhase] = useState<string | null>(
    null,
  );
  const [seedResult, setSeedResult] = useState<{
    success: boolean;
    message: string;
    durationMs?: number;
  } | null>(null);

  // Active Role Simulator for testing access
  const [simulatedRole, setSimulatedRole] = useState(role);

  const canEditResolutions = isManagerOrAdmin;
  const canManageControlPlane = isAdmin;

  const fetchSeedStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const res = await fetch("/api/admin/seed/status");
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.stats) {
          setSeedStatus(data.stats);
        }
      }
    } catch (err) {
      console.error("Failed to fetch seed status:", err);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const triggerSeed = async (phase: "1" | "2" | "3" | "4" | "all") => {
    setIsSeeding(true);
    setActiveSeedingPhase(phase);
    setSeedResult(null);
    try {
      const res = await fetch(`/api/admin/seed/${phase}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSeedResult({
          success: true,
          message: data.message,
          durationMs: data.durationMs,
        });
        await fetchSeedStatus();
      } else {
        setSeedResult({
          success: false,
          message: data.error || "Seed injection failed",
        });
      }
    } catch (err: any) {
      setSeedResult({
        success: false,
        message: err.message || "Network error during seed execution",
      });
    } finally {
      setIsSeeding(false);
      setActiveSeedingPhase(null);
    }
  };

  useEffect(() => {
    if (activeSubTab === "DATABASE_SEED") {
      fetchSeedStatus();
    }
  }, [activeSubTab]);

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim() || !newText.trim()) return;

    addNote({
      category: newCategory,
      label: newLabel.trim(),
      text: newText.trim(),
    });

    setNewLabel("");
    setNewText("");
    setIsAddNoteModalOpen(false);
  };

  const handleRebuildProjections = () => {
    setIsRebuilding(true);
    setTimeout(() => {
      setIsRebuilding(false);
      setRebuildSuccess(true);
      setTimeout(() => setRebuildSuccess(false), 4000);
    }, 1500);
  };

  const filteredNotes = notes.filter(
    (n) =>
      n.label.toLowerCase().includes(noteSearch.toLowerCase()) ||
      n.text.toLowerCase().includes(noteSearch.toLowerCase()) ||
      n.category.toLowerCase().includes(noteSearch.toLowerCase()),
  );

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
              <Sliders size={24} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
                System Administration Panel
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Role: {role}
                </span>
              </h1>
              <p className="text-xs md:text-sm text-slate-400">
                Centralized management hub for operational protocols, platform
                governance, RBAC, and integrations.
              </p>
            </div>
          </div>
        </div>

        {/* Role Simulator Badge */}
        {isAdmin && (
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
            <span className="text-slate-400 font-medium">RBAC Preview:</span>
            <select
              value={simulatedRole}
              onChange={(e) => setSimulatedRole(e.target.value as any)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-indigo-400 font-bold"
            >
              <option value="ADMIN">ADMIN (Full Control)</option>
              <option value="MANAGER">MANAGER (Operations & Protocols)</option>
              <option value="OPERATIONS">OPERATIONS (Execution View)</option>
              <option value="CUSTOMER">CUSTOMER (Restricted)</option>
            </select>
          </div>
        )}
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl shadow-inner">
        <button
          onClick={() => setActiveSubTab("RESOLUTIONS")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === "RESOLUTIONS"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <CheckCircle2 size={15} />
          <span>Resolution Protocols</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 rounded-full text-indigo-300">
            {notes.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab("RBAC")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === "RBAC"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Users size={15} />
          <span>Roles & Access (RBAC)</span>
        </button>

        <button
          onClick={() => setActiveSubTab("DATABASE_SEED")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === "DATABASE_SEED"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Database size={15} />
          <span>Database & Seeds</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-cyan-950 text-cyan-400 border border-cyan-800/40 rounded-full font-bold">
            4 Phases
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab("INTEGRATIONS")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === "INTEGRATIONS"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Network size={15} />
          <span>ERP & B2B EDI Connectors</span>
        </button>

        <button
          onClick={() => setActiveSubTab("CONTROL_PLANE")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === "CONTROL_PLANE"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Server size={15} />
          <span>Platform Governance (CQRS)</span>
        </button>

        <button
          onClick={() => setActiveSubTab("SECURITY_VAULT")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === "SECURITY_VAULT"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Key size={15} />
          <span>e.firma & Digital Vault</span>
        </button>

        <button
          onClick={() => setActiveSubTab("WEBHOOKS")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === "WEBHOOKS"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <BellRing size={15} />
          <span>Alerts & Webhooks</span>
        </button>
      </div>

      {/* SUBTAB 1: RESOLUTION PROTOCOLS (PREDEFINED NOTES) */}
      {activeSubTab === "RESOLUTIONS" && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-3xl">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-400" />
                <span>Authorized Resolution Justification Notes</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Predefined official justifications enforced across Shipment 360,
                Exception Center, and Control Tower modals. Users must select an
                authorized note.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={resetToDefaults}
                className="text-slate-400 border-slate-700 hover:text-white flex items-center gap-1.5"
              >
                <RotateCcw size={14} />
                <span>Reset Defaults</span>
              </Button>

              {canEditResolutions && (
                <Button
                  size="sm"
                  onClick={() => setIsAddNoteModalOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-lg shadow-indigo-600/30"
                >
                  <Plus size={15} />
                  <span>Add Predefined Note</span>
                </Button>
              )}
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 text-slate-500 w-4 h-4" />
            <input
              type="text"
              value={noteSearch}
              onChange={(e) => setNoteSearch(e.target.value)}
              placeholder="Search predefined justification by category, label, or text content..."
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Notes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNotes.map((note) => (
              <div
                key={note.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg hover:border-slate-700 transition-all flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {note.category}
                    </span>
                    {note.isSystemDefault && (
                      <span className="text-[10px] text-slate-500 font-medium">
                        System Protocol
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-white">{note.label}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed italic bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                    "{note.text}"
                  </p>
                </div>

                {canEditResolutions && !note.isSystemDefault && (
                  <div className="pt-2 border-t border-slate-800 flex justify-end">
                    <button
                      onClick={() => deleteNote(note.id)}
                      className="text-slate-500 hover:text-red-400 text-xs flex items-center gap-1 transition-colors"
                      title="Delete custom note"
                    >
                      <Trash2 size={14} />
                      <span>Remove</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 2: ROLES & ACCESS CONTROL (RBAC) */}
      {activeSubTab === "RBAC" && (
        <div className="space-y-5">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users size={18} className="text-indigo-400" />
              <span>Role-Based Access Control (RBAC) Matrix</span>
            </h3>
            <p className="text-xs text-slate-400">
              Configured permission privileges across executive, managerial,
              operational, and external participant roles.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="p-3.5">Feature / Domain Domain</th>
                    <th className="p-3.5 text-center">ADMIN</th>
                    <th className="p-3.5 text-center">MANAGER</th>
                    <th className="p-3.5 text-center">OPERATIONS</th>
                    <th className="p-3.5 text-center">CUSTOMS_BROKER</th>
                    <th className="p-3.5 text-center">CUSTOMER</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  <tr>
                    <td className="p-3.5 font-bold text-white">
                      Predefined Resolution Protocols
                    </td>
                    <td className="p-3.5 text-center text-emerald-400 font-bold">
                      Manage
                    </td>
                    <td className="p-3.5 text-center text-emerald-400 font-bold">
                      Manage
                    </td>
                    <td className="p-3.5 text-center text-indigo-400 font-semibold">
                      Select Only
                    </td>
                    <td className="p-3.5 text-center text-indigo-400 font-semibold">
                      Select Only
                    </td>
                    <td className="p-3.5 text-center text-slate-600">
                      No Access
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3.5 font-bold text-white">
                      Drayage & Port Haulage Dispatch
                    </td>
                    <td className="p-3.5 text-center text-emerald-400 font-bold">
                      Full Dispatch
                    </td>
                    <td className="p-3.5 text-center text-emerald-400 font-bold">
                      Full Dispatch
                    </td>
                    <td className="p-3.5 text-center text-emerald-400 font-bold">
                      Full Dispatch
                    </td>
                    <td className="p-3.5 text-center text-amber-400 font-medium">
                      View Terminal Gate
                    </td>
                    <td className="p-3.5 text-center text-slate-400">
                      Track Status
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3.5 font-bold text-white">
                      Platform Governance & CQRS Rebuild
                    </td>
                    <td className="p-3.5 text-center text-emerald-400 font-bold">
                      Execute & Purge
                    </td>
                    <td className="p-3.5 text-center text-slate-400">
                      View Projections
                    </td>
                    <td className="p-3.5 text-center text-slate-600">
                      No Access
                    </td>
                    <td className="p-3.5 text-center text-slate-600">
                      No Access
                    </td>
                    <td className="p-3.5 text-center text-slate-600">
                      No Access
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3.5 font-bold text-white">
                      ERP & B2B EDI Partner Connectors
                    </td>
                    <td className="p-3.5 text-center text-emerald-400 font-bold">
                      Full Config
                    </td>
                    <td className="p-3.5 text-center text-indigo-400 font-semibold">
                      View Status
                    </td>
                    <td className="p-3.5 text-center text-indigo-400 font-semibold">
                      View Status
                    </td>
                    <td className="p-3.5 text-center text-slate-600">
                      No Access
                    </td>
                    <td className="p-3.5 text-center text-slate-600">
                      No Access
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3.5 font-bold text-white">
                      e.firma & Digital Signature Keys
                    </td>
                    <td className="p-3.5 text-center text-emerald-400 font-bold">
                      Keyring Vault
                    </td>
                    <td className="p-3.5 text-center text-emerald-400 font-bold">
                      Sign Orders
                    </td>
                    <td className="p-3.5 text-center text-indigo-400 font-semibold">
                      Sign Orders
                    </td>
                    <td className="p-3.5 text-center text-indigo-400 font-semibold">
                      Sign Customs
                    </td>
                    <td className="p-3.5 text-center text-slate-600">
                      No Access
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB: DATABASE & SEED MANAGEMENT */}
      {activeSubTab === "DATABASE_SEED" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-3xl">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Database size={18} className="text-cyan-400" />
                <span>Enterprise Database & Multi-Phase Seed Injection</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Deterministically populate realistic enterprise logistics
                records across all 25+ database modules.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchSeedStatus}
                disabled={isLoadingStatus || isSeeding}
                className="border-slate-700 text-slate-300 hover:text-white"
              >
                <RefreshCw
                  size={14}
                  className={isLoadingStatus ? "animate-spin mr-1.5" : "mr-1.5"}
                />
                Refresh Stats
              </Button>
            </div>
          </div>

          {/* Seed Execution Result Banner */}
          {seedResult && (
            <div
              className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
                seedResult.success
                  ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
                  : "bg-rose-950/40 border-rose-500/30 text-rose-300"
              }`}
            >
              <div className="flex items-center gap-2.5">
                {seedResult.success ? (
                  <CheckCircle2
                    size={16}
                    className="text-emerald-400 flex-shrink-0"
                  />
                ) : (
                  <AlertCircle
                    size={16}
                    className="text-rose-400 flex-shrink-0"
                  />
                )}
                <span>
                  {seedResult.message}
                  {seedResult.durationMs
                    ? ` (${(seedResult.durationMs / 1000).toFixed(1)}s)`
                    : ""}
                </span>
              </div>
              <button
                onClick={() => setSeedResult(null)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Role Access Notice */}
          {!isAdmin && (
            <div className="bg-amber-950/30 border border-amber-500/30 p-4 rounded-2xl flex items-center gap-3 text-xs text-amber-300">
              <ShieldCheck size={18} className="text-amber-400 flex-shrink-0" />
              <span>
                You are currently viewing in read-only mode ({role}). Database
                seed execution requires ADMIN privileges. Use the RBAC Preview
                dropdown in the top header to simulate ADMIN permissions.
              </span>
            </div>
          )}

          {/* Live Database Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {/* Phase 1 Overview */}
            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <Layers size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Phase 1: Operations
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Multimodal & Control Tower
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Active
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-800/80 text-center">
                <div>
                  <div className="text-xl font-black text-white">
                    {seedStatus?.phase1.shipments ?? "—"}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-medium">
                    Shipments
                  </div>
                </div>
                <div>
                  <div className="text-xl font-black text-amber-400">
                    {seedStatus?.phase1.incidents ?? "—"}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-medium">
                    Incidents
                  </div>
                </div>
                <div>
                  <div className="text-xl font-black text-indigo-400">
                    {seedStatus?.phase1.drayageOrders ?? "—"}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-medium">
                    Drayage
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed min-h-[48px]">
                7 commercial global corridors, real carrier B/L prefixes,
                continuous vessel AIS paths, container inventories, and 18
                incidents with authorized resolution notes.
              </p>
              <Button
                size="sm"
                onClick={() => triggerSeed("1")}
                disabled={!isAdmin || isSeeding}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all"
              >
                {isSeeding && activeSeedingPhase === "1" ? (
                  <RefreshCw size={14} className="animate-spin mr-1.5" />
                ) : (
                  <Sparkles size={14} className="mr-1.5" />
                )}
                Inject Phase 1
              </Button>
            </div>

            {/* Phase 2 Overview */}
            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Cpu size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Phase 2: Compliance
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Pharma GDP, Hazmat & CBAM
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Regulated
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-800/80 text-center">
                <div>
                  <div className="text-xl font-black text-emerald-400">
                    {seedStatus?.phase2.coldChainShipments ?? "—"}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-medium">
                    Pharma GDP
                  </div>
                </div>
                <div>
                  <div className="text-xl font-black text-blue-400">
                    {seedStatus?.phase2.temperatureReadings ?? "—"}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-medium">
                    Telemetry
                  </div>
                </div>
                <div>
                  <div className="text-xl font-black text-orange-400">
                    {seedStatus?.phase2.dangerousGoods ?? "—"}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-medium">
                    IMDG Hazmat
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed min-h-[48px]">
                Continuous 48h datalogger curves, MKT stability formulas, EmS
                emergency cards, bonded customs warehouse lots, and quarterly EU
                CBAM declarations.
              </p>
              <Button
                size="sm"
                onClick={() => triggerSeed("2")}
                disabled={!isAdmin || isSeeding}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all"
              >
                {isSeeding && activeSeedingPhase === "2" ? (
                  <RefreshCw size={14} className="animate-spin mr-1.5" />
                ) : (
                  <Sparkles size={14} className="mr-1.5" />
                )}
                Inject Phase 2
              </Button>
            </div>

            {/* Phase 3 Overview */}
            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Server size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Phase 3: Finance
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Trade Finance & Vault
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  Audit-Ready
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 py-3 border-y border-slate-800/80 text-center">
                <div>
                  <div className="text-xl font-black text-purple-400">
                    {seedStatus?.phase3.invoices ?? "—"}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-medium">
                    AR/AP Invoices
                  </div>
                </div>
                <div>
                  <div className="text-xl font-black text-amber-400">
                    {seedStatus?.phase3.tradeCreditInstruments ?? "—"}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-medium">
                    UCP 600 LCs
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed min-h-[48px]">
                60 multi-currency AR/AP invoices with 3-way match, CASS airline
                netting, SWIFT MT700/734 messages, and signed digital document
                vault records.
              </p>
              <Button
                size="sm"
                onClick={() => triggerSeed("3")}
                disabled={!isAdmin || isSeeding}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all"
              >
                {isSeeding && activeSeedingPhase === "3" ? (
                  <RefreshCw size={14} className="animate-spin mr-1.5" />
                ) : (
                  <Sparkles size={14} className="mr-1.5" />
                )}
                Inject Phase 3
              </Button>
            </div>

            {/* Phase 4 Overview */}
            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <Network size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Phase 4: Customs & ERP
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      USMCA, e-Firma, DLT & ERP
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  Transborder
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 py-3 border-y border-slate-800/80 text-center">
                <div>
                  <div className="text-xl font-black text-rose-400">
                    {seedStatus?.phase4?.cartaPorteDeclarations ?? "—"}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-medium">
                    Carta Porte
                  </div>
                </div>
                <div>
                  <div className="text-xl font-black text-emerald-400">
                    {seedStatus?.phase4?.efirmaAuditStamps ?? "—"}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-medium">
                    e-Firma
                  </div>
                </div>
                <div>
                  <div className="text-xl font-black text-cyan-400">
                    {seedStatus?.phase4?.smartEscrowContracts ?? "—"}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-medium">
                    MLETR DLT
                  </div>
                </div>
                <div>
                  <div className="text-xl font-black text-amber-400">
                    {seedStatus?.phase4?.erpPurchaseOrders ?? "—"}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-medium">
                    ERP Orders
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed min-h-[48px]">
                Carta Porte 3.1 CFDI stamping, RFC 3161 audit logs, UNCITRAL
                MLETR e-BL escrow ledger, and SAP S/4HANA & NetSuite order sync.
              </p>
              <Button
                size="sm"
                onClick={() => triggerSeed("4")}
                disabled={!isAdmin || isSeeding}
                className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all"
              >
                {isSeeding && activeSeedingPhase === "4" ? (
                  <RefreshCw size={14} className="animate-spin mr-1.5" />
                ) : (
                  <Sparkles size={14} className="mr-1.5" />
                )}
                Inject Phase 4
              </Button>
            </div>
          </div>

          {/* Master Cumulative Injector Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-indigo-950/20">
            <div className="space-y-1 max-w-2xl">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-indigo-400" />
                <h4 className="text-sm font-extrabold text-white">
                  Full Enterprise Seed Pipeline (All Phases)
                </h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Executes the complete relational sequence across all 29 seeders
                in under 10 seconds. Completely idempotent with zero duplicate
                key conflicts.
              </p>
            </div>
            <Button
              onClick={() => triggerSeed("all")}
              disabled={!isAdmin || isSeeding}
              className="w-full md:w-auto px-6 py-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 flex-shrink-0"
            >
              {isSeeding && activeSeedingPhase === "all" ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Database size={16} />
              )}
              <span>Execute Full Enterprise Injection</span>
            </Button>
          </div>
        </div>
      )}

      {/* SUBTAB 3: ERP & B2B EDI CONNECTORS */}
      {activeSubTab === "INTEGRATIONS" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                Enterprise ERP
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                CONNECTED
              </span>
            </div>
            <h4 className="text-base font-bold text-white">
              SAP S/4HANA OData / IDoc
            </h4>
            <p className="text-xs text-slate-400">
              Synchronizes purchase orders, sales bills, and billing documents
              with central corporate SAP enterprise instance.
            </p>
            <div className="text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-800">
              Endpoint: https://sap.atlas-logistics.internal/odata/v4/
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                Cloud Financials
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                ACTIVE
              </span>
            </div>
            <h4 className="text-base font-bold text-white">
              Oracle NetSuite SuiteTalk
            </h4>
            <p className="text-xs text-slate-400">
              Real-time multi-currency exchange rates, carrier AP invoices, and
              general ledger journal posting.
            </p>
            <div className="text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-800">
              REST Web Services: Token-Based Auth (TBA)
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                B2B Interchanges
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                5 PARTNERS
              </span>
            </div>
            <h4 className="text-base font-bold text-white">
              ANSI X12 & UN/EDIFACT Hub
            </h4>
            <p className="text-xs text-slate-400">
              EDI 300 (Booking Request), EDI 301 (Confirmation), EDI 310 (Vessel
              Manifest), and IFTMIN instructions.
            </p>
            <div className="text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-800">
              Protocol: AS2 Encrypted / SFTP Mailbox
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 4: PLATFORM GOVERNANCE (CQRS) */}
      {activeSubTab === "CONTROL_PLANE" && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Server size={18} className="text-indigo-400" />
                  <span>CQRS Read Model Projections & Outbox Health</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Authoritative materialization for Operations Cockpit, Shipment
                  360, and Dead-Letter Queue reconciliation.
                </p>
              </div>

              {canManageControlPlane && (
                <Button
                  onClick={handleRebuildProjections}
                  disabled={isRebuilding}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5"
                >
                  <RotateCcw
                    size={14}
                    className={isRebuilding ? "animate-spin" : ""}
                  />
                  <span>
                    {isRebuilding
                      ? "Rebuilding Projections..."
                      : "Trigger Full Rebuild"}
                  </span>
                </Button>
              )}
            </div>

            {rebuildSuccess && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>
                  CQRS read models successfully synchronized from immutable
                  event store.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
                <span className="text-[10px] font-bold uppercase text-slate-500">
                  Operations Cockpit Projections
                </span>
                <div className="text-sm font-bold text-emerald-400 flex items-center gap-1.5 mt-1">
                  <CheckCircle2 size={16} /> HEALTHY (0ms lag)
                </div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
                <span className="text-[10px] font-bold uppercase text-slate-500">
                  Shipment 360 Aggregates
                </span>
                <div className="text-sm font-bold text-emerald-400 flex items-center gap-1.5 mt-1">
                  <CheckCircle2 size={16} /> 324 Synced Views
                </div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
                <span className="text-[10px] font-bold uppercase text-slate-500">
                  Dead-Letter Queue (DLQ)
                </span>
                <div className="text-sm font-bold text-slate-200 flex items-center gap-1.5 mt-1">
                  <ShieldCheck size={16} className="text-emerald-400" /> 0
                  Unhandled Errors
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 5: DIGITAL VAULT & SECURITY */}
      {activeSubTab === "SECURITY_VAULT" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Key size={18} className="text-amber-400" />
              <span>e.firma WebCrypto Vault</span>
            </h3>
            <p className="text-xs text-slate-400">
              Digital signature certificates (RSA-PSS / ECDSA) used for
              electronic Bill of Lading (MLETR) and SAT Carta de Porte sealing.
            </p>
            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Certificate Issuer:</span>
                <span className="font-bold text-white">
                  SAT Autoridad Certificadora
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Algorithm:</span>
                <span className="font-mono text-amber-300">
                  RSA-PSS 2048-bit / SHA-256
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Status:</span>
                <span className="text-emerald-400 font-bold">
                  VALID (Expires Nov 2027)
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-400" />
              <span>AEO Security Standards (ISO 17712)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Operador Económico Autorizado verification rules and high-security
              mechanical container seals audits.
            </p>
            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>AEO Authorization:</span>
                <span className="font-bold text-white">ESAEOF26000042</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>7-Point Audit Protocol:</span>
                <span className="text-emerald-400 font-bold">
                  MANDATORY ON DEPARTURE
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Smart Seal Battery Alert:</span>
                <span className="text-slate-300">&gt; 15% Threshold</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 6: WEBHOOKS & ALERTS */}
      {activeSubTab === "WEBHOOKS" && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <BellRing size={18} className="text-indigo-400" />
            <span>Omnichannel Notification Endpoints</span>
          </h3>
          <p className="text-xs text-slate-400">
            Automated alerts dispatched for critical container exceptions,
            temperature excursions, and port gate events.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
              <span className="text-xs font-bold text-indigo-400">
                Microsoft Teams
              </span>
              <p className="text-[11px] text-slate-400">
                #ops-control-tower webhook connected.
              </p>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                CONNECTED
              </span>
            </div>

            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
              <span className="text-xs font-bold text-cyan-400">
                Telegram Bot
              </span>
              <p className="text-[11px] text-slate-400">
                @AtlasOpsAlertsBot active for emergency push.
              </p>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                CONNECTED
              </span>
            </div>

            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
              <span className="text-xs font-bold text-amber-400">
                Slack Webhook
              </span>
              <p className="text-[11px] text-slate-400">
                #logistics-dispatch channel enabled.
              </p>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                CONNECTED
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ADD PREDEFINED NOTE MODAL */}
      {isAddNoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
          <form
            onSubmit={handleAddNote}
            className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus size={18} className="text-indigo-400" />
                <span>Add Predefined Resolution Protocol</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddNoteModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-400 block mb-1">
                Domain Category
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="ROUTING">Multimodal Routing & Transit</option>
                <option value="CUSTOMS">Customs & Regulatory Clearance</option>
                <option value="COLD_CHAIN">
                  Cold Chain & Temperature Excursion
                </option>
                <option value="DOCUMENTATION">
                  Documentation & Letters of Credit
                </option>
                <option value="CARRIER">
                  Carrier, Demurrage & Freight Audit
                </option>
                <option value="GENERAL">General Operational Protocols</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-400 block mb-1">
                Short Label / Title
              </label>
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="e.g., Feeder Vessel Rollover Accommodated"
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-400 block mb-1">
                Full Authorized Justification Text
              </label>
              <textarea
                rows={3}
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="e.g., Rolled booking accommodated on secondary feeder vessel ETA +24h, terminal gate appointment verified with zero demurrage impact."
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsAddNoteModalOpen(false)}
                className="text-slate-400"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Save Protocol Note
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
