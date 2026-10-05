import { describe, it, expect } from "vitest";
import {
  calculateShipmentRisk,
  getRiskBadgeStyles,
} from "./risk-scorer";

describe("Shipment Risk Scorer Suite", () => {
  it("should evaluate low risk for shipments with standard parameters", () => {
    const risk = calculateShipmentRisk({
      originPort: "ESVLC",
      destinationPort: "ESBCN",
      type: "ROAD",
      priority: "NORMAL",
      status: "intransit",
    });

    expect(risk.score).toBeLessThan(45);
    expect(risk.level === "Low" || risk.level === "Medium").toBe(true);
    expect(risk.mitigations.length).toBeGreaterThan(0);
  });

  it("should detect high political risk for Red Sea transit corridor", () => {
    const risk = calculateShipmentRisk({
      originPort: "SGSIN",
      destinationPort: "NLRTM",
      type: "SEA",
      priority: "HIGH",
      status: "intransit",
    });

    expect(risk.politicalRisk).toBe(30);
    expect(risk.score).toBeGreaterThanOrEqual(45);
    expect(risk.reasons.some((r) => r.includes("Red Sea"))).toBe(true);
    expect(risk.mitigations.some((m) => m.includes("Cape of Good Hope"))).toBe(true);
  });

  it("should detect weather and port delay hazards for Pacific route to LA", () => {
    const risk = calculateShipmentRisk({
      originPort: "CNSHA",
      destinationPort: "USLAX",
      type: "SEA",
      priority: "HIGH",
      status: "delayed",
    });

    expect(risk.weatherRisk).toBe(28);
    expect(risk.portDelayRisk).toBe(29);
    expect(risk.statusRisk).toBe(12);
    expect(risk.score).toBeGreaterThanOrEqual(75);
    expect(risk.level).toBe("Critical");
    expect(risk.reasons.some((r) => r.includes("Super Typhoon"))).toBe(true);
    expect(risk.reasons.some((r) => r.includes("Crane Operators"))).toBe(true);
  });

  it("should provide appropriate Tailwind badge style tokens for all levels", () => {
    const criticalBadge = getRiskBadgeStyles(85);
    expect(criticalBadge.bg).toContain("red");
    expect(criticalBadge.text).toContain("red");

    const highBadge = getRiskBadgeStyles(55);
    expect(highBadge.bg).toContain("amber");

    const mediumBadge = getRiskBadgeStyles(30);
    expect(mediumBadge.bg).toContain("blue");

    const lowBadge = getRiskBadgeStyles(10);
    expect(lowBadge.bg).toContain("emerald");
  });
});
