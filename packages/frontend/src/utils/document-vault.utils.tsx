import React from "react";
import {
  FileText,
  ShieldCheck,
  Ship,
  Plane,
  Truck,
  TrainTrack,
  FileCheck,
  Snowflake,
  Leaf,
  Anchor,
  FileSignature,
  ShieldAlert,
  AlertTriangle,
} from "lucide-react";
import {
  extractCommercialInvoice,
  extractPackingList,
  extractTransportDocument,
  extractCustomsDeclaration,
  SAMPLE_INVOICE_TEXT,
  SAMPLE_PACKING_LIST_TEXT,
  SAMPLE_TRANSPORT_TEXT,
  SAMPLE_DECLARATION_TEXT,
  CommercialInvoiceData,
  PackingListData,
  TransportDocumentData,
  CustomsDeclarationData,
} from "@atlas/shared";
import type { AuditDocItem } from "../types/document-vault.types";

export interface ShipmentAuditBundle {
  invData: CommercialInvoiceData;
  plData: PackingListData;
  trData: TransportDocumentData;
  decData: CustomsDeclarationData;
}

export function buildAuditShipmentDocuments(
  docs: AuditDocItem[],
): ShipmentAuditBundle {
  const invDoc = docs.find((d) => d.type === "INVOICE");
  const plDoc = docs.find(
    (d) => d.type === "VGM_CERTIFICATE" || d.type === "PACKING_LIST",
  );
  const trDoc = docs.find(
    (d) =>
      d.type === "HBL" ||
      d.type === "BILL_OF_LADING" ||
      d.type === "ECMR" ||
      d.type === "AWB" ||
      d.type === "CIM",
  );
  const decDoc = docs.find((d) => d.type === "DUA");

  const invPayload = (invDoc?.payloadData || {}) as Record<string, unknown>;
  const invData: CommercialInvoiceData = invDoc?.payloadData
    ? {
        invoiceNumber: String(
          invPayload.invoiceNumber ||
            invDoc.documentReference ||
            "INV-2026-98124",
        ),
        invoiceDate: "2026-09-24",
        sellerName: String(invPayload.seller || "Iberia Global Exports S.L."),
        sellerTaxId: "ESA50119988",
        buyerName: String(invPayload.buyer || "American Logistic Hub LLC"),
        buyerTaxId: "US99182341",
        currency: String(invPayload.currency || "EUR"),
        incoterm: "CIF",
        totalFobUsd: 138000,
        freightUsd: 5500,
        insuranceUsd: 1500,
        totalCifUsd: Number(invPayload.totalAmount) || 145000,
        lineItems:
          (invPayload.lineItems as CommercialInvoiceData["lineItems"]) || [
            {
              description: "Industrial Robotics and Precision Tooling Set A",
              hsCode: "8479.89",
              quantity: 520,
              unitPrice: 278.85,
              totalAmount: 145000,
            },
          ],
      }
    : extractCommercialInvoice(SAMPLE_INVOICE_TEXT).extractedFields;

  const plData: PackingListData = plDoc?.payloadData
    ? {
        packingListNumber: plDoc.documentReference || "PL-2026-8819",
        invoiceReference: invData.invoiceNumber,
        totalPackages: plDoc.payloadData.packages || 520,
        packageType: "Pallets / Wooden Crates",
        grossWeightKg:
          plDoc.payloadData.verifiedGrossMassKg ||
          plDoc.payloadData.grossWeightKg ||
          28450,
        netWeightKg: plDoc.payloadData.netCargoWeightKg || 24630,
        totalCbm: 42.5,
        containerNumber: plDoc.payloadData.containerNumber || "MSKU9284712",
        sealNumber: plDoc.payloadData.sealNumber || "ISO-17712-H-881920",
      }
    : extractPackingList(SAMPLE_PACKING_LIST_TEXT).extractedFields;

  const trData: TransportDocumentData = trDoc?.payloadData
    ? {
        documentNumber: trDoc.documentReference || "HBL-2026-0081",
        documentType: "BILL_OF_LADING",
        carrierName: trDoc.payloadData.vessel
          ? "Maersk Line / MSC"
          : "Mediterranean Shipping Co",
        originPortOrHub:
          trDoc.payloadData.portOfLoading || "Puerto de Valencia (ESVLC)",
        destinationPortOrHub:
          trDoc.payloadData.portOfDischarge ||
          "New York Container Terminal (USNYC)",
        vesselOrVehicle: trDoc.payloadData.vessel || "MSC ISABELLA",
        voyageOrPlateNumber: trDoc.payloadData.voyage || "VOY-2026-88",
        declaredGrossWeightKg: trDoc.payloadData.grossWeightKg || 28450,
        containerNumber: trDoc.payloadData.containerNumber || "MSKU9284712",
        sealNumber: trDoc.payloadData.sealNumber || "ISO-17712-H-881920",
        issueDate: "2026-09-24",
      }
    : extractTransportDocument(SAMPLE_TRANSPORT_TEXT).extractedFields;

  const decPayload = (decDoc?.payloadData || {}) as Record<string, unknown>;
  const duties = Number(decPayload.dutiesPayableEur) || 6853;
  const vat = Number(decPayload.vatPayableEur) || 33422;
  const decData: CustomsDeclarationData = decDoc?.payloadData
    ? {
        declarationNumber: String(
          decPayload.duaNumber ||
            decDoc.documentReference ||
            "26ES004129988102B",
        ),
        customsOffice: String(
          decPayload.customsOffice || "ES004611 - Aduana Marítima de Valencia",
        ),
        patentNumber: "4192",
        importerTaxId: "ESA50119988",
        importerCompanyName: String(
          decPayload.importer || "Iberia Global Exports S.L.",
        ),
        regimenType: String(decPayload.regime || "4000"),
        primaryHsCode: "8479.89",
        declaredCustomsValueUsd: Number(decPayload.customsValueEur) || 152300,
        taxes: {
          dtaUsd: 1450,
          igiUsd: duties,
          ivaUsd: vat,
          totalTaxesUsd: duties + vat + 1450,
        },
        electronicSignature: {
          sha256Seal:
            "f6b890a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9",
          certificateSerial: "CERT-AEAT-OEA-ESP-2026-4192",
          isValid: true,
          verificationTimestamp: "2026-09-24T18:00:00Z",
        },
      }
    : extractCustomsDeclaration(SAMPLE_DECLARATION_TEXT).extractedFields;

  return { invData, plData, trData, decData };
}

export const getDocumentTypeIcon = (type: string): React.ReactNode => {
  switch (type) {
    case "HBL":
      return <Ship className="text-blue-400" size={18} />;
    case "DUA":
      return <FileCheck className="text-amber-400" size={18} />;
    case "ECMR":
      return <Truck className="text-emerald-400" size={18} />;
    case "AWB":
      return <Plane className="text-indigo-400" size={18} />;
    case "CIM":
      return <TrainTrack className="text-orange-400" size={18} />;
    case "INSURANCE_CERT":
      return <ShieldCheck className="text-teal-400" size={18} />;
    case "CONTRACT":
      return <FileSignature className="text-cyan-400" size={18} />;
    case "GDP_CERT":
      return <Snowflake className="text-sky-400" size={18} />;
    case "CBAM_DECLARATION":
      return <Leaf className="text-lime-400" size={18} />;
    case "DGR_DECLARATION":
      return <AlertTriangle className="text-red-400" size={18} />;
    case "AEO_7POINT":
      return <ShieldAlert className="text-violet-400" size={18} />;
    case "LAYTIME_SHEET":
      return <Anchor className="text-amber-500" size={18} />;
    default:
      return <FileText className="text-slate-400" size={18} />;
  }
};
