/**
 * @file CartaPorte.tsx
 * @description Tab 1: SAT Carta Porte 3.1 & CFDI 4.0 stamping studio with IdCCP and QR verification.
 * @module @atlas/frontend/components/CrossBorder/Tab
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { motion } from "framer-motion";
import {
  Building,
  ArrowRight,
  Truck,
  User,
  Layers,
  RefreshCw,
  Zap,
  ShieldCheck,
  Check,
  Copy,
  QrCode,
  ExternalLink,
  FileText,
} from "lucide-react";
import { Button } from "@atlas/ui";
import type { CartaPorteTabProps } from "../../../types/cross-border.types";

export function CartaPorte({
  cartaPorteData,
  stampingResult,
  copiedXml,
  copiedIdCCP,
  isStamping,
  onExecuteStamping,
  onCopyXml,
  onCopyIdCCP,
}: CartaPorteTabProps) {
  return (
    <motion.div
      key="carta-porte"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="grid grid-cols-1 lg:grid-cols-12 gap-6"
    >
      {/* Form Left Side */}
      <div className="lg:col-span-7 space-y-6">
        {/* Emisor / Receptor Card */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-400" />
              CFDI 4.0 Comprobante & Figuras Fiscales
            </h3>
            <span className="text-xs text-slate-400">
              Ref: {cartaPorteData.shipmentRef}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Emisor (Transportista SCT)
              </span>
              <p className="font-semibold text-slate-200">
                {cartaPorteData.razonSocialEmisor}
              </p>
              <p className="text-emerald-400 font-mono">
                RFC: {cartaPorteData.rfcEmisor}
              </p>
              <p className="text-slate-400">
                Régimen: {cartaPorteData.regimenFiscalEmisor || "601"}
              </p>
              <p className="text-slate-400">
                CP Origen: {cartaPorteData.origen.codigoPostal}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Receptor (Destinatario Internacional)
              </span>
              <p className="font-semibold text-slate-200">
                {cartaPorteData.razonSocialReceptor}
              </p>
              <p className="text-cyan-400 font-mono">
                RFC / Tax ID: {cartaPorteData.rfcReceptor}
              </p>
              <p className="text-slate-400">
                Uso CFDI: S01 (Sin efectos fiscales)
              </p>
              <p className="text-slate-400">
                CP Destino: {cartaPorteData.destino.codigoPostal}
              </p>
            </div>
          </div>

          {/* Ruta y Distancia */}
          <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/40 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500">Origen:</span>{" "}
              {cartaPorteData.origen.nombre}
            </div>
            <div className="flex items-center gap-2 text-indigo-400 font-medium">
              <ArrowRight className="w-3.5 h-3.5" />
              {cartaPorteData.distanciaRecorridaKm} km
            </div>
            <div>
              <span className="text-slate-500">Destino:</span>{" "}
              {cartaPorteData.destino.nombre}
            </div>
          </div>
        </div>

        {/* Autotransporte Federal SCT & Operador */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Truck className="w-4 h-4 text-cyan-400" />
              Identificación Vehicular SCT & Póliza Civil
            </h3>
            <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-mono">
              {cartaPorteData.autotransporte.configVehicular}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
              <span className="text-slate-500 block text-[10px]">
                Placa Federal
              </span>
              <span className="font-semibold text-white font-mono">
                {cartaPorteData.autotransporte.placa}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
              <span className="text-slate-500 block text-[10px]">
                Año Modelo
              </span>
              <span className="font-semibold text-white">
                {cartaPorteData.autotransporte.anioModelo}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
              <span className="text-slate-500 block text-[10px]">
                Permiso SCT
              </span>
              <span className="font-semibold text-white">
                {cartaPorteData.autotransporte.permisoSct}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
              <span className="text-slate-500 block text-[10px]">
                Póliza RC
              </span>
              <span className="font-semibold text-emerald-400 truncate block">
                {cartaPorteData.autotransporte.polizaRespCivil}
              </span>
            </div>
          </div>

          {/* Operador Card */}
          <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/40 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" />
              <div>
                <span className="text-slate-300 font-semibold">
                  {cartaPorteData.operador.nombre}
                </span>
                <span className="text-slate-500 ml-2 font-mono">
                  ({cartaPorteData.operador.rfc})
                </span>
              </div>
            </div>
            <div className="font-mono text-cyan-400">
              Lic: {cartaPorteData.operador.numLicencia}
            </div>
          </div>
        </div>

        {/* Mercancías en Tránsito */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              Mercancías Transportadas ({cartaPorteData.mercancias.length})
            </h3>
            <span className="text-xs text-slate-400 font-semibold">
              Peso Total:{" "}
              {cartaPorteData.mercancias
                .reduce((a, m) => a + m.pesoKg, 0)
                .toLocaleString()}{" "}
              kg
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-medium">
                  <th className="pb-2">Clave SAT</th>
                  <th className="pb-2">Descripción</th>
                  <th className="pb-2">Fracción</th>
                  <th className="pb-2 text-right">Peso (kg)</th>
                  <th className="pb-2 text-right">HazMat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {cartaPorteData.mercancias.map((m, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30">
                    <td className="py-2.5 font-mono text-emerald-400">
                      {m.claveProdServ}
                    </td>
                    <td className="py-2.5 max-w-[200px] truncate">
                      {m.descripcion}
                    </td>
                    <td className="py-2.5 font-mono text-cyan-400">
                      {m.fraccionArancelaria || "N/A"}
                    </td>
                    <td className="py-2.5 text-right font-medium">
                      {m.pesoKg.toLocaleString()}
                    </td>
                    <td className="py-2.5 text-right">
                      {m.materialPeligroso ? (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono">
                          {m.claveMaterialPeligroso || "UN HAZMAT"}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[10px]">NO</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Subtotales y Total Flete */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 flex items-center justify-between text-xs">
            <div className="text-slate-400">
              Subtotal:{" "}
              <span className="font-semibold text-white font-mono">
                ${cartaPorteData.subtotalMxn.toLocaleString()} MXN
              </span>{" "}
              | IVA 16%:{" "}
              <span className="font-mono">
                ${cartaPorteData.ivaMxn.toLocaleString()} MXN
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block uppercase">
                Total Flete Facturado
              </span>
              <span className="text-base font-bold text-emerald-400 font-mono">
                ${cartaPorteData.totalMxn.toLocaleString()} MXN
              </span>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={onExecuteStamping}
              disabled={isStamping}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2"
            >
              {isStamping ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5" />
              )}
              Timbrar Carta Porte 3.1 (Diverza PAC)
            </Button>
          </div>
        </div>
      </div>

      {/* Output Right Side: Stamped Result & QR & XML */}
      <div className="lg:col-span-5 space-y-6">
        {/* IdCCP Hero Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              Identificador Universal SAT CP 3.1
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
              TIMBRADO VÁLIDO
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 uppercase block font-semibold">
              IdCCP (36 Caracteres)
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-sm md:text-base font-bold text-white break-all bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex-1">
                {stampingResult?.idCCP}
              </span>
              <button
                onClick={onCopyIdCCP}
                className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Copiar IdCCP"
              >
                {copiedIdCCP ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs pt-2">
            <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80">
              <span className="text-slate-500 text-[10px] block">
                UUID Fiscal
              </span>
              <span className="font-mono text-slate-300 text-[11px] truncate block">
                {stampingResult?.uuid}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80">
              <span className="text-slate-500 text-[10px] block">
                PAC Autorizado
              </span>
              <span className="text-slate-300 text-[11px] truncate block font-medium">
                {stampingResult?.pacProvider}
              </span>
            </div>
          </div>

          {/* QR SAT Viewer */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-4">
            <div className="p-3 bg-white rounded-lg flex-shrink-0 flex items-center justify-center">
              <QrCode className="w-14 h-14 text-slate-950" />
            </div>
            <div className="space-y-1 text-xs">
              <span className="text-slate-300 font-semibold block">
                Código QR de Verificación SAT
              </span>
              <p className="text-[11px] text-slate-400">
                Escaneo para verificación inmediata de transportación federal en
                retenes aduanales y Guardia Nacional.
              </p>
              <a
                href={stampingResult?.qrCodeSatUrl}
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 hover:underline flex items-center gap-1 text-[11px] font-mono mt-1"
              >
                Verificar en Portal SAT <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* XML Stamped Viewer */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              XML CFDI 4.0 con Complemento CP 3.1
            </h4>
            <button
              onClick={onCopyXml}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors"
            >
              {copiedXml ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copiedXml ? "Copiado" : "Copiar XML"}
            </button>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-400 max-h-72 overflow-y-auto whitespace-pre leading-relaxed">
            {stampingResult?.stampedXml}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
