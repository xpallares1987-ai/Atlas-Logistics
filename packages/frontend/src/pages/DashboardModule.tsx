import { StatCards } from "../features/dashboard/components/StatCards";
import { RevenueChart } from "../features/dashboard/components/RevenueChart";
import { ShipmentVolumeChart } from "../features/dashboard/components/ShipmentVolumeChart";
import { ActiveShipments } from "../features/dashboard/components/ActiveShipments";
import { GlobeWidget } from "../features/dashboard/components/GlobeWidget";
import { QuickActions } from "../features/dashboard/components/QuickActions";
import { DashboardProvider } from "../features/dashboard/context/DashboardContext";
import { useQueryClient } from "@tanstack/react-query";
import { useDashboardStore } from "../features/dashboard/store";
import { useAppWebSocket } from "../hooks/useAppWebSocket";

function DashboardContent() {
  const queryClient = useQueryClient();
  const { dateRange } = useDashboardStore();

  useAppWebSocket("/api/dashboard/live", {
    onMessage: (msg: any) => {
      if (msg?.type === "STATS_UPDATE") {
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
                  ...data.data?.stats,
                  activeShipments: msg.data?.activeShipments,
                },
              },
            };
          },
        );
      }
    },
  });

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

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-fade-in">
        {/* Top Row: Stats (Spans full width) */}
        <div className="col-span-1 md:col-span-12">
          <StatCards />
        </div>

        {/* Second Row: 3D Globe */}
        <div className="col-span-1 md:col-span-12 h-[450px]">
          <GlobeWidget />
        </div>

        {/* Third Row: Charts */}
        <div className="col-span-1 lg:col-span-6 h-[400px]">
          <RevenueChart />
        </div>
        <div className="col-span-1 lg:col-span-6 h-[400px]">
          <ShipmentVolumeChart />
        </div>

        {/* Bottom Row: Active Shipments */}
        <div className="col-span-1 md:col-span-12">
          <ActiveShipments />
        </div>
      </div>
    </div>
  );
}

export function DashboardModule() {
  return (
    <DashboardProvider>
      <DashboardContent />
    </DashboardProvider>
  );
}

export default DashboardModule;
