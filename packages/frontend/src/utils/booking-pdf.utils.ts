/**
 * @file booking-pdf.utils.ts
 * @description PDF document generation routines for Ocean Booking, Shipping Instructions, and Equipment Release Gate Passes
 */

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { OceanBooking } from "@atlas/shared";
import { DraftBLPayload } from "../types/booking-management.types";

/**
 * Generates and downloads the Official Multimodal Draft Bill of Lading PDF from booking confirmation modal.
 */
export function downloadDraftBLModalPdf(payload: DraftBLPayload): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Background Watermark: DRAFT - NON-NEGOTIABLE
  doc.saveGraphicsState?.();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(38);
  doc.setTextColor(230, 235, 245);
  doc.text("DRAFT - NON-NEGOTIABLE", 105, 145, {
    align: "center",
    angle: 45,
  });
  doc.restoreGraphicsState?.();

  // Official Header Banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 32, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(
    `ATLAS LOGISTICS ENTERPRISE - MULTIMODAL DRAFT BILL OF LADING`,
    14,
    12,
  );

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text(
    `DCSA Transport Document Standard v2.0 / FIATA FBL Specification • Ref: ${payload.blReference}`,
    14,
    18,
  );

  doc.setFontSize(8);
  doc.setTextColor(226, 232, 240);
  doc.text(
    `Shipment Tracking: ${payload.trackingNumber} | Booking: ${payload.bookingReference} | Carrier Booking Ref: ${payload.carrierBookingNumber}`,
    14,
    25,
  );

  if (payload.sha256Hash) {
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `MLETR Verification Hash (SHA-256): ${payload.sha256Hash}`,
      14,
      30,
    );
  }

  autoTable(doc, {
    startY: 36,
    head: [
      ["Transport & Party Box", "Legal Entity / Address", "Terms & References"],
    ],
    body: [
      [
        "Shipper / Consignor",
        payload.shipperName,
        `Incoterm: ${payload.incoterm || "FOB"} (Incoterms® 2020)`,
      ],
      [
        "Consignee",
        payload.consigneeName || "TO ORDER OF SHIPPER",
        "Negotiable Title Document (Draft Stage)",
      ],
      [
        "Notify Party",
        "Same as Consignee / Destination Forwarding Agent",
        "Port Clearance & Transit Notice",
      ],
      [
        "Ocean Carrier",
        payload.carrier,
        `Carrier Ref: ${payload.carrierBookingNumber}`,
      ],
      [
        "Vessel & Voyage",
        `${payload.vesselName} / ${payload.voyageNumber}`,
        `Port of Loading (POL): ${payload.origin} -> Port of Discharge (POD): ${payload.destination}`,
      ],
    ],
    theme: "striped",
    styles: { fontSize: 7.5, cellPadding: 2.2 },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
  });

  const nextY = (doc as any).lastAutoTable.finalY + 6;
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text(
    "CONTAINER PARTICULARS & VERIFIED GROSS MASS (SOLAS VGM)",
    14,
    nextY,
  );

  autoTable(doc, {
    startY: nextY + 3,
    head: [
      [
        "Container No. (ISO 6346)",
        "Seal No. (ISO 17712)",
        "Equipment",
        "VGM Gross Weight",
        "Commodity Description & HS Code",
      ],
    ],
    body: [
      [
        payload.containerNumber,
        payload.sealNumber,
        payload.equipment,
        `${Number(payload.weightKg || 18000).toLocaleString()} KG (VGM Verified)`,
        payload.commodity,
      ],
    ],
    theme: "grid",
    styles: { fontSize: 7.5, cellPadding: 2.2 },
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255] },
  });

  // Legal Paramount Clause & Disclaimer
  const finalY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(
    "PARAMOUNT CLAUSE: Taken in charge in apparent good order and condition. Subject to Hague-Visby Rules (1968/1979) and FIATA Multimodal Transport Bill of Lading conditions. One original bill of lading must be surrendered duly endorsed in exchange for the goods or delivery order. This draft copy is non-negotiable.",
    14,
    finalY,
    { maxWidth: 182, align: "justify" },
  );

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text(
    `SIGNED FOR AND ON BEHALF OF ATLAS LOGISTICS AS CARRIER • ISSUED AT: ${payload.origin.split(" ")[0] || "MADRID"} • DATE: ${new Date().toISOString().split("T")[0]}`,
    14,
    finalY + 12,
  );

  doc.save(`Draft_BL_${payload.blReference}.pdf`);
}

/**
 * Generates and downloads the Shipping Instructions Draft Ocean Bill of Lading PDF.
 */
export function downloadShippingInstructionsPdf(
  activeBooking: OceanBooking,
): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Top Carrier Header
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 32, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text(
    `${activeBooking.rateLock.carrierName.toUpperCase()} - DRAFT BILL OF LADING`,
    14,
    14,
  );

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text(
    `DCSA v2.0 / EDI 304 Standard | Booking Ref: ${activeBooking.bookingNumber || activeBooking.referenceNumber} | SCAC: ${activeBooking.carrierScac}`,
    14,
    22,
  );

  // Parties Grid
  const si = activeBooking.shippingInstructions;
  const partiesData = [
    [
      "Shipper / Exporter",
      si?.shipperName || "Atlas Logistics Enterprise Group",
      si?.shipperAddress || "Pudong Logistics Hub, Shanghai",
    ],
    [
      "Consignee",
      si?.consigneeName || "Atlas Logistics Corp USA",
      si?.consigneeAddress || "Port of Los Angeles Gate 3",
    ],
    [
      "Notify Party",
      si?.notifyPartyName || "Same as Consignee",
      "Notify on Arrival via Automated Webhook",
    ],
    [
      "Vessel & Voyage",
      `${activeBooking.vesselName} / ${activeBooking.voyageNumber}`,
      `Port of Loading: ${activeBooking.originPort} | Port of Discharge: ${activeBooking.destinationPort}`,
    ],
    [
      "Bill of Lading Type",
      si?.blType || "WAYBILL",
      `Freight Payment Term: ${si?.freightPaymentTerm || "PREPAID"}`,
    ],
  ];

  autoTable(doc, {
    startY: 38,
    head: [
      ["Transport Party", "Name / Entity", "Address & Routing Instructions"],
    ],
    body: partiesData,
    theme: "striped",
    styles: { fontSize: 8, cellPadding: 2.2 },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
  });

  // Container Cargo Manifest Table
  const nextY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(10.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("CONTAINER PARTICULARS & VERIFIED GROSS MASS (VGM)", 14, nextY);

  const cargoRows = (
    si?.containerDetails || [
      {
        containerNumber: "MSKU9284712",
        sealNumber: "SL-MAEU-884910",
        tareWeightKg: 3880,
        verifiedGrossMassKg: 24500,
        packagesCount: 1200,
        packageType: "Cartons",
        cargoDescription: activeBooking.commodityDescription,
        hsCode: "8528.59",
      },
    ]
  ).map((c) => [
    c.containerNumber,
    c.sealNumber,
    `${c.verifiedGrossMassKg.toLocaleString()} kg`,
    `${c.packagesCount} ${c.packageType}`,
    c.cargoDescription,
    c.hsCode,
  ]);

  autoTable(doc, {
    startY: nextY + 4,
    head: [
      [
        "Container No.",
        "Seal No.",
        "VGM Gross Wt",
        "Packages",
        "Cargo Description",
        "HS Code",
      ],
    ],
    body: cargoRows,
    theme: "grid",
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255] },
  });

  // Legal disclaimer
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(
    "This document is a certified Draft Ocean Bill of Lading / Sea Waybill generated in compliance with DCSA Transport Document Standards. Received for shipment in apparent external good order and condition.",
    14,
    finalY,
    { maxWidth: 182 },
  );

  doc.save(
    `Draft_BL_${activeBooking.bookingNumber || activeBooking.referenceNumber}.pdf`,
  );
}

/**
 * Generates and downloads the Empty Container Depot Equipment Release Gate Pass PDF.
 */
export function downloadDepotGatePassPdf(activeBooking: OceanBooking): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const release = activeBooking.equipmentRelease;

  // Header styling
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 32, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("EMPTY CONTAINER EQUIPMENT RELEASE ORDER", 14, 14);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Depot Gate Pass | Ref: ${release?.releaseOrderNumber || "REL-PENDING"} | Valid Until: ${release?.validUntil || "2026-10-25"}`,
    14,
    22,
  );

  const depotData = [
    [
      "Carrier & SCAC",
      `${activeBooking.rateLock.carrierName} (${activeBooking.carrierScac})`,
    ],
    [
      "Carrier Booking Number",
      activeBooking.bookingNumber || activeBooking.referenceNumber,
    ],
    ["Depot Facility", release?.depotName || "Intermodal Container Terminal"],
    [
      "Depot Code & Address",
      `${release?.depotCode || "DEPOT-01"} - ${release?.depotAddress || "Gate 4, Terminal Area"}`,
    ],
    [
      "Container Equipment Allotted",
      `${activeBooking.requestedEquipment.quantity}x ${activeBooking.requestedEquipment.isoType} High Cube`,
    ],
    [
      "Assigned Container Seals",
      release?.sealNumbersAllocated.join(", ") || "SL-PENDING",
    ],
    ["DRIVER AUTHORIZATION PIN", release?.pickupPin || "8492"],
    [
      "Status & Validity",
      `${release?.status || "ISSUED"} - Valid through ${release?.validUntil || "2026-10-25"}`,
    ],
  ];

  autoTable(doc, {
    startY: 38,
    head: [["Depot Dispatch Field", "Authorized Terminal Value"]],
    body: depotData,
    theme: "striped",
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
  });

  const pinY = (doc as any).lastAutoTable.finalY + 12;
  doc.setFillColor(241, 245, 249);
  doc.rect(14, pinY, 182, 28, "F");

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("DRIVER TERMINAL GATE INSTRUCTIONS", 20, pinY + 8);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Present Authorization PIN [ ${release?.pickupPin || "8492"} ] and Booking Ref [ ${activeBooking.bookingNumber} ] at Depot Ingate Kiosk.\nConfirm external container inspection and seal integrity before departing terminal gate.`,
    20,
    pinY + 16,
  );

  doc.save(
    `Depot_Gate_Pass_${activeBooking.bookingNumber || activeBooking.referenceNumber}.pdf`,
  );
}
