/**
 * @file DigitalSignatures.tsx
 * @description Tab 2: Client-side WebCrypto SHA-256 document sealing & tamper-evident verification studio.
 * @module @atlas/frontend/components/SecurityRisk/Tab
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { motion } from "framer-motion";
import {
  FileCheck2,
  Zap,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Button, Input } from "@atlas/ui";
import type {
  DigitalSignaturesTabProps,
  DocumentSignType,
} from "../../../types/security-risk.types";

export function DigitalSignatures({
  docType,
  setDocType,
  docId,
  setDocId,
  issuerOrg,
  setIssuerOrg,
  docPayload,
  setDocPayload,
  digitalSeal,
  tamperedPayload,
  setTamperedPayload,
  tamperVerificationResult,
  onSignDocument,
  onVerifyTampering,
}: DigitalSignaturesTabProps) {
  return (
    <motion.div
      key="digital_signatures"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="grid grid-cols-1 lg:grid-cols-2 gap-6"
    >
      {/* Left: Document Signing Studio */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <FileCheck2 size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Emisor de Sellos Criptográficos (WebCrypto)
              </h3>
              <p className="text-xs text-slate-500">
                Firma en cliente sin transmisión de llaves privadas al servidor
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 text-xs font-semibold">
            SubtleCrypto SHA-256
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Tipo de Documento
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as DocumentSignType)}
              className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-800 dark:text-slate-200"
            >
              <option value="PEDIMENTO">Pedimento Aduanal SAT</option>
              <option value="BILL_OF_LADING">Ocean Bill of Lading (B/L)</option>
              <option value="E_CMR">e-CMR Transporte Terrestre</option>
              <option value="CUSTOMS_DECLARATION">
                Declaración Aduanera DUA
              </option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Identificador Oficial
            </label>
            <Input
              value={docId}
              onChange={(e) => setDocId(e.target.value)}
              className="w-full text-sm"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
            Agencia Emisora / Certificado
          </label>
          <Input
            value={issuerOrg}
            onChange={(e) => setIssuerOrg(e.target.value)}
            className="w-full text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
            Cuerpo del Documento (Payload JSON)
          </label>
          <textarea
            rows={6}
            value={docPayload}
            onChange={(e) => setDocPayload(e.target.value)}
            className="w-full p-2.5 font-mono text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200"
          />
        </div>

        <Button
          onClick={onSignDocument}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium flex items-center justify-center gap-2 py-2.5 rounded-xl shadow-md"
        >
          <Zap size={16} />
          Generar Sello Digital con WebCrypto API
        </Button>

        {digitalSeal && (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 font-bold">
              <span>Sello Digital SHA-256 Emitido</span>
              <span className="font-mono text-[11px]">
                {digitalSeal.certificateSerial}
              </span>
            </div>
            <div className="p-2 rounded bg-slate-200/50 dark:bg-slate-800/50 font-mono text-[11px] break-all select-all text-slate-800 dark:text-slate-200">
              {digitalSeal.digitalSealSha256}
            </div>
            <div className="text-[11px] text-slate-500">
              Fecha de Timbrado:{" "}
              {new Date(digitalSeal.verificationTimestamp).toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {/* Right: Tamper-Evident Verification Simulator */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Verificador Anti-Manipulación (Tamper-Proof)
              </h3>
              <p className="text-xs text-slate-500">
                Comprueba cómo una sola alteración invalida el sello
                criptográfico
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
          <strong>Auditoría Forense de Integridad:</strong> Inspecciona el
          documento firmado y ejecuta "Verificar Integridad" para certificar la
          validez del sello criptográfico SHA-256.
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
            Payload a Verificar
          </label>
          <textarea
            rows={8}
            value={tamperedPayload}
            onChange={(e) => setTamperedPayload(e.target.value)}
            disabled={!digitalSeal}
            placeholder="Genera primero un sello digital en el panel izquierdo..."
            className="w-full p-2.5 font-mono text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200"
          />
        </div>

        <Button
          onClick={onVerifyTampering}
          disabled={!digitalSeal}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium flex items-center justify-center gap-2 py-2.5 rounded-xl shadow-md dark:bg-slate-800 dark:hover:bg-slate-700"
        >
          <FileCheck2 size={16} />
          Verificar Integridad Criptográfica del Sello
        </Button>

        {tamperVerificationResult !== null && (
          <div
            className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-3 ${
              tamperVerificationResult
                ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                : "bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800"
            }`}
          >
            {tamperVerificationResult ? (
              <>
                <CheckCircle2 size={20} className="shrink-0 text-emerald-600" />
                <div>
                  <div className="font-bold text-sm">INTEGRIDAD CONFIRMADA</div>
                  <div>
                    El documento coincide bit a bit con el sello original
                    emitido por {digitalSeal?.issuerOrg}.
                  </div>
                </div>
              </>
            ) : (
              <>
                <AlertTriangle size={20} className="shrink-0 text-red-600" />
                <div>
                  <div className="font-bold text-sm">
                    ALTERACIÓN O FRAUDE DETECTADO
                  </div>
                  <div>
                    El contenido actual ha sido modificado. La huella SHA-256 no
                    coincide con el certificado original.
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
