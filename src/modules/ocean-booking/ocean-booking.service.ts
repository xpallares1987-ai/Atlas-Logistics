/**
 * @file ocean-booking.service.ts
 * @description Orchestration service for Autonomous Multi-Carrier Ocean Booking Engine,
 * DCSA Booking API v2.0, ANSI X12 EDI 301/304, and Container Equipment Release Orders.
 */

import {
  OceanBooking,
  RateLockQuote,
  ShippingInstructionData,
  EquipmentReleaseOrder,
  CarrierCode,
  ContainerIsoType,
  CARRIER_METADATA,
  OCEAN_BOOKING_PRESETS,
  generateDCSABookingPayload,
  generateEDI301Transaction,
  generateEDI304ShippingInstruction,
  generateEquipmentReleaseOrder,
} from "@atlas/shared";

export class OceanBookingService {
  private bookings: OceanBooking[] = JSON.parse(JSON.stringify(OCEAN_BOOKING_PRESETS));

  /**
   * Retrieves all active ocean bookings.
   */
  public getBookings(): OceanBooking[] {
    return this.bookings;
  }

  /**
   * Retrieves demonstration presets.
   */
  public getPresets(): OceanBooking[] {
    return OCEAN_BOOKING_PRESETS;
  }

  /**
   * Generates live multi-carrier spot rate lock quotes with 15-minute binding countdown.
   */
  public getLiveRateLocks(originPort = "CNSHA", destPort = "USLAX", containerType: ContainerIsoType = "40HC"): RateLockQuote[] {
    const carriers: { code: CarrierCode; baseOcean: number; baf: number; freeDays: number; transitDays: number }[] = [
      { code: "MAERSK", baseOcean: 2150, baf: 320, freeDays: 5, transitDays: 14 },
      { code: "MSC", baseOcean: 2080, baf: 340, freeDays: 6, transitDays: 15 },
      { code: "CMA_CGM", baseOcean: 2120, baf: 310, freeDays: 7, transitDays: 16 },
      { code: "HAPAG_LLOYD", baseOcean: 2200, baf: 290, freeDays: 7, transitDays: 13 },
      { code: "ONE", baseOcean: 2100, baf: 330, freeDays: 5, transitDays: 15 },
    ];

    const validityExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    return carriers.map((c) => {
      const meta = CARRIER_METADATA[c.code];
      const thcOrigin = 140;
      const thcDest = 280;
      const totalSpot = c.baseOcean + c.baf + thcOrigin + thcDest;
      return {
        quoteId: `QTE-${meta.scac}-${originPort}-${destPort}-${Date.now().toString(36).slice(-4)}`,
        carrier: c.code,
        carrierName: meta.name,
        carrierScac: meta.scac,
        originPort,
        destPort,
        containerType,
        oceanFreightUsd: c.baseOcean,
        bafUsd: c.baf,
        thcOriginUsd: thcOrigin,
        thcDestUsd: thcDest,
        totalSpotUsd: totalSpot,
        validityExpiresAt,
        rateLockToken: `RL-${meta.scac}-${Date.now().toString(36).toUpperCase()}`,
        freeTimeDays: c.freeDays,
        transitTimeDays: c.transitDays,
      };
    });
  }

  /**
   * Submits a new booking request and generates booking confirmation and cut-off deadlines.
   */
  public createBookingRequest(params: {
    carrier: CarrierCode;
    originPort: string;
    destinationPort: string;
    commodityDescription: string;
    isoType: ContainerIsoType;
    quantity: number;
    rateLockToken?: string;
  }): OceanBooking {
    const meta = CARRIER_METADATA[params.carrier];
    const bkgNumber = `${meta.scac}-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const refNumber = `ATL-BKG-${params.originPort}-${params.destinationPort}-${Date.now().toString(36).toUpperCase()}`;

    const now = Date.now();
    const cutOffs = {
      cargoCutOff: new Date(now + 48 * 60 * 60 * 1000).toISOString(),
      vgmCutOff: new Date(now + 36 * 60 * 60 * 1000).toISOString(),
      siCutOff: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
      customsCutOff: new Date(now + 40 * 60 * 60 * 1000).toISOString(),
      estimatedDeparture: new Date(now + 72 * 60 * 60 * 1000).toISOString(),
      estimatedArrival: new Date(now + 16 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const rateLock: RateLockQuote = {
      quoteId: `QTE-${meta.scac}-${Date.now().toString(36)}`,
      carrier: params.carrier,
      carrierName: meta.name,
      carrierScac: meta.scac,
      originPort: params.originPort,
      destPort: params.destinationPort,
      containerType: params.isoType,
      oceanFreightUsd: 2150,
      bafUsd: 320,
      thcOriginUsd: 140,
      thcDestUsd: 280,
      totalSpotUsd: 2890,
      validityExpiresAt: new Date(now + 15 * 60 * 1000).toISOString(),
      rateLockToken: params.rateLockToken || `RL-${meta.scac}-${Date.now().toString(36).toUpperCase()}`,
      freeTimeDays: 7,
      transitTimeDays: 14,
    };

    const newBooking: OceanBooking = {
      id: `bkg-${Date.now().toString(36)}`,
      referenceNumber: refNumber,
      bookingNumber: bkgNumber,
      carrier: params.carrier,
      carrierScac: meta.scac,
      status: "CONFIRMED",
      originPort: params.originPort,
      destinationPort: params.destinationPort,
      vesselName: `${meta.name.split(" ")[0].toUpperCase()} RESOLUTION`,
      voyageNumber: `${new Date().getFullYear().toString().slice(2)}01E`,
      commodityDescription: params.commodityDescription,
      requestedEquipment: {
        isoType: params.isoType,
        quantity: params.quantity,
      },
      rateLock,
      cutOffs,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    newBooking.equipmentRelease = generateEquipmentReleaseOrder(newBooking, {
      depotCode: `${params.originPort}-DEPOT-1`,
      depotName: `${meta.name} Terminal & Depot Logistics`,
      depotAddress: `Gate Terminal Zone, Port of ${params.originPort}`,
    });

    this.bookings.unshift(newBooking);
    return newBooking;
  }

  /**
   * Submits Shipping Instructions (EDI 304 / DCSA) for an existing confirmed booking.
   */
  public submitShippingInstructions(
    bookingId: string,
    siData: Omit<ShippingInstructionData, "bookingReference" | "carrierScac" | "siStatus" | "submissionTimestamp">
  ): { booking: OceanBooking; edi304Payload: string } {
    const booking = this.bookings.find((b) => b.id === bookingId || b.bookingNumber === bookingId);
    if (!booking) {
      throw new Error(`Booking ${bookingId} not found`);
    }

    const fullSI: ShippingInstructionData = {
      ...siData,
      bookingReference: booking.bookingNumber || booking.referenceNumber,
      carrierScac: booking.carrierScac,
      submissionTimestamp: new Date().toISOString(),
      siStatus: "ACCEPTED",
    };

    booking.shippingInstructions = fullSI;
    booking.status = "SI_SUBMITTED";
    booking.updatedAt = new Date().toISOString();

    const edi304Payload = generateEDI304ShippingInstruction(fullSI);

    return { booking, edi304Payload };
  }

  /**
   * Issues Empty Equipment Release Order for an ocean booking.
   */
  public issueEquipmentRelease(
    bookingId: string,
    depotInfo?: { depotCode?: string; depotName?: string; depotAddress?: string }
  ): { booking: OceanBooking; releaseOrder: EquipmentReleaseOrder } {
    const booking = this.bookings.find((b) => b.id === bookingId || b.bookingNumber === bookingId);
    if (!booking) {
      throw new Error(`Booking ${bookingId} not found`);
    }

    const releaseOrder = generateEquipmentReleaseOrder(booking, depotInfo);
    booking.equipmentRelease = releaseOrder;
    booking.status = "ALLOCATED";
    booking.updatedAt = new Date().toISOString();

    return { booking, releaseOrder };
  }
}

export const oceanBookingService = new OceanBookingService();
