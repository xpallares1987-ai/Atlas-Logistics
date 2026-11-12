import React from "react";
import {
  CommercialInvoiceData,
  PackingListData,
  TransportDocumentData,
  CustomsDeclarationData,
  TripartiteCrossCheckResult,
} from "@atlas/shared";

export interface DocumentTemplate {
  type: string;
  name: string;
  domain: string;
  regulation: string;
  icon: string;
  defaultData: Record<string, any>;
}

export interface VaultDocument {
  id: string;
  name: string;
  type: string;
  documentReference?: string;
  sha256Hash?: string;
  status: "DRAFT" | "EMITTED" | "SIGNED" | "REVOKED";
  signedBy?: string;
  signerTitle?: string;
  signerCertificate?: string;
  signedAt?: string | number;
  fileSize?: number;
  url: string;
  createdAt: string | number;
}

export interface OcrAttachment {
  fileName: string;
  mimeType: string;
  base64Data: string;
}

export interface OcrAiProvenance {
  source: string;
  model: string;
  cached: boolean;
  latencyMs?: number;
}

export interface DocumentStudioTabProps {
  templates: DocumentTemplate[];
  selectedType: string;
  onSelectTemplate: (tpl: DocumentTemplate) => void;
  formData: Record<string, any>;
  onFormDataChange: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  docReference: string;
  onDocReferenceChange: (ref: string) => void;
  isGenerating: boolean;
  onGenerateDocument: (autoSign: boolean) => void;
  getTypeIcon: (type: string) => React.ReactNode;
}

export interface DocumentVaultTabProps {
  documents: VaultDocument[];
  filteredDocuments: VaultDocument[];
  templates: DocumentTemplate[];
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  typeFilter: string;
  onTypeFilterChange: (type: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  isLoadingDocs: boolean;
  onRefresh: () => void;
  onOpenViewer: (doc: VaultDocument) => void;
  onVerifyDocument: (query: string) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isUploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  getTypeIcon: (type: string) => React.ReactNode;
}

export interface DocumentVerifyTabProps {
  verifyQuery: string;
  onVerifyQueryChange: (query: string) => void;
  verifyResult: any;
  isVerifying: boolean;
  onVerify: (queryToVerify?: string) => void;
  onOpenViewer?: (doc: VaultDocument) => void;
}

export interface DocumentOcrStudioTabProps {
  ocrDocType: "INVOICE" | "PACKING_LIST" | "TRANSPORT" | "DECLARATION";
  onOcrDocTypeChange: (
    type: "INVOICE" | "PACKING_LIST" | "TRANSPORT" | "DECLARATION",
  ) => void;
  ocrRawText: string;
  onOcrRawTextChange: (text: string) => void;
  isProcessingOcr: boolean;
  extractedInvoice: CommercialInvoiceData | null;
  extractedPackingList: PackingListData | null;
  extractedTransport: TransportDocumentData | null;
  extractedDeclaration: CustomsDeclarationData | null;
  crossCheckResult: TripartiteCrossCheckResult | null;
  ocrNotification: string | null;
  onClearNotification: () => void;
  ocrAttachment: OcrAttachment | null;
  onClearAttachment: () => void;
  ocrAiProvenance: OcrAiProvenance | null;
  shipmentsList: any[];
  selectedShipmentId: string;
  onSelectedShipmentIdChange: (id: string) => void;
  onAuditShipmentDocuments: (id: string) => void;
  onLoadPreset: (
    type: "INVOICE" | "PACKING_LIST" | "TRANSPORT" | "DECLARATION",
  ) => void;
  onOcrFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  ocrFileInputRef: React.RefObject<HTMLInputElement>;
  onTriggerOcrExtract: () => void;
  onTriggerCrossCheck: () => void;
}

export interface DocumentViewerModalProps {
  doc: VaultDocument | null;
  pdfUrl: string | null;
  onClose: () => void;
  selectedSigner: string;
  onSelectedSignerChange: (signer: string) => void;
  signerTitle: string;
  onSignerTitleChange: (title: string) => void;
  isSigning: boolean;
  onSignDocument: () => void;
  copyToClipboard: (text: string) => void;
}
