import { create } from 'zustand';

interface DashboardState {
  dateRange: { start: string; end: string } | null;
  setDateRange: (start: string, end: string) => void;
  clearDateRange: () => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  dateRange: null,
  setDateRange: (start, end) => set({ dateRange: { start, end } }),
  clearDateRange: () => set({ dateRange: null })
}));
