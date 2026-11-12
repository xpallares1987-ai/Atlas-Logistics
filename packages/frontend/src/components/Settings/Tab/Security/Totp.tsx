/**
 * @file Totp.tsx
 * @description Two-Factor Authentication (TOTP RFC 6238) configuration with live countdown badge.
 * @module @atlas/frontend/components/Settings/Tab/Security/Totp
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

import React, { useState, useEffect } from "react";
import { Check, Clock, Copy, RefreshCw, Smartphone } from "lucide-react";
import { Button, Input, Switch } from "@atlas/ui";
import { generateBase32Secret, generateTOTP } from "@atlas/shared";

interface TotpProps {
  is2FaEnabled: boolean;
  totpSecret: string;
  totpInputCode: string;
  totpVerifiedStatus: boolean | null;
  copiedSecret: boolean;
  onToggle2Fa: (enabled: boolean) => void;
  onSecretChange: (secret: string) => void;
  onInputCodeChange: (code: string) => void;
  onVerifyTotp: () => void;
  onCopySecret: () => void;
}

// Memoized leaf countdown badge preventing full parent re-renders every 1s
const TotpLiveCountdownBadge = React.memo(function TotpLiveCountdownBadge({
  secret,
}: {
  secret: string;
}) {
  const [code, setCode] = useState(() => generateTOTP(secret));
  const [secondsRemaining, setSecondsRemaining] = useState(30);

  useEffect(() => {
    setCode(generateTOTP(secret));
    const interval = setInterval(() => {
      const nowSeconds = Math.floor(Date.now() / 1000);
      const remaining = 30 - (nowSeconds % 30);
      setSecondsRemaining(remaining);
      if (remaining === 30 || remaining === 1) {
        setCode(generateTOTP(secret));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [secret]);

  return (
    <div className="p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
      <div>
        <span className="text-[10px] text-slate-400 uppercase font-semibold block">
          Live Test Code
        </span>
        <span className="font-mono text-xl font-black text-indigo-600 dark:text-indigo-400 tracking-wider">
          {code.slice(0, 3)} {code.slice(3)}
        </span>
      </div>
      <div className="text-right">
        <span className="text-[10px] text-slate-400 block font-semibold">
          Expiration
        </span>
        <span className="font-mono text-xs font-bold text-amber-500 flex items-center gap-1">
          <Clock className="w-3 h-3" /> {secondsRemaining}s
        </span>
      </div>
    </div>
  );
});

export const Totp: React.FC<TotpProps> = ({
  is2FaEnabled,
  totpSecret,
  totpInputCode,
  totpVerifiedStatus,
  copiedSecret,
  onToggle2Fa,
  onSecretChange,
  onInputCodeChange,
  onVerifyTotp,
  onCopySecret,
}) => {
  return (
    <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-cyan-500" />
            Two-Factor Authentication (TOTP RFC 6238)
          </h3>
          <p className="text-xs text-slate-500">
            One-time passcode generation compatible with Google Authenticator
            and Microsoft Authenticator.
          </p>
        </div>
        <Switch
          checked={is2FaEnabled}
          onChange={(e) => onToggle2Fa(e.target.checked)}
        />
      </div>

      {is2FaEnabled && (
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Secret Key and Live Countdown */}
            <div className="space-y-3">
              <div>
                <span className="text-slate-500 text-[11px] block font-medium">
                  Base32 Secret Key:
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-sm font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-950 p-2 rounded-lg border border-slate-200 dark:border-slate-800 flex-1">
                    {totpSecret}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => onSecretChange(generateBase32Secret(16))}
                    title="Generate New Secret Key"
                    className="text-xs flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={onCopySecret}
                    className="text-xs flex items-center gap-1"
                  >
                    {copiedSecret ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>
              </div>

              <TotpLiveCountdownBadge secret={totpSecret} />
            </div>

            {/* Input Verification */}
            <div className="space-y-2">
              <span className="text-slate-500 text-[11px] block font-medium">
                Verify 6-Digit Token:
              </span>
              <div className="flex items-center gap-2">
                <Input
                  maxLength={6}
                  autoComplete="one-time-code"
                  value={totpInputCode}
                  onChange={(e) =>
                    onInputCodeChange(e.target.value.replace(/[^0-9]/g, ""))
                  }
                  placeholder="123456"
                  className="font-mono text-sm tracking-widest text-center"
                />
                <Button
                  onClick={onVerifyTotp}
                  className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
                >
                  Verify
                </Button>
              </div>
              {totpVerifiedStatus !== null && (
                <p
                  className={`text-xs font-medium ${
                    totpVerifiedStatus ? "text-emerald-500" : "text-rose-500"
                  }`}
                >
                  {totpVerifiedStatus
                    ? "✓ Code verified successfully."
                    : "✕ Invalid or expired code."}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
