/**
 * @file Sidebar.tsx
 * @description Settings navigation sidebar managing tab selection, role-based visibility, and sign out.
 * @module @atlas/frontend/components/Settings/Sidebar
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

import React from "react";
import { LogOut } from "lucide-react";
import { Button } from "@atlas/ui";
import { useTranslation } from "react-i18next";
import type {
  SettingsTabId,
  SettingsTabItem,
} from "../../types/settings.types";

interface SidebarProps {
  tabs: SettingsTabItem[];
  activeTab: SettingsTabId;
  onTabChange: (id: SettingsTabId) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  tabs,
  activeTab,
  onTabChange,
}) => {
  const { t } = useTranslation();

  return (
    <div className="w-full md:w-64 shrink-0 space-y-1">
      {tabs.map((tab) => (
        <Button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          variant="ghost"
          className={`w-full justify-start gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors h-auto ${
            activeTab === tab.id
              ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <tab.icon
            className={`w-5 h-5 ${
              activeTab === tab.id ? "text-indigo-600" : "text-slate-400"
            }`}
          />
          {tab.label}
        </Button>
      ))}

      <div className="h-px bg-slate-200 dark:bg-slate-800 my-4" />

      <Button
        variant="ghost"
        className="w-full justify-start gap-3 px-4 py-3 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors h-auto"
      >
        <LogOut className="w-5 h-5" />
        {t("settings.signOut")}
      </Button>
    </div>
  );
};
