import { createEnvValidator } from "@/components";
import { z } from "zod";

const envSchema = {
  VITE_GITHUB_GIST_ID: z.string().optional(),
};

const validateEnv = createEnvValidator(envSchema);
export const env = validateEnv(
  (typeof import.meta !== "undefined" &&
    (import.meta as unknown as { env: Record<string, string> }).env) ||
    process.env ||
    {},
);

export const BLACK_SHEETS = ["Final Destination", "Warehouse"];
export const BLACK_COLS = [
  "Warehouse Code",
  "Ext. Addr. Number",
  "POL",
  "POD",
  "Reel Year",
  "Load Type",
  "Roll Length (CM)",
];
export const BLACK_FILTERS = [
  "Quantity",
  "Customer Order",
  "Item Number",
  "Weight (Kg)",
  "Weight (Kgs)",
  "Weight (KG)",
  "Pending",
  "Total",
  "Buyer Address",
  "Load Code",
  "Grammage (GM)",
  "Diameter (CM)",
  "Roll Width (CM)",
  "Payables",
  "Receivables",
  "Local Amount",
  "Total Rate",
  "GP Ops.",
  "Revenue Ops.",
  "Expenses Ops.",
];
export const BRANCH_MAP: Record<string, string> = {
  BCN: "Barcelona",
  VLC: "Valencia",
  BIO: "Bilbao",
  MAD: "Madrid",
};

export const PALETTES = {
  primary: [
    "#8B0000",
    "#1E293B",
    "#F59E0B",
    "#3B82F6",
    "#10B981",
    "#64748B",
    "#8B5CF6",
    "#EC4899",
    "#14B8A6",
    "#F43F5E",
  ],
  cool: ["#0F172A", "#1E293B", "#334155", "#475569", "#64748B", "#94A3B8"],
  warm: ["#7f1d1d", "#991b1b", "#b91c1c", "#dc2626", "#ef4444", "#f87171"],
} as const;

export type PaletteTheme = keyof typeof PALETTES;

export const BASE_PATH = "/Shipment-Dashboard";
export const PAGE_SIZE = 50;
