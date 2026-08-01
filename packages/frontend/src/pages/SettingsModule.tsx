import React, { useState, useEffect } from "react";
import {
  User,
  Building2,
  Key,
  Bell,
  Shield,
  PaintBucket,
  Smartphone,
  LogOut,
  Monitor,
  Moon,
  Sun,
  Globe,
  Database,
  Plus,
  TableProperties
} from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { useTranslation } from "react-i18next";

export default function SettingsModule() {
  const location = window.location;

  const getInitialTab = () => {
    const hash = location.hash.replace("#", "");
    if (hash === "profile") return "Profile";
    if (hash === "company") return "Company";
    if (hash === "security") return "Security";
    if (hash === "apikeys") return "API";
    return "Appearance";
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());
  const { theme, setTheme, language, setLanguage, user } = useAppStore();
  const { t, i18n } = useTranslation();

  const handleTabChange = (id: string) => {
    setActiveTab(id);
    window.location.hash = id.toLowerCase().replace(" ", "");
  };

  useEffect(() => {
    const handleHashChange = () => {
      setActiveTab(getInitialTab());
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const handleLanguageChange = (lng: string) => {
    setLanguage(lng);
    i18n.changeLanguage(lng);
  };

  const tabs = [
    { id: "Profile", icon: User, label: t("settings.profile") },
    { id: "Company", icon: Building2, label: t("settings.company") },
    { id: "Security", icon: Shield, label: t("settings.security") },
    { id: "API", icon: Key, label: t("settings.apiKeys") },
    { id: "Notifications", icon: Bell, label: t("settings.notifications") },
    { id: "Appearance", icon: PaintBucket, label: t("settings.appearance") },
    { id: "Devices", icon: Smartphone, label: t("settings.devices") },
  ];

  if (user?.role === "ADMIN") {
    tabs.push({ id: "Database", icon: Database, label: "Database" });
  }

  return (
    <div className="flex flex-col h-full bg-transparent text-slate-900 dark:text-slate-100">
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
          {/* Settings Sidebar */}
          <div className="w-full md:w-64 shrink-0 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <tab.icon
                  className={`w-5 h-5 ${activeTab === tab.id ? "text-indigo-600" : "text-slate-400"}`}
                />
                {tab.label}
              </button>
            ))}
            <div className="h-px bg-slate-200 dark:bg-slate-800 my-4"></div>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors">
              <LogOut className="w-5 h-5" />
              {t("settings.signOut")}
            </button>
          </div>

          {/* Settings Content Area */}
          <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 min-h-[500px] transition-colors">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
              {activeTab}
            </h2>

            {activeTab === "Profile" && <ProfileSettings />}

            {activeTab === "Appearance" && (
              <div className="max-w-xl space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                    {t("settings.theme")}
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <button
                      onClick={() => setTheme("light")}
                      className={`flex flex-col items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all ${
                        theme === "light"
                          ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                      }`}
                    >
                      <Sun
                        className={
                          theme === "light"
                            ? "text-indigo-600"
                            : "text-slate-400"
                        }
                        size={24}
                      />
                      <span
                        className={`text-sm font-medium ${theme === "light" ? "text-indigo-700 dark:text-indigo-400" : "text-slate-600 dark:text-slate-400"}`}
                      >
                        Light
                      </span>
                    </button>
                    <button
                      onClick={() => setTheme("dark")}
                      className={`flex flex-col items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all ${
                        theme === "dark"
                          ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                      }`}
                    >
                      <Moon
                        className={
                          theme === "dark"
                            ? "text-indigo-600"
                            : "text-slate-400"
                        }
                        size={24}
                      />
                      <span
                        className={`text-sm font-medium ${theme === "dark" ? "text-indigo-700 dark:text-indigo-400" : "text-slate-600 dark:text-slate-400"}`}
                      >
                        Dark
                      </span>
                    </button>
                    <button
                      onClick={() => setTheme("system")}
                      className={`flex flex-col items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all ${
                        theme === "system"
                          ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                      }`}
                    >
                      <Monitor
                        className={
                          theme === "system"
                            ? "text-indigo-600"
                            : "text-slate-400"
                        }
                        size={24}
                      />
                      <span
                        className={`text-sm font-medium ${theme === "system" ? "text-indigo-700 dark:text-indigo-400" : "text-slate-600 dark:text-slate-400"}`}
                      >
                        System
                      </span>
                    </button>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                    {t("settings.density")}
                  </h3>
                  <div className="flex gap-4">
                    <button className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300">
                      Comfortable
                    </button>
                    <button className="px-4 py-2 rounded-lg border-2 border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-sm font-medium text-indigo-700 dark:text-indigo-400">
                      Compact
                    </button>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                    <Globe size={18} /> {t("settings.language")}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { code: "en", label: "English" },
                      { code: "es", label: "Español" },
                      { code: "de", label: "Deutsch" },
                      { code: "fr", label: "Français" },
                    ].map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => handleLanguageChange(lang.code)}
                        className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                          language === lang.code
                            ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400"
                            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
                        }`}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "API" && (
              <div className="max-w-3xl space-y-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      API Keys
                    </h3>
                    <p className="text-xs text-slate-500">
                      Manage your B2B integration tokens. Keep these secret.
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        const backendUrl = import.meta.env.VITE_API_URL || "";
                        const res = await fetch(
                          `${backendUrl}/api/keys/generate`,
                          {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              name: "New Integration Key",
                            }),
                          },
                        );
                        const data = await res.json();
                        if (data.success) {
                          alert(
                            `Token generated! Please copy it now, you won't be able to see it again:\n\n${data.key.token}`,
                          );
                        }
                      } catch (e) {
                        alert("Error generating API key");
                      }
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-sm text-sm"
                  >
                    Generate New Token
                  </button>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                      <tr>
                        <th className="px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                          NAME
                        </th>
                        <th className="px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                          CREATED
                        </th>
                        <th className="px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 text-right">
                          ACTION
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      <tr>
                        <td className="px-4 py-4 text-sm font-medium text-slate-800 dark:text-slate-200">
                          Production ERP Sync
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-500">
                          Oct 12, 2025
                        </td>
                        <td className="px-4 py-4 text-sm text-right">
                          <button className="text-rose-500 hover:text-rose-600 font-medium">
                            Revoke
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "Company" && <CompanySettings />}

            {activeTab === "Security" && <SecuritySettings />}

            {activeTab === "Notifications" && (
              <div className="max-w-2xl space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">Email Notifications</h3>
                  <div className="space-y-4">
                    {["Shipment Updates", "Invoice Approvals", "System Alerts", "Weekly Reports"].map((label, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</p>
                          <p className="text-xs text-slate-500">Receive an email when {label.toLowerCase()} occur.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" defaultChecked={idx !== 3} className="sr-only peer" />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "Devices" && (
              <div className="max-w-2xl space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">Active Sessions</h3>
                  <div className="space-y-4">
                    <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                      <div className="flex items-center gap-4">
                        <Monitor className="w-8 h-8 text-indigo-500" />
                        <div>
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Windows 11 • Chrome</p>
                          <p className="text-xs text-slate-500">Madrid, ES • Active now</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs font-bold rounded-full">Current</span>
                    </div>
                    <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Smartphone className="w-8 h-8 text-slate-400" />
                        <div>
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">iPhone 14 Pro • Safari</p>
                          <p className="text-xs text-slate-500">London, UK • Last active: 2 hours ago</p>
                        </div>
                      </div>
                      <button className="text-sm text-rose-500 hover:text-rose-600 font-medium">Revoke</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "Database" && user?.role === "ADMIN" && (
              <DatabaseManager />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DatabaseManager() {
  const [schema, setSchema] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newTable, setNewTable] = useState({ name: "", column1Name: "", column1Type: "TEXT" });
  const [newColumn, setNewColumn] = useState({ table: "", name: "", type: "TEXT" });

  const fetchSchema = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/db/schema");
      const data = await res.json();
      if (data.success) {
        setSchema(data.schema);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchema();
  }, []);

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/db/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableName: newTable.name,
          columns: [
            { name: "id", type: "TEXT", pk: true, notnull: true },
            { name: newTable.column1Name, type: newTable.column1Type }
          ]
        })
      });
      const data = await res.json();
      if (data.success) {
        setNewTable({ name: "", column1Name: "", column1Type: "TEXT" });
        fetchSchema();
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColumn.table) return alert("Select a table");
    try {
      const res = await fetch(`/api/admin/db/tables/${newColumn.table}/columns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          columnName: newColumn.name,
          dataType: newColumn.type,
          isNullable: true
        })
      });
      const data = await res.json();
      if (data.success) {
        setNewColumn({ table: "", name: "", type: "TEXT" });
        fetchSchema();
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <div>Loading schema...</div>;
  if (error) return <div className="text-rose-500">Error: {error}</div>;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Current Schema</h3>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {Object.entries(schema || {}).map(([tableName, columns]: [string, any]) => (
              <div key={tableName} className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
                  <TableProperties className="w-4 h-4 text-indigo-500" />
                  <span className="font-bold text-sm text-slate-700 dark:text-slate-300">{tableName}</span>
                </div>
                <div className="p-4">
                  <table className="w-full text-left text-sm text-slate-500 dark:text-slate-400">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-800 dark:text-slate-400">
                      <tr>
                        <th className="px-2 py-1">Column</th>
                        <th className="px-2 py-1">Type</th>
                        <th className="px-2 py-1">PK</th>
                      </tr>
                    </thead>
                    <tbody>
                      {columns.map((c: any) => (
                        <tr key={c.name} className="border-b dark:border-slate-800 last:border-0">
                          <td className="px-2 py-1 font-medium">{c.name}</td>
                          <td className="px-2 py-1">{c.type}</td>
                          <td className="px-2 py-1">{c.pk ? "Yes" : ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          <div className="p-6 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add New Table
            </h3>
            <form onSubmit={handleCreateTable} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Table Name</label>
                <input required type="text" value={newTable.name} onChange={e => setNewTable({...newTable, name: e.target.value})} className="w-full px-3 py-2 bg-transparent text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Col 1 Name</label>
                  <input required type="text" value={newTable.column1Name} onChange={e => setNewTable({...newTable, column1Name: e.target.value})} className="w-full px-3 py-2 bg-transparent text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Col 1 Type</label>
                  <select value={newTable.column1Type} onChange={e => setNewTable({...newTable, column1Type: e.target.value})} className="w-full px-3 py-2 bg-transparent text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="TEXT">TEXT</option>
                    <option value="INTEGER">INTEGER</option>
                    <option value="REAL">REAL</option>
                    <option value="BOOLEAN">BOOLEAN</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg">Create Table</button>
            </form>
          </div>

          <div className="p-6 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Column to Existing Table
            </h3>
            <form onSubmit={handleAddColumn} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Target Table</label>
                <select required value={newColumn.table} onChange={e => setNewColumn({...newColumn, table: e.target.value})} className="w-full px-3 py-2 bg-transparent text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="">Select a table...</option>
                  {Object.keys(schema || {}).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Column Name</label>
                  <input required type="text" value={newColumn.name} onChange={e => setNewColumn({...newColumn, name: e.target.value})} className="w-full px-3 py-2 bg-transparent text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
                  <select value={newColumn.type} onChange={e => setNewColumn({...newColumn, type: e.target.value})} className="w-full px-3 py-2 bg-transparent text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="TEXT">TEXT</option>
                    <option value="INTEGER">INTEGER</option>
                    <option value="REAL">REAL</option>
                    <option value="BOOLEAN">BOOLEAN</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg">Add Column</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileSettings() {
  const { user, checkAuth, addNotification } = useAppStore();
  const defaultFirstName = (user?.name || "").split(" ")[0] || "";
  const defaultLastName = (user?.name || "").split(" ")[1] || "";

  const [firstName, setFirstName] = useState(defaultFirstName);
  const [lastName, setLastName] = useState(defaultLastName);
  const [timezone, setTimezone] = useState("Pacific Time (PT) - US & Canada");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, timezone }),
      });
      const data = await res.json();
      if (data.success) {
        addNotification({
          id: Date.now().toString(),
          title: "Profile Updated",
          message: data.message,
          type: "success",
          timestamp: new Date().toISOString(),
          read: false
        });
        await checkAuth(); // refresh user data
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert("Failed to update profile: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-6">
        <div className="w-20 h-20 rounded-full bg-indigo-100 dark:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-700 dark:text-indigo-400 text-2xl font-black">
          {user?.avatarInitials || "JD"}
        </div>
        <div>
          <button className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition-colors">
            Change Avatar
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              First Name
            </label>
            <input
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-3 py-2 bg-transparent text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Last Name
            </label>
            <input
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-3 py-2 bg-transparent text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Email Address
          </label>
          <input
            type="email"
            disabled
            value={user?.email || ""}
            className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <p className="text-xs text-slate-500 mt-1">Email cannot be changed directly.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Timezone
          </label>
          <select 
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full px-3 py-2 bg-transparent text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option>Pacific Time (PT) - US & Canada</option>
            <option>Eastern Time (ET) - US & Canada</option>
            <option>Central European Time (CET)</option>
            <option>China Standard Time (CST)</option>
          </select>
        </div>



        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <button 
            type="submit" 
            disabled={loading}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

function CompanySettings() {
  const { addNotification } = useAppStore();
  const [name, setName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/settings/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, taxId, billingAddress }),
      });
      const data = await res.json();
      if (data.success) {
        addNotification({
          id: Date.now().toString(),
          title: "Company Updated",
          message: data.message,
          type: "success",
          timestamp: new Date().toISOString(),
          read: false
        });
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert("Failed to update company: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div>
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
          Company Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Company Name</label>
            <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 bg-transparent text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tax ID / VAT</label>
            <input required type="text" value={taxId} onChange={e => setTaxId(e.target.value)} className="w-full px-3 py-2 bg-transparent text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Billing Address</label>
        <input type="text" value={billingAddress} onChange={e => setBillingAddress(e.target.value)} className="w-full px-3 py-2 bg-transparent text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
      </div>
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
        <button type="submit" disabled={loading} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50">
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}

function SecuritySettings() {
  const { addNotification } = useAppStore();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert("New passwords do not match!");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/settings/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        addNotification({
          id: Date.now().toString(),
          title: "Security Updated",
          message: data.message,
          type: "success",
          timestamp: new Date().toISOString(),
          read: false
        });
        
        // Use App Store logout since session was invalidated on the backend
        setTimeout(() => {
          useAppStore.getState().logout();
        }, 2000);
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert("Failed to update password: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <form onSubmit={handleSubmit}>
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
          Password
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Current Password</label>
            <input required type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="••••••••" className="w-full px-3 py-2 bg-transparent text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">New Password</label>
              <input required type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" className="w-full px-3 py-2 bg-transparent text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Confirm New Password</label>
              <input required type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" className="w-full px-3 py-2 bg-transparent text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>
        </div>
        <button type="submit" disabled={loading} className="mt-4 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium rounded-lg transition-colors text-sm disabled:opacity-50">
          {loading ? "Updating..." : "Change Password"}
        </button>
      </form>
      <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Two-Factor Authentication (2FA)</h3>
        <p className="text-sm text-slate-500 mb-4">Add an extra layer of security to your account.</p>
        <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors text-sm">Enable 2FA</button>
      </div>
    </div>
  );
}
