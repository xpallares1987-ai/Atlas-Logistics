import { useState, useMemo } from "react";
import { useApiQuery, useQueryClient } from "../hooks/useApiQuery";
import {
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  FileText,
  BadgeDollarSign,
  TrendingUp,
  Download,
} from "lucide-react";
import { motion, Variants } from "framer-motion";
import { Button, Input } from "@atlas/ui";
import { SettlementDetailsDrawer } from "../features/invoicing/components/SettlementDetailsDrawer";

interface AgentSettlement {
  id: string;
  statementNumber: string;
  agentName: string;
  periodStart: string;
  periodEnd: string;
  netBalance: number;
  currency: string;
  status: "Pending" | "Paid" | "Draft" | "Approved";
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

export default function AgentSettlementsModule() {
  const [activeTab, setActiveTab] = useState<"All" | "Pending" | "Paid">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSettlement, setSelectedSettlement] =
    useState<AgentSettlement | null>(null);

  const queryClient = useQueryClient();

  const { data, isLoading } = useApiQuery<AgentSettlement[]>(
    ["agent-settlements"],
    "/agent-settlements",
  );
  const settlements = Array.isArray(data) ? data : [];

  const filteredSettlements = useMemo(() => {
    return settlements.filter((s) => {
      const matchesSearch =
        s.agentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.statementNumber.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = activeTab === "All" ? true : s.status === activeTab;
      return matchesSearch && matchesFilter;
    });
  }, [settlements, searchQuery, activeTab]);

  const totalPending = settlements
    .filter((s) => s.status === "Pending")
    .reduce((acc, curr) => acc + curr.netBalance, 0);
  const totalPaid = settlements
    .filter((s) => s.status === "Paid")
    .reduce((acc, curr) => acc + curr.netBalance, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Paid":
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      case "Approved":
        return "text-indigo-400 bg-indigo-500/10 border-indigo-500/20";
      case "Pending":
        return "text-amber-400 bg-amber-500/10 border-amber-500/20";
      default:
        return "text-slate-400 bg-slate-500/10 border-slate-500/20";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Paid":
        return <CheckCircle2 className="w-4 h-4" />;
      case "Pending":
      case "Draft":
        return <Clock className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const generateSettlement = async () => {
    try {
      await fetch(`/api/agent-settlements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: "comp-2",
          periodStart: new Date(
            new Date().setMonth(new Date().getMonth() - 1),
          ).toISOString(),
          periodEnd: new Date().toISOString(),
          currency: "USD",
        }),
      });
      queryClient.invalidateQueries({ queryKey: ["agent-settlements"] });
    } catch (err) {
      console.error("Failed to generate settlement", err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200 relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
      {/* Background Effects */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />

      {/* Header */}
      <div className="px-6 py-6 md:px-8 md:py-8 shrink-0 z-10 border-b border-white/10 relative bg-white/5 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
              <div className="p-2.5 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl text-indigo-400 border border-indigo-500/20">
                <Briefcase className="w-7 h-7" />
              </div>
              Agent Settlements
            </h1>
            <p className="text-slate-400 mt-2 text-sm md:text-base font-medium max-w-xl">
              Track global partner profit shares, automate periodic statement
              reconciliation, and monitor inter-company financial flows.
            </p>
          </div>
          <Button
            onClick={generateSettlement}
            className="px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-500/20 active:scale-95 border border-indigo-500/50"
          >
            <RefreshCw className="w-5 h-5 mr-2" /> Generate Statement
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="px-4 md:px-8 py-6 z-10 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 shrink-0">
        <motion.div
          whileHover={{ y: -4 }}
          className="bg-white/5 border border-white/10 p-5 rounded-2xl relative overflow-hidden backdrop-blur-xl"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <span className="text-xs font-bold px-2 py-1 bg-amber-500/10 text-amber-300 rounded-lg uppercase tracking-wider">
              Unsettled
            </span>
          </div>
          <p className="text-sm font-medium text-slate-400 mb-1">
            Total Pending
          </p>
          <h3 className="text-3xl font-black text-white">
            ${totalPending.toLocaleString()}
          </h3>
        </motion.div>

        <motion.div
          whileHover={{ y: -4 }}
          className="bg-white/5 border border-white/10 p-5 rounded-2xl relative overflow-hidden backdrop-blur-xl"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-xs font-bold px-2 py-1 bg-emerald-500/10 text-emerald-300 rounded-lg uppercase tracking-wider">
              Cleared
            </span>
          </div>
          <p className="text-sm font-medium text-slate-400 mb-1">
            Total Paid (YTD)
          </p>
          <h3 className="text-3xl font-black text-white">
            ${totalPaid.toLocaleString()}
          </h3>
        </motion.div>

        <motion.div
          whileHover={{ y: -4 }}
          className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 p-5 rounded-2xl relative overflow-hidden backdrop-blur-xl"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
            </div>
            <span className="text-xs font-bold px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded-lg uppercase tracking-wider">
              Volume
            </span>
          </div>
          <p className="text-sm font-medium text-indigo-200/70 mb-1">
            Active Agents
          </p>
          <h3 className="text-3xl font-black text-white">
            {new Set(settlements.map((s) => s.agentName)).size}
          </h3>
        </motion.div>
      </div>

      <SettlementDetailsDrawer
        isOpen={!!selectedSettlement}
        onClose={() => setSelectedSettlement(null)}
        settlement={selectedSettlement}
      />

      {/* Main List */}
      <div className="flex-1 flex flex-col min-h-0 z-10 px-4 md:px-8 pb-8">
        <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-xl flex flex-col h-full">
          {/* Toolbar */}
          <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row gap-4 justify-between items-center bg-white/5">
            <div className="flex gap-2 p-1 bg-slate-950/50 rounded-xl border border-white/5 w-full sm:w-auto">
              {(["All", "Pending", "Paid"] as const).map((tab) => (
                <Button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  variant={activeTab === tab ? "outline" : "ghost"}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium flex-1 sm:flex-none h-auto border-transparent ${
                    activeTab === tab
                      ? "bg-indigo-500/20 text-indigo-300 shadow-sm border-transparent hover:bg-indigo-500/30 hover:text-indigo-200"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {tab}
                </Button>
              ))}
            </div>

            <div className="w-full sm:w-64">
              <Input
                type="text"
                placeholder="Search agent or stmt #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search size={16} />}
              />
            </div>
          </div>

          {/* Table/List */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-4">
                <RefreshCw className="w-8 h-8 animate-spin opacity-50" />
                <p>Loading settlements...</p>
              </div>
            ) : filteredSettlements.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-4">
                <BadgeDollarSign className="w-12 h-12 opacity-20" />
                <p className="font-medium">No settlements found.</p>
              </div>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {filteredSettlements.map((settlement) => (
                  <motion.div
                    key={settlement.id}
                    variants={itemVariants}
                    onClick={() => setSelectedSettlement(settlement)}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 p-5 rounded-2xl transition-all group flex flex-col justify-between h-48 cursor-pointer"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1.5 ${getStatusColor(settlement.status)}`}
                          >
                            {getStatusIcon(settlement.status)}{" "}
                            {settlement.status}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-slate-400">
                          {settlement.statementNumber}
                        </span>
                      </div>
                      <h4 className="text-lg font-bold text-white mb-1 truncate">
                        {settlement.agentName || "Unknown Agent"}
                      </h4>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(settlement.periodStart).toLocaleDateString(
                          undefined,
                          { month: "short", day: "numeric" },
                        )}{" "}
                        -{" "}
                        {new Date(settlement.periodEnd).toLocaleDateString(
                          undefined,
                          { month: "short", day: "numeric", year: "numeric" },
                        )}
                      </p>
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/10 flex items-end justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">
                          Net Balance
                        </p>
                        <p className="text-xl font-black text-white">
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: settlement.currency,
                            maximumFractionDigits: 0,
                          }).format(settlement.netBalance)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        className="w-8 h-8 rounded-full bg-white/5 hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-400 border border-transparent hover:border-indigo-500/30 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(
                            `/api/agent-settlements/${settlement.id}/pdf`,
                            "_blank",
                          );
                        }}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
