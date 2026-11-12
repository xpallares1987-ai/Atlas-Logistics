/**
 * @file PasskeysTotp.tsx
 * @description Tab 1: WebAuthn / FIDO2 Hardware Passkeys & RFC 6238 TOTP 2FA simulator.
 * @module @atlas/frontend/components/SecurityRisk/Tab
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Fingerprint,
  KeyRound,
  RefreshCw,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { generateTOTP } from "@atlas/shared";
import { Button, Input } from "@atlas/ui";
import type { PasskeysTotpTabProps } from "../../../types/security-risk.types";

const TotpSecurityCard = React.memo(function TotpSecurityCard({
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
    <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-200/50 dark:border-indigo-800/50 text-center">
      <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 block mb-1">
        CÓDIGO DE 6 DÍGITOS ACTIVO
      </span>
      <div className="text-4xl font-extrabold tracking-widest text-slate-900 dark:text-white font-mono my-2">
        {code.slice(0, 3)} {code.slice(3)}
      </div>
      <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
        <span>Expira en:</span>
        <span className="font-bold text-indigo-600 dark:text-indigo-400">
          {secondsRemaining}s
        </span>
      </div>
      <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-3">
        <div
          className="bg-indigo-600 h-full transition-[width] duration-1000 ease-linear"
          style={{ width: `${(secondsRemaining / 30) * 100}%` }}
        />
      </div>
    </div>
  );
});

export function PasskeysTotp({
  userEmail,
  setUserEmail,
  manifestId,
  setManifestId,
  deviceModel,
  setDeviceModel,
  isAuthenticating,
  passkeyResult,
  registeredKeys,
  onTestPasskeyAuth,
  totpSecret,
  totpInputCode,
  setTotpInputCode,
  totpVerificationStatus,
  backupCodes,
  onVerifyTotp,
  onGenerateNewSecret,
}: PasskeysTotpTabProps) {
  return (
    <motion.div
      key="passkeys_totp"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="grid grid-cols-1 lg:grid-cols-2 gap-6"
    >
      {/* Left: WebAuthn / Passkeys Hardware Token */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <Fingerprint size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Passkeys & Llaves de Hardware (FIDO2)
              </h3>
              <p className="text-xs text-slate-500">
                Liberación de manifiestos y órdenes críticas con firma
                biométrica o física
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
            FIDO2 / WebAuthn
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Usuario Operativo
            </label>
            <Input
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              className="w-full text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                ID Manifiesto / Orden
              </label>
              <Input
                value={manifestId}
                onChange={(e) => setManifestId(e.target.value)}
                className="w-full text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Dispositivo FIDO2
              </label>
              <select
                value={deviceModel}
                onChange={(e) => setDeviceModel(e.target.value)}
                className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-800 dark:text-slate-200"
              >
                <option value="YubiKey 5 NFC / Series FIPS">
                  YubiKey 5 NFC / Series FIPS
                </option>
                <option value="Google Titan Security Key">
                  Google Titan Security Key
                </option>
                <option value="Windows Hello (TPM 2.0 Biometric)">
                  Windows Hello (TPM 2.0)
                </option>
                <option value="Apple TouchID / FaceID Secure Enclave">
                  Apple TouchID / Secure Enclave
                </option>
              </select>
            </div>
          </div>

          <Button
            onClick={onTestPasskeyAuth}
            disabled={isAuthenticating}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium flex items-center justify-center gap-2 py-2.5 rounded-xl shadow-md"
          >
            {isAuthenticating ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Esperando interacción con llave de hardware...
              </>
            ) : (
              <>
                <KeyRound size={16} />
                Verificar Autenticación FIDO2 / WebAuthn
              </>
            )}
          </Button>

          {passkeyResult && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={16} /> Handshake Criptográfico Exitoso
                </span>
                <span>{passkeyResult.deviceModel}</span>
              </div>
              <div className="grid grid-cols-1 gap-1 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                <div>
                  <strong>Credential ID:</strong> {passkeyResult.credentialId}
                </div>
                <div className="truncate">
                  <strong>Signature:</strong> {passkeyResult.signature}
                </div>
                <div>
                  <strong>Timestamp:</strong> {passkeyResult.timestamp}
                </div>
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Llaves FIDO2 Vinculadas
            </h4>
            <div className="space-y-2">
              {registeredKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <KeyRound size={14} className="text-indigo-500" />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {key.device}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {key.registeredAt}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right: TOTP 2FA Engine */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
              <KeyRound size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Autenticación Doble Factor TOTP (RFC 6238)
              </h3>
              <p className="text-xs text-slate-500">
                Compatible con Google Authenticator, Microsoft Authenticator y
                Yubico
              </p>
            </div>
          </div>
          <Button
            onClick={onGenerateNewSecret}
            variant="outline"
            className="text-xs flex items-center gap-1.5 h-8 px-2.5"
          >
            <RefreshCw size={12} /> Regenerar
          </Button>
        </div>

        <div className="space-y-4">
          <TotpSecurityCard secret={totpSecret} />

          <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 font-mono">
              <span>Secret Base32:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {totpSecret}
              </span>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Verificar Código del Dispositivo
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="000000"
                maxLength={6}
                value={totpInputCode}
                onChange={(e) =>
                  setTotpInputCode(e.target.value.replace(/\D/g, ""))
                }
                className="text-center font-mono text-base tracking-widest"
              />
              <Button
                onClick={onVerifyTotp}
                disabled={totpInputCode.length !== 6}
                className="bg-purple-600 hover:bg-purple-700 text-white shrink-0 px-4"
              >
                Validar
              </Button>
            </div>
            {totpVerificationStatus !== null && (
              <div
                className={`mt-2 p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                  totpVerificationStatus
                    ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400"
                    : "bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400"
                }`}
              >
                {totpVerificationStatus ? (
                  <>
                    <CheckCircle2 size={14} /> Código TOTP válido con ventana de
                    tolerancia activa.
                  </>
                ) : (
                  <>
                    <XCircle size={14} /> Código inválido o expirado. Reintente
                    con el código actual.
                  </>
                )}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-2">
              Códigos de Respaldo de Emergencia
            </span>
            <div className="grid grid-cols-3 gap-2">
              {backupCodes.map((code) => (
                <div
                  key={code}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-center font-mono text-[11px] text-slate-700 dark:text-slate-300"
                >
                  {code}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
