/**
 * @file useSecuritySettings.ts
 * @description Domain hook for Passkeys, WebAuthn, TOTP, and step-up security policy management.
 * @module @atlas/frontend/components/Settings/hooks/useSecuritySettings
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

import { useState, useEffect } from "react";
import { useAppStore } from "../../../store/useAppStore";
import type {
  PasskeyDeviceType,
  RegisteredPasskeyDevice,
  StepUpSecurityPolicy,
} from "../../../types/settings.types";
import {
  DEFAULT_STEP_UP_POLICY,
  SAMPLE_REGISTERED_PASSKEYS,
  authenticateWithHardwareToken,
  generateBackupCodes,
  generateBase32Secret,
  getSecureRandomString,
  verifyHardwareSignature,
  verifyTOTP,
} from "@atlas/shared";

export function useSecuritySettings() {
  const { addNotification, user } = useAppStore();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loadingPassword, setLoadingPassword] = useState(false);

  // Passkeys FIDO2 State
  const [passkeys, setPasskeys] = useState<RegisteredPasskeyDevice[]>(
    SAMPLE_REGISTERED_PASSKEYS,
  );
  const [isAddingPasskey, setIsAddingPasskey] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState(
    "YubiKey 5 NFC (Personal)",
  );
  const [newDeviceType, setNewDeviceType] =
    useState<PasskeyDeviceType>("YUBIKEY_FIPS");
  const [handshakeTesting, setHandshakeTesting] = useState(false);
  const [handshakeResult, setHandshakeResult] = useState<{
    success: boolean;
    deviceModel: string;
    timestamp: string;
  } | null>(null);

  // TOTP State
  const [is2FaEnabled, setIs2FaEnabled] = useState(true);
  const [totpSecret, setTotpSecret] = useState(() => generateBase32Secret(16));
  const [totpInputCode, setTotpInputCode] = useState("");
  const [totpVerifiedStatus, setTotpVerifiedStatus] = useState<boolean | null>(
    null,
  );
  const [backupCodes] = useState<string[]>(() => generateBackupCodes(5));
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackupCodes, setCopiedBackupCodes] = useState(false);

  // Step-Up Policy State
  const [stepUpPolicy, setStepUpPolicy] = useState<StepUpSecurityPolicy>(
    DEFAULT_STEP_UP_POLICY,
  );
  const [savingPolicy, setSavingPolicy] = useState(false);

  // Fetch credentials and policy on mount
  useEffect(() => {
    fetch("/api/passkeys/credentials")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.success && data.devices) {
          setPasskeys(data.devices);
        }
      })
      .catch(() => {});

    fetch("/api/passkeys/policy")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.success && data.policy) {
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
      const token =
        localStorage.getItem("atlas_token") || localStorage.getItem("token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch("/api/settings/password", {
        method: "PUT",
        headers,
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
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
        alert(data.error || "Failed to update password");
      }
    } catch (err: any) {
      alert("Failed to update password: " + err.message);
    } finally {
      setLoadingPassword(false);
    }
  };

  const handleAddPasskey = async () => {
    try {
      const credId = `fido2-cred-${getSecureRandomString(12)}`;
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
          title: "Passkey Linked",
          message: `Device '${newDeviceName}' registered successfully.`,
          type: "success",
          timestamp: new Date().toISOString(),
          read: false,
        });
      }
    } catch (err: any) {
      alert("Failed to link Passkey: " + err.message);
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
          title: "Passkey Revoked",
          message: data.message,
          type: "info",
          timestamp: new Date().toISOString(),
          read: false,
        });
      }
    } catch (err: any) {
      alert("Error revoking Passkey: " + err.message);
    }
  };

  const handleTestHandshake = async () => {
    setHandshakeTesting(true);
    try {
      const result = await authenticateWithHardwareToken(
        "TEST-MANIFEST-884",
        user?.email || "admin@atlas-logistics.com",
        { simulatedDelayMs: 600, deviceModel: "YubiKey 5 NFC / Windows Hello" },
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
    if (!totpInputCode || totpInputCode.trim().length !== 6) {
      setTotpVerifiedStatus(false);
      return;
    }
    const isValid = verifyTOTP(totpSecret, totpInputCode.trim());
    if (!isValid) {
      setTotpVerifiedStatus(false);
      return;
    }
    try {
      const res = await fetch("/api/passkeys/totp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: totpSecret,
          token: totpInputCode.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      const verified = Boolean(res.ok && (data.verified || data.success));
      setTotpVerifiedStatus(verified);
      if (verified) {
        addNotification({
          id: Date.now().toString(),
          title: "2FA TOTP Activated",
          message: "Two-factor authentication configured successfully.",
          type: "success",
          timestamp: new Date().toISOString(),
          read: false,
        });
      }
    } catch {
      setTotpVerifiedStatus(false);
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
          title: "Policy Updated",
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

  return {
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    loadingPassword,
    handlePasswordSubmit,

    passkeys,
    isAddingPasskey,
    setIsAddingPasskey,
    newDeviceName,
    setNewDeviceName,
    newDeviceType,
    setNewDeviceType,
    handshakeTesting,
    handshakeResult,
    handleAddPasskey,
    handleRevokePasskey,
    handleTestHandshake,

    is2FaEnabled,
    setIs2FaEnabled,
    totpSecret,
    setTotpSecret,
    totpInputCode,
    setTotpInputCode,
    totpVerifiedStatus,
    backupCodes,
    copiedSecret,
    copiedBackupCodes,
    handleVerifyTotp,
    handleCopySecret,
    handleCopyBackupCodes,

    stepUpPolicy,
    setStepUpPolicy,
    savingPolicy,
    handleSavePolicy,
  };
}
