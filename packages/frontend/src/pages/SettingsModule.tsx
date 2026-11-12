/**
 * @file SettingsModule.tsx
 * @description Main orchestrator for user settings, appearance, security, and administrative governance.
 * @module @atlas/frontend/pages/SettingsModule
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

import React, { useState, useEffect, Suspense, lazy } from "react";
import {
  Bell,
  Building2,
  CheckCircle2,
  Database as DatabaseIcon,
  Key,
  PaintBucket,
  RefreshCw,
  Shield,
  Sliders,
  Smartphone,
  User,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../store/useAppStore";
import type { SettingsTabId, SettingsTabItem } from "../types/settings.types";
import {
  Api,
  Appearance,
  Company,
  Devices,
  Notifications,
  Profile,
  Sidebar,
  SystemAdmin,
} from "../components/Settings";

// ============================================================================
// 1. LAZY-LOADED ADMINISTRATIVE & SECURITY TABS (CODE-SPLITTING)
// ============================================================================

const LazySecurity = lazy(() => import("../components/Settings/Tab/Security"));
const LazyDatabase = lazy(() => import("../components/Settings/Tab/Database"));
const LazyResolutions = lazy(
  () => import("../components/Settings/Tab/Resolutions"),
);

// ============================================================================
// 2. MAIN SETTINGS MODULE ORCHESTRATOR
// ============================================================================

export default function SettingsModule() {
  const { user } = useAppStore();
  const { t } = useTranslation();

  const getInitialTab = (): SettingsTabId => {
    const hash = window.location.hash.replace("#", "");
    if (hash === "profile") return "Profile";
    if (hash === "company") return "Company";
    if (hash === "security") return "Security";
    if (hash === "apikeys" || hash === "api") return "API";
    if (hash === "database") return "Database";
    if (hash === "resolutions") return "Resolutions";
    if (hash === "system") return "System Administration";
    if (hash === "notifications") return "Notifications";
    if (hash === "devices") return "Devices";
    return "Appearance";
  };

  const [activeTab, setActiveTab] = useState<SettingsTabId>(getInitialTab());

  const handleTabChange = (id: SettingsTabId) => {
    React.startTransition(() => {
      setActiveTab(id);
    });
    window.location.hash = id.toLowerCase().replace(" ", "");
  };

  useEffect(() => {
    const handleHashChange = () => {
      setActiveTab(getInitialTab());
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Compute navigation tabs based on user RBAC role
  const tabs: SettingsTabItem[] = [
    { id: "Profile", icon: User, label: t("settings.profile") },
    { id: "Company", icon: Building2, label: t("settings.company") },
    { id: "Security", icon: Shield, label: t("settings.security") },
    { id: "API", icon: Key, label: t("settings.apiKeys") },
    { id: "Notifications", icon: Bell, label: t("settings.notifications") },
    { id: "Appearance", icon: PaintBucket, label: t("settings.appearance") },
    { id: "Devices", icon: Smartphone, label: t("settings.devices") },
  ];

  if (user?.role === "ADMIN" || user?.role === "MANAGER") {
    tabs.push({
      id: "Resolutions",
      icon: CheckCircle2,
      label: "Resolution Protocols",
    });
  }

  if (user?.role === "ADMIN") {
    tabs.push({ id: "Database", icon: DatabaseIcon, label: "Database" });
    tabs.push({
      id: "System Administration",
      icon: Sliders,
      label: "System Panel",
    });
  }

  return (
    <div className="flex flex-col h-full bg-transparent text-slate-900 dark:text-slate-100">
      {/* Settings Top Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-6 shrink-0 transition-colors">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
          {t("settings.title")}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {t("settings.description")}
        </p>
      </div>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-8">
          {/* Navigation Sidebar */}
          <Sidebar
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />

          {/* Settings Tab Content Area */}
          <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 min-h-[500px] transition-colors">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
              {activeTab}
            </h2>

            {/* Eagerly Loaded Tabs */}
            {activeTab === "Profile" && <Profile />}
            {activeTab === "Company" && <Company />}
            {activeTab === "Appearance" && <Appearance />}
            {activeTab === "API" && <Api />}
            {activeTab === "Notifications" && <Notifications />}
            {activeTab === "Devices" && <Devices />}
            {activeTab === "System Administration" &&
              user?.role === "ADMIN" && <SystemAdmin />}

            {/* Lazy-Loaded Heavy Administrative & Security Tabs */}
            <Suspense
              fallback={
                <div className="p-12 flex flex-col items-center justify-center gap-2 text-slate-500">
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
                  <span className="text-xs">Loading settings...</span>
                </div>
              }
            >
              {activeTab === "Security" && <LazySecurity />}
              {activeTab === "Database" && user?.role === "ADMIN" && (
                <LazyDatabase />
              )}
              {activeTab === "Resolutions" &&
                (user?.role === "ADMIN" || user?.role === "MANAGER") && (
                  <LazyResolutions />
                )}
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
