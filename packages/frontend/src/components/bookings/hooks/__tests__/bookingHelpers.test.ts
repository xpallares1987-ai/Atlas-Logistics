/**
 * @file bookingHelpers.test.ts
 * @description Unit tests for Ocean Booking relational mapping, countdown formatting, and spot quote generation.
 * @module @atlas/frontend/components/bookings/hooks/__tests__
 */

import { describe, it, expect } from "vitest";
import {
  CANONICAL_FALLBACK_OCEAN_BOOKING,
  mapDbToOceanBooking,
  formatCountdown,
  buildRateLockQuotes,
} from "../bookingHelpers";

describe("bookingHelpers", () => {
  it("returns CANONICAL_FALLBACK_OCEAN_BOOKING when detail and parentBooking are null", () => {
    const result = mapDbToOceanBooking(null, null);
    expect(result.id).toBe(CANONICAL_FALLBACK_OCEAN_BOOKING.id);
    expect(result.bookingNumber).toBe("BK-2026-67116");
    expect(result.carrierScac).toBe("MSCU");
  });

  it("maps SQLite detail and parentBooking into a strongly typed OceanBooking", () => {
    const detail = {
      bookingId: "bk_test_99",
      carrierScac: "MAEU",
      siStatus: "CONFIRMED",
      vgmJson: JSON.stringify({
        sealNumber: "SEAL-991",
        verifiedGrossMassKg: 24100,
      }),
    };
    const parentBooking = {
      id: "bk_test_99",
      referenceNumber: "BK-2026-99100",
      origin: "CNSHA",
      destination: "ESBCN",
      equipment: "40HC",
      cargoDetails: JSON.stringify({
        containerNumber: "MAEU1234567",
        description: "Solar Inverters",
      }),
    };
    const mapped = mapDbToOceanBooking(detail, parentBooking);
    expect(mapped.id).toBe("bk_test_99");
    expect(mapped.carrier).toBe("MAERSK");
    expect(mapped.shippingInstructions?.siStatus).toBe("ACCEPTED");
    expect(
      mapped.shippingInstructions?.containerDetails[0]?.containerNumber,
    ).toBe("MAEU1234567");
    expect(
      mapped.shippingInstructions?.containerDetails[0]?.verifiedGrossMassKg,
    ).toBe(24100);
  });

  it("formats countdown seconds into MM:SS", () => {
    expect(formatCountdown(882)).toBe("14:42");
    expect(formatCountdown(65)).toBe("01:05");
    expect(formatCountdown(0)).toBe("00:00");
  });

  it("builds 5 multi-carrier spot rate quotes", () => {
    const quotes = buildRateLockQuotes("ESVLC", "USNYC", "40HC", 600);
    expect(quotes).toHaveLength(5);
    expect(quotes[0]?.originPort).toBe("ESVLC");
    expect(quotes[0]?.destPort).toBe("USNYC");
    expect(quotes[0]?.totalSpotUsd).toBeGreaterThan(2000);
  });
});
