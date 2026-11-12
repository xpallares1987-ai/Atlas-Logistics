/**
 * @file Navigation.tsx
 * @description Horizontal perspective switcher for Shipment Workspace 360.
 * Coordinates tab selection, active badges (e.g. CBAM), and operational count indicators.
 * @module @atlas/frontend/components/Shipment/Tab
 */

import React from "react";
import {
  Layers,
  ShieldAlert,
  History,
  GitBranch,
  AlertTriangle,
  Ship,
  FileText,
  Leaf,
} from "lucide-react";
import type {
  OperationalShipment360View,
  ShipmentGreenComplianceReadModel,
  TabKey,
} from "../../../types/shipment-workspace360.types.js";

export interface ShipmentNavigationTabsProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  shipmentDetail: OperationalShipment360View;
  timelineCount: number;
  auditCount: number;
  greenCompliance: ShipmentGreenComplianceReadModel | null;
}

export const Navigation: React.FC<ShipmentNavigationTabsProps> = ({
  activeTab,
  onTabChange,
  shipmentDetail,
  timelineCount,
  auditCount,
  greenCompliance,
}) => {
  const tabs = [
    { key: "overview" as TabKey, label: "Overview", icon: Layers },
    {
      key: "attention" as TabKey,
      label: "Attention & Signals",
      icon: ShieldAlert,
      count:
        (shipmentDetail.signals?.length || 0) +
        (shipmentDetail.exceptions?.filter((e) => e.status === "OPEN").length ||
          0),
    },
    {
      key: "journey" as TabKey,
      label: "Journey & Timeline",
      icon: History,
      count: timelineCount || shipmentDetail.routePlan?.legs?.length || 0,
    },
    {
      key: "tasks" as TabKey,
      label: "Tasks (DAG)",
      icon: GitBranch,
      count:
        shipmentDetail.tasks?.filter((t) => t.status === "OPEN").length || 0,
    },
    {
      key: "exceptions" as TabKey,
      label: "Exceptions",
      icon: AlertTriangle,
      count:
        shipmentDetail.exceptions?.filter((e) => e.status === "OPEN").length ||
        0,
    },
    {
      key: "cargo_route" as TabKey,
      label: "Cargo & Route",
      icon: Ship,
      count:
        (shipmentDetail.shipment?.cargoDetails?.packageCount ? 1 : 0) +
        (shipmentDetail.routePlan?.legs?.length || 0),
    },
    {
      key: "audit" as TabKey,
      label: "Outbox Audit",
      icon: FileText,
      count: auditCount,
    },
    {
      key: "compliance_green" as TabKey,
      label: "Compliance & Green",
      icon: Leaf,
      count: greenCompliance?.customs?.hasActiveHold ? 1 : 0,
      badge: greenCompliance?.cbam?.isApplicable ? "CBAM" : undefined,
    },
  ];

  return (
    <div className="flex items-center gap-1 border-b border-slate-800">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition -mb-px ${
              isActive
                ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {tab.label}
            {tab.badge && (
              <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                {tab.badge}
              </span>
            )}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export const NavigationTabs = Navigation;
export const ShipmentNavigationTabs = Navigation;
