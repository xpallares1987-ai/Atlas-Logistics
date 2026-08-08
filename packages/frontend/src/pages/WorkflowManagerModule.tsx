import { useState } from "react";
import {
  Activity,
  Settings,
  CheckCircle2,
  PlayCircle,
  RefreshCw,
  Box,
  DollarSign,
  AlertTriangle,
} from "lucide-react";

export default function WorkflowManagerModule() {
  const [runningTasks, setRunningTasks] = useState<Record<string, boolean>>({});

  const runTask = (taskId: string, endpoint: string, method: string = "GET") => {
    setRunningTasks((prev) => ({ ...prev, [taskId]: true }));
    
    // Simulate backend trigger or hit actual endpoint
    fetch(endpoint, { method })
      .then((res) => {
        if (!res.ok) throw new Error("Task failed");
        return res.json();
      })
      .then((_data) => {
        alert(`Task '${taskId}' completed successfully!`);
      })
      .catch((err) => {
        console.error(`Task '${taskId}' failed`, err);
        alert(`Task '${taskId}' failed. Please retry.`);
      })
      .finally(() => {
        setTimeout(() => {
          setRunningTasks((prev) => ({ ...prev, [taskId]: false }));
        }, 1500);
      });
  };

  const tasks = [
    {
      id: "demurrage-check",
      title: "Run Demurrage Checks",
      description: "Scan all active containers at ports and calculate exposure and dwell times.",
      icon: <AlertTriangle className="text-amber-500" size={24} />,
      endpoint: "/api/operations/demurrage",
    },
    {
      id: "profitability-sync",
      title: "Recalculate Profitability",
      description: "Aggregate all AR/AP invoices and update total profit margins for all shipments.",
      icon: <DollarSign className="text-emerald-500" size={24} />,
      endpoint: "/api/financial/profitability",
    },
    {
      id: "lcl-pack",
      title: "Auto-pack LCLs (Heuristic)",
      description: "Run volume-based sorting and back-to-front packing algorithm for unassigned cargo.",
      icon: <Box className="text-indigo-500" size={24} />,
      endpoint: "/api/operations/containers/demo-cont-1/optimize-load",
      method: "POST"
    },
  ];

  return (
    <div className="h-full flex flex-col gap-6 animate-fade-in p-8">
      {/* Header */}
      <div className="flex justify-between items-center bg-white/70 backdrop-blur-xl p-6 rounded-3xl border border-slate-200/60 shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <Settings className="text-indigo-600" size={32} />
            Rule-Based Workflow Manager
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            Manually trigger deterministic operations and batch processing scripts.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/70 backdrop-blur-xl p-6 rounded-3xl border border-slate-200/60 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">
              Available Triggers
            </p>
            <p className="text-3xl font-black text-slate-800">{tasks.length}</p>
          </div>
        </div>
        <div className="bg-white/70 backdrop-blur-xl p-6 rounded-3xl border border-slate-200/60 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">
              System Status
            </p>
            <p className="text-3xl font-black text-emerald-600">Healthy</p>
          </div>
        </div>
      </div>

      {/* Task Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-4">
        {tasks.map((task) => {
          const isRunning = runningTasks[task.id];
          return (
            <div key={task.id} className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                    {task.icon}
                  </div>
                  <h3 className="text-xl font-bold text-slate-800">{task.title}</h3>
                </div>
                <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                  {task.description}
                </p>
              </div>
              <button
                onClick={() => runTask(task.id, task.endpoint, task.method)}
                disabled={isRunning}
                className="w-full flex justify-center items-center gap-2 bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="animate-spin" size={18} /> Running...
                  </>
                ) : (
                  <>
                    <PlayCircle size={18} /> Execute Task
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
