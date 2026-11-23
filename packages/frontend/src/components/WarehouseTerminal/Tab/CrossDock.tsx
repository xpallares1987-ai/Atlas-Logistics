/**
 * @file CrossDock.tsx
 * @description Cross-dock staging manifests tab for rugged warehouse terminal.
 * @module @atlas/frontend/components/WarehouseTerminal/Tab/CrossDock
 */

export interface CrossDockTask {
  id: string;
  inboundRef: string;
  outboundShipmentId: string;
  destinationHub: string;
  palletCount: number;
  priority: "HIGH" | "NORMAL";
  scannedCount: number;
}

interface CrossDockProps {
  tasks: CrossDockTask[];
}

export function CrossDock({ tasks }: CrossDockProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-zinc-400 font-semibold px-1">
        <span>ACTIVE CROSS-DOCK MANIFESTS</span>
        <span>{tasks.length} PENDING</span>
      </div>
      {tasks.map((task) => (
        <div
          key={task.id}
          className="p-3 bg-zinc-900 border-2 border-zinc-800 rounded-xl space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm font-black text-cyan-400">
              {task.inboundRef}
            </span>
            <span
              className={`text-[10px] font-black px-2 py-0.5 rounded ${
                task.priority === "HIGH"
                  ? "bg-red-900 text-red-200 border border-red-700"
                  : "bg-zinc-800 text-zinc-400"
              }`}
            >
              {task.priority} PRIORITY
            </span>
          </div>
          <div className="text-xs text-zinc-300">
            <div className="font-bold text-white">
              Target: {task.outboundShipmentId}
            </div>
            <div className="text-zinc-400">{task.destinationHub}</div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800 text-xs">
            <span className="text-zinc-400 font-semibold">Staged Pallets:</span>
            <span className="font-mono text-sm font-black text-amber-400">
              {task.scannedCount} / {task.palletCount}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
