import React from "react";
import { motion, Variants } from "framer-motion";
import {
  Send,
  Zap,
  Scale,
  DollarSign,
  FileCheck,
  Copy,
  Download,
} from "lucide-react";
import { Input, Button } from "@atlas/ui";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

export interface EdiOutboundTabProps {
  outboundFormat: "304" | "310" | "IFTMIN" | "204";
  onOutboundFormatChange: (format: "304" | "310" | "IFTMIN" | "204") => void;
  scmShipments: any[];
  onScmPreFill: (shipmentId: string) => void;
  bookingRef: string;
  onBookingRefChange: (ref: string) => void;
  containerNum: string;
  onContainerNumChange: (num: string) => void;
  consignorName: string;
  onConsignorNameChange: (name: string) => void;
  consigneeName: string;
  onConsigneeNameChange: (name: string) => void;
  originLocode: string;
  onOriginLocodeChange: (locode: string) => void;
  destLocode: string;
  onDestLocodeChange: (locode: string) => void;
  invoiceNumber: string;
  onInvoiceNumberChange: (num: string) => void;
  billOfLading: string;
  onBillOfLadingChange: (bl: string) => void;
  currency: string;
  onCurrencyChange: (curr: string) => void;
  vgmWeightKg: number;
  onVgmWeightKgChange: (weight: number) => void;
  vgmMethod: "METHOD_1" | "METHOD_2";
  onVgmMethodChange: (method: "METHOD_1" | "METHOD_2") => void;
  vgmPerson: string;
  onVgmPersonChange: (person: string) => void;
  vesselName: string;
  onVesselNameChange: (name: string) => void;
  voyageNum: string;
  onVoyageNumChange: (num: string) => void;
  sealNum: string;
  onSealNumChange: (seal: string) => void;
  baseFreightRate: number;
  onBaseFreightRateChange: (rate: number) => void;
  bafAmount: number;
  onBafAmountChange: (amount: number) => void;
  thcAmount: number;
  onThcAmountChange: (amount: number) => void;
  cargoDesc: string;
  onCargoDescChange: (desc: string) => void;
  isGenerating: boolean;
  onGenerateOutbound: () => void;
  outboundResult: any;
  copyToClipboard: (text: string) => void;
  downloadEdiFile: (content: string, filename: string) => void;
}

export const EdiOutboundTab: React.FC<EdiOutboundTabProps> = ({
  outboundFormat,
  onOutboundFormatChange,
  scmShipments,
  onScmPreFill,
  bookingRef,
  onBookingRefChange,
  containerNum,
  onContainerNumChange,
  consignorName,
  onConsignorNameChange,
  consigneeName,
  onConsigneeNameChange,
  originLocode,
  onOriginLocodeChange,
  destLocode,
  onDestLocodeChange,
  invoiceNumber,
  onInvoiceNumberChange,
  billOfLading,
  onBillOfLadingChange,
  currency,
  onCurrencyChange,
  vgmWeightKg,
  onVgmWeightKgChange,
  vgmMethod,
  onVgmMethodChange,
  vgmPerson,
  onVgmPersonChange,
  vesselName,
  onVesselNameChange,
  voyageNum,
  onVoyageNumChange,
  sealNum,
  onSealNumChange,
  baseFreightRate,
  onBaseFreightRateChange,
  bafAmount,
  onBafAmountChange,
  thcAmount,
  onThcAmountChange,
  cargoDesc,
  onCargoDescChange,
  isGenerating,
  onGenerateOutbound,
  outboundResult,
  copyToClipboard,
  downloadEdiFile,
}) => {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 lg:grid-cols-12 gap-6"
    >
      <motion.div
        variants={itemVariants}
        className="lg:col-span-6 flex flex-col gap-4"
      >
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <Send size={18} className="text-indigo-400" />
              <span className="text-sm font-bold text-white">
                Generador Multimodal Outbound
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => onOutboundFormatChange("304")}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  outboundFormat === "304"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                304 (Ocean SI + VGM)
              </button>
              <button
                onClick={() => onOutboundFormatChange("310")}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  outboundFormat === "310"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                310 (Ocean Invoice)
              </button>
              <button
                onClick={() => onOutboundFormatChange("IFTMIN")}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  outboundFormat === "IFTMIN"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                IFTMIN
              </button>
              <button
                onClick={() => onOutboundFormatChange("204")}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  outboundFormat === "204"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                204 (Tender)
              </button>
            </div>
          </div>

          {/* 1-Click SCM Pre-fill Dropdown */}
          <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                <Zap size={14} className="text-amber-400" />
                Autocompletar con Expedición SCM Activa (1-Click)
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {scmShipments.length} disponibles
              </span>
            </div>
            <select
              aria-label="Seleccione una expedición operativa para precargar parámetros"
              onChange={(e) => onScmPreFill(e.target.value)}
              defaultValue=""
              className="w-full bg-slate-950 border border-indigo-500/30 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="" disabled>
                Seleccione una expedición operativa para precargar parámetros...
              </option>
              {scmShipments.map((s) => (
                <option key={s.shipmentId} value={s.shipmentId}>
                  {s.shipmentReference || s.shipmentId} •{" "}
                  {s.serviceType || "OCEAN"} • {s.lifecycle || "ACTIVE"}
                </option>
              ))}
            </select>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 mb-1 block">
                Referencia de Booking
              </label>
              <Input
                value={bookingRef}
                onChange={(e: any) => onBookingRefChange(e.target.value)}
                className="bg-slate-950 border-slate-800 font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-400 mb-1 block">
                Nº Contenedor
              </label>
              <Input
                value={containerNum}
                onChange={(e: any) => onContainerNumChange(e.target.value)}
                className="bg-slate-950 border-slate-800 font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 mb-1 block">
                Embarcador (Shipper)
              </label>
              <Input
                value={consignorName}
                onChange={(e: any) => onConsignorNameChange(e.target.value)}
                className="bg-slate-950 border-slate-800"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-400 mb-1 block">
                Consignatario (Consignee)
              </label>
              <Input
                value={consigneeName}
                onChange={(e: any) => onConsigneeNameChange(e.target.value)}
                className="bg-slate-950 border-slate-800"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 mb-1 block">
                Puerto Carga (POL) LOCODE
              </label>
              <Input
                value={originLocode}
                onChange={(e: any) => onOriginLocodeChange(e.target.value)}
                className="bg-slate-950 border-slate-800 font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-400 mb-1 block">
                Puerto Descarga (POD) LOCODE
              </label>
              <Input
                value={destLocode}
                onChange={(e: any) => onDestLocodeChange(e.target.value)}
                className="bg-slate-950 border-slate-800 font-mono"
              />
            </div>

            {/* Specifics for 304 Ocean SI */}
            {outboundFormat === "304" && (
              <>
                <div className="col-span-2 p-3 rounded-2xl bg-slate-950/80 border border-indigo-500/20 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-indigo-300 font-bold text-xs">
                    <Scale size={14} />
                    <span>
                      Declaración Oficial SOLAS VGM (Verified Gross Mass - Regla
                      VI/2)
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">
                        Nº Factura Carrier
                      </label>
                      <Input
                        value={invoiceNumber}
                        onChange={(e: any) =>
                          onInvoiceNumberChange(e.target.value)
                        }
                        className="bg-slate-900 border-slate-800 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">
                        Nº Bill of Lading (B/L)
                      </label>
                      <Input
                        value={billOfLading}
                        onChange={(e: any) =>
                          onBillOfLadingChange(e.target.value)
                        }
                        className="bg-slate-900 border-slate-800 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">
                        Divisa de Facturación
                      </label>
                      <select
                        value={currency}
                        onChange={(e: any) => onCurrencyChange(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-white"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">
                        Masa Bruta (kg)
                      </label>
                      <Input
                        type="number"
                        value={vgmWeightKg}
                        onChange={(e: any) =>
                          onVgmWeightKgChange(Number(e.target.value))
                        }
                        className="bg-slate-900 border-slate-800 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">
                        Método de Pesaje
                      </label>
                      <select
                        value={vgmMethod}
                        onChange={(e: any) => onVgmMethodChange(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-white"
                      >
                        <option value="METHOD_1">
                          Método 1 (Báscula Certificada SM1)
                        </option>
                        <option value="METHOD_2">
                          Método 2 (Cálculo de Bultos SM2)
                        </option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">
                        Declarante Autorizado
                      </label>
                      <Input
                        value={vgmPerson}
                        onChange={(e: any) => onVgmPersonChange(e.target.value)}
                        className="bg-slate-900 border-slate-800 text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 mb-1 block">
                    Nombre del Buque
                  </label>
                  <Input
                    value={vesselName}
                    onChange={(e: any) => onVesselNameChange(e.target.value)}
                    className="bg-slate-950 border-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 mb-1 block">
                    Nº de Viaje (Voyage)
                  </label>
                  <Input
                    value={voyageNum}
                    onChange={(e: any) => onVoyageNumChange(e.target.value)}
                    className="bg-slate-950 border-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 mb-1 block">
                    Nº de Precinto (Seal)
                  </label>
                  <Input
                    value={sealNum}
                    onChange={(e: any) => onSealNumChange(e.target.value)}
                    className="bg-slate-950 border-slate-800 font-mono"
                  />
                </div>
              </>
            )}

            {/* Specifics for 310 Ocean Invoice */}
            {outboundFormat === "310" && (
              <div className="col-span-2 p-3 rounded-2xl bg-slate-950/80 border border-emerald-500/20 flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-xs">
                  <DollarSign size={14} />
                  <span>
                    Desglose de Tarifas Marítimas y Recargos Portuarios
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">
                      Nº Factura Carrier
                    </label>
                    <Input
                      value={invoiceNumber}
                      onChange={(e: any) =>
                        onInvoiceNumberChange(e.target.value)
                      }
                      className="bg-slate-900 border-slate-800 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">
                      Nº Bill of Lading (B/L)
                    </label>
                    <Input
                      value={billOfLading}
                      onChange={(e: any) =>
                        onBillOfLadingChange(e.target.value)
                      }
                      className="bg-slate-900 border-slate-800 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">
                      Divisa de Facturación
                    </label>
                    <select
                      value={currency}
                      onChange={(e: any) => onCurrencyChange(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-white"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">
                      Flete Base 40HC
                    </label>
                    <Input
                      type="number"
                      value={baseFreightRate}
                      onChange={(e: any) =>
                        onBaseFreightRateChange(Number(e.target.value))
                      }
                      className="bg-slate-900 border-slate-800 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">
                      Recargo BAF (Combustible)
                    </label>
                    <Input
                      type="number"
                      value={bafAmount}
                      onChange={(e: any) =>
                        onBafAmountChange(Number(e.target.value))
                      }
                      className="bg-slate-900 border-slate-800 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">
                      Recargo THC (Terminal)
                    </label>
                    <Input
                      type="number"
                      value={thcAmount}
                      onChange={(e: any) =>
                        onThcAmountChange(Number(e.target.value))
                      }
                      className="bg-slate-900 border-slate-800 text-xs font-mono"
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-white/5 text-xs">
                  <span className="text-slate-400">Total Factura Carrier:</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    {(baseFreightRate + bafAmount + thcAmount).toFixed(2)}{" "}
                    {currency}
                  </span>
                </div>
              </div>
            )}

            <div className="col-span-2">
              <label className="text-[11px] font-semibold text-slate-400 mb-1 block">
                Descripción de Carga
              </label>
              <Input
                value={cargoDesc}
                onChange={(e: any) => onCargoDescChange(e.target.value)}
                className="bg-slate-950 border-slate-800"
              />
            </div>
          </div>

          <Button
            onClick={onGenerateOutbound}
            disabled={isGenerating}
            className="mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 text-xs"
          >
            <Zap size={16} />
            {isGenerating
              ? "Generando..."
              : `Generar Documento EDI Outbound (${outboundFormat})`}
          </Button>
        </div>
      </motion.div>

      {/* Right Column: Outbound Preview & Download */}
      <motion.div
        variants={itemVariants}
        className="lg:col-span-6 flex flex-col gap-4"
      >
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col gap-4 min-h-[460px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck size={18} className="text-emerald-400" />
              <span className="text-sm font-bold text-white">
                Vista Previa del Archivo Oficial
              </span>
            </div>
            {outboundResult && (
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => copyToClipboard(outboundResult.rawPayload)}
                  variant="ghost"
                  className="text-xs text-slate-300 hover:text-white flex items-center gap-1.5 p-1.5 h-auto"
                >
                  <Copy size={14} /> Copiar
                </Button>
                <Button
                  onClick={() =>
                    downloadEdiFile(
                      outboundResult.rawPayload,
                      `${outboundFormat}_${bookingRef}.edi`,
                    )
                  }
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 h-auto"
                >
                  <Download size={14} /> Descargar .edi
                </Button>
              </div>
            )}
          </div>

          {!outboundResult ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500 gap-3 border border-dashed border-slate-800 rounded-2xl">
              <Send size={36} className="text-slate-600" />
              <div className="text-sm font-medium">
                Ningún mensaje outbound generado aún.
              </div>
              <div className="text-xs text-slate-500 max-w-sm">
                Complete los campos o seleccione una expedición SCM y presione
                &quot;Generar Documento EDI Outbound&quot;.
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="p-3 bg-slate-950 rounded-2xl border border-white/5 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase">
                    Control Number
                  </span>
                  <div className="font-mono text-indigo-400 font-bold">
                    {outboundResult.controlNumber}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase">
                    Formato
                  </span>
                  <div className="font-bold text-emerald-400">
                    {outboundResult.format}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase">
                    Estado
                  </span>
                  <div className="font-bold text-white">ACKNOWLEDGED</div>
                </div>
              </div>

              <pre className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs font-mono text-slate-200 overflow-x-auto whitespace-pre-wrap max-h-[380px]">
                {outboundResult.rawPayload}
              </pre>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
