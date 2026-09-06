import { describe, it, expect } from "vitest";
import { RoadRouteOptimizerService } from "./route-optimizer.service.js";

describe("RoadRouteOptimizerService", () => {
  it("should calculate trailer floor and payload utilization", () => {
    const res = RoadRouteOptimizerService.planRouteAndSchedule({
      originCity: "Madrid",
      destinationCity: "Valencia",
      distanceKm: 355,
      totalPallets: 33, // Full trailer
      totalGrossWeightKg: 21000,
    });

    expect(res.capacityUtilization.floorUtilizationPct).toBe(100);
    expect(res.capacityUtilization.isPalletOverloaded).toBe(false);
    expect(res.capacityUtilization.payloadUtilizationPct).toBe(87.5); // 21,000 / 24,000
    expect(res.capacityUtilization.isWeightOverloaded).toBe(false);
  });

  it("should calculate tachograph driving hours and mandatory 45-min breaks", () => {
    // 1,180 km at 75 km/h -> 15.73 hours driving -> 3 breaks (after 4.5h, 9h [or daily rest], 13.5h)
    const res = RoadRouteOptimizerService.planRouteAndSchedule({
      originCity: "Madrid",
      destinationCity: "Lyon",
      distanceKm: 1180,
      totalPallets: 28,
      totalGrossWeightKg: 18000,
    });

    expect(res.estimatedDrivingHours).toBe(15.73);
    expect(res.requiredRestBreaksCount).toBe(3);
    expect(res.tachographItinerary.length).toBeGreaterThanOrEqual(4);
    expect(res.tachographItinerary[0].type).toBe("ORIGIN_DEPARTURE");
    expect(
      res.tachographItinerary[res.tachographItinerary.length - 1].type,
    ).toBe("DESTINATION_ARRIVAL");
  });
});
