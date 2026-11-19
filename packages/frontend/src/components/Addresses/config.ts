/**
 * @file config.ts
 * @description Logistics entity types, UI badges, and iconography configuration for Addresses Hub.
 * @module @atlas/frontend/components/Addresses/config
 * @see {@link docs/adr/0022-enterprise-freight-forwarding-organization-schema-and-governance.md}
 */

import React from "react";
import {
  Building2,
  Anchor,
  Ship,
  Truck,
  Warehouse,
  Shield,
  Layers,
  Plane,
  Train,
  Navigation,
  Factory,
  MapPin,
} from "lucide-react";

export interface TypeConfigItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  badgeClass: string;
}

export const TYPE_CONFIG: Record<string, TypeConfigItem> = {
  // 1. Customer
  MCC: {
    label: "MCC · Main Customer Company",
    icon: Building2,
    color: "indigo",
    badgeClass:
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
  },
  CUS: {
    label: "MCC · Customer",
    icon: Building2,
    color: "indigo",
    badgeClass:
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
  },
  // 2. Carriers
  OCA: {
    label: "OCA · Ocean Carrier",
    icon: Ship,
    color: "blue",
    badgeClass:
      "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  },
  CAR: {
    label: "OCA · Ocean Carrier",
    icon: Ship,
    color: "blue",
    badgeClass:
      "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  },
  ACA: {
    label: "ACA · Airline Carrier",
    icon: Plane,
    color: "sky",
    badgeClass:
      "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800",
  },
  RCA: {
    label: "RCA · Rail Carrier",
    icon: Train,
    color: "cyan",
    badgeClass:
      "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800",
  },
  // 3. Agencies
  CLA: {
    label: "CLA · Carrier Line Agency",
    icon: Anchor,
    color: "teal",
    badgeClass:
      "bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-800",
  },
  CAA: {
    label: "CLA · Carrier Line Agency",
    icon: Anchor,
    color: "teal",
    badgeClass:
      "bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-800",
  },
  CBA: {
    label: "CBA · Customs Broker Agency",
    icon: Shield,
    color: "emerald",
    badgeClass:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
  CB: {
    label: "CBA · Customs Broker Agency",
    icon: Shield,
    color: "emerald",
    badgeClass:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
  OAG: {
    label: "OAG · Representative Agent (Origin)",
    icon: Navigation,
    color: "amber",
    badgeClass:
      "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  DAG: {
    label: "DAG · Representative Agent (Destination)",
    icon: Anchor,
    color: "lime",
    badgeClass:
      "bg-lime-100 text-lime-700 dark:bg-lime-950/60 dark:text-lime-300 border-lime-200 dark:border-lime-800",
  },
  AG: {
    label: "DAG · Agent",
    icon: Anchor,
    color: "lime",
    badgeClass:
      "bg-lime-100 text-lime-700 dark:bg-lime-950/60 dark:text-lime-300 border-lime-200 dark:border-lime-800",
  },
  FFC: {
    label: "FFC · Freight Forwarding Company",
    icon: Layers,
    color: "purple",
    badgeClass:
      "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  },
  FW: {
    label: "FFC · Forwarder",
    icon: Layers,
    color: "purple",
    badgeClass:
      "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  },
  // 4. Terminals
  SPT: {
    label: "SPT · Seaport Terminal",
    icon: Ship,
    color: "blue",
    badgeClass:
      "bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-200 border-blue-300 dark:border-blue-700",
  },
  TRM: {
    label: "SPT · Seaport Terminal",
    icon: Ship,
    color: "blue",
    badgeClass:
      "bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-200 border-blue-300 dark:border-blue-700",
  },
  RST: {
    label: "RST · Railway Station Terminal",
    icon: Train,
    color: "cyan",
    badgeClass:
      "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/70 dark:text-cyan-200 border-cyan-300 dark:border-cyan-700",
  },
  OIC: {
    label: "OIC · Inland Terminal (Origin)",
    icon: Layers,
    color: "amber",
    badgeClass:
      "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-200 border-amber-300 dark:border-amber-700",
  },
  DIC: {
    label: "DIC · Inland Terminal (Destination)",
    icon: Layers,
    color: "emerald",
    badgeClass:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700",
  },
  // 5. Warehouses
  OEW: {
    label: "OEW · External Warehouse (Origin)",
    icon: Warehouse,
    color: "orange",
    badgeClass:
      "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-800",
  },
  WH: {
    label: "OEW · Warehouse",
    icon: Warehouse,
    color: "orange",
    badgeClass:
      "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-800",
  },
  DEW: {
    label: "DEW · External Warehouse (Destination)",
    icon: Warehouse,
    color: "amber",
    badgeClass:
      "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  OWO: {
    label: "OWO · Owned Warehouse (Origin)",
    icon: Warehouse,
    color: "emerald",
    badgeClass:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700",
  },
  DWO: {
    label: "DWO · Owned Warehouse (Destination)",
    icon: Warehouse,
    color: "teal",
    badgeClass:
      "bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-200 border-teal-300 dark:border-teal-700",
  },
  // 6. Hauliers
  OHA: {
    label: "OHA · Haulier (Origin)",
    icon: Truck,
    color: "violet",
    badgeClass:
      "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border-violet-200 dark:border-violet-800",
  },
  HAU: {
    label: "OHA · Haulier",
    icon: Truck,
    color: "violet",
    badgeClass:
      "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border-violet-200 dark:border-violet-800",
  },
  DHA: {
    label: "DHA · Haulier (Destination)",
    icon: Truck,
    color: "fuchsia",
    badgeClass:
      "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950/60 dark:text-fuchsia-300 border-fuchsia-200 dark:border-fuchsia-800",
  },
  // 7. Insurance
  INS: {
    label: "INS · Insurance",
    icon: Shield,
    color: "rose",
    badgeClass:
      "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  },
  // 8. Gateways & Locations
  PLL: {
    label: "PLL · Place of Loading Location",
    icon: Factory,
    color: "amber",
    badgeClass:
      "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-200 border-amber-300 dark:border-amber-700",
  },
  PDL: {
    label: "PDL · Place of Delivery Location",
    icon: MapPin,
    color: "indigo",
    badgeClass:
      "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-200 border-indigo-300 dark:border-indigo-700",
  },
  POL: {
    label: "POL · Port of Loading",
    icon: Anchor,
    color: "blue",
    badgeClass:
      "bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-200 border-blue-300 dark:border-blue-700",
  },
  POD: {
    label: "POD · Port of Discharge",
    icon: Anchor,
    color: "emerald",
    badgeClass:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700",
  },
  TSP: {
    label: "TSP · Transhipment Port",
    icon: Navigation,
    color: "violet",
    badgeClass:
      "bg-violet-100 text-violet-800 dark:bg-violet-950/70 dark:text-violet-200 border-violet-300 dark:border-violet-700",
  },
};
