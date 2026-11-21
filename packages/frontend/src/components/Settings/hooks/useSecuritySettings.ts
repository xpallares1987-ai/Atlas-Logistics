/**
 * @file useSecuritySettings.ts
 * @description Sovereign Credentials Management hook for Passkeys (WebAuthn), TOTP MFA with QR SVG, and NIST Step-Up policy.
 * @module @atlas/frontend/components/Settings/hooks/useSecuritySettings
 * @see {@link docs/adr/0031-sovereign-native-identity-and-authentication-engine.md}
 */

import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "../../../store/useAppStore";
import { resolveApiUrl } from "../../../hooks/useApiQuery";
import { usePasskey } from "../../../hooks/usePasskey";
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
  verifyHardwareSignature,
  verifyTOTP,
} from "@atlas/shared";

export interface SecurityAuditLogItem {
  id: string;
  eventType: string;
  ipHash: string;
  userAgent: string;
  status: string;
  failureReason?: string | null;
  createdAt: string;
}

export type StepUpActionType = "REVOKE_PASSKEY" | "DISABLE_TOTP" | null;

export function useSecuritySettings() {
  const { addNotification, user } = useAppStore();
  const { registerPasskey } = usePasskey();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loadingPassword, setLoadingPassword] = useState(false);

  // Passkeys FIDO2 State
  const [passkeys, setPasskeys] = useState<RegisteredPasskeyDevice[]>([]);
  const [isAddingPasskey, setIsAddingPasskey] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState(
    "YubiKey 5 NFC / Windows Hello",
  );
  const [newDeviceType, setNewDeviceType] = useState<PasskeyDeviceType>(
    "SECURITY_KEY_GENERIC",
  );
  const [handshakeTesting, setHandshakeTesting] = useState(false);
  const [handshakeResult, setHandshakeResult] = useState<{
    success: boolean;
    deviceModel: string;
    timestamp: string;
  } | null>(null);

  // TOTP State
  const [is2FaEnabled, setIs2FaEnabled] = useState(false);
  const [totpSecret, setTotpSecret] = useState(() => generateBase32Secret(16));
  const [qrSvgDataUrl, setQrSvgDataUrl] = useState("");
  const [totpInputCode, setTotpInputCode] = useState("");
  const [totpVerifiedStatus, setTotpVerifiedStatus] = useState<boolean | null>(
    null,
  );
  const [backupCodes, setBackupCodes] = useState<string[]>(() =>
    generateBackupCodes(5),
  );
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackupCodes, setCopiedBackupCodes] = useState(false);

  // Step-Up Policy & NIST SP 800-63B Confirmation State
  const [stepUpPolicy, setStepUpPolicy] = useState<StepUpSecurityPolicy>(
    DEFAULT_STEP_UP_POLICY,
  );
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [stepUpModalOpen, setStepUpModalOpen] = useState(false);
  const [stepUpPassword, setStepUpPassword] = useState("");
  const [stepUpAction, setStepUpAction] = useState<StepUpActionType>(null);
  const [stepUpTargetId, setStepUpTargetId] = useState<string | null>(null);
  const [stepUpLoading, setStepUpLoading] = useState(false);
  const [stepUpError, setStepUpError] = useState("");

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<SecurityAuditLogItem[]>([]);

  // 1. Fetch Registered Passkeys from Fastify
  const fetchPasskeys = useCallback(async () => {
    try {
      const res = await fetch(resolveApiUrl("/api/auth/passkeys"), {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.devices)) {
          const mapped: RegisteredPasskeyDevice[] = data.devices.map(
            (d: {
              id: string;
              deviceName?: string;
              name?: string;
              deviceType?: string;
              credentialId?: string;
              createdAt?: string;
              lastUsedAt?: string;
            }) => ({
              id: d.id,
              deviceName: d.deviceName || d.name || "Biometric / Security Key",
              deviceType: (d.deviceType ||
                "SECURITY_KEY_GENERIC") as PasskeyDeviceType,
              credentialId: d.credentialId || "",
              publicKey: "",
              registeredAt: d.createdAt
                ? new Date(d.createdAt).toLocaleDateString()
                : new Date().toLocaleDateString(),
              lastUsedAt: d.lastUsedAt
                ? new Date(d.lastUsedAt).toLocaleDateString()
                : undefined,
              status: "ACTIVE" as const,
            }),
          );
          setPasskeys(mapped);
          return;
        }
      }
      setPasskeys(SAMPLE_REGISTERED_PASSKEYS);
    } catch {
      setPasskeys(SAMPLE_REGISTERED_PASSKEYS);
    }
  }, []);

  // 2. Fetch User Security Audit Logs
  const fetchAuditLogs = useCallback(async () => {
    try {
      const res = await fetch(resolveApiUrl("/api/auth/audit-logs"), {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.logs)) {
          setAuditLogs(data.logs);
        }
      }
    } catch {
      // Non-blocking fallback
    }
  }, []);

  // 3. Initialize TOTP Setup from Fastify
  const initTotpSetup = useCallback(async () => {
    try {
      const res = await fetch(resolveApiUrl("/api/auth/totp/setup"), {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (data.secret) setTotpSecret(data.secret);
          if (data.qrSvgDataUrl) setQrSvgDataUrl(data.qrSvgDataUrl);
          if (Array.isArray(data.backupCodes)) setBackupCodes(data.backupCodes);
        }
      }
    } catch {
      // Fallback to local offline secret
    }
  }, []);

  useEffect(() => {
    void fetchPasskeys();
    void fetchAuditLogs();
    void initTotpSetup();

    fetch(resolveApiUrl("/api/passkeys/policy"), { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.success && data.policy) {
          setStepUpPolicy(data.policy);
        }
      })
      .catch(() => {});
  }, [fetchPasskeys, fetchAuditLogs, initTotpSetup]);

  // Account Password Update
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
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(resolveApiUrl("/api/settings/password"), {
        method: "PUT",
        headers,
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        addNotification({
          id: Date.now().toString(),
          title: "Password Updated",
          message: data.message || "Password changed successfully.",
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
    } catch (err: unknown) {
      alert(
        "Failed to update password: " +
          (err instanceof Error ? err.message : String(err)),
      );
    } finally {
      setLoadingPassword(false);
    }
  };

  // Real WebAuthn Passkey Registration Ceremony
  const handleAddPasskey = async () => {
    try {
      await registerPasskey(newDeviceName);
      await fetchPasskeys();
      await fetchAuditLogs();
      setIsAddingPasskey(false);
      addNotification({
        id: Date.now().toString(),
        title: "Passkey Enrolled",
        message: `Hardware device '${newDeviceName}' verified and enrolled successfully.`,
        type: "success",
        timestamp: new Date().toISOString(),
        read: false,
      });
    } catch (err: unknown) {
      alert(
        "Error al vincular Passkey: " +
          (err instanceof Error ? err.message : String(err)),
      );
    }
  };

  // Step-Up Authentication Triggers
  const handlePromptRevokePasskey = (id: string) => {
    setStepUpAction("REVOKE_PASSKEY");
    setStepUpTargetId(id);
    setStepUpPassword("");
    setStepUpError("");
    setStepUpModalOpen(true);
  };

  const handlePromptToggle2Fa = (enabled: boolean) => {
    if (!enabled) {
      setStepUpAction("DISABLE_TOTP");
      setStepUpTargetId(null);
      setStepUpPassword("");
      setStepUpError("");
      setStepUpModalOpen(true);
    } else {
      setIs2FaEnabled(true);
      void initTotpSetup();
    }
  };

  const handleConfirmStepUp = async () => {
    if (!stepUpPassword) {
      setStepUpError("Por favor ingresa tu contraseña de confirmación.");
      return;
    }

    setStepUpLoading(true);
    setStepUpError("");

    try {
      if (stepUpAction === "REVOKE_PASSKEY" && stepUpTargetId) {
        const res = await fetch(
          resolveApiUrl(`/api/auth/passkeys/${stepUpTargetId}`),
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ password: stepUpPassword }),
          },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || "Error al revocar passkey.");
        }
        await fetchPasskeys();
        await fetchAuditLogs();
        setStepUpModalOpen(false);
        addNotification({
          id: Date.now().toString(),
          title: "Passkey Revocada",
          message: "La clave de acceso ha sido revocada de forma segura.",
          type: "info",
          timestamp: new Date().toISOString(),
          read: false,
        });
      } else if (stepUpAction === "DISABLE_TOTP") {
        const res = await fetch(resolveApiUrl("/api/auth/totp"), {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ password: stepUpPassword }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || "Error al desactivar 2FA.");
        }
        setIs2FaEnabled(false);
        await fetchAuditLogs();
        setStepUpModalOpen(false);
        addNotification({
          id: Date.now().toString(),
          title: "2FA Desactivado",
          message: "La autenticación en dos pasos ha sido deshabilitada.",
          type: "warning",
          timestamp: new Date().toISOString(),
          read: false,
        });
      }
    } catch (err: unknown) {
      setStepUpError(
        err instanceof Error ? err.message : "Error durante la confirmación.",
      );
    } finally {
      setStepUpLoading(false);
    }
  };

  const handleCloseStepUp = () => {
    setStepUpModalOpen(false);
    setStepUpPassword("");
    setStepUpError("");
    setStepUpAction(null);
    setStepUpTargetId(null);
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

    try {
      const res = await fetch(resolveApiUrl("/api/auth/totp/verify"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: totpInputCode.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      const verified = Boolean(res.ok && data.success);
      setTotpVerifiedStatus(verified);
      if (verified) {
        setIs2FaEnabled(true);
        await fetchAuditLogs();
        addNotification({
          id: Date.now().toString(),
          title: "2FA TOTP Activado",
          message:
            "Autenticación en dos pasos activada y verificada exitosamente.",
          type: "success",
          timestamp: new Date().toISOString(),
          read: false,
        });
      }
    } catch {
      const offlineValid = verifyTOTP(totpSecret, totpInputCode.trim());
      setTotpVerifiedStatus(offlineValid);
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
      const res = await fetch(resolveApiUrl("/api/passkeys/policy"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(stepUpPolicy),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        addNotification({
          id: Date.now().toString(),
          title: "Policy Updated",
          message: data.message || "Security policy updated.",
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
    handleRevokePasskey: handlePromptRevokePasskey,
    handleTestHandshake,

    is2FaEnabled,
    setIs2FaEnabled: handlePromptToggle2Fa,
    totpSecret,
    setTotpSecret,
    qrSvgDataUrl,
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

    stepUpModalOpen,
    stepUpPassword,
    setStepUpPassword,
    stepUpAction,
    stepUpLoading,
    stepUpError,
    handleCloseStepUp,
    handleConfirmStepUp,

    auditLogs,
  };
}
