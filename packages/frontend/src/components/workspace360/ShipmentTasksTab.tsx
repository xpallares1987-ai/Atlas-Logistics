import React from "react";
import { CheckCircle2, GitBranch, Lock, Unlock, Zap } from "lucide-react";
import { ShipmentTasksTabProps } from "../../types/shipment-workspace360.types";

export const ShipmentTasksTab: React.FC<ShipmentTasksTabProps> = ({
  shipmentDetail,
  highlightId,
  onOpenTaskAction,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-indigo-400" />
            Operational Task DAG & Gating Pipeline
          </h3>
          <p className="text-xs text-slate-400">
            Tasks are conditionally unlocked as upstream predecessors are
            satisfied.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {shipmentDetail.tasks.map((task) => {
          const isComplete = task.status === "COMPLETED";
          const isGated = task.isBlocked;
          const hId = highlightId ?? "";
          const isHighlighted =
            Boolean(hId) &&
            (hId === task.taskId ||
              hId === `task_${task.taskId}` ||
              hId.replace("task_", "") === task.taskId);

          return (
            <div
              key={task.taskId}
              id={`highlight-${task.taskId}`}
              data-highlight-id={task.taskId}
              className={`p-4 rounded-xl border transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                isHighlighted
                  ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900 shadow-xl shadow-amber-500/20 bg-amber-950/20 border-amber-400"
                  : isComplete
                    ? "bg-slate-900/40 border-slate-800/60 opacity-80"
                    : isGated
                      ? "bg-amber-500/5 border-amber-500/20"
                      : "bg-slate-900 border-indigo-500/40 shadow-sm"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                    isComplete
                      ? "bg-emerald-500/20 text-emerald-400"
                      : isGated
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-indigo-600/20 text-indigo-400"
                  }`}
                >
                  {isComplete ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : isGated ? (
                    <Lock className="w-4 h-4" />
                  ) : (
                    <Unlock className="w-4 h-4" />
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-200">
                      {task.title}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-slate-800 text-slate-400">
                      {task.taskType}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                        isComplete
                          ? "bg-emerald-500/20 text-emerald-400"
                          : isGated
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-indigo-500/20 text-indigo-300"
                      }`}
                    >
                      {task.status}
                    </span>
                  </div>

                  {task.dependencies && task.dependencies.length > 0 && (
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                      <span>Predecessors:</span>
                      {task.dependencies.map((dep, dIdx) => (
                        <span
                          key={dIdx}
                          className={`px-1.5 py-0.2 rounded font-mono ${
                            dep.status === "COMPLETED"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-amber-500/10 text-amber-400"
                          }`}
                        >
                          {dep.predecessorTaskId.slice(0, 12)} ({dep.status})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="flex items-center justify-end shrink-0">
                {isComplete ? (
                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Satisfied
                  </span>
                ) : isGated ? (
                  <span className="text-xs text-amber-400/80 font-medium flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" /> Gated by Predecessors
                  </span>
                ) : (
                  <button
                    onClick={() => onOpenTaskAction(task)}
                    className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition shadow-sm"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    {task.primaryAction?.actionLabel || "Complete In-Situ"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
