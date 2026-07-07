import { useState } from "react";
import { CheckCircle2, AlertCircle, Clock, FileText } from "lucide-react";

export interface HumanTask {
  id: string;
  processInstanceKey: string;
  name: string;
  assignee?: string;
  creationDate: string;
  variables: Record<string, any>;
  state: "CREATED" | "COMPLETED" | "CANCELED";
}

export function HumanTasklist() {
  const [tasks, setTasks] = useState<HumanTask[]>([
    {
      id: "tsk-80123",
      processInstanceKey: "pi-98213",
      name: "Aprobar Despacho Aduanero",
      creationDate: new Date().toISOString(),
      variables: {
        shipmentRef: "SHP-4402",
        customsValue: "$124,000",
        hsCode: "8471.30.00",
      },
      state: "CREATED",
    },
    {
      id: "tsk-80124",
      processInstanceKey: "pi-98214",
      name: "Revisión de BAF Anómalo",
      creationDate: new Date(Date.now() - 3600000).toISOString(),
      variables: {
        shipmentRef: "SHP-4491",
        bafQuoted: "$150",
        bafInvoiced: "$450",
      },
      state: "CREATED",
    },
  ]);

  const completeTask = (taskId: string, approved: boolean) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, state: "COMPLETED" } : t
      )
    );
    // Real implementation would call Camunda Tasklist API via Firebase function
    alert(`Task ${taskId} completed with approved=${approved}`);
  };

  const pendingTasks = tasks.filter((t) => t.state === "CREATED");

  return (
    <div className="flex flex-col h-full bg-[#0a0f18] text-slate-200 p-6 rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden glassmorphism">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <AlertCircle size={100} />
      </div>

      <div className="mb-6 flex justify-between items-end relative z-10">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="text-blue-400" /> Human Tasklist (Camunda)
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Revisa y autoriza las tareas bloqueadas por los motores BPMN.
          </p>
        </div>
        <div className="bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700/50">
          <span className="text-2xl font-bold text-white">
            {pendingTasks.length}
          </span>
          <span className="text-xs text-slate-400 ml-2 uppercase tracking-wider">
            Pendientes
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar relative z-10">
        {pendingTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <CheckCircle2 size={48} className="mb-4 opacity-50" />
            <p>No hay tareas pendientes en la bandeja.</p>
          </div>
        ) : (
          pendingTasks.map((task) => (
            <div
              key={task.id}
              className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5 hover:border-blue-500/50 transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg text-slate-100 flex items-center gap-2">
                    <FileText size={18} className="text-purple-400" />
                    {task.name}
                  </h3>
                  <div className="flex gap-4 mt-2 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />{" "}
                      {new Date(task.creationDate).toLocaleString()}
                    </span>
                    <span>Instance: {task.processInstanceKey}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/50 rounded-lg p-3 mb-4 font-mono text-sm">
                <ul className="space-y-1">
                  {Object.entries(task.variables).map(([k, v]) => (
                    <li key={k} className="flex justify-between border-b border-slate-800/50 pb-1">
                      <span className="text-slate-500">{k}</span>
                      <span className="text-slate-300">{String(v)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => completeTask(task.id, true)}
                  className="flex-1 py-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg font-medium transition-colors"
                >
                  Aprobar
                </button>
                <button
                  onClick={() => completeTask(task.id, false)}
                  className="flex-1 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-lg font-medium transition-colors"
                >
                  Rechazar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
