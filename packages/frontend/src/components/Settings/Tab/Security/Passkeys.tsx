/**
 * @file Passkeys.tsx
 * @description FIDO2 and WebAuthn hardware token credentials management and handshake simulation.
 * @module @atlas/frontend/components/Settings/Tab/Security/Passkeys
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

import React from "react";
import {
  CheckCircle2,
  Fingerprint,
  KeyRound,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button, Input, Select } from "@atlas/ui";
import type {
  PasskeyDeviceType,
  RegisteredPasskeyDevice,
} from "../../../../types/settings.types";

interface PasskeysProps {
  passkeys: RegisteredPasskeyDevice[];
  isAddingPasskey: boolean;
  newDeviceName: string;
  newDeviceType: PasskeyDeviceType;
  handshakeTesting: boolean;
  handshakeResult: {
    success: boolean;
    deviceModel: string;
    timestamp: string;
  } | null;
  onToggleAddPasskey: () => void;
  onNewDeviceNameChange: (val: string) => void;
  onNewDeviceTypeChange: (val: PasskeyDeviceType) => void;
  onAddPasskey: () => void;
  onRevokePasskey: (id: string) => void;
  onTestHandshake: () => void;
}

export const Passkeys: React.FC<PasskeysProps> = ({
  passkeys,
  isAddingPasskey,
  newDeviceName,
  newDeviceType,
  handshakeTesting,
  handshakeResult,
  onToggleAddPasskey,
  onNewDeviceNameChange,
  onNewDeviceTypeChange,
  onAddPasskey,
  onRevokePasskey,
  onTestHandshake,
}) => {
  return (
    <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Fingerprint className="w-4 h-4 text-indigo-500" />
            Passkeys & Hardware Security Keys (FIDO2)
          </h3>
          <p className="text-xs text-slate-500">
            Phishing-resistant sign-in and authorization via YubiKey, TouchID,
            or Windows Hello.
          </p>
        </div>
        <Button
          onClick={onToggleAddPasskey}
          className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5"
        >
          <KeyRound className="w-3.5 h-3.5" />
          Link New Key
        </Button>
      </div>

      {/* New Device Form */}
      {isAddingPasskey && (
        <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40 space-y-3">
          <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 block">
            Register New FIDO2 / WebAuthn Device
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-500 mb-1 font-medium">
                Key Name:
              </label>
              <Input
                value={newDeviceName}
                onChange={(e) => onNewDeviceNameChange(e.target.value)}
                placeholder="e.g. YubiKey 5 NFC Office"
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1 font-medium">
                Authenticator Type:
              </label>
              <Select
                value={newDeviceType}
                onChange={(e) =>
                  onNewDeviceTypeChange(e.target.value as PasskeyDeviceType)
                }
              >
                <option value="YUBIKEY_FIPS">
                  YubiKey 5 Series (Hardware FIPS)
                </option>
                <option value="TOUCH_ID">
                  Apple TouchID / FaceID (Secure Enclave)
                </option>
                <option value="WINDOWS_HELLO">Windows Hello (TPM 2.0)</option>
                <option value="TITAN_KEY">Google Titan Security Key</option>
                <option value="SECURITY_KEY_GENERIC">
                  Generic FIDO2 Security Key
                </option>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="ghost"
              onClick={onToggleAddPasskey}
              className="text-xs text-slate-500"
            >
              Cancel
            </Button>
            <Button
              onClick={onAddPasskey}
              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Complete FIDO2 Registration
            </Button>
          </div>
        </div>
      )}

      {/* Registered Devices List */}
      <div className="space-y-2">
        {passkeys.map((dev) => (
          <div
            key={dev.id}
            className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                {dev.deviceType.includes("TOUCH") ||
                dev.deviceType.includes("WINDOWS") ? (
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
                  Registered: {new Date(dev.registeredAt).toLocaleDateString()}{" "}
                  • Credential: {dev.credentialId.slice(0, 20)}...
                </span>
              </div>
            </div>

            <Button
              variant="ghost"
              onClick={() => onRevokePasskey(dev.id)}
              className="text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> Revoke
            </Button>
          </div>
        ))}
      </div>

      {/* Handshake Test Banner */}
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div>
          <span className="font-semibold text-slate-800 dark:text-slate-200 block">
            Biometric Handshake Test (Local Simulation)
          </span>
          <span className="text-slate-500 text-[11px]">
            Verify the sensor and hardware certificate without initiating a live
            transaction.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={onTestHandshake}
            disabled={handshakeTesting}
            variant="outline"
            className="text-xs flex items-center gap-1.5"
          >
            {handshakeTesting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            )}
            Test Handshake
          </Button>
        </div>
      </div>

      {handshakeResult && (
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-xs flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <span>
            Handshake successful! Device: <b>{handshakeResult.deviceModel}</b>{" "}
            at {handshakeResult.timestamp}.
          </span>
        </div>
      )}
    </div>
  );
};
