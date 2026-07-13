"use client";
import { FileText, Download, Printer, Stamp } from "lucide-react";

import { useAuth } from "./auth/AuthProvider";

interface DocumentPreviewerProps {
  type: "HBL" | "CommercialInvoice" | "CertificateOfOrigin";
  reference: string;
  shipper?: string;
  consignee?: string;
  vessel?: string;
  pol?: string; // Port of Loading
  pod?: string; // Port of Discharge
  marksAndNumbers?: string;
  descriptionOfGoods?: string;
  grossWeight?: string;
  measurement?: string;
  issueDate?: string;
  onDownload?: () => void;
}

const TENANT_HEADERS: Record<string, { name: string; address: string }> = {
  "atlas-spain": {
    name: "ATLAS LOGISTICS SPAIN, S.L.",
    address: "CALLE DE ALCALÁ 1, MADRID, SPAIN",
  },
  "atlas-mexico": {
    name: "ATLAS LOGISTICS MEXICO S.A. DE C.V.",
    address: "PASEO DE LA REFORMA 1, CDMX, MEXICO",
  },
  "atlas-us": {
    name: "ATLAS LOGISTICS USA INC",
    address: "123 PORT ROAD, MIAMI, FL 33132",
  },
  "atlas-default-tenant": {
    name: "ATLAS LOGISTICS INTERNATIONAL",
    address: "GLOBAL HQ, LONDON, UK",
  },
};

export function DocumentPreviewer(props: DocumentPreviewerProps) {
  const { tenantId } = useAuth();
  const header =
    TENANT_HEADERS[tenantId || "atlas-default-tenant"] ||
    TENANT_HEADERS["atlas-default-tenant"];

  // Safe extractors
  const polCountry = props.pol?.includes(",") ? props.pol.split(",")[1]?.trim() : props.pol;
  const polCity = props.pol?.includes(",") ? props.pol.split(",")[0]?.trim() : props.pol;
  const bkgRef = props.reference?.includes("-") ? props.reference.split("-")[1] : props.reference;

  return (
    <div className="bg-slate-200 rounded-lg p-1 max-w-4xl mx-auto shadow-2xl overflow-auto h-full">
      {/* Viewer Toolbar */}
      <div className="bg-slate-800 text-slate-300 px-4 py-2 flex justify-between items-center rounded-t-md">
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-blue-400" />
          <span className="font-semibold text-sm">
            {props.type === "HBL"
              ? "House Bill of Lading"
              : props.type === "CommercialInvoice"
                ? "Commercial Invoice"
                : "Certificate of Origin"}
            - {props.reference || "DRAFT"}.pdf
          </span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={props.onDownload}
            className="hover:text-white transition-colors"
            title="Download PDF"
          >
            <Download size={18} />
          </button>
          <button className="hover:text-white transition-colors" title="Print">
            <Printer size={18} />
          </button>
        </div>
      </div>

      {/* A4 Paper Canvas */}
      <div className="bg-white text-slate-900 mx-auto mt-2 mb-2 min-h-[842px] w-full max-w-[595px] p-8 shadow-sm relative font-sans text-sm border border-slate-300">
        {/* Mock Watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
          <Stamp size={400} />
        </div>

        {/* Header */}
        <div className="text-center mb-8 border-b-2 border-slate-900 pb-4">
          <h1 className="text-2xl font-bold uppercase tracking-widest">
            {props.type === "HBL"
              ? "Bill of Lading"
              : props.type === "CommercialInvoice"
                ? "Commercial Invoice"
                : "Certificate of Origin"}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            NON-NEGOTIABLE WAYBILL UNLESS CONSIGNED TO ORDER
          </p>
          <div className="absolute top-8 right-8 text-right">
            <p className="text-[10px] font-bold text-slate-500 uppercase">
              Document No.
            </p>
            <p className="text-lg font-mono font-bold text-red-600">
              {props.reference}
            </p>
          </div>
        </div>

        {/* Grid Layout for B/L standard format */}
        <div className="grid grid-cols-2 border border-slate-900 mb-4">
          {/* Left Column */}
          <div className="border-r border-slate-900">
            <div className="border-b border-slate-900 p-2 h-24">
              <span className="text-[10px] font-bold uppercase">
                1. Shipper / Exporter
              </span>
              <p className="text-xs mt-1 whitespace-pre-wrap">
                {props.shipper || "N/A"}
              </p>
            </div>
            <div className="border-b border-slate-900 p-2 h-24">
              <span className="text-[10px] font-bold uppercase">
                2. Consignee
              </span>
              <p className="text-xs mt-1 whitespace-pre-wrap">
                {props.consignee || "N/A"}
              </p>
            </div>
            <div className="p-2 h-16">
              <span className="text-[10px] font-bold uppercase">
                3. Notify Party
              </span>
              <p className="text-xs mt-1">SAME AS CONSIGNEE</p>
            </div>
          </div>

          {/* Right Column */}
          <div>
            <div className="border-b border-slate-900 p-2 h-24">
              <span className="text-[10px] font-bold uppercase">
                4. Booking Reference
              </span>
              <p className="text-xs font-mono mt-1">BKG-{bkgRef || "PENDING"}</p>
            </div>
            <div className="border-b border-slate-900 p-2 h-24 bg-slate-50">
              <span className="text-[10px] font-bold uppercase">
                5. Forwarding Agent
              </span>
              <p className="text-xs mt-1 font-bold">
                {header.name}
                <br />
                {header.address}
              </p>
            </div>
            <div className="p-2 h-16">
              <span className="text-[10px] font-bold uppercase">
                6. Point and Country of Origin
              </span>
              <p className="text-xs mt-1">{polCountry || props.pol || "N/A"}</p>
            </div>
          </div>
        </div>

        {/* Routing Details */}
        <div className="grid grid-cols-4 border border-slate-900 mb-4 text-xs">
          <div className="border-r border-slate-900 p-2">
            <span className="text-[9px] font-bold uppercase">
              Pre-Carriage by
            </span>
            <p className="mt-1">N/A</p>
          </div>
          <div className="border-r border-slate-900 p-2">
            <span className="text-[9px] font-bold uppercase">
              Place of Receipt
            </span>
            <p className="mt-1">{props.pol || "N/A"}</p>
          </div>
          <div className="border-r border-slate-900 p-2 bg-slate-50">
            <span className="text-[9px] font-bold uppercase">
              Vessel / Voyage
            </span>
            <p className="mt-1 font-bold">{props.vessel || "N/A"}</p>
          </div>
          <div className="p-2">
            <span className="text-[9px] font-bold uppercase">
              Port of Loading
            </span>
            <p className="mt-1">{props.pol || "N/A"}</p>
          </div>
          <div className="border-t border-r border-slate-900 p-2">
            <span className="text-[9px] font-bold uppercase">
              Port of Discharge
            </span>
            <p className="mt-1">{props.pod || "N/A"}</p>
          </div>
          <div className="border-t border-r border-slate-900 p-2">
            <span className="text-[9px] font-bold uppercase">
              Place of Delivery
            </span>
            <p className="mt-1">{props.pod || "N/A"}</p>
          </div>
          <div className="border-t border-slate-900 p-2 col-span-2">
            <span className="text-[9px] font-bold uppercase">
              Final Destination
            </span>
            <p className="mt-1">{props.pod || "N/A"}</p>
          </div>
        </div>

        {/* Cargo Details */}
        <div className="border border-slate-900 min-h-[300px] flex flex-col">
          <div className="grid grid-cols-12 border-b border-slate-900 text-[10px] font-bold uppercase bg-slate-100 divide-x divide-slate-900">
            <div className="col-span-3 p-1.5 text-center">Marks & Numbers</div>
            <div className="col-span-2 p-1.5 text-center">No. of Pkgs</div>
            <div className="col-span-4 p-1.5 text-center">
              Description of Goods
            </div>
            <div className="col-span-1 p-1.5 text-center">Gross Wt</div>
            <div className="col-span-2 p-1.5 text-center">Measurement</div>
          </div>
          <div className="grid grid-cols-12 flex-1 divide-x divide-slate-900 text-xs">
            <div className="col-span-3 p-2 font-mono whitespace-pre-wrap">
              {props.marksAndNumbers || "N/M"}
            </div>
            <div className="col-span-2 p-2 text-center">1 CONTAINER</div>
            <div className="col-span-4 p-2 whitespace-pre-wrap">
              <span className="font-bold">"FREIGHT PREPAID"</span>
              <br />
              <br />
              {props.descriptionOfGoods || "CONSOLIDATED CARGO"}
            </div>
            <div className="col-span-1 p-2 text-right">
              {props.grossWeight || "0 KGS"}
            </div>
            <div className="col-span-2 p-2 text-right">
              {props.measurement || "0 CBM"}
            </div>
          </div>
        </div>

        {/* Footer Signatures */}
        <div className="grid grid-cols-2 mt-8 text-xs">
          <div>
            <p className="mb-8">
              Laden on Board Date:{" "}
              <span className="font-mono">{props.issueDate || "N/A"}</span>
            </p>
            <div className="border-t border-slate-400 w-48 pt-1">
              <p className="text-[10px] uppercase">Shipper's Signature</p>
            </div>
          </div>
          <div className="text-right flex flex-col items-end">
            <p className="mb-8">
              Place and Date of Issue:{" "}
              <span className="font-mono">
                {polCity || "N/A"}, {props.issueDate || "N/A"}
              </span>
            </p>
            <div className="border-t border-slate-400 w-64 pt-1 text-center">
              <p className="text-[10px] uppercase">
                Signed on behalf of Carrier / Agent
              </p>
              <p className="font-bold mt-1 text-blue-900 font-serif italic">
                {header.name}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
