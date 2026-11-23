/**
 * @file Putaway.tsx
 * @description Directed putaway tasks tab for rugged warehouse terminal.
 * @module @atlas/frontend/components/WarehouseTerminal/Tab/Putaway
 */

export interface PutawayTask {
  id: string;
  sscc: string;
  sku: string;
  description: string;
  recommendedBin: string;
  confirmedBin?: string;
  quantity: number;
  status: "PENDING" | "CONFIRMED";
}

interface PutawayProps {
  tasks: PutawayTask[];
}

export function Putaway({ tasks }: PutawayProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-zinc-400 font-semibold px-1">
        <span>DIRECTED PUTAWAY TASKS</span>
        <span>{tasks.length} QUEUED</span>
      </div>
      {tasks.map((item) => (
        <div
          key={item.id}
          className={`p-3 border-2 rounded-xl space-y-2 ${
            item.status === "CONFIRMED"
              ? "bg-emerald-950/40 border-emerald-700"
              : "bg-zinc-900 border-zinc-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-zinc-400">
              SSCC: {item.sscc}
            </span>
            <span
              className={`text-[10px] font-black px-2 py-0.5 rounded ${
                item.status === "CONFIRMED"
                  ? "bg-emerald-800 text-emerald-100"
                  : "bg-amber-900 text-amber-200"
              }`}
            >
              {item.status}
            </span>
          </div>
          <div>
            <div className="font-bold text-sm text-white">{item.sku}</div>
            <div className="text-xs text-zinc-400">
              {item.description} ({item.quantity} units)
            </div>
          </div>
          <div className="p-2 bg-black rounded-lg border border-amber-500/50 flex items-center justify-between">
            <span className="text-xs text-amber-400 font-semibold">
              DIRECTED TARGET BIN:
            </span>
            <span className="font-mono text-base font-black text-amber-300">
              {item.recommendedBin}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
