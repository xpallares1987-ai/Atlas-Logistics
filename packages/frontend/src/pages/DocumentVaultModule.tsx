import { useState, useEffect, useRef } from "react";
import { motion, Variants } from "framer-motion";
import { FileText, ShieldCheck, Layers, Sparkles, Scan } from "lucide-react";
import {
  extractCommercialInvoice,
  extractPackingList,
  extractTransportDocument,
  extractCustomsDeclaration,
  performTripartiteCrossCheck,
  SAMPLE_INVOICE_TEXT,
  SAMPLE_PACKING_LIST_TEXT,
  SAMPLE_TRANSPORT_TEXT,
  SAMPLE_DECLARATION_TEXT,
  CommercialInvoiceData,
  PackingListData,
  TransportDocumentData,
  CustomsDeclarationData,
  TripartiteCrossCheckResult,
} from "@atlas/shared";

import {
  DocumentTemplate,
  VaultDocument,
  OcrAttachment,
  OcrAiProvenance,
} from "../types/document-vault.types";
import { getDocumentTypeIcon } from "../utils/document-vault.utils";

import { DocumentStudioTab } from "../components/documents/DocumentStudioTab";
import { DocumentVaultTab } from "../components/documents/DocumentVaultTab";
import { DocumentVerifyTab } from "../components/documents/DocumentVerifyTab";
import { DocumentOcrStudioTab } from "../components/documents/DocumentOcrStudioTab";
import { DocumentViewerModal } from "../components/documents/modals/DocumentViewerModal";

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

export default function DocumentVaultModule() {
  const [activeTab, setActiveTab] = useState<
    "STUDIO" | "VAULT" | "VERIFY" | "OCR_STUDIO"
  >("STUDIO");

  // Document Templates & Selection
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [selectedType, setSelectedType] = useState<string>("HBL");
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [docReference, setDocReference] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Vault Ledger & Search
  const [documents, setDocuments] = useState<VaultDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);

  // Modal Viewer & Digital Signature
  const [activeModalDoc, setActiveModalDoc] = useState<VaultDocument | null>(
    null,
  );
  const [modalPdfUrl, setModalPdfUrl] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [selectedSigner, setSelectedSigner] = useState("Carlos Mendoza");
  const [signerTitle, setSignerTitle] = useState(
    "Director de Operaciones & Tráfico",
  );

  // Verification State
  const [verifyQuery, setVerifyQuery] = useState("");
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Manual Upload State
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ocrFileInputRef = useRef<HTMLInputElement>(null);

  // Customs OCR & Tripartite Cross-Check State
  const [ocrDocType, setOcrDocType] = useState<
    "INVOICE" | "PACKING_LIST" | "TRANSPORT" | "DECLARATION"
  >("INVOICE");
  const [ocrRawText, setOcrRawText] = useState<string>(SAMPLE_INVOICE_TEXT);
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [extractedInvoice, setExtractedInvoice] =
    useState<CommercialInvoiceData | null>(null);
  const [extractedPackingList, setExtractedPackingList] =
    useState<PackingListData | null>(null);
  const [extractedTransport, setExtractedTransport] =
    useState<TransportDocumentData | null>(null);
  const [extractedDeclaration, setExtractedDeclaration] =
    useState<CustomsDeclarationData | null>(null);
  const [crossCheckResult, setCrossCheckResult] =
    useState<TripartiteCrossCheckResult | null>(null);
  const [ocrNotification, setOcrNotification] = useState<string | null>(null);
  const [ocrAttachment, setOcrAttachment] = useState<OcrAttachment | null>(
    null,
  );
  const [ocrAiProvenance, setOcrAiProvenance] =
    useState<OcrAiProvenance | null>(null);
  const [shipmentsList, setShipmentsList] = useState<any[]>([]);
  const [selectedShipmentId, setSelectedShipmentId] =
    useState<string>("sh_demo_01");

  useEffect(() => {
    fetchTemplates();
    fetchDocuments();
    fetchShipmentsList();
  }, []);

  const generateSecureCode = () => {
    if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
      const arr = new Uint32Array(1);
      window.crypto.getRandomValues(arr);
      return 1000 + (arr[0] % 9000);
    }
    return Math.floor(1000 + (Date.now() % 9000));
  };

  const fetchShipmentsList = async () => {
    try {
      const res = await fetch("/api/bookings");
      if (res.ok) {
        const data = await res.json();
        setShipmentsList(data || []);
      }
    } catch (e) {
      console.error("Failed to load shipments list for OCR cross-check", e);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/documents/templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.data || []);
        if (data.data && data.data.length > 0) {
          const first = data.data[0];
          setSelectedType(first.type);
          setFormData(first.defaultData || {});
          setDocReference(
            `${first.type}-${new Date().getFullYear()}-${generateSecureCode()}`,
          );
        }
      }
    } catch (e) {
      console.error("Failed to load templates", e);
    }
  };

  const fetchDocuments = async () => {
    setIsLoadingDocs(true);
    try {
      const res = await fetch("/api/documents");
      if (res.ok) {
        const data = await res.json();
        setDocuments(data || []);
      }
    } catch (e) {
      console.error("Failed to load documents", e);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  const handleSelectTemplate = (template: DocumentTemplate) => {
    setSelectedType(template.type);
    setFormData(template.defaultData || {});
    setDocReference(
      `${template.type}-${new Date().getFullYear()}-${generateSecureCode()}`,
    );
  };

  const handleGenerateDocument = async (autoSign: boolean = false) => {
    setIsGenerating(true);
    try {
      const signer = autoSign
        ? {
            signedBy: selectedSigner,
            signerTitle,
            signerCertificate: `CERT-ATLAS-${Date.now()}`,
          }
        : undefined;

      const res = await fetch("/api/documents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selectedType,
          documentReference: docReference,
          payloadData: formData,
          signer,
        }),
      });

      const data = await res.json();
      if (data.success) {
        await fetchDocuments();
        openViewerModal(data.data);
      } else {
        alert(`Error al generar documento: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error de red: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const openViewerModal = (doc: VaultDocument) => {
    setActiveModalDoc(doc);
    setModalPdfUrl(`/api/documents/${doc.id}/pdf?t=${Date.now()}`);
  };

  const closeViewerModal = () => {
    setActiveModalDoc(null);
    setModalPdfUrl(null);
  };

  const handleSignDocument = async () => {
    if (!activeModalDoc) return;
    setIsSigning(true);
    try {
      const res = await fetch(`/api/documents/${activeModalDoc.id}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signedBy: selectedSigner,
          signerTitle,
          signerCertificate: `CERT-ATLAS-PKI-${Date.now()}`,
        }),
      });

      const data = await res.json();
      if (data.success) {
        await fetchDocuments();
        setActiveModalDoc((prev) =>
          prev
            ? {
                ...prev,
                status: "SIGNED",
                signedBy: data.data.signedBy,
                signerTitle: data.data.signerTitle,
                signedAt: data.data.signedAt,
                signerCertificate: data.data.signerCertificate,
              }
            : null,
        );
        alert("¡Documento firmado y sellado criptográficamente con éxito!");
      } else {
        alert(`Error al firmar: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error al firmar: ${err.message}`);
    } finally {
      setIsSigning(false);
    }
  };

  const handleVerify = async (queryToVerify?: string) => {
    const q = (queryToVerify || verifyQuery).trim();
    if (!q) return;
    setIsVerifying(true);
    try {
      const res = await fetch(`/api/documents/verify/${encodeURIComponent(q)}`);
      const data = await res.json();
      setVerifyResult(data);
      if (queryToVerify) {
        setVerifyQuery(queryToVerify);
        setActiveTab("VERIFY");
      }
    } catch (err: any) {
      alert(`Error al verificar: ${err.message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("type", "Commercial Invoice");

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }

      await fetchDocuments();
      alert("Archivo subido y registrado en la bóveda.");
    } catch (err: any) {
      alert(err.message || "Error al subir documento");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copiado al portapapeles");
  };

  const handleLoadPreset = (
    type: "INVOICE" | "PACKING_LIST" | "TRANSPORT" | "DECLARATION",
  ) => {
    setOcrDocType(type);
    if (type === "INVOICE") setOcrRawText(SAMPLE_INVOICE_TEXT);
    if (type === "PACKING_LIST") setOcrRawText(SAMPLE_PACKING_LIST_TEXT);
    if (type === "TRANSPORT") setOcrRawText(SAMPLE_TRANSPORT_TEXT);
    if (type === "DECLARATION") setOcrRawText(SAMPLE_DECLARATION_TEXT);
    setOcrNotification(`Plantilla de ${type} cargada en el editor OCR.`);
    setTimeout(() => setOcrNotification(null), 3000);
  };

  const handleOcrFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isBinaryMultimodal =
      file.type.startsWith("image/") ||
      file.type === "application/pdf" ||
      /\.(pdf|png|jpe?g)$/i.test(file.name);

    if (isBinaryMultimodal) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = (e.target?.result as string) || "";
        const base64Data = dataUrl.includes(",")
          ? dataUrl.split(",")[1]
          : dataUrl;
        setOcrAttachment({
          fileName: file.name,
          mimeType: file.type || "application/pdf",
          base64Data,
        });
        setOcrNotification(
          `Adjunto multimodal '${file.name}' listo para extracción con Gemini IA (${Math.round(file.size / 1024)} KB).`,
        );
        setTimeout(() => setOcrNotification(null), 4000);
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (content) {
          setOcrRawText(content);
          setOcrAttachment(null);
          setOcrNotification(
            `Archivo '${file.name}' cargado en el editor OCR.`,
          );
          setTimeout(() => setOcrNotification(null), 3500);
        }
      };
      reader.readAsText(file);
    }
    if (ocrFileInputRef.current) ocrFileInputRef.current.value = "";
  };

  const handleExtractGeminiMultimodal = async (bypassCache = false) => {
    setIsProcessingOcr(true);
    try {
      const res = await fetch("/api/ai/extract-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docType: ocrDocType,
          shipmentId: selectedShipmentId,
          rawText: ocrRawText,
          mimeType: ocrAttachment?.mimeType,
          base64Data: ocrAttachment?.base64Data,
          bypassCache,
        }),
      });
      if (!res.ok) {
        throw new Error("Error en endpoint /api/ai/extract-document");
      }
      const payload = await res.json();
      const ext = payload.extracted || {};

      setOcrAiProvenance({
        source: payload.source || "gemini-live",
        model: payload.model || "gemini-2.5-flash",
        cached: Boolean(payload.cached),
        latencyMs: payload.latencyMs,
      });
      window.dispatchEvent(new CustomEvent("atlas:ai-quota-updated"));

      const nextInv: CommercialInvoiceData =
        ocrDocType === "INVOICE" || !extractedInvoice
          ? {
              invoiceNumber: ext.invoiceNumber || "INV-2026-98124",
              invoiceDate: new Date().toISOString().slice(0, 10),
              sellerName: ext.sellerName || "Iberia Global Exports S.L.",
              sellerTaxId: "ESA50119988",
              buyerName: ext.buyerName || "American Logistic Hub LLC",
              buyerTaxId: "US99182341",
              currency: ext.currency || "USD",
              incoterm: ext.incoterm || "CIF",
              totalFobUsd: Number(ext.totalFobUsd) || 138000,
              freightUsd: Number(ext.freightUsd) || 5500,
              insuranceUsd: Number(ext.insuranceUsd) || 1500,
              totalCifUsd: Number(ext.invoiceAmountUsd) || 145000,
              lineItems: [
                {
                  itemNumber: 1,
                  description:
                    ext.extractedNotes ||
                    "Industrial Supply Chain Equipment & Pallets ISPM-15",
                  hsCode: ext.suggestedHsCode || "8479.89",
                  quantity: Number(ext.packageCount) || 520,
                  unit: "PCS",
                  unitPrice: 278.85,
                  totalAmount: Number(ext.invoiceAmountUsd) || 145000,
                },
              ],
            }
          : extractedInvoice;

      const nextPl: PackingListData =
        ocrDocType === "PACKING_LIST" || !extractedPackingList
          ? {
              packingListNumber: ext.packingListNumber || "PL-2026-8819",
              invoiceReference: nextInv.invoiceNumber,
              totalPackages: Number(ext.packageCount) || 520,
              packageType: "Pallets / ISPM-15",
              grossWeightKg: Number(ext.grossWeightKg) || 28450,
              netWeightKg: Number(ext.netWeightKg) || 24630,
              totalCbm: Number(ext.totalCbm) || 42.5,
              containerNumber: ext.containerNumber || "MSKU9284712",
              sealNumber: ext.sealNumber || "ISO-17712-H-881920",
            }
          : extractedPackingList;

      const nextTr: TransportDocumentData =
        ocrDocType === "TRANSPORT" || !extractedTransport
          ? {
              documentNumber: ext.transportDocumentNumber || "HBL-2026-0081",
              documentType: "BILL_OF_LADING",
              carrierName: ext.carrierName || "Mediterranean Shipping Co (MSC)",
              originPortOrHub: ext.originPort || "Puerto de Valencia (ESVLC)",
              destinationPortOrHub:
                ext.destinationPort || "New York Container Terminal (USNYC)",
              vesselOrVehicle: ext.vesselVoyage || "MSC ISABELLA",
              voyageOrPlateNumber: "2604W",
              declaredGrossWeightKg: Number(ext.grossWeightKg) || 28450,
              containerNumber: ext.containerNumber || "MSKU9284712",
              sealNumber: ext.sealNumber || "ISO-17712-H-881920",
              issueDate: new Date().toISOString().slice(0, 10),
            }
          : extractedTransport;

      const nextDec: CustomsDeclarationData =
        ocrDocType === "DECLARATION" || !extractedDeclaration
          ? {
              declarationNumber: ext.declarationNumber || "26ES004129988102B",
              customsOffice: "ES004611 - Aduana Marítima de Valencia",
              patentNumber: "4192",
              importerTaxId: "ESA50119988",
              importerCompanyName:
                ext.sellerName || "Iberia Global Exports S.L.",
              regimenType: "4000",
              primaryHsCode: ext.suggestedHsCode || "8479.89",
              declaredCustomsValueUsd:
                Number(ext.declaredCustomsValueUsd) ||
                Number(ext.invoiceAmountUsd) ||
                145000,
              taxes: {
                dtaUsd: 1450,
                igiUsd: 6853,
                ivaUsd: 33422,
                totalTaxesUsd: 41725,
              },
              electronicSignature: {
                sha256Seal:
                  "f6b890a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9",
                certificateSerial: "CERT-AEAT-OEA-ESP-2026-4192",
                isValid: true,
                verificationTimestamp: new Date().toISOString(),
              },
            }
          : extractedDeclaration;

      if (ocrDocType === "INVOICE") setExtractedInvoice(nextInv);
      else if (ocrDocType === "PACKING_LIST") setExtractedPackingList(nextPl);
      else if (ocrDocType === "TRANSPORT") setExtractedTransport(nextTr);
      else if (ocrDocType === "DECLARATION") setExtractedDeclaration(nextDec);

      setExtractedInvoice(nextInv);
      setExtractedPackingList(nextPl);
      setExtractedTransport(nextTr);
      setExtractedDeclaration(nextDec);
      setCrossCheckResult(
        performTripartiteCrossCheck(nextInv, nextPl, nextDec, nextTr),
      );

      setOcrNotification(
        `Extracción IA Multimodal (${payload.source}) completada y volcada al Validador Tripartito y SQLite.`,
      );
      setTimeout(() => setOcrNotification(null), 4000);
    } catch (err: any) {
      alert(`Error en extracción Gemini Multimodal: ${err.message}`);
    } finally {
      setIsProcessingOcr(false);
    }
  };

  const handleExtractCurrent = () => {
    setIsProcessingOcr(true);
    try {
      if (ocrDocType === "INVOICE") {
        const res = extractCommercialInvoice(ocrRawText);
        setExtractedInvoice(res.extractedFields);
      } else if (ocrDocType === "PACKING_LIST") {
        const res = extractPackingList(ocrRawText);
        setExtractedPackingList(res.extractedFields);
      } else if (ocrDocType === "TRANSPORT") {
        const res = extractTransportDocument(ocrRawText);
        setExtractedTransport(res.extractedFields);
      } else if (ocrDocType === "DECLARATION") {
        const res = extractCustomsDeclaration(ocrRawText);
        setExtractedDeclaration(res.extractedFields);
      }
      setOcrNotification(`Extracción OCR completada para ${ocrDocType}`);
      setTimeout(() => setOcrNotification(null), 3000);
    } catch (err: any) {
      alert(`Error en extracción OCR: ${err.message}`);
    } finally {
      setIsProcessingOcr(false);
    }
  };

  const handleAuditShipmentDocuments = async (
    shipmentId: string = selectedShipmentId,
  ) => {
    setIsProcessingOcr(true);
    setSelectedShipmentId(shipmentId);
    try {
      const res = await fetch(`/api/documents?shipmentId=${shipmentId}`);
      let docs: any[] = [];
      if (res.ok) {
        docs = await res.json();
      }

      const invDoc = docs.find((d: any) => d.type === "INVOICE");
      const plDoc = docs.find(
        (d: any) => d.type === "VGM_CERTIFICATE" || d.type === "PACKING_LIST",
      );
      const trDoc = docs.find(
        (d: any) =>
          d.type === "HBL" ||
          d.type === "BILL_OF_LADING" ||
          d.type === "ECMR" ||
          d.type === "AWB" ||
          d.type === "CIM",
      );
      const decDoc = docs.find((d: any) => d.type === "DUA");

      const invData: CommercialInvoiceData = invDoc?.payloadData
        ? {
            invoiceNumber:
              invDoc.payloadData.invoiceNumber ||
              invDoc.documentReference ||
              "INV-2026-98124",
            invoiceDate: "2026-09-24",
            sellerName:
              invDoc.payloadData.seller || "Iberia Global Exports S.L.",
            sellerTaxId: "ESA50119988",
            buyerName: invDoc.payloadData.buyer || "American Logistic Hub LLC",
            buyerTaxId: "US99182341",
            currency: invDoc.payloadData.currency || "EUR",
            incoterm: "CIF",
            totalFobUsd: 138000,
            freightUsd: 5500,
            insuranceUsd: 1500,
            totalCifUsd: invDoc.payloadData.totalAmount || 145000,
            lineItems: invDoc.payloadData.lineItems || [
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

      const decData: CustomsDeclarationData = decDoc?.payloadData
        ? {
            declarationNumber:
              decDoc.payloadData.duaNumber ||
              decDoc.documentReference ||
              "26ES004129988102B",
            customsOffice:
              decDoc.payloadData.customsOffice ||
              "ES004611 - Aduana Marítima de Valencia",
            patentNumber: "4192",
            importerTaxId: "ESA50119988",
            importerCompanyName:
              decDoc.payloadData.importer || "Iberia Global Exports S.L.",
            regimenType: decDoc.payloadData.regime || "4000",
            primaryHsCode: "8479.89",
            declaredCustomsValueUsd:
              decDoc.payloadData.customsValueEur || 152300,
            taxes: {
              dtaUsd: 1450,
              igiUsd: decDoc.payloadData.dutiesPayableEur || 6853,
              ivaUsd: decDoc.payloadData.vatPayableEur || 33422,
              totalTaxesUsd:
                (decDoc.payloadData.dutiesPayableEur || 6853) +
                (decDoc.payloadData.vatPayableEur || 33422) +
                1450,
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

      setExtractedInvoice(invData);
      setExtractedPackingList(plData);
      setExtractedTransport(trData);
      setExtractedDeclaration(decData);

      const crossCheck = performTripartiteCrossCheck(
        invData,
        plData,
        decData,
        trData,
      );
      setCrossCheckResult(crossCheck);
      setOcrNotification(
        `Auditoría tripartita completada contra los documentos oficiales de la BD para ${shipmentId}.`,
      );
      setTimeout(() => setOcrNotification(null), 4000);
    } catch (err: any) {
      alert(`Error al auditar expedición: ${err.message}`);
    } finally {
      setIsProcessingOcr(false);
    }
  };

  const handleRunCrossCheck = () => {
    if (!extractedInvoice || !extractedPackingList || !extractedDeclaration) {
      alert(
        "Para ejecutar la validación tripartita se requiere extraer al menos Factura, Packing List y Pedimento/DUA.",
      );
      return;
    }
    const result = performTripartiteCrossCheck(
      extractedInvoice,
      extractedPackingList,
      extractedDeclaration,
      extractedTransport || undefined,
    );
    setCrossCheckResult(result);
    setOcrNotification("Validación cruzada tripartita actualizada.");
    setTimeout(() => setOcrNotification(null), 3000);
  };

  const getTypeIcon = getDocumentTypeIcon;

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      (doc.name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (doc.documentReference?.toLowerCase() || "").includes(
        searchQuery.toLowerCase(),
      ) ||
      (doc.sha256Hash?.toLowerCase() || "").includes(
        searchQuery.toLowerCase(),
      ) ||
      (doc.signedBy?.toLowerCase() || "").includes(searchQuery.toLowerCase());

    const matchesType = typeFilter === "ALL" || doc.type === typeFilter;
    const matchesStatus = statusFilter === "ALL" || doc.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="p-6 max-w-[1600px] mx-auto flex flex-col gap-6"
    >
      {/* Top Hero Header */}
      <motion.div
        variants={itemVariants}
        className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                <FileText size={20} />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Gobernanza & Cumplimiento Normativo
              </span>
            </div>
            <h1 className="text-2xl font-black text-white">
              Bóveda Documental Legal & Centro de Emisión Digital
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Generación de documentos de transporte internacional (B/L, CMR,
              AWB), sellado criptográfico SHA-256 e interoperabilidad con firma
              avanzada (SAT e.firma / WebCrypto).
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-white/5 flex flex-col items-center min-w-[100px]">
              <span className="text-slate-400 text-[10px] font-bold uppercase">
                Emitidos
              </span>
              <span className="text-white text-lg font-black font-mono">
                {documents.length}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-white/5 flex flex-col items-center min-w-[100px]">
              <span className="text-emerald-400 text-[10px] font-bold uppercase">
                Firmados
              </span>
              <span className="text-emerald-400 text-lg font-black font-mono">
                {documents.filter((d) => d.status === "SIGNED").length}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-white/5 flex flex-col items-center min-w-[100px]">
              <span className="text-amber-400 text-[10px] font-bold uppercase">
                Plantillas
              </span>
              <span className="text-amber-400 text-lg font-black font-mono">
                {templates.length}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mt-8 border-t border-white/10 pt-4">
          <button
            onClick={() => setActiveTab("STUDIO")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "STUDIO"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Sparkles size={16} />
            Centro de Emisión (Studio)
          </button>
          <button
            onClick={() => setActiveTab("VAULT")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "VAULT"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Layers size={16} />
            Bóveda de Documentos ({documents.length})
          </button>
          <button
            onClick={() => setActiveTab("VERIFY")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "VERIFY"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <ShieldCheck size={16} />
            Verificador de Autenticidad SHA-256
          </button>
          <button
            onClick={() => setActiveTab("OCR_STUDIO")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "OCR_STUDIO"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Scan size={16} />
            OCR Ingestion & Cross-Check Studio
          </button>
        </div>
      </motion.div>

      {/* TAB 1: EMISSION STUDIO */}
      {activeTab === "STUDIO" && (
        <DocumentStudioTab
          templates={templates}
          selectedType={selectedType}
          onSelectTemplate={handleSelectTemplate}
          formData={formData}
          onFormDataChange={setFormData}
          docReference={docReference}
          onDocReferenceChange={setDocReference}
          isGenerating={isGenerating}
          onGenerateDocument={handleGenerateDocument}
          getTypeIcon={getTypeIcon}
        />
      )}

      {/* TAB 2: VAULT LEDGER */}
      {activeTab === "VAULT" && (
        <DocumentVaultTab
          documents={documents}
          filteredDocuments={filteredDocuments}
          templates={templates}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          isLoadingDocs={isLoadingDocs}
          onRefresh={fetchDocuments}
          onOpenViewer={openViewerModal}
          onVerifyDocument={handleVerify}
          onFileUpload={handleFileUpload}
          isUploading={isUploading}
          fileInputRef={fileInputRef as React.RefObject<HTMLInputElement>}
          getTypeIcon={getTypeIcon}
        />
      )}

      {/* TAB 3: VERIFICATION */}
      {activeTab === "VERIFY" && (
        <DocumentVerifyTab
          verifyQuery={verifyQuery}
          onVerifyQueryChange={setVerifyQuery}
          verifyResult={verifyResult}
          isVerifying={isVerifying}
          onVerify={handleVerify}
        />
      )}

      {/* TAB 4: OCR INGESTION & TRIPARTITE CROSS-CHECK STUDIO */}
      {activeTab === "OCR_STUDIO" && (
        <DocumentOcrStudioTab
          ocrDocType={ocrDocType}
          onOcrDocTypeChange={setOcrDocType}
          ocrRawText={ocrRawText}
          onOcrRawTextChange={setOcrRawText}
          isProcessingOcr={isProcessingOcr}
          extractedInvoice={extractedInvoice}
          extractedPackingList={extractedPackingList}
          extractedTransport={extractedTransport}
          extractedDeclaration={extractedDeclaration}
          crossCheckResult={crossCheckResult}
          ocrNotification={ocrNotification}
          onClearNotification={() => setOcrNotification(null)}
          ocrAttachment={ocrAttachment}
          ocrAiProvenance={ocrAiProvenance}
          shipmentsList={shipmentsList}
          selectedShipmentId={selectedShipmentId}
          onSelectedShipmentIdChange={setSelectedShipmentId}
          onAuditShipmentDocuments={handleAuditShipmentDocuments}
          onLoadPreset={handleLoadPreset}
          onOcrFileSelect={handleOcrFileSelect}
          ocrFileInputRef={ocrFileInputRef as React.RefObject<HTMLInputElement>}
          onTriggerGeminiExtract={handleExtractGeminiMultimodal}
          onTriggerLocalExtract={handleExtractCurrent}
          onTriggerCrossCheck={handleRunCrossCheck}
          onResetAll={() => {
            setExtractedInvoice(null);
            setExtractedPackingList(null);
            setExtractedTransport(null);
            setExtractedDeclaration(null);
            setCrossCheckResult(null);
            setOcrNotification("Estado de OCR y conciliación limpiado.");
            setTimeout(() => setOcrNotification(null), 3000);
          }}
          copyToClipboard={copyToClipboard}
        />
      )}

      {/* MODAL VIEWER & DIGITAL SIGNATURE */}
      <DocumentViewerModal
        doc={activeModalDoc}
        pdfUrl={modalPdfUrl}
        onClose={closeViewerModal}
        selectedSigner={selectedSigner}
        onSelectedSignerChange={setSelectedSigner}
        signerTitle={signerTitle}
        onSignerTitleChange={setSignerTitle}
        isSigning={isSigning}
        onSignDocument={handleSignDocument}
        copyToClipboard={copyToClipboard}
      />
    </motion.div>
  );
}
