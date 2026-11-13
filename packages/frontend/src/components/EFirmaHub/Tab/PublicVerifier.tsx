/**
 * @file PublicVerifier.tsx
 * @description Independent cryptographic seal verifier and RFC 3161 audit ledger tab.
 * @module @atlas/frontend/components/EFirmaHub/Tab
 * @see {@link docs/adr/0020-modular-file-size-guardrails.md}
 */

import React from "react";
import { motion } from "framer-motion";
import {
  Scale,
  RefreshCw,
  CheckCircle2,
  ShieldAlert,
  Clock,
} from "lucide-react";
import { Button, Input } from "@atlas/ui";
import type { EFirmaVerificationFeedback } from "../../../types/efirma-hub.types";

interface PublicVerifierProps {
  verifierCadena: string;
  onChangeVerifierCadena: (val: string) => void;
  verifierSello: string;
  onChangeVerifierSello: (val: string) => void;
  verifierSerial: string;
  onChangeVerifierSerial: (val: string) => void;
  verifierRfc: string;
  onChangeVerifierRfc: (val: string) => void;
  isVerifying: boolean;
  onTestVerify: () => void;
  verificationFeedback: EFirmaVerificationFeedback | null;
  stamps: any[];
}

export const PublicVerifier: React.FC<PublicVerifierProps> = ({
  verifierCadena,
  onChangeVerifierCadena,
  verifierSello,
  onChangeVerifierSello,
  verifierSerial,
  onChangeVerifierSerial,
  verifierRfc,
  onChangeVerifierRfc,
  isVerifying,
  onTestVerify,
  verificationFeedback,
  stamps,
}) => {
  return (
    <motion.div
      key="verifier"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="grid grid-cols-1 lg:grid-cols-12 gap-6"
    >
      <div className="lg:col-span-7 space-y-6">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-cyan-400" />
              Verificador Criptográfico Independiente de Sellos SAT
            </h3>
            <span className="text-xs text-cyan-400 font-mono">
              Auditoría Dual
            </span>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="text-slate-400 block mb-1 font-medium">
                Cadena Original a Validar:
              </label>
              <textarea
                rows={3}
                value={verifierCadena}
                onChange={(e) => onChangeVerifierCadena(e.target.value)}
                placeholder="||4.0|PEDIMENTO_ADUANAL|...||"
                className="w-full p-2.5 rounded-lg border border-slate-800 bg-slate-950 text-emerald-300 font-mono text-[11px] outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-medium">
                Sello Digital en Base64:
              </label>
              <textarea
                rows={3}
                value={verifierSello}
                onChange={(e) => onChangeVerifierSello(e.target.value)}
                placeholder="MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCg..."
                className="w-full p-2.5 rounded-lg border border-slate-800 bg-slate-950 text-cyan-300 font-mono text-[11px] outline-none focus:border-cyan-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-slate-400 block mb-1 font-medium">
                  Número de Serie del Certificado:
                </label>
                <Input
                  value={verifierSerial}
                  onChange={(e) => onChangeVerifierSerial(e.target.value)}
                  className="bg-slate-950 border-slate-800 font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1 font-medium">
                  RFC Titular Declarado:
                </label>
                <Input
                  value={verifierRfc}
                  onChange={(e) => onChangeVerifierRfc(e.target.value)}
                  className="bg-slate-950 border-slate-800 font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={onTestVerify}
                disabled={isVerifying}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center gap-2"
              >
                {isVerifying ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Scale className="w-3.5 h-3.5" />
                )}
                Validar Autenticidad Matemática
              </Button>
            </div>

            {verificationFeedback && (
              <div
                className={`p-4 rounded-xl border flex items-center gap-3 ${
                  verificationFeedback.valid
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                }`}
              >
                {verificationFeedback.valid ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                ) : (
                  <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0" />
                )}
                <div className="text-xs">
                  <span className="font-bold block">
                    {verificationFeedback.valid
                      ? "FIRMA VÁLIDA Y AUTÉNTICA"
                      : "FIRMA INVÁLIDA"}
                  </span>
                  <span>{verificationFeedback.message}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="lg:col-span-5 space-y-6">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              Historial de Sellos y Acuses RFC 3161
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              {stamps.length} Registros
            </span>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {stamps.length > 0 ? (
              stamps.map((stamp: any) => (
                <div
                  key={stamp.id || stamp.auditId}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5 text-xs hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">
                      {stamp.documentId || stamp.id}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">
                      {stamp.documentType}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono truncate">
                    Token:{" "}
                    {stamp.rfc3161TimestampToken || stamp.signatureDigest}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                    <span>RFC: {stamp.signerRfc || stamp.rfcTitular}</span>
                    <span>
                      {stamp.verifiedAt || stamp.stampedAt
                        ? new Date(
                            stamp.verifiedAt || stamp.stampedAt,
                          ).toLocaleTimeString()
                        : "Validado"}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-slate-500">
                No hay sellos registrados aún en el libro de auditoría.
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
