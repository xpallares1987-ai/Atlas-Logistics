/**
 * @file Password.tsx
 * @description Account password update form with validation and session lifecycle management.
 * @module @atlas/frontend/components/Settings/Tab/Security/Password
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

import React from "react";
import { Button, Input } from "@atlas/ui";

interface PasswordProps {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  loadingPassword: boolean;
  onCurrentPasswordChange: (val: string) => void;
  onNewPasswordChange: (val: string) => void;
  onConfirmPasswordChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const Password: React.FC<PasswordProps> = ({
  currentPassword,
  newPassword,
  confirmPassword,
  loadingPassword,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Account Password
        </h3>
        <p className="text-xs text-slate-500">
          Update your password periodically to keep your account secure.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
            Current Password
          </label>
          <Input
            required
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => onCurrentPasswordChange(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              New Password
            </label>
            <Input
              required
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => onNewPasswordChange(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Confirm New Password
            </label>
            <Input
              required
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => onConfirmPasswordChange(e.target.value)}
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
        {loadingPassword ? "Updating..." : "Update Password"}
      </Button>
    </form>
  );
};
