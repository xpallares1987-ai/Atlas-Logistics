/**
 * @file useOrganizationStore.ts
 * @description Zustand store for Global Freight Forwarding Stations, Departments, Matrix RBAC & Station Context.
 * @module @atlas/frontend/store/organization
 * @see {@link docs/adr/0022-enterprise-freight-forwarding-organization-schema-and-governance.md}
 */

import { create } from "zustand";
import { authFetch } from "../lib/api.js";

export interface BranchStation {
  id: string;
  companyId: string;
  stationCode: string;
  name: string;
  stationType: string;
  unLocode: string;
  iataCode?: string | null;
  primaryCurrency: string;
  timezone: string;
  managerUserId?: string | null;
  fmcOtiNumber?: string | null;
  iataNumericCode?: string | null;
  createdAt?: string;
  updatedAt?: string;
  address?: {
    id: string;
    companyName: string;
    tradeName?: string | null;
    city: string;
    federalState?: string | null;
    country: string;
    formattedAddress?: string | null;
    lat?: number | null;
    lon?: number | null;
    unLocode?: string | null;
  } | null;
}

export interface Department {
  id: string;
  branchId: string;
  code: string;
  name: string;
  costCenter: string;
  emailAlias?: string | null;
  managerUserId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserStationAssignment {
  id: string;
  userId: string;
  branchId: string;
  departmentId?: string | null;
  roleId?: string | null;
  isPrimary: boolean;
  branch?: {
    id: string;
    stationCode: string;
    name: string;
    unLocode: string;
    primaryCurrency: string;
    timezone: string;
  } | null;
  role?: {
    id: string;
    name: string;
    description: string;
  } | null;
}

interface OrganizationState {
  stations: BranchStation[];
  departments: Department[];
  myAssignments: UserStationAssignment[];
  activeStationId: string;
  activeStationCode: string;
  activeDepartmentId: string;
  canAccessAllStations: boolean;
  isLoading: boolean;
  error: string | null;
  warningMessage: string | null;

  fetchStations: () => Promise<void>;
  fetchMyAssignments: () => Promise<void>;
  fetchDepartmentsForStation: (stationId: string) => Promise<Department[]>;
  setActiveStation: (stationId: string, stationCode?: string) => void;
  setActiveDepartment: (departmentId: string) => void;
  getActiveStation: () => BranchStation | null;
  getSelectableStations: () => BranchStation[];
  fallbackToPrimaryStation: (reason?: string) => void;
  clearWarning: () => void;
}

const LOCAL_STORAGE_STATION_KEY = "atlas_station_context";
const LOCAL_STORAGE_STATION_ID_KEY = "atlas_station_id";
const LOCAL_STORAGE_DEPT_KEY = "atlas_department_context";

export const useOrganizationStore = create<OrganizationState>((set, get) => ({
  stations: [],
  departments: [],
  myAssignments: [],
  activeStationId:
    (typeof window !== "undefined" &&
      localStorage.getItem(LOCAL_STORAGE_STATION_ID_KEY)) ||
    "ALL",
  activeStationCode:
    (typeof window !== "undefined" &&
      localStorage.getItem(LOCAL_STORAGE_STATION_KEY)) ||
    "ALL",
  activeDepartmentId:
    (typeof window !== "undefined" &&
      localStorage.getItem(LOCAL_STORAGE_DEPT_KEY)) ||
    "ALL",
  canAccessAllStations: true,
  isLoading: false,
  error: null,
  warningMessage: null,

  fetchStations: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await authFetch("/api/organization/stations");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.stations)) {
        set({ stations: data.stations, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (err: any) {
      set({
        error: err?.message || "Failed to load stations",
        isLoading: false,
      });
    }
  },

  fetchMyAssignments: async () => {
    try {
      const res = await authFetch("/api/organization/my-stations");
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        set({
          myAssignments: data.assignments || [],
          canAccessAllStations:
            data.canAccessAllStations ?? data.isAdmin ?? false,
        });

        // If no station selected yet and user has a primary assignment, default to it
        const currentCode = get().activeStationCode;
        if (
          (!currentCode || currentCode === "ALL") &&
          data.assignments?.length > 0 &&
          !data.canAccessAllStations
        ) {
          const primary =
            data.assignments.find((a: UserStationAssignment) => a.isPrimary) ||
            data.assignments[0];
          if (primary && primary.branch) {
            get().setActiveStation(
              primary.branch.id,
              primary.branch.stationCode,
            );
          }
        }
      }
    } catch {
      // Ignore assignment load failures silently in unauthenticated or test states
    }
  },

  fetchDepartmentsForStation: async (stationId: string) => {
    if (!stationId || stationId === "ALL") return [];
    try {
      const res = await authFetch(
        `/api/organization/stations/${stationId}/departments`,
      );
      if (!res.ok) return [];
      const data = await res.json();
      if (data.success && Array.isArray(data.departments)) {
        set({ departments: data.departments });
        return data.departments;
      }
      return [];
    } catch {
      return [];
    }
  },

  setActiveStation: (stationId: string, stationCode?: string) => {
    let resolvedCode = stationCode;
    if (!resolvedCode && stationId !== "ALL") {
      const match = get().stations.find((s) => s.id === stationId);
      resolvedCode = match?.stationCode || stationId;
    } else if (stationId === "ALL") {
      resolvedCode = "ALL";
    }

    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_STATION_ID_KEY, stationId);
      localStorage.setItem(
        LOCAL_STORAGE_STATION_KEY,
        resolvedCode || stationId,
      );
      localStorage.setItem(LOCAL_STORAGE_DEPT_KEY, "ALL");
    }

    set({
      activeStationId: stationId,
      activeStationCode: resolvedCode || stationId,
      activeDepartmentId: "ALL",
    });

    if (stationId !== "ALL") {
      get().fetchDepartmentsForStation(stationId);
    } else {
      set({ departments: [] });
    }
  },

  setActiveDepartment: (departmentId: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_DEPT_KEY, departmentId);
    }
    set({ activeDepartmentId: departmentId });
  },

  clearWarning: () => set({ warningMessage: null }),

  getSelectableStations: () => {
    const { stations, myAssignments, canAccessAllStations } = get();
    if (canAccessAllStations) {
      return stations;
    }
    const assignedBranchIds = new Set(myAssignments.map((a) => a.branchId));
    return stations.filter((s) => assignedBranchIds.has(s.id));
  },

  fallbackToPrimaryStation: (reason?: string) => {
    const { myAssignments, stations } = get();
    const primary = myAssignments.find((a) => a.isPrimary) || myAssignments[0];

    if (primary && primary.branch) {
      get().setActiveStation(primary.branch.id, primary.branch.stationCode);
    } else if (stations.length > 0) {
      get().setActiveStation(stations[0].id, stations[0].stationCode);
    } else {
      get().setActiveStation("ALL", "ALL");
    }

    set({
      warningMessage:
        reason ||
        "Station access denied. Automatically switched to your default assigned station.",
    });
  },

  getActiveStation: () => {
    const { activeStationId, stations } = get();
    if (activeStationId === "ALL") return null;
    return stations.find((s) => s.id === activeStationId) || null;
  },
}));
