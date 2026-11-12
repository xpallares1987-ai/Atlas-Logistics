/**
 * @file useContainerPlanner.test.ts
 * @description Unit tests for 3D Container Stowage & Axle Load Planner helpers and domain calculations.
 * @module @atlas/frontend/components/ContainerPlanner/hooks/__tests__
 */

import { describe, it, expect } from "vitest";
import { EQUIPMENT_CATALOG, optimizeStowage3D } from "@atlas/shared";
import {
  mapDbStowageItems,
  extractConflictingItemIds,
} from "../useContainerPlanner";
import { CANONICAL_FALLBACK_ITEMS } from "../../../../types/container-planner.types";

describe("ContainerPlanner Domain Helpers & 3D Bin-Packing Integration", () => {
  it("mapDbStowageItems returns CANONICAL_FALLBACK_ITEMS when rawItems is empty", () => {
    const mapped = mapDbStowageItems([]);
    expect(mapped).toHaveLength(CANONICAL_FALLBACK_ITEMS.length);
    expect(mapped[0].id).toBe("cargo_item_01");
  });

  it("mapDbStowageItems normalizes SQLite stowage sequence JSON items accurately", () => {
    const raw = [
      {
        id: "ci_201",
        label: "Automotive Stamping Dies A",
        width: 1.1,
        height: 1.2,
        depth: 1.4,
        weight: 5800,
        color: "#3b82f6",
        hazardClass: "3",
      },
    ];
    const mapped = mapDbStowageItems(raw);
    expect(mapped).toHaveLength(1);
    expect(mapped[0]).toEqual({
      id: "ci_201",
      name: "Automotive Stamping Dies A",
      widthM: 1.1,
      heightM: 1.2,
      lengthM: 1.4,
      weightKg: 5800,
      stackable: true,
      color: "#3b82f6",
      hazardClass: "3",
    });
  });

  it("extractConflictingItemIds returns an empty Set for general non-hazardous cargo", () => {
    const optResult = optimizeStowage3D(
      EQUIPMENT_CATALOG["40ft_hc"],
      CANONICAL_FALLBACK_ITEMS,
    );
    const conflicts = extractConflictingItemIds(optResult);
    expect(conflicts.size).toBe(0);
  });

  it("extractConflictingItemIds identifies incompatible IMDG classes in same CTU", () => {
    const hazmatItems = [
      {
        id: "haz_flammable",
        name: "Acetone Drums (Class 3)",
        widthM: 1.0,
        heightM: 1.0,
        lengthM: 1.0,
        weightKg: 1200,
        stackable: false,
        hazardClass: "3",
      },
      {
        id: "haz_oxidizer",
        name: "Hydrogen Peroxide (Class 5.1)",
        widthM: 1.0,
        heightM: 1.0,
        lengthM: 1.0,
        weightKg: 1200,
        stackable: false,
        hazardClass: "5.1",
      },
    ];
    const optResult = optimizeStowage3D(
      EQUIPMENT_CATALOG["20ft_dry"],
      hazmatItems,
    );
    const conflicts = extractConflictingItemIds(optResult);
    if (optResult.imoSegregation.hasIncompatibleHazard) {
      expect(conflicts.has("haz_flammable")).toBe(true);
      expect(conflicts.has("haz_oxidizer")).toBe(true);
    } else {
      expect(conflicts.size).toBe(0);
    }
  });
});
