import { useState, useEffect } from "react";
import { CheckCircle2, AlertCircle, Clock, FileText, X } from "lucide-react";

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
  const [tasks, setTasks] = useState<HumanTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<HumanTask | null>(null);

  useEffect(() => {
    // Simulate fetching tasks
    const timer = setTimeout(() => {
      setTasks([
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
            marginImpact: "-12%",
          },
          state: "CREATED",
        },
      ]);
      setLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const completeTask = (taskId: string, _approved: boolean) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, state: "COMPLETED" } : t
      )
    );
    if (selectedTask?.id === taskId) {
      setSelectedTask(null);
    }
  };

  const pendingTasks = tasks.filter((t) => t.state === "CREATED");

  return (
    <div className="flex h-full bg-[#0a0f18] text-slate-200 relative overflow-hidden rounded-2xl border border-slate-800 shadow-2xl glassmorphism">
      
      {/* Main List */}
      <div className={`flex flex-col flex-1 p-6 transition-all duration-300 ${selectedTask ? "w-2/3 opacity-50 pointer-events-none" : "w-full"}`}>
        <div className="absolute top-0 left-1/2 p-4 opacity-10 pointer-events-none">
          <AlertCircle size={150} />
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
              {loading ? "-" : pendingTasks.length}
            </span>
            <span className="text-xs text-slate-400 ml-2 uppercase tracking-wider">
              Pendientes
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar relative z-10">
          {loading ? (
            // Skeleton Loader
            [1, 2, 3].map((i) => (
              <div key={i} className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 animate-pulse">
                <div className="h-6 bg-slate-800 rounded w-1/3 mb-4"></div>
                <div className="h-4 bg-slate-800/50 rounded w-1/4 mb-2"></div>
                <div className="h-24 bg-slate-950/50 rounded-lg mt-4"></div>
              </div>
            ))
          ) : pendingTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <CheckCircle2 size={48} className="mb-4 opacity-50" />
              <p>No hay tareas pendientes en la bandeja.</p>
            </div>
          ) : (
            pendingTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => setSelectedTask(task)}
                className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5 hover:border-blue-500/50 transition-all cursor-pointer group shadow-md hover:shadow-blue-900/20"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg text-slate-100 flex items-center gap-2 group-hover:text-blue-300 transition-colors">
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
                  <button className="px-3 py-1 bg-slate-800 rounded text-xs font-semibold text-blue-400 border border-slate-700">
                    Ver Detalles
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Slide-over Panel for Task Details */}
      <div 
        className={`absolute top-0 right-0 h-full bg-slate-900 border-l border-slate-700 shadow-2xl transition-transform duration-300 ease-in-out z-50 flex flex-col ${selectedTask ? "translate-x-0 w-1/3" : "translate-x-full w-1/3"}`}
      >
        {selectedTask && (
          <>
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
              <h3 className="font-bold text-lg text-white">Detalles de la Tarea</h3>
              <button 
                onClick={() => setSelectedTask(null)}
                className="p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto">
              <h4 className="text-xl font-bold text-blue-400 mb-2">{selectedTask.name}</h4>
              <p className="text-sm text-slate-400 mb-6 flex items-center gap-2">
                <Clock size={14} /> {new Date(selectedTask.creationDate).toLocaleString()}
              </p>
              
              <h5 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Context Variables</h5>
              <div className="bg-slate-950/80 rounded-lg p-4 font-mono text-sm border border-slate-800/80 shadow-inner">
                <ul className="space-y-3">
                  {Object.entries(selectedTask.variables).map(([k, v]) => (
                    <li key={k} className="flex flex-col pb-2 border-b border-slate-800/50 last:border-0 last:pb-0">
                      <span className="text-slate-500 text-xs mb-1">{k}</span>
                      <span className="text-slate-200">{String(v)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="p-6 border-t border-slate-800 bg-slate-900/90 flex gap-3">
              <button
                onClick={() => completeTask(selectedTask.id, true)}
                className="flex-1 py-3 bg-blue-600 text-white hover:bg-blue-500 rounded-xl font-bold shadow-lg shadow-blue-900/50 transition-all active:scale-95"
              >
                Autorizar
              </button>
              <button
                onClick={() => completeTask(selectedTask.id, false)}
                className="flex-1 py-3 bg-slate-800 text-red-400 hover:bg-slate-700 hover:text-red-300 border border-slate-700 rounded-xl font-bold transition-all active:scale-95"
              >
                Rechazar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
