import { motion, Variants } from "framer-motion";
import { StatCards } from "../features/dashboard/components/StatCards";
import { RevenueChart } from "../features/dashboard/components/RevenueChart";
import { ShipmentVolumeChart } from "../features/dashboard/components/ShipmentVolumeChart";
import { ActiveShipments } from "../features/dashboard/components/ActiveShipments";
import { GlobeWidget } from "../features/dashboard/components/GlobeWidget";
import { QuickActions } from "../features/dashboard/components/QuickActions";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useDashboardStore } from "../features/dashboard/store";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

export function DashboardModule() {
  const queryClient = useQueryClient();
  const { dateRange } = useDashboardStore();

  useEffect(() => {
    let isMounted = true;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let initTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempts = 0;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace(/^http/, "ws") +
        "/api/dashboard/live"
      : `${protocol}//${window.location.host}/api/dashboard/live`;

    const cleanupSocket = () => {
      if (ws) {
        const targetWs = ws;
        targetWs.onopen = null;
        targetWs.onmessage = null;
        targetWs.onclose = null;
        targetWs.onerror = null;
        if (targetWs.readyState === WebSocket.OPEN) {
          try {
            targetWs.close(1000, "Clean cleanup");
          } catch {
            // Safe cleanup
          }
        } else if (targetWs.readyState === WebSocket.CONNECTING) {
          targetWs.onopen = () => {
            try {
              targetWs.close(1000, "Unmounted during connect");
            } catch {
              // Safe cleanup
            }
          };
        }
        ws = null;
      }
    };

    const MAX_RECONNECT_ATTEMPTS = 3;

    const scheduleReconnect = () => {
      if (!isMounted || reconnectTimer) return;
      reconnectAttempts++;
      if (reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
        return; // Circuit breaker to prevent console spam when server is offline
      }
      const delay = Math.min(
        2000 * Math.pow(1.8, reconnectAttempts - 1),
        15000,
      );
      reconnectTimer = setTimeout(async () => {
        reconnectTimer = null;
        if (!isMounted) return;
        try {
          const health = await fetch("/api/health");
          if (!health.ok) {
            scheduleReconnect();
            return;
          }
        } catch {
          scheduleReconnect();
          return;
        }
        connect();
      }, delay);
    };

    const connect = () => {
      if (!isMounted) return;
      cleanupSocket();

      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          if (!isMounted) return;
          reconnectAttempts = 0;
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === "STATS_UPDATE") {
              queryClient.setQueryData(
                ["dashboard", dateRange],
                (oldData: unknown) => {
                  if (!oldData || typeof oldData !== "object") return oldData;
                  const data = oldData as any;
                  return {
                    ...data,
                    data: {
                      ...data.data,
                      stats: {
                        ...data.data.stats,
                        activeShipments: msg.data.activeShipments,
                      },
                    },
                  };
                },
              );
            }
          } catch (err) {
            console.error("Live update error", err);
          }
        };

        ws.onclose = () => {
          if (!isMounted) return;
          scheduleReconnect();
        };

        ws.onerror = () => {
          if (!isMounted) return;
          // Graceful fallback if WebSocket is temporarily unavailable
        };
      } catch {
        if (!isMounted) return;
        scheduleReconnect();
      }
    };

    // Debounce initial connection by 50ms so StrictMode double-mount in dev
    // cancels the initial throwaway attempt without triggering browser socket closure warnings
    initTimer = setTimeout(() => {
      initTimer = null;
      if (isMounted) {
        connect();
      }
    }, 50);

    return () => {
      isMounted = false;
      if (initTimer) {
        clearTimeout(initTimer);
        initTimer = null;
      }
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      cleanupSocket();
    };
  }, [queryClient, dateRange]);

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 overflow-x-hidden">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-emerald-400 to-emerald-200 mb-2 tracking-tight">
            Command Center
          </h1>
          <p className="text-slate-400 font-medium">
            Real-time overview of your global logistics operations.
          </p>
        </div>
        <QuickActions />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-12 gap-6"
      >
        {/* Top Row: Stats (Spans full width) */}
        <motion.div
          variants={itemVariants}
          className="col-span-1 md:col-span-12"
        >
          <StatCards />
        </motion.div>

        {/* Second Row: 3D Globe */}
        <motion.div
          variants={itemVariants}
          className="col-span-1 md:col-span-12 h-[450px]"
        >
          <GlobeWidget />
        </motion.div>

        {/* Third Row: Charts */}
        <motion.div
          variants={itemVariants}
          className="col-span-1 lg:col-span-6 h-[400px]"
        >
          <RevenueChart />
        </motion.div>
        <motion.div
          variants={itemVariants}
          className="col-span-1 lg:col-span-6 h-[400px]"
        >
          <ShipmentVolumeChart />
        </motion.div>

        {/* Bottom Row: Active Shipments */}
        <motion.div
          variants={itemVariants}
          className="col-span-1 md:col-span-12"
        >
          <ActiveShipments />
        </motion.div>
      </motion.div>
    </div>
  );
}

export default DashboardModule;
