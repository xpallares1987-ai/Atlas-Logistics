/**
 * @file Policy.tsx
 * @description Step-Up biometric authorization policy configuration for high-risk operations.
 * @module @atlas/frontend/components/Settings/Tab/Security/Policy
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

import React from "react";
import { Check, RefreshCw, ShieldCheck } from "lucide-react";
import { Button, Input, Switch } from "@atlas/ui";
import type { StepUpSecurityPolicy } from "../../../../types/settings.types";

interface PolicyProps {
  stepUpPolicy: StepUpSecurityPolicy;
  savingPolicy: boolean;
  onPolicyChange: (policy: StepUpSecurityPolicy) => void;
  onSavePolicy: () => void;
}

export const Policy: React.FC<PolicyProps> = ({
  stepUpPolicy,
  savingPolicy,
  onPolicyChange,
  onSavePolicy,
}) => {
  return (
    <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          Step-Up Biometric Authorization Policies
        </h3>
        <p className="text-xs text-slate-500">
          Enforce mandatory Passkey / FIDO2 confirmation for high-risk customs
          or financial operations.
        </p>
      </div>

      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-4 text-xs">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              Customs Clearance & Declaration Release
            </p>
            <p className="text-slate-500 text-[11px]">
              Require fingerprint or YubiKey token before certifying container
              customs release.
            </p>
          </div>
          <Switch
            checked={stepUpPolicy.requirePasskeyForCustomsClearance}
            onChange={(e) =>
              onPolicyChange({
                ...stepUpPolicy,
                requirePasskeyForCustomsClearance: e.target.checked,
              })
            }
          />
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              Endorsement & Transfer of Bills of Lading (e-BL MLETR)
            </p>
            <p className="text-slate-500 text-[11px]">
              Require hardware cryptographic key before transferring legal cargo
              title.
            </p>
          </div>
          <Switch
            checked={stepUpPolicy.requirePasskeyForEblRelease}
            onChange={(e) =>
              onPolicyChange({
                ...stepUpPolicy,
                requirePasskeyForEblRelease: e.target.checked,
              })
            }
          />
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              Treasury Settlements & High-Value Payouts
            </p>
            <p className="text-slate-500 text-[11px]">
              Require security token to authorize freight disbursements or
              carrier payments.
            </p>
          </div>
          <Switch
            checked={stepUpPolicy.requirePasskeyForHighValuePayouts}
            onChange={(e) =>
              onPolicyChange({
                ...stepUpPolicy,
                requirePasskeyForHighValuePayouts: e.target.checked,
              })
            }
          />
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-slate-500">
            Settlement Threshold in Euros (€):
          </span>
          <div className="w-32">
            <Input
              type="number"
              value={stepUpPolicy.payoutThresholdEur}
              onChange={(e) =>
                onPolicyChange({
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
            onClick={onSavePolicy}
            disabled={savingPolicy}
            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
          >
            {savingPolicy ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            Save Security Policies
          </Button>
        </div>
      </div>
    </div>
  );
};
