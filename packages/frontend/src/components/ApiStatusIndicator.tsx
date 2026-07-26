import { useApiStatus } from "../contexts/ApiStatusContext";
import { Wifi, WifiOff, Loader2 } from "lucide-react";

export function ApiStatusIndicator() {
  const { status, lastHeartbeat } = useApiStatus();

  return (
    <div
      className="group relative"
      title={
        lastHeartbeat
          ? `Last heartbeat: ${lastHeartbeat.toLocaleTimeString()}`
          : "Connecting..."
      }
    >
      <div
        className={`rounded-full px-2.5 py-1 text-xs font-medium flex items-center gap-1.5 transition-all duration-300 ${
          status === "connected"
            ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
            : status === "reconnecting"
              ? "bg-amber-100 text-amber-700 border border-amber-200"
              : "bg-rose-100 text-rose-700 border border-rose-200"
        }`}
      >
        {status === "connected" && (
          <>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <Wifi size={14} className="text-emerald-600" />
            <span>Live</span>
          </>
        )}

        {status === "reconnecting" && (
          <>
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <Loader2 size={14} className="animate-spin text-amber-600" />
            <span>Reconnecting...</span>
          </>
        )}

        {status === "disconnected" && (
          <>
            <div className="w-2 h-2 rounded-full bg-rose-500" />
            <WifiOff size={14} className="text-rose-600" />
            <span>Offline</span>
          </>
        )}
      </div>
    </div>
  );
}
