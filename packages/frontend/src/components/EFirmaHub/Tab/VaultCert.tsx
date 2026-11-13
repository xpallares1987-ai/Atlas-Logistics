/**
 * @file VaultCert.tsx
 * @description Zero-Knowledge RAM Cryptographic Vault & SAT X.509 Certificate Inspector tab.
 * @module @atlas/frontend/components/EFirmaHub/Tab
 * @see {@link docs/adr/0020-modular-file-size-guardrails.md}
 */

import React from "react";
import { motion } from "framer-motion";
import {
  Lock,
  Unlock,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { Button, Input } from "@atlas/ui";
import type { EFirmaCertificateMetadata } from "../../../types/efirma-hub.types";

interface VaultCertProps {
  isVaultUnlocked: boolean;
  cerFileName: string | null;
  keyFileName: string | null;
  onCerFileUpload: (file: File) => void;
  onKeyFileSelect: (name: string) => void;
  passphrase: string;
  onChangePassphrase: (val: string) => void;
  loadingUnlock: boolean;
  onLoadSandboxCredentials: () => void;
  onLockVault: () => void;
  activeCertificate: EFirmaCertificateMetadata | null;
}

export const VaultCert: React.FC<VaultCertProps> = ({
  isVaultUnlocked,
  cerFileName,
  keyFileName,
  onCerFileUpload,
  onKeyFileSelect,
  passphrase,
  onChangePassphrase,
  loadingUnlock,
  onLoadSandboxCredentials,
  onLockVault,
  activeCertificate,
}) => {
  return (
    <motion.div
      key="vault"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="grid grid-cols-1 lg:grid-cols-12 gap-6"
    >
      <div className="lg:col-span-6 space-y-6">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400" />
                Gestión de Llaves y Bóveda Criptográfica
              </h3>
              <p className="text-xs text-slate-400">
                Zero-Knowledge: La clave privada reside estrictamente en memoria
                RAM
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isVaultUnlocked ? (
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-xs font-mono flex items-center gap-1">
                  <Unlock className="w-3 h-3" /> ACTIVA
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-xs font-mono flex items-center gap-1">
                  <Lock className="w-3 h-3" /> BLOQUEADA
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-dashed border-slate-700 bg-slate-950/60 text-center space-y-2">
              <span className="font-semibold text-slate-300 block">
                Certificado Público (.cer)
              </span>
              <input
                type="file"
                accept=".cer"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onCerFileUpload(file);
                }}
                className="text-[10px] text-slate-500 w-full"
              />
              {cerFileName && (
                <span className="text-emerald-400 text-[10px] font-mono block">
                  ✓ {cerFileName}
                </span>
              )}
            </div>

            <div className="p-4 rounded-xl border border-dashed border-slate-700 bg-slate-950/60 text-center space-y-2">
              <span className="font-semibold text-slate-300 block">
                Llave Privada PKCS#8 (.key)
              </span>
              <input
                type="file"
                accept=".key"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onKeyFileSelect(file.name);
                }}
                className="text-[10px] text-slate-500 w-full"
              />
              {keyFileName && (
                <span className="text-emerald-400 text-[10px] font-mono block">
                  ✓ {keyFileName}
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1 text-xs font-medium">
              Contraseña de e.firma (SAT):
            </label>
            <Input
              type="password"
              autoComplete="current-password"
              value={passphrase}
              onChange={(e) => onChangePassphrase(e.target.value)}
              placeholder="••••••••••••"
              className="bg-slate-950 border-slate-800 font-mono text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <Button
              onClick={onLoadSandboxCredentials}
              disabled={loadingUnlock}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-2"
            >
              {loadingUnlock ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              )}
              Cargar Credenciales Sandbox SAT (Demo)
            </Button>

            {isVaultUnlocked ? (
              <Button
                onClick={onLockVault}
                className="bg-rose-600/80 hover:bg-rose-600 text-white text-xs flex items-center gap-2"
              >
                <Lock className="w-3.5 h-3.5" />
                Bloquear y Purgar Memoria RAM
              </Button>
            ) : (
              <Button
                onClick={onLoadSandboxCredentials}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs flex items-center gap-2"
              >
                <Unlock className="w-3.5 h-3.5" />
                Desbloquear Bóveda
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="lg:col-span-6 space-y-6">
        {activeCertificate ? (
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Diagnóstico del Certificado X.509 SAT
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                VIGENTE
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
                <span className="text-slate-500 text-[10px] block">
                  Titular (Razón Social)
                </span>
                <span className="font-semibold text-white block text-sm">
                  {activeCertificate.razonSocial}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80">
                  <span className="text-slate-500 text-[10px] block">
                    RFC Titular
                  </span>
                  <span className="font-mono font-bold text-emerald-400">
                    {activeCertificate.rfcTitular}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80">
                  <span className="text-slate-500 text-[10px] block">
                    Número de Serie (20 Dígitos)
                  </span>
                  <span className="font-mono text-cyan-400">
                    {activeCertificate.certificateSerial}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80">
                  <span className="text-slate-500 text-[10px] block">
                    Válido Desde
                  </span>
                  <span className="text-slate-300">
                    {new Date(activeCertificate.validFrom).toLocaleDateString()}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80">
                  <span className="text-slate-500 text-[10px] block">
                    Válido Hasta
                  </span>
                  <span className="text-slate-300">
                    {new Date(
                      activeCertificate.validUntil,
                    ).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80">
                <span className="text-slate-500 text-[10px] block">
                  Autoridad Certificadora (Emisor SAT)
                </span>
                <span className="text-slate-300">
                  {activeCertificate.issuer}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80">
                <span className="text-slate-500 text-[10px] block">
                  Huella Digital SHA-256
                </span>
                <span className="font-mono text-[10px] text-slate-400 break-all">
                  {activeCertificate.certificateSha256Fingerprint}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
            <ShieldAlert className="w-8 h-8 text-slate-500 mx-auto" />
            <span className="text-xs text-slate-400 block">
              No hay ningún certificado cargado. Cargue archivos o active
              Sandbox.
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};
