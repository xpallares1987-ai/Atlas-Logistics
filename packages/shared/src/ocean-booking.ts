/**
 * Autonomous Multi-Carrier Ocean Booking Engine (EDI 301 / DCSA API Instant Rate Lock)
 * 
 * Standards & Protocols:
 * - DCSA Booking API v2.0 (Digital Container Shipping Association)
 * - ANSI X12 EDI 301 (Confirmation of Booking / Booking Request)
 * - ANSI X12 EDI 304 (Shipping Instructions / B/L Draft)
 * - Automated Equipment Empty Release Order Generation
 */

export type CarrierCode =
  | "MAERSK"
  | "MSC"
  | "CMA_CGM"
  | "HAPAG_LLOYD"
  | "ONE"
  | "EVERGREEN";

export type ContainerIsoType =
  | "20GP"
  | "40GP"
  | "40HC"
  | "40HR"
  | "45HC";

export type BookingStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "CONFIRMED"
  | "AMENDED"
  | "SI_PENDING"
  | "SI_SUBMITTED"
  | "ALLOCATED"
  | "CANCELLED";

export type BillOfLadingType =
  | "WAYBILL"       // Express Sea Waybill (Non-negotiable)
  | "ORIGINAL"      // Negotiable Bill of Lading (3/3 Originals)
  | "TELEX_RELEASE"; // Telex / Electronic Release

export interface CarrierMetadata {
  name: string;
  scac: string;
  dcsaVersion: string;
  bookingApiEndpoint: string;
}

export const CARRIER_METADATA: Record<CarrierCode, CarrierMetadata> = {
  MAERSK: {
    name: "Maersk Line A/S",
    scac: "MAEU",
    dcsaVersion: "2.0.2",
    bookingApiEndpoint: "https://api.maersk.com/ocean/v2/bookings",
  },
  MSC: {
    name: "MSC Mediterranean Shipping Co",
    scac: "MSCU",
    dcsaVersion: "2.0.2",
    bookingApiEndpoint: "https://api.msc.com/dcsa/v2/booking",
  },
  CMA_CGM: {
    name: "CMA CGM S.A.",
    scac: "CMDU",
    dcsaVersion: "2.0.1",
    bookingApiEndpoint: "https://api.cma-cgm.com/v2/ocean-booking",
  },
  HAPAG_LLOYD: {
    name: "Hapag-Lloyd AG",
    scac: "HLCU",
    dcsaVersion: "2.0.2",
    bookingApiEndpoint: "https://api.hlag.com/ocean/v2/bookings",
  },
  ONE: {
    name: "Ocean Network Express (ONE)",
    scac: "ONEY",
    dcsaVersion: "2.0.0",
    bookingApiEndpoint: "https://api.one-line.com/booking/v2",
  },
  EVERGREEN: {
    name: "Evergreen Marine Corp",
    scac: "EGLV",
    dcsaVersion: "2.0.0",
    bookingApiEndpoint: "https://api.evergreen-marine.com/v2/bookings",
  },
};

export interface RateLockQuote {
  quoteId: string;
  carrier: CarrierCode;
  carrierName: string;
  carrierScac: string;
  originPort: string;
  destPort: string;
  containerType: ContainerIsoType;
  oceanFreightUsd: number;
  bafUsd: number;
  thcOriginUsd: number;
  thcDestUsd: number;
  totalSpotUsd: number;
  validityExpiresAt: string; // ISO 8601
  rateLockToken: string;
  freeTimeDays: number;
  transitTimeDays: number;
}

export interface CutOffMilestones {
  cargoCutOff: string;       // Gate-in deadline
  vgmCutOff: string;         // Verified Gross Mass deadline
  siCutOff: string;          // Shipping Instructions deadline
  customsCutOff: string;     // Export customs release deadline
  estimatedDeparture: string;// ETD
  estimatedArrival: string;  // ETA
}

export interface CutOffStatusEvaluation {
  isSiExpired: boolean;
  isVgmExpired: boolean;
  isCargoExpired: boolean;
  isCustomsExpired: boolean;
  siHoursRemaining: number;
  vgmHoursRemaining: number;
  cargoHoursRemaining: number;
  customsHoursRemaining: number;
  overallStatus: "SAFE" | "URGENT" | "CRITICAL" | "BREACHED";
}

export interface EquipmentReleaseOrder {
  releaseOrderNumber: string;
  bookingNumber: string;
  carrier: CarrierCode;
  carrierScac: string;
  depotCode: string;
  depotName: string;
  depotAddress: string;
  validUntil: string;
  containerCount: number;
  isoType: ContainerIsoType;
  sealNumbersAllocated: string[];
  pickupPin: string;
  qrDigest: string;
  status: "ISSUED" | "PICKED_UP" | "EXPIRED";
}

export interface ContainerShippingDetail {
  containerNumber: string;
  sealNumber: string;
  tareWeightKg: number;
  verifiedGrossMassKg: number;
  packagesCount: number;
  packageType: string;
  cargoDescription: string;
  hsCode: string;
}

export interface ShippingInstructionData {
  bookingReference: string;
  carrierScac: string;
  shipperName: string;
  shipperAddress: string;
  consigneeName: string;
  consigneeAddress: string;
  notifyPartyName: string;
  blType: BillOfLadingType;
  containerDetails: ContainerShippingDetail[];
  freightPaymentTerm: "PREPAID" | "COLLECT";
  placeOfIssue: string;
  submissionTimestamp?: string;
  siStatus: "DRAFT" | "SUBMITTED" | "ACCEPTED";
}

export interface OceanBooking {
  id: string;
  bookingNumber?: string;
  referenceNumber: string;
  carrier: CarrierCode;
  carrierScac: string;
  status: BookingStatus;
  originPort: string;
  destinationPort: string;
  vesselName: string;
  voyageNumber: string;
  commodityDescription: string;
  requestedEquipment: {
    isoType: ContainerIsoType;
    quantity: number;
  };
  rateLock: RateLockQuote;
  cutOffs?: CutOffMilestones;
  shippingInstructions?: ShippingInstructionData;
  equipmentRelease?: EquipmentReleaseOrder;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

/**
 * Evaluates cut-off milestones against reference timestamp and generates operational alerts.
 */
export function validateCutOffDeadlines(
  cutOffs: CutOffMilestones,
  currentTimestampStr?: string
): CutOffStatusEvaluation {
  const now = currentTimestampStr ? new Date(currentTimestampStr).getTime() : Date.now();

  const parseHours = (isoStr: string) => {
    const diffMs = new Date(isoStr).getTime() - now;
    return Math.round(diffMs / (1000 * 60 * 60));
  };

  const siHoursRemaining = parseHours(cutOffs.siCutOff);
  const vgmHoursRemaining = parseHours(cutOffs.vgmCutOff);
  const cargoHoursRemaining = parseHours(cutOffs.cargoCutOff);
  const customsHoursRemaining = parseHours(cutOffs.customsCutOff);

  const isSiExpired = siHoursRemaining <= 0;
  const isVgmExpired = vgmHoursRemaining <= 0;
  const isCargoExpired = cargoHoursRemaining <= 0;
  const isCustomsExpired = customsHoursRemaining <= 0;

  const minHours = Math.min(siHoursRemaining, vgmHoursRemaining, cargoHoursRemaining, customsHoursRemaining);

  let overallStatus: CutOffStatusEvaluation["overallStatus"] = "SAFE";
  if (minHours <= 0) {
    overallStatus = "BREACHED";
  } else if (minHours <= 12) {
    overallStatus = "CRITICAL";
  } else if (minHours <= 36) {
    overallStatus = "URGENT";
  } else {
    overallStatus = "SAFE";
  }

  return {
    isSiExpired,
    isVgmExpired,
    isCargoExpired,
    isCustomsExpired,
    siHoursRemaining,
    vgmHoursRemaining,
    cargoHoursRemaining,
    customsHoursRemaining,
    overallStatus,
  };
}

/**
 * Generates standard DCSA Booking API v2.0 JSON payload.
 */
export function generateDCSABookingPayload(booking: OceanBooking): Record<string, any> {
  return {
    receiptTypeAtOrigin: "CY",
    deliveryTypeAtDestination: "CY",
    cargoMovementTypeAtOrigin: "FCL",
    cargoMovementTypeAtDestination: "FCL",
    serviceContractReference: booking.rateLock.rateLockToken,
    transportDocumentTypeCode: "BOL",
    isPartialLoadAllowed: false,
    isExportDeclarationRequired: true,
    carrierBookingRequestReference: booking.referenceNumber,
    carrierScac: booking.carrierScac,
    vesselName: booking.vesselName,
    voyageNumber: booking.voyageNumber,
    polPortCode: booking.originPort,
    podPortCode: booking.destinationPort,
    commodities: [
      {
        commodityType: booking.commodityDescription,
        cargoGrossWeight: 26000 * booking.requestedEquipment.quantity,
        cargoGrossWeightUnit: "KGM",
      },
    ],
    requestedEquipments: [
      {
        ISOEquipmentCode: booking.requestedEquipment.isoType,
        units: booking.requestedEquipment.quantity,
        isShipperOwned: false,
      },
    ],
    invoicePayableAt: {
      UNLocationCode: booking.originPort,
    },
  };
}

/**
 * Generates an ANSI X12 EDI 301 (Confirmation of Booking / Booking Request) transaction set string.
 */
export function generateEDI301Transaction(booking: OceanBooking): string {
  const bkgNum = booking.bookingNumber || booking.referenceNumber;
  const now = new Date();
  const dateStr = now.toISOString().slice(2, 10).replace(/-/g, ""); // YYMMDD
  const timeStr = now.toTimeString().slice(0, 5).replace(/:/g, ""); // HHMM

  return [
    `ISA*00*          *00*          *ZZ*ATLASLOGISTICS *02*${booking.carrierScac.padEnd(15, " ")}*${dateStr}*${timeStr}*U*00401*000000001*0*P*>~`,
    `GS*RO*ATLASLOGISTICS*${booking.carrierScac}*${dateStr}*${timeStr}*1*X*004010~`,
    `ST*301*0001~`,
    `B1*${booking.carrierScac}*${bkgNum}*${dateStr}*A~`,
    `Y3*${bkgNum}*${booking.carrierScac}*${booking.rateLock.rateLockToken}~`,
    `Y4*${booking.cutOffs?.cargoCutOff.split("T")[0].replace(/-/g, "") || dateStr}*CY*${booking.requestedEquipment.isoType}*${booking.requestedEquipment.quantity}~`,
    `N1*SH*Atlas Logistics Global Group~`,
    `N1*CA*${booking.rateLock.carrierName}*25*${booking.carrierScac}~`,
    `R4*R*UN*${booking.originPort}***Origin Port of Loading~`,
    `R4*D*UN*${booking.destinationPort}***Destination Port of Discharge~`,
    `W09*${booking.vesselName.slice(0, 28)}*${booking.voyageNumber}~`,
    `SE*10*0001~`,
    `GE*1*1~`,
    `IEA*1*000000001~`,
  ].join("\n");
}

/**
 * Generates an ANSI X12 EDI 304 (Shipping Instructions / Ocean Bill of Lading) transaction set string.
 */
export function generateEDI304ShippingInstruction(si: ShippingInstructionData): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(2, 10).replace(/-/g, "");
  const timeStr = now.toTimeString().slice(0, 5).replace(/:/g, "");

  const segments: string[] = [
    `ISA*00*          *00*          *ZZ*ATLASLOGISTICS *02*${si.carrierScac.padEnd(15, " ")}*${dateStr}*${timeStr}*U*00401*000000002*0*P*>~`,
    `GS*SO*ATLASLOGISTICS*${si.carrierScac}*${dateStr}*${timeStr}*2*X*004010~`,
    `ST*304*0001~`,
    `B2**${si.carrierScac}*${si.bookingReference}**${si.blType}~`,
    `N1*SH*${si.shipperName}~`,
    `N3*${si.shipperAddress}~`,
    `N1*CN*${si.consigneeName}~`,
    `N3*${si.consigneeAddress}~`,
    `N1*N1*${si.notifyPartyName}~`,
  ];

  si.containerDetails.forEach((cont, idx) => {
    segments.push(`LX*${idx + 1}~`);
    segments.push(`M7*${cont.sealNumber}~`);
    segments.push(`W09*${cont.containerNumber}*${cont.tareWeightKg}*K*${cont.verifiedGrossMassKg}~`);
    segments.push(`L0*${idx + 1}*${cont.packagesCount}*${cont.packageType}*${cont.verifiedGrossMassKg}*K~`);
    segments.push(`L5*${idx + 1}*${cont.cargoDescription}*${cont.hsCode}~`);
  });

  segments.push(`L3*${si.containerDetails.reduce((s, c) => s + c.verifiedGrossMassKg, 0)}*K***${si.freightPaymentTerm}~`);
  segments.push(`SE*${segments.length - 2}*0001~`);
  segments.push(`GE*1*2~`);
  segments.push(`IEA*1*000000002~`);

  return segments.join("\n");
}

/**
 * Generates an Empty Equipment Release Order for container depot collection.
 */
export function generateEquipmentReleaseOrder(
  booking: OceanBooking,
  depotOverrides?: { depotCode?: string; depotName?: string; depotAddress?: string }
): EquipmentReleaseOrder {
  const bkgNum = booking.bookingNumber || booking.referenceNumber;
  const releaseOrderNumber = `REL-${booking.carrierScac}-${bkgNum.slice(-6)}-${Date.now().toString(36).toUpperCase()}`;

  // Generate unique container seal numbers
  const sealNumbersAllocated: string[] = [];
  for (let i = 0; i < booking.requestedEquipment.quantity; i++) {
    sealNumbersAllocated.push(`SL-${booking.carrierScac}-${Math.floor(100000 + Math.random() * 900000)}`);
  }

  const pickupPin = Math.floor(1000 + Math.random() * 9000).toString();
  const validUntil = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const defaultDepot = {
    depotCode: `${booking.originPort}-DEPOT-1`,
    depotName: `${booking.rateLock.carrierName} Logistics & Depot Terminal`,
    depotAddress: `Depot Gate Terminal Zone 4, Port of ${booking.originPort}`,
  };

  const depot = { ...defaultDepot, ...depotOverrides };

  return {
    releaseOrderNumber,
    bookingNumber: bkgNum,
    carrier: booking.carrier,
    carrierScac: booking.carrierScac,
    depotCode: depot.depotCode,
    depotName: depot.depotName,
    depotAddress: depot.depotAddress,
    validUntil,
    containerCount: booking.requestedEquipment.quantity,
    isoType: booking.requestedEquipment.isoType,
    sealNumbersAllocated,
    pickupPin,
    qrDigest: `RELEASE:${releaseOrderNumber}:BKG:${bkgNum}:PIN:${pickupPin}:QTY:${booking.requestedEquipment.quantity}`,
    status: "ISSUED",
  };
}

/**
 * Real-world Demonstration Presets
 */
export const OCEAN_BOOKING_PRESETS: OceanBooking[] = [
  {
    id: "bkg-transpac-01",
    referenceNumber: "ATL-BKG-SHA-LAX-001",
    bookingNumber: "MSK-99201482",
    carrier: "MAERSK",
    carrierScac: "MAEU",
    status: "CONFIRMED",
    originPort: "CNSHA",
    destinationPort: "USLAX",
    vesselName: "MAERSK MC-KINNEY MOLLER",
    voyageNumber: "2608W",
    commodityDescription: "High-Tech Consumer Electronics & Lithium Battery Assemblies (UN 3481)",
    requestedEquipment: {
      isoType: "40HC",
      quantity: 1,
    },
    rateLock: {
      quoteId: "QTE-MSK-SHA-LAX-88",
      carrier: "MAERSK",
      carrierName: "Maersk Line A/S",
      carrierScac: "MAEU",
      originPort: "CNSHA",
      destPort: "USLAX",
      containerType: "40HC",
      oceanFreightUsd: 2150,
      bafUsd: 320,
      thcOriginUsd: 140,
      thcDestUsd: 280,
      totalSpotUsd: 2890,
      validityExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      rateLockToken: "RL-MAEU-2026-X8849",
      freeTimeDays: 5,
      transitTimeDays: 14,
    },
    cutOffs: {
      cargoCutOff: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      vgmCutOff: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(),
      siCutOff: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      customsCutOff: new Date(Date.now() + 40 * 60 * 60 * 1000).toISOString(),
      estimatedDeparture: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
      estimatedArrival: new Date(Date.now() + 17 * 24 * 60 * 60 * 1000).toISOString(),
    },
    shippingInstructions: {
      bookingReference: "MSK-99201482",
      carrierScac: "MAEU",
      shipperName: "Atlas Global Electronics Ltd (Shanghai)",
      shipperAddress: "No. 888 Pudong South Rd, Shanghai, China",
      consigneeName: "Apex High-Tech Logistics Inc (Los Angeles)",
      consigneeAddress: "2200 E Pacific Coast Hwy, Long Beach, CA 90810, USA",
      notifyPartyName: "Atlas Logistics USA Branch",
      blType: "WAYBILL",
      freightPaymentTerm: "PREPAID",
      placeOfIssue: "Shanghai",
      siStatus: "ACCEPTED",
      containerDetails: [
        {
          containerNumber: "MSKU9284712",
          sealNumber: "SL-MAEU-884910",
          tareWeightKg: 3880,
          verifiedGrossMassKg: 24500,
          packagesCount: 1200,
          packageType: "Cartons",
          cargoDescription: "Smart Display Modules & Sensors (HS 8528.59)",
          hsCode: "85285900",
        },
      ],
    },
    equipmentRelease: {
      releaseOrderNumber: "REL-MAEU-201482-K9A",
      bookingNumber: "MSK-99201482",
      carrier: "MAERSK",
      carrierScac: "MAEU",
      depotCode: "CNSHA-DEPOT-PUDONG",
      depotName: "APM Terminals Pudong Container Depot",
      depotAddress: "Gate 4, Lingang Logistics Park, Shanghai",
      validUntil: "2026-10-20",
      containerCount: 1,
      isoType: "40HC",
      sealNumbersAllocated: ["SL-MAEU-884910"],
      pickupPin: "8492",
      qrDigest: "RELEASE:REL-MAEU-201482-K9A:BKG:MSK-99201482:PIN:8492:QTY:1",
      status: "ISSUED",
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "bkg-asiaeu-02",
    referenceNumber: "ATL-BKG-SIN-RTM-002",
    bookingNumber: "CMA-77402911",
    carrier: "CMA_CGM",
    carrierScac: "CMDU",
    status: "CONFIRMED",
    originPort: "SGSIN",
    destinationPort: "NLRTM",
    vesselName: "CMA CGM JACQUES SAADE",
    voyageNumber: "091E",
    commodityDescription: "Packaged Fast-Moving Consumer Goods & Eco Textiles",
    requestedEquipment: {
      isoType: "40HC",
      quantity: 2,
    },
    rateLock: {
      quoteId: "QTE-CMA-SIN-RTM-42",
      carrier: "CMA_CGM",
      carrierName: "CMA CGM S.A.",
      carrierScac: "CMDU",
      originPort: "SGSIN",
      destPort: "NLRTM",
      containerType: "40HC",
      oceanFreightUsd: 1980,
      bafUsd: 290,
      thcOriginUsd: 130,
      thcDestUsd: 260,
      totalSpotUsd: 2660,
      validityExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      rateLockToken: "RL-CMDU-2026-Y5510",
      freeTimeDays: 7,
      transitTimeDays: 22,
    },
    cutOffs: {
      cargoCutOff: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
      vgmCutOff: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      siCutOff: new Date(Date.now() + 30 * 60 * 60 * 1000).toISOString(),
      customsCutOff: new Date(Date.now() + 60 * 60 * 60 * 1000).toISOString(),
      estimatedDeparture: new Date(Date.now() + 96 * 60 * 60 * 1000).toISOString(),
      estimatedArrival: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "bkg-bcn-cantunis-03",
    referenceNumber: "ATL-BKG-BCN-NYC-003",
    bookingNumber: "HLC-48291030",
    carrier: "HAPAG_LLOYD",
    carrierScac: "HLCU",
    status: "CONFIRMED",
    originPort: "ESBCN",
    destinationPort: "USNYC",
    vesselName: "AL ZUBARA",
    voyageNumber: "2611W",
    commodityDescription: "SAICA Kraft Paper Coils & Recycled Fluting Corrugated (Book 012 Can Tunis Corredor)",
    requestedEquipment: {
      isoType: "40HC",
      quantity: 2,
    },
    rateLock: {
      quoteId: "QTE-HLC-BCN-NYC-12",
      carrier: "HAPAG_LLOYD",
      carrierName: "Hapag-Lloyd AG",
      carrierScac: "HLCU",
      originPort: "ESBCN",
      destPort: "USNYC",
      containerType: "40HC",
      oceanFreightUsd: 1720,
      bafUsd: 240,
      thcOriginUsd: 160,
      thcDestUsd: 310,
      totalSpotUsd: 2430,
      validityExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      rateLockToken: "RL-HLCU-2026-Z012",
      freeTimeDays: 7,
      transitTimeDays: 12,
    },
    cutOffs: {
      cargoCutOff: new Date(Date.now() + 60 * 60 * 60 * 1000).toISOString(),
      vgmCutOff: new Date(Date.now() + 40 * 60 * 60 * 1000).toISOString(),
      siCutOff: new Date(Date.now() + 28 * 60 * 60 * 1000).toISOString(),
      customsCutOff: new Date(Date.now() + 50 * 60 * 60 * 1000).toISOString(),
      estimatedDeparture: new Date(Date.now() + 80 * 60 * 60 * 1000).toISOString(),
      estimatedArrival: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    },
    shippingInstructions: {
      bookingReference: "HLC-48291030",
      carrierScac: "HLCU",
      shipperName: "SAICA Paper España S.A. (Corredor BCN.FE.FE01.012)",
      shipperAddress: "Polígono Industrial El Espartal, Zaragoza / Can Tunis BCN",
      consigneeName: "Atlantic Packaging & Container Corporation (New York)",
      consigneeAddress: "Port Newark Container Terminal (PNCT), Newark, NJ 07114",
      notifyPartyName: "Atlas Logistics Group Barcelona Lead (Xavier Pallarès)",
      blType: "ORIGINAL",
      freightPaymentTerm: "PREPAID",
      placeOfIssue: "Barcelona",
      siStatus: "ACCEPTED",
      containerDetails: [
        {
          containerNumber: "SUDU4829103",
          sealNumber: "SL-HLCU-482911",
          tareWeightKg: 3900,
          verifiedGrossMassKg: 26500,
          packagesCount: 22,
          packageType: "Coils / Reels",
          cargoDescription: "Paper Reels for Corrugated Packaging (HS 4805.11)",
          hsCode: "48051100",
        },
        {
          containerNumber: "HLXU7729104",
          sealNumber: "SL-HLCU-482912",
          tareWeightKg: 3910,
          verifiedGrossMassKg: 26480,
          packagesCount: 22,
          packageType: "Coils / Reels",
          cargoDescription: "Paper Reels for Corrugated Packaging (HS 4805.11)",
          hsCode: "48051100",
        },
      ],
    },
    equipmentRelease: {
      releaseOrderNumber: "REL-HLCU-482910-BCN",
      bookingNumber: "HLC-48291030",
      carrier: "HAPAG_LLOYD",
      carrierScac: "HLCU",
      depotCode: "ESBCN-CANTUNIS-DEPOT",
      depotName: "Terminal Intermodal Can Tunis Logistainer BCN",
      depotAddress: "Carrer del Port, Can Tunis Ferroviaria, Barcelona",
      validUntil: "2026-10-25",
      containerCount: 2,
      isoType: "40HC",
      sealNumbersAllocated: ["SL-HLCU-482911", "SL-HLCU-482912"],
      pickupPin: "3914",
      qrDigest: "RELEASE:REL-HLCU-482910-BCN:BKG:HLC-48291030:PIN:3914:QTY:2",
      status: "ISSUED",
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
