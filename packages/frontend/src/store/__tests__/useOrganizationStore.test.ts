/**
 * @file useOrganizationStore.test.ts
 * @description Unit tests for useOrganizationStore, station context binding, RBAC filtering, and fallback mechanisms.
 * @module @atlas/frontend/store/__tests__/useOrganizationStore.test
 * @see {@link docs/adr/0022-enterprise-freight-forwarding-organization-schema-and-governance.md}
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock localStorage and window for Node environment
const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) || null,
  setItem: (key: string, val: string) => storageMap.set(key, String(val)),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
};

globalThis.localStorage = localStorageMock as any;
(globalThis as any).window = {
  localStorage: localStorageMock,
  dispatchEvent: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

import {
  useOrganizationStore,
  BranchStation,
  UserStationAssignment,
} from "../useOrganizationStore.js";

// Mock authFetch
vi.mock("../../lib/api.js", () => ({
  authFetch: vi.fn(),
  getAuthHeaders: vi.fn(() => ({ "Content-Type": "application/json" })),
}));

import { authFetch } from "../../lib/api.js";

const mockStations: BranchStation[] = [
  {
    id: "stn_esbcn_01",
    companyId: "c-1",
    stationCode: "BCN-OCEAN",
    name: "Barcelona Maritime Gateway",
    stationType: "OCEAN_GATEWAY",
    unLocode: "ESBCN",
    primaryCurrency: "EUR",
    timezone: "Europe/Madrid",
  },
  {
    id: "stn_esmad_01",
    companyId: "c-1",
    stationCode: "MAD-AIR",
    name: "Madrid Barajas Cargo Terminal",
    stationType: "AIR_CARGO_HUB",
    unLocode: "ESMAD",
    primaryCurrency: "EUR",
    timezone: "Europe/Madrid",
  },
  {
    id: "stn_vlc_01",
    companyId: "c-1",
    stationCode: "VLC-OCEAN",
    name: "Valencia Port Facility",
    stationType: "OCEAN_GATEWAY",
    unLocode: "ESVLC",
    primaryCurrency: "EUR",
    timezone: "Europe/Madrid",
  },
];

const mockAssignments: UserStationAssignment[] = [
  {
    id: "usa_01",
    userId: "u-forwarder-01",
    branchId: "stn_esbcn_01",
    isPrimary: true,
    branch: {
      id: "stn_esbcn_01",
      stationCode: "BCN-OCEAN",
      name: "Barcelona Maritime Gateway",
      unLocode: "ESBCN",
      primaryCurrency: "EUR",
      timezone: "Europe/Madrid",
    },
  },
];

describe("useOrganizationStore - Station Context & RBAC Governance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useOrganizationStore.setState({
      stations: [],
      departments: [],
      myAssignments: [],
      activeStationId: "ALL",
      activeStationCode: "ALL",
      activeDepartmentId: "ALL",
      canAccessAllStations: true,
      isLoading: false,
      error: null,
      warningMessage: null,
    });
  });

  it("fetches and populates stations correctly", async () => {
    (authFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, stations: mockStations }),
    });

    await useOrganizationStore.getState().fetchStations();

    const state = useOrganizationStore.getState();
    expect(state.stations).toHaveLength(3);
    expect(state.stations[0].stationCode).toBe("BCN-OCEAN");
    expect(state.error).toBeNull();
  });

  it("sets active station and persists to localStorage", () => {
    useOrganizationStore.setState({ stations: mockStations });

    useOrganizationStore
      .getState()
      .setActiveStation("stn_esbcn_01", "BCN-OCEAN");

    const state = useOrganizationStore.getState();
    expect(state.activeStationId).toBe("stn_esbcn_01");
    expect(state.activeStationCode).toBe("BCN-OCEAN");
    expect(localStorage.getItem("atlas_station_id")).toBe("stn_esbcn_01");
    expect(localStorage.getItem("atlas_station_context")).toBe("BCN-OCEAN");

    const active = useOrganizationStore.getState().getActiveStation();
    expect(active?.stationCode).toBe("BCN-OCEAN");
    expect(active?.unLocode).toBe("ESBCN");
  });

  it("filters selectable stations for operational users based on assigned stations", () => {
    useOrganizationStore.setState({
      stations: mockStations,
      myAssignments: mockAssignments,
      canAccessAllStations: false, // Operational forwarder role
    });

    const selectable = useOrganizationStore.getState().getSelectableStations();
    expect(selectable).toHaveLength(1);
    expect(selectable[0].stationCode).toBe("BCN-OCEAN");
  });

  it("allows all stations for company admin users", () => {
    useOrganizationStore.setState({
      stations: mockStations,
      myAssignments: mockAssignments,
      canAccessAllStations: true, // Company admin role
    });

    const selectable = useOrganizationStore.getState().getSelectableStations();
    expect(selectable).toHaveLength(3);
  });

  it("automatically falls back to primary assigned station when access is forbidden", () => {
    useOrganizationStore.setState({
      stations: mockStations,
      myAssignments: mockAssignments,
      activeStationId: "stn_vlc_01",
      activeStationCode: "VLC-OCEAN",
    });

    useOrganizationStore
      .getState()
      .fallbackToPrimaryStation("Access to VLC-OCEAN is restricted.");

    const state = useOrganizationStore.getState();
    expect(state.activeStationId).toBe("stn_esbcn_01");
    expect(state.activeStationCode).toBe("BCN-OCEAN");
    expect(state.warningMessage).toContain(
      "Access to VLC-OCEAN is restricted.",
    );
  });

  it("clears warning message when clearWarning is invoked", () => {
    useOrganizationStore.setState({ warningMessage: "Sample alert" });
    useOrganizationStore.getState().clearWarning();
    expect(useOrganizationStore.getState().warningMessage).toBeNull();
  });
});
