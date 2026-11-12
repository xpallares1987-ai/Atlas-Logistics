/**
 * @file booking-pdf-utils.test.ts
 * @description Unit tests for Ocean Booking PDF generation routines (Draft B/L, EDI 304 SI, Depot Gate Pass)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const saveMock = vi.fn();
const mockDoc = {
  saveGraphicsState: vi.fn(),
  restoreGraphicsState: vi.fn(),
  setFont: vi.fn(),
  setFontSize: vi.fn(),
  setTextColor: vi.fn(),
  setFillColor: vi.fn(),
  rect: vi.fn(),
  text: vi.fn(),
  save: saveMock,
  lastAutoTable: { finalY: 100 },
};

vi.mock("jspdf", () => {
  return {
    jsPDF: vi.fn().mockImplementation(function (this: any) {
      return mockDoc;
    }),
  };
});

vi.mock("jspdf-autotable", () => ({
  default: vi.fn(),
}));

import {
  downloadDraftBLModalPdf,
  downloadShippingInstructionsPdf,
  downloadDepotGatePassPdf,
} from "../packages/frontend/src/utils/booking-pdf.utils";
import type { OceanBooking } from "@atlas/shared";

describe("Booking PDF Utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockBooking: OceanBooking = {
    id: "bk_test_01",
    bookingNumber: "BK-2026-TEST",
    referenceNumber: "BK-2026-TEST",
    carrier: "MSC",
    carrierScac: "MSCU",
    originPort: "ESVLC",
    destinationPort: "USNYC",
    vesselName: "MSC TESTER",
    voyageNumber: "VOY-99",
    commodityDescription: "Test High-Value Cargo",
    status: "CONFIRMED",
    requestedEquipment: {
      isoType: "40HC",
      quantity: 1,
    },
    rateLock: {
      quoteId: "QTE-TEST",
      carrier: "MSC",
      carrierName: "Mediterranean Shipping Company (MSC)",
      carrierScac: "MSCU",
      originPort: "ESVLC",
      destPort: "USNYC",
      containerType: "40HC",
      oceanFreightUsd: 2100,
      bafUsd: 300,
      thcOriginUsd: 150,
      thcDestUsd: 250,
      totalSpotUsd: 2800,
      validityExpiresAt: "2026-11-20T23:59:59Z",
      rateLockToken: "RL-TEST-TOKEN",
      freeTimeDays: 7,
      transitTimeDays: 14,
    },
    cutOffs: {
      cargoCutOff: "2026-11-15T18:00:00Z",
      vgmCutOff: "2026-11-16T12:00:00Z",
      customsCutOff: "2026-11-16T16:00:00Z",
      siCutOff: "2026-11-17T10:00:00Z",
      estimatedDeparture: "2026-11-18T08:00:00Z",
      estimatedArrival: "2026-12-02T14:00:00Z",
    },
    shippingInstructions: {
      bookingReference: "BK-2026-TEST",
      carrierScac: "MSCU",
      shipperName: "Test Shipper Corp",
      shipperAddress: "Calle Test 123, Valencia",
      consigneeName: "Test Consignee Ltd",
      consigneeAddress: "123 Port Blvd, Newark",
      notifyPartyName: "Same as Consignee",
      blType: "WAYBILL",
      freightPaymentTerm: "PREPAID",
      placeOfIssue: "Valencia",
      siStatus: "ACCEPTED",
      containerDetails: [
        {
          containerNumber: "MSKU1234567",
          sealNumber: "SL-TEST-001",
          tareWeightKg: 3880,
          verifiedGrossMassKg: 25000,
          packagesCount: 50,
          packageType: "Pallets",
          cargoDescription: "Test High-Value Cargo",
          hsCode: "8479.89",
        },
      ],
    },
    equipmentRelease: {
      releaseOrderNumber: "REL-TEST-001",
      bookingNumber: "BK-2026-TEST",
      carrier: "MSC",
      carrierScac: "MSCU",
      depotCode: "DEPOT-TEST-01",
      depotName: "Terminal de Contenedores Test",
      depotAddress: "Muelle Test, Valencia",
      containerCount: 1,
      isoType: "40HC",
      validUntil: "2026-11-15",
      pickupPin: "9988",
      qrDigest: "SHA256:TEST-DIGEST",
      status: "ISSUED",
      sealNumbersAllocated: ["SL-TEST-001"],
    },
    createdAt: "2026-11-01T08:00:00Z",
    updatedAt: "2026-11-05T12:00:00Z",
  };

  it("should generate and download Draft BL Modal PDF with SHA-256 watermark", () => {
    downloadDraftBLModalPdf({
      blReference: "BL-TEST-123456",
      trackingNumber: "ATLS-2026-12345",
      bookingReference: "BK-2026-TEST",
      carrierBookingNumber: "CR-998877",
      shipperName: "Atlas Global Imports",
      consigneeName: "European Distribution Hub",
      carrier: "MSC",
      vesselName: "MSC TESTER",
      voyageNumber: "VOY-99",
      origin: "ESVLC",
      destination: "USNYC",
      containerNumber: "MSKU1234567",
      sealNumber: "SL-TEST-001",
      commodity: "Robotics",
      weightKg: 25000,
      equipment: "40HC",
      incoterm: "FOB",
      sha256Hash: "abcdef1234567890abcdef1234567890",
    });

    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(saveMock).toHaveBeenCalledWith("Draft_BL_BL-TEST-123456.pdf");
  });

  it("should generate and download Shipping Instructions Draft BL PDF", () => {
    downloadShippingInstructionsPdf(mockBooking);

    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(saveMock).toHaveBeenCalledWith("Draft_BL_BK-2026-TEST.pdf");
  });

  it("should generate and download Empty Equipment Release Gate Pass PDF", () => {
    downloadDepotGatePassPdf(mockBooking);

    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(saveMock).toHaveBeenCalledWith("Depot_Gate_Pass_BK-2026-TEST.pdf");
  });
});
