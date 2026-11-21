/**
 * @file Security.tsx
 * @description Master Security settings tab orchestrating password, passkeys, TOTP, backup codes, audit trails, and NIST step-up confirmation.
 * @module @atlas/frontend/components/Settings/Tab/Security
 * @see {@link docs/adr/0031-sovereign-native-identity-and-authentication-engine.md}
 */

import React from "react";
import { ShieldAlert, History, AlertTriangle } from "lucide-react";
import { Button, Input } from "@atlas/ui";
import { useSecuritySettings } from "../hooks/useSecuritySettings";
import { Password } from "./Security/Password";
import { Passkeys } from "./Security/Passkeys";
import { Totp } from "./Security/Totp";
import { BackupCodes } from "./Security/BackupCodes";
import { Policy } from "./Security/Policy";

export const Security: React.FC = () => {
  const {
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
  } = useSecuritySettings();

  return (
    <div className="max-w-3xl space-y-8">
      {/* 1. Account Password */}
      <Password
        currentPassword={currentPassword}
        newPassword={newPassword}
        confirmPassword={confirmPassword}
        loadingPassword={loadingPassword}
        onCurrentPasswordChange={setCurrentPassword}
        onNewPasswordChange={setNewPassword}
        onConfirmPasswordChange={setConfirmPassword}
        onSubmit={handlePasswordSubmit}
      />

      {/* 2. Passkeys & Hardware Security Keys */}
      <Passkeys
        passkeys={passkeys}
        isAddingPasskey={isAddingPasskey}
        newDeviceName={newDeviceName}
        newDeviceType={newDeviceType}
        handshakeTesting={handshakeTesting}
        handshakeResult={handshakeResult}
        onToggleAddPasskey={() => setIsAddingPasskey(!isAddingPasskey)}
        onNewDeviceNameChange={setNewDeviceName}
        onNewDeviceTypeChange={setNewDeviceType}
        onAddPasskey={handleAddPasskey}
        onRevokePasskey={handleRevokePasskey}
        onTestHandshake={handleTestHandshake}
      />

      {/* 3. Two-Factor Authentication (TOTP) */}
      <Totp
        is2FaEnabled={is2FaEnabled}
        totpSecret={totpSecret}
        qrSvgDataUrl={qrSvgDataUrl}
        totpInputCode={totpInputCode}
        totpVerifiedStatus={totpVerifiedStatus}
        copiedSecret={copiedSecret}
        onToggle2Fa={setIs2FaEnabled}
        onSecretChange={setTotpSecret}
        onInputCodeChange={setTotpInputCode}
        onVerifyTotp={handleVerifyTotp}
        onCopySecret={handleCopySecret}
      />

      {/* Backup Codes (Displayed when 2FA is active) */}
      {is2FaEnabled && (
        <BackupCodes
          backupCodes={backupCodes}
          copiedBackupCodes={copiedBackupCodes}
          onCopyBackupCodes={handleCopyBackupCodes}
        />
      )}

      {/* 4. Step-Up Security Policies */}
      <Policy
        stepUpPolicy={stepUpPolicy}
        savingPolicy={savingPolicy}
        onPolicyChange={setStepUpPolicy}
        onSavePolicy={handleSavePolicy}
      />

      {/* 5. Security Audit Log History */}
      {auditLogs.length > 0 && (
        <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Historial de Auditoría de Seguridad (NIST SP 800-63B)
            </h3>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-3.5 py-2.5 font-medium">Evento</th>
                  <th className="px-3.5 py-2.5 font-medium">Estado</th>
                  <th className="px-3.5 py-2.5 font-medium">IP Hash</th>
                  <th className="px-3.5 py-2.5 font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
                {auditLogs.slice(0, 10).map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                  >
                    <td className="px-3.5 py-2 font-semibold text-slate-800 dark:text-slate-200">
                      {log.eventType}
                    </td>
                    <td className="px-3.5 py-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          log.status === "SUCCESS"
                            ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
                            : "bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="px-3.5 py-2 text-slate-500 truncate max-w-[120px]">
                      {log.ipHash || "local"}
                    </td>
                    <td className="px-3.5 py-2 text-slate-400">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* NIST Step-Up Authentication Modal Dialog */}
      {stepUpModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Confirmación de Seguridad (Step-Up)
                </h3>
                <p className="text-xs text-slate-500">
                  {stepUpAction === "REVOKE_PASSKEY"
                    ? "¿Estás seguro de que deseas revocar esta Passkey? Esta acción es irreversible."
                    : "¿Estás seguro de que deseas desactivar la autenticación en dos pasos (2FA)?"}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Ingresa tu contraseña actual para confirmar:
              </label>
              <Input
                type="password"
                placeholder="Contraseña actual"
                value={stepUpPassword}
                onChange={(e) => setStepUpPassword(e.target.value)}
                autoFocus
              />
              {stepUpError && (
                <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1 mt-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {stepUpError}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={handleCloseStepUp}
                disabled={stepUpLoading}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmStepUp}
                disabled={stepUpLoading || !stepUpPassword}
                className="text-xs bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5"
              >
                {stepUpLoading ? "Verificando..." : "Confirmar Acción"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Security;
