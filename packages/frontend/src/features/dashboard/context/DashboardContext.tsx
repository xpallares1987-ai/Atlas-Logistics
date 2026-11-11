import React, { createContext, useContext, useMemo } from "react";
import { useApiQuery } from "../../../hooks/useApiQuery";
import { useDashboardStore } from "../store";

export interface DashboardStats {
  activeShipments: number;
  completedShipments: number;
  revenue: number;
  satisfaction: number;
}

export interface RevenueChartPoint {
  name: string;
  value: number;
  costs?: number;
}

export interface VolumeChartPoint {
  name: string;
  value: number;
  status?: string;
}

export interface DashboardShipmentItem {
  id?: string;
  referenceNumber?: string;
  origin?: string;
  destination?: string;
  status?: string;
  vessel?: string;
  equipment?: string;
  [key: string]: unknown;
}

export interface DashboardPayload {
  stats?: DashboardStats;
  revenueChart?: RevenueChartPoint[];
  volumeChart?: VolumeChartPoint[];
  activeList?: DashboardShipmentItem[];
  [key: string]: unknown;
}

interface DashboardContextValue {
  data: DashboardPayload | null;
  stats: DashboardStats | null;
  revenueChart: RevenueChartPoint[];
  volumeChart: VolumeChartPoint[];
  activeList: DashboardShipmentItem[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export interface DashboardProviderProps {
  children: React.ReactNode;
}

export const DashboardProvider: React.FC<DashboardProviderProps> = ({
  children,
}) => {
  const { dateRange } = useDashboardStore();
  const queryStr = dateRange
    ? `?start=${dateRange.start}&end=${dateRange.end}`
    : "";

  const {
    data: rawResponse,
    isLoading,
    isError,
    refetch,
  } = useApiQuery<{ data?: DashboardPayload }>(
    ["dashboard", dateRange],
    `/dashboard${queryStr}`,
    {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  );

  const payload: DashboardPayload | null = useMemo(
    () => rawResponse?.data ?? null,
    [rawResponse],
  );

  const stats = useMemo(() => payload?.stats ?? null, [payload]);
  const revenueChart = useMemo(() => payload?.revenueChart ?? [], [payload]);
  const volumeChart = useMemo(() => payload?.volumeChart ?? [], [payload]);
  const activeList = useMemo(() => payload?.activeList ?? [], [payload]);

  const value: DashboardContextValue = useMemo(
    () => ({
      data: payload,
      stats,
      revenueChart,
      volumeChart,
      activeList,
      isLoading,
      isError,
      refetch,
    }),
    [
      payload,
      stats,
      revenueChart,
      volumeChart,
      activeList,
      isLoading,
      isError,
      refetch,
    ],
  );

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};

export function useDashboard(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error("useDashboard must be used within a <DashboardProvider>");
  }
  return ctx;
}

export function useDashboardStats(): {
  stats: DashboardStats | null;
  isLoading: boolean;
} {
  const { stats, isLoading } = useDashboard();
  return useMemo(() => ({ stats, isLoading }), [stats, isLoading]);
}

export function useDashboardRevenueChart(): {
  data: RevenueChartPoint[];
  isLoading: boolean;
} {
  const { revenueChart, isLoading } = useDashboard();
  const data = useMemo(
    () =>
      revenueChart.length > 0 ? revenueChart : [{ name: "Jan", value: 0 }],
    [revenueChart],
  );
  return useMemo(() => ({ data, isLoading }), [data, isLoading]);
}

export function useDashboardVolumeChart(): {
  data: VolumeChartPoint[];
  isLoading: boolean;
} {
  const { volumeChart, isLoading } = useDashboard();
  return useMemo(
    () => ({ data: volumeChart, isLoading }),
    [volumeChart, isLoading],
  );
}

export function useDashboardActiveList(): {
  activeList: DashboardShipmentItem[];
  isLoading: boolean;
} {
  const { activeList, isLoading } = useDashboard();
  return useMemo(() => ({ activeList, isLoading }), [activeList, isLoading]);
}
