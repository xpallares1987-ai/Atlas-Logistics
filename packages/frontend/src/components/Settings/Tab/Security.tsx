/**
 * @file Security.tsx
 * @description Master Security settings tab orchestrating password, passkeys, TOTP, backup codes, and step-up policy.
 * @module @atlas/frontend/components/Settings/Tab/Security
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

import React from "react";
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
    </div>
  );
};

export default Security;
