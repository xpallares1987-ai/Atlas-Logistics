/**
 * @file erp-integrations.ts
 * @description Enterprise ERP Bi-Directional Connectors for SAP S/4HANA (OData v4/v2)
 * and Oracle NetSuite (SuiteTalk REST & Web Services), with Landed Cost allocation,
 * Token-Based Authentication (TBA), and BAPI translation dictionaries.
 */

// ============================================================================
// 1. SAP S/4HANA OData v4 / v2 Types & Schemas
// ============================================================================

export interface SapPurchaseOrderItem {
  PurchaseOrderItem: string; // e.g. "00010"
  Material: string; // e.g. "MAT-AUTO-ENGINE-01"
  PurchaseOrderItemText: string;
  OrderQuantity: number;
  PurchaseOrderQuantityUnit: string; // e.g. "PCE" or "KGM"
  NetPriceAmount: number;
  DocumentCurrency: string; // e.g. "EUR" or "USD"
  Plant: string; // e.g. "1010" (Werk)
  StorageLocation: string; // e.g. "101A" (Lagerort)
  RequirementTrackingNumber?: string; // e.g. "REF-ATLAS-778"
  IncotermsClassification: string; // e.g. "FCA" or "CIF"
  IncotermsTransferLocation: string; // e.g. "Hamburg Port Terminal"
  GrossWeight?: number;
  WeightUnit?: string;
  Volume?: number;
  VolumeUnit?: string;
}

export interface SapPurchaseOrderHeader {
  PurchaseOrder: string; // e.g. "4500019283"
  CompanyCode: string; // e.g. "1000"
  PurchaseOrderType: string; // e.g. "NB" (Standard PO)
  Supplier: string; // e.g. "VEND-100420"
  CreationDate: string; // ISO Date YYYY-MM-DD
  DocumentCurrency: string;
  ExchangeRate?: number;
  PaymentTerms: string; // e.g. "NT30"
  IncotermsClassification: string;
  IncotermsTransferLocation: string;
  CorrespncExternalReference?: string; // Bill of Lading / Tracking ID
  Items: SapPurchaseOrderItem[];
}

export interface SapInboundDeliveryItem {
  DeliveryDocumentItem: string;
  ReferenceSDDocument: string; // Purchase Order #
  ReferenceSDDocumentItem: string; // PO Item #
  Material: string;
  ActualDeliveryQuantity: number;
  DeliveryQuantityUnit: string;
  ItemGrossWeight: number;
  ItemNetWeight: number;
  ItemWeightUnit: string;
  StorageLocation: string;
}

export interface SapInboundDeliveryRequest {
  DeliveryDocumentType: string; // e.g. "EL" (Inbound Delivery)
  ReceivingPlant: string;
  ActualGoodsMovementDate: string; // ISO Date
  BillOfLading: string; // e.g. "MSCUBCN992819"
  MeansOfTransportType: string; // "VESSEL" | "TRUCK" | "RAIL"
  MeansOfTransportId: string; // IMO or Truck Plate
  TrackingNumber: string;
  Items: SapInboundDeliveryItem[];
}

export interface SapServiceEntrySheetItem {
  ServiceEntrySheetItem: string;
  PurchaseOrderItem: string;
  ServiceDescription: string;
  Quantity: number;
  UnitOfMeasure: string;
  UnitPrice: number;
  CostCenter?: string;
  WBSElement?: string;
  GLAccount: string;
}

export interface SapServiceEntrySheet {
  ServiceEntrySheet: string;
  PurchaseOrder: string;
  ServiceEntrySheetName: string;
  PostingDate: string;
  OriginatingEntity: string;
  Items: SapServiceEntrySheetItem[];
  TotalNetAmount: number;
  Currency: string;
}

// ============================================================================
// 2. Oracle NetSuite SuiteTalk REST Records & Schemas
// ============================================================================

export interface NetSuitePOLine {
  line: number;
  item: { id: string; refName: string };
  quantity: number;
  rate: number;
  amount: number;
  description: string;
  department?: { id: string; refName: string };
  location?: { id: string; refName: string };
  expectedReceiptDate?: string;
  weightLbs?: number;
  volumeCuFt?: number;
}

export interface NetSuitePurchaseOrder {
  id: string; // internalId e.g. "82910"
  tranId: string; // PO Document # e.g. "PO-2026-8812"
  entity: { id: string; refName: string }; // Vendor
  subsidiary: { id: string; refName: string };
  currency: { id: string; refName: string };
  tranDate: string;
  total: number;
  incoterm?: string;
  memo?: string;
  item: NetSuitePOLine[];
}

export interface NetSuiteFulfillmentPackage {
  packageTrackingNumber: string; // Container ID or Tracking #
  packageWeight: number;
  packageDescr: string;
}

export interface NetSuiteItemFulfillment {
  id?: string;
  createdFrom: { id: string; refName: string }; // PO or SO reference
  tranDate: string;
  shipMethod: { id: string; refName: string }; // e.g. "Ocean Freight FCL"
  package: NetSuiteFulfillmentPackage[];
  status: "shipped" | "picked" | "packed";
}

export interface NetSuiteLandedCostItem {
  line: number;
  itemRefName: string;
  lineValue: number;
  weightKg: number;
  volumeCbm: number;
  allocatedLandedCost: number;
  effectiveUnitCost: number;
}

export interface NetSuiteItemReceipt {
  id?: string;
  createdFrom: { id: string; refName: string };
  tranDate: string;
  bolNumber: string;
  totalFreightAccrual: number;
  landedCostMethod: "VALUE" | "WEIGHT" | "VOLUME";
  items: NetSuiteLandedCostItem[];
}

export interface NetSuiteVendorBill {
  id?: string;
  tranId: string; // Freight Invoice #
  entity: { id: string; refName: string }; // Carrier / Forwarder
  tranDate: string;
  dueDate: string;
  userTotal: number;
  currency: string;
  memo: string;
  expenseLines: Array<{
    account: string;
    amount: number;
    department?: string;
    memo: string;
  }>;
}

// ============================================================================
// 3. Landed Cost Allocation Engine (NetSuite Compatible)
// ============================================================================

export interface LandedCostInputItem {
  line: number;
  itemRefName: string;
  quantity: number;
  unitValue: number;
  weightKg: number;
  volumeCbm: number;
}

export interface LandedCostResult {
  totalLandedFreight: number;
  allocationMethod: "VALUE" | "WEIGHT" | "VOLUME";
  currency: string;
  items: NetSuiteLandedCostItem[];
}

/**
 * Distributes landed costs (ocean freight, customs duties, drayage) across item lines
 * proportionally based on Value, Gross Weight, or Cubic Volume, ensuring 100% rounding integrity.
 */
export function calculateNetSuiteLandedCost(
  totalFreightAmount: number,
  method: "VALUE" | "WEIGHT" | "VOLUME",
  items: LandedCostInputItem[],
  currency = "USD"
): LandedCostResult {
  if (!items || items.length === 0) {
    return {
      totalLandedFreight: totalFreightAmount,
      allocationMethod: method,
      currency,
      items: [],
    };
  }

  // Calculate divisor base
  let totalBase = 0;
  for (const it of items) {
    if (method === "VALUE") totalBase += it.unitValue * it.quantity;
    else if (method === "WEIGHT") totalBase += it.weightKg;
    else if (method === "VOLUME") totalBase += it.volumeCbm;
  }

  if (totalBase <= 0) totalBase = 1; // Prevent div by zero

  let allocatedSum = 0;
  const resultItems: NetSuiteLandedCostItem[] = [];

  items.forEach((it, idx) => {
    const isLast = idx === items.length - 1;
    const itemTotalValue = it.unitValue * it.quantity;
    let factor = 0;

    if (method === "VALUE") factor = itemTotalValue / totalBase;
    else if (method === "WEIGHT") factor = it.weightKg / totalBase;
    else if (method === "VOLUME") factor = it.volumeCbm / totalBase;

    let allocatedAmount = Math.round(totalFreightAmount * factor * 100) / 100;

    // Reconciliation on last item to prevent rounding penny drift
    if (isLast) {
      allocatedAmount = Math.round((totalFreightAmount - allocatedSum) * 100) / 100;
    } else {
      allocatedSum += allocatedAmount;
    }

    const effectiveUnitCost = it.quantity > 0
      ? Math.round(((itemTotalValue + allocatedAmount) / it.quantity) * 1000) / 1000
      : it.unitValue;

    resultItems.push({
      line: it.line,
      itemRefName: it.itemRefName,
      lineValue: itemTotalValue,
      weightKg: it.weightKg,
      volumeCbm: it.volumeCbm,
      allocatedLandedCost: allocatedAmount,
      effectiveUnitCost,
    });
  });

  return {
    totalLandedFreight: totalFreightAmount,
    allocationMethod: method,
    currency,
    items: resultItems,
  };
}

// ============================================================================
// 4. Token-Based Authentication (TBA) Header Builder (NetSuite HMAC-SHA256)
// ============================================================================

export interface NetSuiteTbaCredentials {
  consumerKey: string;
  consumerSecret: string;
  tokenId: string;
  tokenSecret: string;
  accountId: string;
}

export function generateMockNetSuiteTbaHeader(
  creds: NetSuiteTbaCredentials,
  _httpMethod = "POST",
  _url = "https://rest.netsuite.com/services/rest/record/v1/itemReceipt",
  nonce = `ns_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
  timestamp = Math.floor(Date.now() / 1000).toString()
): { authorizationHeader: string; nonce: string; timestamp: string } {
  // Mock deterministic signature simulation for sandbox testing
  const signature = `TBA_HMAC256_${btoa(`${creds.consumerKey}:${creds.tokenId}:${timestamp}`).substring(0, 32)}=`;
  
  const authHeader = `OAuth realm="${creds.accountId}", ` +
    `oauth_consumer_key="${creds.consumerKey}", ` +
    `oauth_token="${creds.tokenId}", ` +
    `oauth_signature_method="HMAC-SHA256", ` +
    `oauth_timestamp="${timestamp}", ` +
    `oauth_nonce="${nonce}", ` +
    `oauth_version="1.0", ` +
    `oauth_signature="${signature}"`;

  return {
    authorizationHeader: authHeader,
    nonce,
    timestamp,
  };
}

// ============================================================================
// 5. BAPI & Canonical Code Translation Dictionaries
// ============================================================================

export const SAP_UOM_MAP: Record<string, string> = {
  KGM: "KG",
  TNE: "TON",
  MTQ: "CBM",
  PCE: "UNIT",
  LTR: "LITER",
  FTK: "SQFT",
  MTR: "METER",
};

export const REVERSE_SAP_UOM_MAP: Record<string, string> = {
  KG: "KGM",
  TON: "TNE",
  CBM: "MTQ",
  UNIT: "PCE",
  LITER: "LTR",
  SQFT: "FTK",
  METER: "MTR",
};

export const INCOTERMS_CANONICAL = [
  "EXW",
  "FCA",
  "CPT",
  "CIP",
  "DAP",
  "DPU",
  "DDP",
  "FAS",
  "FOB",
  "CFR",
  "CIF",
] as const;

export type IncotermCode = typeof INCOTERMS_CANONICAL[number];

export function mapAtlasToSapIncoterm(incoterm: string): string {
  const norm = incoterm.trim().toUpperCase();
  return (INCOTERMS_CANONICAL as readonly string[]).includes(norm) ? norm : "FOB";
}

// ============================================================================
// 6. Circuit Breaker State Machine Types
// ============================================================================

export type ErpCircuitBreakerState = "CLOSED" | "HALF_OPEN" | "OPEN";

export interface ErpConnectorStatus {
  system: "SAP_S4HANA" | "ORACLE_NETSUITE";
  endpoint: string;
  status: "ONLINE" | "DEGRADED" | "OFFLINE";
  circuitBreaker: ErpCircuitBreakerState;
  latencyMs: number;
  lastSyncTimestamp: number;
  activeAuthMethod: "ODATA_CSRF" | "SUITETALK_TBA_HMAC256";
  metrics: {
    totalSyncedToday: number;
    failedSyncCount: number;
    pendingQueueDepth: number;
    averageLatencyMs: number;
  };
}

// ============================================================================
// 7. Realistic Scenarios & Presets (Demonstration Sandbox)
// ============================================================================

export interface ErpDemoPreset {
  id: string;
  name: string;
  erpSystem: "SAP_S4HANA" | "ORACLE_NETSUITE";
  description: string;
  sampleInput: {
    referenceNumber: string;
    originPlant: string;
    destinationPort: string;
    items: LandedCostInputItem[];
    freightChargesUsd: number;
    incoterm: IncotermCode;
  };
}

export const ERP_DEMO_PRESETS: Record<string, ErpDemoPreset> = {
  sap_automotive_tier1: {
    id: "sap_automotive_tier1",
    name: "SAP S/4HANA: Cadena de Suministro Automotriz (Stuttgart ➔ Veracruz)",
    erpSystem: "SAP_S4HANA",
    description: "Importación de transmisiones y motores en 3 contenedores 40' HC con PO 4500091823 y generación de Entrega Entrante (Inbound Delivery).",
    sampleInput: {
      referenceNumber: "PO-4500091823",
      originPlant: "1010-STUTTGART",
      destinationPort: "MXVER",
      freightChargesUsd: 14500,
      incoterm: "FCA",
      items: [
        {
          line: 10,
          itemRefName: "Transmisión Dual 8-Speed (V6)",
          quantity: 40,
          unitValue: 3200,
          weightKg: 8800,
          volumeCbm: 18.5,
        },
        {
          line: 20,
          itemRefName: "Conjunto Eje Delantero Eléctrico",
          quantity: 60,
          unitValue: 1850,
          weightKg: 6600,
          volumeCbm: 14.2,
        },
        {
          line: 30,
          itemRefName: "Módulos ECU Inversores SiC",
          quantity: 200,
          unitValue: 640,
          weightKg: 1200,
          volumeCbm: 3.8,
        },
      ],
    },
  },
  netsuite_retail_hightech: {
    id: "netsuite_retail_hightech",
    name: "Oracle NetSuite: Distribución de Electrónica (Taipei ➔ Long Beach)",
    erpSystem: "ORACLE_NETSUITE",
    description: "Ingreso en almacén 3PL con Item Receipt y prorrateo automático de Landed Cost (Flete Marítimo + Handling + Arancel) por volumen CBM.",
    sampleInput: {
      referenceNumber: "PO-NS-884210",
      originPlant: "TW-TPE-WH01",
      destinationPort: "USLGB",
      freightChargesUsd: 9800,
      incoterm: "CIF",
      items: [
        {
          line: 1,
          itemRefName: "Servidores Blade 2U GPU AI",
          quantity: 15,
          unitValue: 12000,
          weightKg: 950,
          volumeCbm: 5.2,
        },
        {
          line: 2,
          itemRefName: "Switches Ópticos 800Gbps QSFP-DD",
          quantity: 30,
          unitValue: 4500,
          weightKg: 420,
          volumeCbm: 3.1,
        },
        {
          line: 3,
          itemRefName: "Cables DAC Transceptores 2m",
          quantity: 500,
          unitValue: 120,
          weightKg: 180,
          volumeCbm: 1.5,
        },
      ],
    },
  },
};
