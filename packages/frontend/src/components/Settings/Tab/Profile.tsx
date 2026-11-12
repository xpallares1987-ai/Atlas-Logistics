/**
 * @file Profile.tsx
 * @description User personal profile, avatar, name, and timezone configuration tab.
 * @module @atlas/frontend/components/Settings/Tab/Profile
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

import React, { useState } from "react";
import { Button, Input, Select } from "@atlas/ui";
import { useAppStore } from "../../../store/useAppStore";

export const Profile: React.FC = () => {
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
        await checkAuth();
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
};
