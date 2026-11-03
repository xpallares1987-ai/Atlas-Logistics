import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ResolutionCategory =
  | "ROUTING"
  | "CUSTOMS"
  | "COLD_CHAIN"
  | "DOCUMENTATION"
  | "CARRIER"
  | "GENERAL";

export interface PredefinedResolutionNote {
  id: string;
  category: ResolutionCategory;
  label: string;
  text: string;
  isSystemDefault?: boolean;
}

export const DEFAULT_PREDEFINED_NOTES: PredefinedResolutionNote[] = [
  {
    id: "res_01",
    category: "ROUTING",
    label: "Alternative Rail Corridor Activated",
    text: "Alternative intermodal rail corridor activated (tmZ-BEST Zaragoza-Barcelona shuttle) bypassing motorway stoppage.",
    isSystemDefault: true,
  },
  {
    id: "res_02",
    category: "ROUTING",
    label: "Port Diversion & Drayage Rescheduled",
    text: "Vessel diverted to secondary deep-water terminal due to weather; drayage gate appointment rescheduled.",
    isSystemDefault: true,
  },
  {
    id: "res_03",
    category: "CUSTOMS",
    label: "AEAT Customs Inspection Cleared",
    text: "Physical inspection cleared by AEAT customs authorities with zero discrepancy; release levante generated.",
    isSystemDefault: true,
  },
  {
    id: "res_04",
    category: "CUSTOMS",
    label: "Corrective DUA Filed & Bond Released",
    text: "Corrective DUA declaration filed with updated TARIC classification; global guarantee bond released.",
    isSystemDefault: true,
  },
  {
    id: "res_05",
    category: "COLD_CHAIN",
    label: "GDP Thermal Excursion QP Release",
    text: "Mean Kinetic Temperature (MKT) verified within stability budget; Responsible Person QP certified batch release.",
    isSystemDefault: true,
  },
  {
    id: "res_06",
    category: "COLD_CHAIN",
    label: "Auxiliary Genset Reconnected",
    text: "Auxiliary genset diesel generator connected during terminal transfer; reefer temperature restored to setpoint.",
    isSystemDefault: true,
  },
  {
    id: "res_07",
    category: "DOCUMENTATION",
    label: "Electronic e-CMR & Gate Stamped",
    text: "Digital e-CMR electronic signature and Carta de Porte validated with haulier and terminal gate agent.",
    isSystemDefault: true,
  },
  {
    id: "res_08",
    category: "DOCUMENTATION",
    label: "UCP 600 Letter of Credit Aligned",
    text: "Bill of Lading party clauses and description aligned with documentary Letter of Credit UCP 600 requirements.",
    isSystemDefault: true,
  },
  {
    id: "res_09",
    category: "CARRIER",
    label: "Demurrage Free-Time Waiver Granted",
    text: "Demurrage & detention waiver authorized by carrier management due to port terminal berth congestion.",
    isSystemDefault: true,
  },
  {
    id: "res_10",
    category: "CARRIER",
    label: "Freight Audit 3-Way Match Reconciled",
    text: "Freight audit invoice reconciled with approved contract rate matrix; credit note issued for variance.",
    isSystemDefault: true,
  },
  {
    id: "res_11",
    category: "GENERAL",
    label: "Force Majeure Waiver Acknowledged",
    text: "Force majeure weather delay acknowledged; customer signed transit schedule and demurrage liability waiver.",
    isSystemDefault: true,
  },
  {
    id: "res_12",
    category: "GENERAL",
    label: "ISO 17712 High-Security Seal Verified",
    text: "ISO 17712 high-security seal verified intact with 7-point container inspection; chain of custody unbroken.",
    isSystemDefault: true,
  },
];

interface ResolutionNotesState {
  notes: PredefinedResolutionNote[];
  addNote: (
    note: Omit<PredefinedResolutionNote, "id" | "isSystemDefault">,
  ) => void;
  updateNote: (id: string, note: Partial<PredefinedResolutionNote>) => void;
  deleteNote: (id: string) => void;
  resetToDefaults: () => void;
}

export const useResolutionNotesStore = create<ResolutionNotesState>()(
  persist(
    (set) => ({
      notes: DEFAULT_PREDEFINED_NOTES,
      addNote: (note) =>
        set((state) => ({
          notes: [
            ...state.notes,
            {
              ...note,
              id: `res_custom_${Date.now()}`,
              isSystemDefault: false,
            },
          ],
        })),
      updateNote: (id, updated) =>
        set((state) => ({
          notes: state.notes.map((n) =>
            n.id === id ? { ...n, ...updated } : n,
          ),
        })),
      deleteNote: (id) =>
        set((state) => ({
          notes: state.notes.filter((n) => n.id !== id),
        })),
      resetToDefaults: () =>
        set({
          notes: DEFAULT_PREDEFINED_NOTES,
        }),
    }),
    {
      name: "atlas-predefined-resolution-notes",
    },
  ),
);
