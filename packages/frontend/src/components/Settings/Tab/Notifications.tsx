/**
 * @file Notifications.tsx
 * @description Email, SMS, and webhook operational notifications preferences configuration tab.
 * @module @atlas/frontend/components/Settings/Tab/Notifications
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

import React from "react";
import { Switch } from "@atlas/ui";

const NOTIFICATION_CHANNELS = [
  "Shipment Updates",
  "Invoice Approvals",
  "System Alerts",
  "Weekly Reports",
];

export const Notifications: React.FC = () => {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
          Email Notifications
        </h3>
        <div className="space-y-4">
          {NOTIFICATION_CHANNELS.map((label, idx) => (
            <div key={idx} className="flex items-center justify-between">
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
  );
};
