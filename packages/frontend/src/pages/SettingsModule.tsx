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
  TableProperties,
  Fingerprint,
  ShieldCheck,
  KeyRound,
  Copy,
  Check,
  RefreshCw,
  CheckCircle2,
  Trash2,
  Sparkles,
  Clock,
} from "lucide-react";
import type {
  RegisteredPasskeyDevice,
  PasskeyDeviceType,
  StepUpSecurityPolicy,
} from "@atlas/shared";
import {
  generateBase32Secret,
  generateTOTP,
  verifyTOTP,
  generateBackupCodes,
  authenticateWithHardwareToken,
  verifyHardwareSignature,
  SAMPLE_REGISTERED_PASSKEYS,
  DEFAULT_STEP_UP_POLICY,
} from "@atlas/shared";
import { useAppStore } from "../store/useAppStore";
import { useTranslation } from "react-i18next";
import {
  Button,
  Input,
  Switch,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@atlas/ui";

export default function SettingsModule() {
  const location = window.location;

  const getInitialTab = () => {
    const hash = location.hash.replace("#", "");
    if (hash === "profile") return "Profile";
    if (hash === "company") return "Company";
    if (hash === "security") return "Security";
    if (hash === "apikeys") return "API";
    if (hash === "database") return "Database";
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
              <Button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                variant="ghost"
                className={`w-full justify-start gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors h-auto ${
                  activeTab === tab.id
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <tab.icon
                  className={`w-5 h-5 ${activeTab === tab.id ? "text-indigo-600" : "text-slate-400"}`}
                />
                {tab.label}
              </Button>
            ))}
            <div className="h-px bg-slate-200 dark:bg-slate-800 my-4"></div>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 px-4 py-3 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors h-auto"
            >
              <LogOut className="w-5 h-5" />
              {t("settings.signOut")}
            </Button>
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
                    <Button
                      onClick={() => setTheme("light")}
                      variant="outline"
                      className={`h-auto flex-col justify-center gap-3 p-4 rounded-xl border-2 transition-all ${
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
                    </Button>
                    <Button
                      onClick={() => setTheme("dark")}
                      variant="outline"
                      className={`h-auto flex-col justify-center gap-3 p-4 rounded-xl border-2 transition-all ${
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
                    </Button>
                    <Button
                      onClick={() => setTheme("system")}
                      variant="outline"
                      className={`h-auto flex-col justify-center gap-3 p-4 rounded-xl border-2 transition-all ${
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
                    </Button>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                    {t("settings.density")}
                  </h3>
                  <div className="flex gap-4">
                    <Button
                      variant="outline"
                      className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300 h-auto"
                    >
                      Comfortable
                    </Button>
                    <Button
                      variant="outline"
                      className="px-4 py-2 rounded-lg border-2 border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-sm font-medium text-indigo-700 dark:text-indigo-400 h-auto"
                    >
                      Compact
                    </Button>
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
                      <Button
                        key={lang.code}
                        onClick={() => handleLanguageChange(lang.code)}
                        variant="outline"
                        className={`px-4 py-3 h-auto rounded-lg border-2 text-sm font-medium transition-colors ${
                          language === lang.code
                            ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400"
                            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
                        }`}
                      >
                        {lang.label}
                      </Button>
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
                  <Button
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
                    className="px-4 py-2 rounded-lg shadow-sm text-sm"
                  >
                    Generate New Token
                  </Button>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                      <TableRow>
                        <TableHead>NAME</TableHead>
                        <TableHead>CREATED</TableHead>
                        <TableHead className="text-right">ACTION</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium text-slate-800 dark:text-slate-200">
                          Production ERP Sync
                        </TableCell>
                        <TableCell>Oct 12, 2025</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            className="text-rose-500 hover:text-rose-600 font-medium h-auto p-0"
                          >
                            Revoke
                          </Button>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {activeTab === "Company" && <CompanySettings />}

            {activeTab === "Security" && <SecuritySettings />}

            {activeTab === "Notifications" && (
              <div className="max-w-2xl space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
                    Email Notifications
                  </h3>
                  <div className="space-y-4">
                    {[
                      "Shipment Updates",
                      "Invoice Approvals",
                      "System Alerts",
                      "Weekly Reports",
                    ].map((label, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {label}
                          </p>
                          <p className="text-xs text-slate-500">
                            Receive an email when {label.toLowerCase()} occur.
                          </p>
                        </div>
                        <Switch defaultChecked={idx !== 3} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "Devices" && (
              <div className="max-w-2xl space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
                    Active Sessions
                  </h3>
                  <div className="space-y-4">
                    <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                      <div className="flex items-center gap-4">
                        <Monitor className="w-8 h-8 text-indigo-500" />
                        <div>
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                            Windows 11 • Chrome
                          </p>
                          <p className="text-xs text-slate-500">
                            Madrid, ES • Active now
                          </p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs font-bold rounded-full">
                        Current
                      </span>
                    </div>
                    <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Smartphone className="w-8 h-8 text-slate-400" />
                        <div>
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                            iPhone 14 Pro • Safari
                          </p>
                          <p className="text-xs text-slate-500">
                            London, UK • Last active: 2 hours ago
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        className="text-sm text-rose-500 hover:text-rose-600 font-medium h-auto p-0"
                      >
                        Revoke
                      </Button>
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

  const [newTable, setNewTable] = useState({
    name: "",
    column1Name: "",
    column1Type: "TEXT",
  });
  const [newColumn, setNewColumn] = useState({
    table: "",
    name: "",
    type: "TEXT",
  });

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
            { name: newTable.column1Name, type: newTable.column1Type },
          ],
        }),
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
      const res = await fetch(
        `/api/admin/db/tables/${newColumn.table}/columns`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            columnName: newColumn.name,
            dataType: newColumn.type,
            isNullable: true,
          }),
        },
      );
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
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
            Current Schema
          </h3>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {Object.entries(schema || {}).map(
              ([tableName, columns]: [string, any]) => (
                <div
                  key={tableName}
                  className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden"
                >
                  <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
                    <TableProperties className="w-4 h-4 text-indigo-500" />
                    <span className="font-bold text-sm text-slate-700 dark:text-slate-300">
                      {tableName}
                    </span>
                  </div>
                  <div className="p-4">
                    <Table>
                      <TableHeader className="bg-slate-50 dark:bg-slate-800">
                        <TableRow>
                          <TableHead className="h-8 py-1">Column</TableHead>
                          <TableHead className="h-8 py-1">Type</TableHead>
                          <TableHead className="h-8 py-1">PK</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {columns.map((c: any) => (
                          <TableRow key={c.name}>
                            <TableCell className="py-1 font-medium">
                              {c.name}
                            </TableCell>
                            <TableCell className="py-1">{c.type}</TableCell>
                            <TableCell className="py-1">
                              {c.pk ? "Yes" : ""}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ),
            )}
          </div>
        </div>

        <div className="space-y-8">
          <div className="p-6 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add New Table
            </h3>
            <form onSubmit={handleCreateTable} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Table Name
                </label>
                <Input
                  required
                  type="text"
                  value={newTable.name}
                  onChange={(e) =>
                    setNewTable({ ...newTable, name: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Col 1 Name
                  </label>
                  <Input
                    required
                    type="text"
                    value={newTable.column1Name}
                    onChange={(e) =>
                      setNewTable({ ...newTable, column1Name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Col 1 Type
                  </label>
                  <Select
                    value={newTable.column1Type}
                    onChange={(e) =>
                      setNewTable({ ...newTable, column1Type: e.target.value })
                    }
                  >
                    <option value="TEXT">TEXT</option>
                    <option value="INTEGER">INTEGER</option>
                    <option value="REAL">REAL</option>
                    <option value="BOOLEAN">BOOLEAN</option>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="px-4 py-2 rounded-lg">
                Create Table
              </Button>
            </form>
          </div>

          <div className="p-6 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Column to Existing Table
            </h3>
            <form onSubmit={handleAddColumn} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Target Table
                </label>
                <Select
                  required
                  value={newColumn.table}
                  onChange={(e) =>
                    setNewColumn({ ...newColumn, table: e.target.value })
                  }
                >
                  <option value="">Select a table...</option>
                  {Object.keys(schema || {}).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Column Name
                  </label>
                  <Input
                    required
                    type="text"
                    value={newColumn.name}
                    onChange={(e) =>
                      setNewColumn({ ...newColumn, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Type
                  </label>
                  <Select
                    value={newColumn.type}
                    onChange={(e) =>
                      setNewColumn({ ...newColumn, type: e.target.value })
                    }
                  >
                    <option value="TEXT">TEXT</option>
                    <option value="INTEGER">INTEGER</option>
                    <option value="REAL">REAL</option>
                    <option value="BOOLEAN">BOOLEAN</option>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="px-4 py-2 rounded-lg">
                Add Column
              </Button>
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
          read: false,
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
          <Button
            variant="outline"
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition-colors"
          >
            Change Avatar
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              First Name
            </label>
            <Input
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Last Name
            </label>
            <Input
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Email Address
          </label>
          <Input type="email" disabled value={user?.email || ""} />
          <p className="text-xs text-slate-500 mt-1">
            Email cannot be changed directly.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Timezone
          </label>
          <Select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          >
            <option>Pacific Time (PT) - US & Canada</option>
            <option>Eastern Time (ET) - US & Canada</option>
            <option>Central European Time (CET)</option>
            <option>China Standard Time (CST)</option>
          </Select>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-lg shadow-sm"
          >
            {loading ? "Saving..." : "Save Changes"}
          </Button>
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
          read: false,
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
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Company Name
            </label>
            <Input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Tax ID / VAT
            </label>
            <Input
              required
              type="text"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
            />
          </div>
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
          Billing Address
        </label>
        <Input
          type="text"
          value={billingAddress}
          onChange={(e) => setBillingAddress(e.target.value)}
        />
      </div>
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
        <Button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 rounded-lg shadow-sm"
        >
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}

function SecuritySettings() {
  const { addNotification, user } = useAppStore();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loadingPassword, setLoadingPassword] = useState(false);

  // Passkeys FIDO2 State
  const [passkeys, setPasskeys] = useState<RegisteredPasskeyDevice[]>(SAMPLE_REGISTERED_PASSKEYS);
  const [isAddingPasskey, setIsAddingPasskey] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState("YubiKey 5 NFC (Personal)");
  const [newDeviceType, setNewDeviceType] = useState<PasskeyDeviceType>("YUBIKEY_FIPS");
  const [handshakeTesting, setHandshakeTesting] = useState(false);
  const [handshakeResult, setHandshakeResult] = useState<{ success: boolean; deviceModel: string; timestamp: string } | null>(null);

  // TOTP State
  const [is2FaEnabled, setIs2FaEnabled] = useState(true);
  const [totpSecret, setTotpSecret] = useState(() => generateBase32Secret(16));
  const [currentTotpCode, setCurrentTotpCode] = useState(() => generateTOTP(totpSecret));
  const [totpSecondsRemaining, setTotpSecondsRemaining] = useState(30);
  const [totpInputCode, setTotpInputCode] = useState("");
  const [totpVerifiedStatus, setTotpVerifiedStatus] = useState<boolean | null>(null);
  const [backupCodes] = useState<string[]>(() => generateBackupCodes(5));
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackupCodes, setCopiedBackupCodes] = useState(false);

  // Step-Up Policy State
  const [stepUpPolicy, setStepUpPolicy] = useState<StepUpSecurityPolicy>(DEFAULT_STEP_UP_POLICY);
  const [savingPolicy, setSavingPolicy] = useState(false);

  // Timer for live TOTP code
  useEffect(() => {
    const interval = setInterval(() => {
      const nowSeconds = Math.floor(Date.now() / 1000);
      const remaining = 30 - (nowSeconds % 30);
      setTotpSecondsRemaining(remaining);
      if (remaining === 30 || remaining === 1) {
        setCurrentTotpCode(generateTOTP(totpSecret));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [totpSecret]);

  // Fetch credentials and policy from backend on mount
  useEffect(() => {
    fetch("/api/passkeys/credentials")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.devices) {
          setPasskeys(data.devices);
        }
      })
      .catch(() => {});

    fetch("/api/passkeys/policy")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.policy) {
          setStepUpPolicy(data.policy);
        }
      })
      .catch(() => {});
  }, []);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert("New passwords do not match!");
      return;
    }
    setLoadingPassword(true);
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
          title: "Password Updated",
          message: data.message,
          type: "success",
          timestamp: new Date().toISOString(),
          read: false,
        });
        setTimeout(() => {
          useAppStore.getState().logout();
        }, 2000);
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert("Failed to update password: " + err.message);
    } finally {
      setLoadingPassword(false);
    }
  };

  const handleAddPasskey = async () => {
    try {
      const credId = `fido2-cred-${Math.random().toString(36).substring(2, 10)}`;
      const res = await fetch("/api/passkeys/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceName: newDeviceName,
          deviceType: newDeviceType,
          credentialId: credId,
        }),
      });
      const data = await res.json();
      if (data.success && data.device) {
        setPasskeys([data.device, ...passkeys]);
        setIsAddingPasskey(false);
        addNotification({
          id: Date.now().toString(),
          title: "Passkey Vinculada",
          message: `Dispositivo '${newDeviceName}' registrado con éxito.`,
          type: "success",
          timestamp: new Date().toISOString(),
          read: false,
        });
      }
    } catch (err: any) {
      alert("Error al vincular Passkey: " + err.message);
    }
  };

  const handleRevokePasskey = async (id: string) => {
    try {
      const res = await fetch(`/api/passkeys/credentials/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setPasskeys(passkeys.filter((d) => d.id !== id));
        addNotification({
          id: Date.now().toString(),
          title: "Passkey Revocada",
          message: data.message,
          type: "info",
          timestamp: new Date().toISOString(),
          read: false,
        });
      }
    } catch (err: any) {
      alert("Error al revocar: " + err.message);
    }
  };

  const handleTestHandshake = async () => {
    setHandshakeTesting(true);
    try {
      const result = await authenticateWithHardwareToken(
        "TEST-MANIFEST-884",
        user?.email || "admin@atlas-logistics.com",
        { simulatedDelayMs: 600, deviceModel: "YubiKey 5 NFC / Windows Hello" }
      );
      const isValid = verifyHardwareSignature(result, "TEST-MANIFEST-884");
      if (isValid) {
        setHandshakeResult({
          success: true,
          deviceModel: result.deviceModel,
          timestamp: new Date().toLocaleTimeString(),
        });
      }
    } finally {
      setHandshakeTesting(false);
    }
  };

  const handleVerifyTotp = async () => {
    const isValid = verifyTOTP(totpSecret, totpInputCode);
    setTotpVerifiedStatus(isValid);
    if (isValid) {
      await fetch("/api/passkeys/totp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: totpSecret, token: totpInputCode }),
      });
      addNotification({
        id: Date.now().toString(),
        title: "2FA TOTP Activado",
        message: "Autenticación de dos factores configurada exitosamente.",
        type: "success",
        timestamp: new Date().toISOString(),
        read: false,
      });
    }
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(totpSecret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const handleCopyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join("\n"));
    setCopiedBackupCodes(true);
    setTimeout(() => setCopiedBackupCodes(false), 2000);
  };

  const handleSavePolicy = async () => {
    setSavingPolicy(true);
    try {
      const res = await fetch("/api/passkeys/policy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stepUpPolicy),
      });
      const data = await res.json();
      if (data.success) {
        addNotification({
          id: Date.now().toString(),
          title: "Políticas Actualizadas",
          message: data.message,
          type: "success",
          timestamp: new Date().toISOString(),
          read: false,
        });
      }
    } finally {
      setSavingPolicy(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-8">
      {/* 1. SECCIÓN CONTRASEÑA */}
      <form onSubmit={handlePasswordSubmit} className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Contraseña de Acceso
          </h3>
          <p className="text-xs text-slate-500">
            Actualice su contraseña periódicamente para asegurar su cuenta.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Contraseña Actual
            </label>
            <Input
              required
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Nueva Contraseña
              </label>
              <Input
                required
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Confirmar Nueva Contraseña
              </label>
              <Input
                required
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>
        </div>

        <Button
          type="submit"
          disabled={loadingPassword}
          variant="secondary"
          className="px-4 py-2 text-xs font-medium rounded-lg"
        >
          {loadingPassword ? "Actualizando..." : "Actualizar Contraseña"}
        </Button>
      </form>

      {/* 2. SECCIÓN PASSKEYS (FIDO2 / WEBAUTHN) */}
      <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Fingerprint className="w-4 h-4 text-indigo-500" />
              Centro de Llaves Passkeys & Tokens de Seguridad (FIDO2)
            </h3>
            <p className="text-xs text-slate-500">
              Inicio de sesión y autorización resistente a phishing mediante YubiKey, TouchID o Windows Hello.
            </p>
          </div>
          <Button
            onClick={() => setIsAddingPasskey(!isAddingPasskey)}
            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5"
          >
            <KeyRound className="w-3.5 h-3.5" />
            Vincular Nueva Llave
          </Button>
        </div>

        {/* Formulario de Nueva Llave */}
        {isAddingPasskey && (
          <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40 space-y-3">
            <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 block">
              Registrar Nuevo Dispositivo FIDO2 / WebAuthn
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-500 mb-1 font-medium">Nombre de la Llave:</label>
                <Input
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  placeholder="ej. YubiKey 5 NFC Oficina"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1 font-medium">Tipo de Autenticador:</label>
                <Select
                  value={newDeviceType}
                  onChange={(e) => setNewDeviceType(e.target.value as PasskeyDeviceType)}
                >
                  <option value="YUBIKEY_FIPS">YubiKey 5 Series (Hardware FIPS)</option>
                  <option value="TOUCH_ID">Apple TouchID / FaceID (Secure Enclave)</option>
                  <option value="WINDOWS_HELLO">Windows Hello (TPM 2.0)</option>
                  <option value="TITAN_KEY">Google Titan Security Key</option>
                  <option value="SECURITY_KEY_GENERIC">Llave de Seguridad Genérica FIDO2</option>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="ghost"
                onClick={() => setIsAddingPasskey(false)}
                className="text-xs text-slate-500"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleAddPasskey}
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Completar Registro FIDO2
              </Button>
            </div>
          </div>
        )}

        {/* Lista de Dispositivos Registrados */}
        <div className="space-y-2">
          {passkeys.map((dev) => (
            <div
              key={dev.id}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  {dev.deviceType.includes("TOUCH") || dev.deviceType.includes("WINDOWS") ? (
                    <Fingerprint className="w-5 h-5" />
                  ) : (
                    <KeyRound className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                      {dev.deviceName}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">
                      {dev.status}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 block font-mono">
                    Registrado: {new Date(dev.registeredAt).toLocaleDateString()} • Credential: {dev.credentialId.slice(0, 20)}...
                  </span>
                </div>
              </div>

              <Button
                variant="ghost"
                onClick={() => handleRevokePasskey(dev.id)}
                className="text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Revocar
              </Button>
            </div>
          ))}
        </div>

        {/* Botón de Prueba de Handshake */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div>
            <span className="font-semibold text-slate-800 dark:text-slate-200 block">
              Prueba de Handshake Biométrico (Simulación Local)
            </span>
            <span className="text-slate-500 text-[11px]">
              Verifique el sensor y el certificado de hardware sin iniciar una transacción real.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleTestHandshake}
              disabled={handshakeTesting}
              variant="outline"
              className="text-xs flex items-center gap-1.5"
            >
              {handshakeTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-indigo-500" />}
              Probar Handshake
            </Button>
          </div>
        </div>

        {handshakeResult && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-xs flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span>
              ¡Handshake exitoso! Dispositivo: <b>{handshakeResult.deviceModel}</b> a las {handshakeResult.timestamp}.
            </span>
          </div>
        )}
      </div>

      {/* 3. SECCIÓN AUTENTICACIÓN EN DOS PASOS TOTP (RFC 6238) */}
      <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-cyan-500" />
              Autenticación en Dos Pasos (TOTP RFC 6238)
            </h3>
            <p className="text-xs text-slate-500">
              Generación de códigos de un solo uso compatibles con Google Authenticator y Microsoft Authenticator.
            </p>
          </div>
          <Switch
            checked={is2FaEnabled}
            onChange={(e) => setIs2FaEnabled(e.target.checked)}
          />
        </div>

        {is2FaEnabled && (
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Clave Secreta y Cuenta Regresiva */}
              <div className="space-y-3">
                <div>
                  <span className="text-slate-500 text-[11px] block font-medium">Clave Secreta Base32:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-sm font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-950 p-2 rounded-lg border border-slate-200 dark:border-slate-800 flex-1">
                      {totpSecret}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const newSecret = generateBase32Secret(16);
                        setTotpSecret(newSecret);
                        setCurrentTotpCode(generateTOTP(newSecret));
                      }}
                      title="Generar Nueva Clave Secreta"
                      className="text-xs flex items-center gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCopySecret}
                      className="text-xs flex items-center gap-1"
                    >
                      {copiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>

                {/* Código En Vivo y Reloj */}
                <div className="p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Código de Prueba en Vivo</span>
                    <span className="font-mono text-xl font-black text-indigo-600 dark:text-indigo-400 tracking-wider">
                      {currentTotpCode.slice(0, 3)} {currentTotpCode.slice(3)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-semibold">Expiración</span>
                    <span className="font-mono text-xs font-bold text-amber-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {totpSecondsRemaining}s
                    </span>
                  </div>
                </div>
              </div>

              {/* Verificación de Entrada */}
              <div className="space-y-2">
                <span className="text-slate-500 text-[11px] block font-medium">
                  Comprobar Token de 6 Dígitos:
                </span>
                <div className="flex items-center gap-2">
                  <Input
                    maxLength={6}
                    value={totpInputCode}
                    onChange={(e) => setTotpInputCode(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="123456"
                    className="font-mono text-sm tracking-widest text-center"
                  />
                  <Button
                    onClick={handleVerifyTotp}
                    className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
                  >
                    Verificar
                  </Button>
                </div>
                {totpVerifiedStatus !== null && (
                  <p className={`text-xs font-medium ${totpVerifiedStatus ? "text-emerald-500" : "text-rose-500"}`}>
                    {totpVerifiedStatus ? "✓ Código verificado correctamente." : "✕ Código incorrecto o desfasado."}
                  </p>
                )}
              </div>
            </div>

            {/* Códigos de Recuperación */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Códigos de Recuperación de Emergencia (5 Códigos de Un Solo Uso)
                </span>
                <Button
                  variant="ghost"
                  onClick={handleCopyBackupCodes}
                  className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1 h-auto p-0"
                >
                  {copiedBackupCodes ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} Copiar Todos
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {backupCodes.map((code, idx) => (
                  <div
                    key={idx}
                    className="p-1.5 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-center text-slate-700 dark:text-slate-300 font-bold"
                  >
                    {code}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. SECCIÓN POLÍTICAS STEP-UP DE SEGURIDAD REFORZADA */}
      <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            Políticas de Autorización Biométrica Reforzada (Step-Up)
          </h3>
          <p className="text-xs text-slate-500">
            Exigir confirmación obligatoria mediante Passkey / FIDO2 para operaciones de alto riesgo aduanal o financiero.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                Despacho y Pedimentos Aduanales (SAT / VUCEM)
              </p>
              <p className="text-slate-500 text-[11px]">
                Requerir huella o token YubiKey antes de certificar el desaduanamiento de contenedores.
              </p>
            </div>
            <Switch
              checked={stepUpPolicy.requirePasskeyForCustomsClearance}
              onChange={(e) =>
                setStepUpPolicy({ ...stepUpPolicy, requirePasskeyForCustomsClearance: e.target.checked })
              }
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                Endoso y Transferencia de Conocimientos de Embarque (e-BL MLETR)
              </p>
              <p className="text-slate-500 text-[11px]">
                Requerir clave criptográfica hardware antes de ceder la titularidad legal de la carga.
              </p>
            </div>
            <Switch
              checked={stepUpPolicy.requirePasskeyForEblRelease}
              onChange={(e) =>
                setStepUpPolicy({ ...stepUpPolicy, requirePasskeyForEblRelease: e.target.checked })
              }
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                Liquidaciones y Pagos de Tesorería Superiores a Umbral
              </p>
              <p className="text-slate-500 text-[11px]">
                Exigir token de seguridad para autorizar desembolsos de fletes o pagos a navieras.
              </p>
            </div>
            <Switch
              checked={stepUpPolicy.requirePasskeyForHighValuePayouts}
              onChange={(e) =>
                setStepUpPolicy({ ...stepUpPolicy, requirePasskeyForHighValuePayouts: e.target.checked })
              }
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-slate-500">Umbral de Liquidación en Euros (€):</span>
            <div className="w-32">
              <Input
                type="number"
                value={stepUpPolicy.payoutThresholdEur}
                onChange={(e) =>
                  setStepUpPolicy({
                    ...stepUpPolicy,
                    payoutThresholdEur: parseFloat(e.target.value) || 10000,
                  })
                }
                className="text-right font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSavePolicy}
              disabled={savingPolicy}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
            >
              {savingPolicy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Guardar Políticas de Seguridad
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
