/**
 * @file WavePick.tsx
 * @description Directed wave picking list tab for rugged warehouse terminal.
 * @module @atlas/frontend/components/WarehouseTerminal/Tab/WavePick
 */

export interface WavePickItem {
  id: string;
  waveId: string;
  sku: string;
  binLocation: string;
  requiredQty: number;
  pickedQty: number;
  isComplete: boolean;
}

interface WavePickProps {
  items: WavePickItem[];
}

export function WavePick({ items }: WavePickProps) {
  const completedCount = items.filter((i) => i.isComplete).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-zinc-400 font-semibold px-1">
        <span>WAVE 2026-089 PICK LIST</span>
        <span>
          {completedCount} / {items.length} COMPLETED
        </span>
      </div>
      {items.map((item) => (
        <div
          key={item.id}
          className={`p-3 border-2 rounded-xl space-y-2 ${
            item.isComplete
              ? "bg-emerald-950/40 border-emerald-700"
              : "bg-zinc-900 border-zinc-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-black text-cyan-400">
              {item.binLocation}
            </span>
            <span className="font-mono text-sm font-black text-white">
              {item.pickedQty} / {item.requiredQty} QTY
            </span>
          </div>
          <div className="font-bold text-sm text-white">{item.sku}</div>
          <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full transition-all duration-300"
              style={{
                width: `${(item.pickedQty / item.requiredQty) * 100}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
