import { describe, it, expect } from "vitest";
import { GeofenceEngineService } from "./geofence-engine.service.js";

describe("GeofenceEngineService (Haversine & Point-in-Polygon)", () => {
  it("should calculate distance between two coordinates accurately", () => {
    // Barcelona to Valencia: ~350 km
    const barcelona = { lat: 41.3851, lng: 2.1734 };
    const valencia = { lat: 39.4699, lng: -0.3763 };
    const distanceKm =
      GeofenceEngineService.calculateDistanceMeters(barcelona, valencia) / 1000;
    expect(distanceKm).toBeCloseTo(302, -1); // ~302 km
  });

  it("should detect a point inside a circular geofence", () => {
    const portCenter = { lat: 39.4485, lng: -0.3168 }; // Puerto Valencia center
    const vesselInPort = { lat: 39.452, lng: -0.312 }; // Inside port
    const inside = GeofenceEngineService.isInsideCircularGeofence(
      vesselInPort,
      portCenter,
      5000,
    );
    expect(inside).toBe(true);
  });

  it("should detect a point outside a circular geofence", () => {
    const portCenter = { lat: 39.4485, lng: -0.3168 };
    const vesselFarAway = { lat: 37.85, lng: 7.42 }; // Near Sicily, not in Valencia
    const outside = GeofenceEngineService.isInsideCircularGeofence(
      vesselFarAway,
      portCenter,
      5000,
    );
    expect(outside).toBe(false);
  });

  it("should detect a point inside a polygon using Ray-casting", () => {
    const polygon = [
      { lat: 39.462, lng: -0.332 },
      { lat: 39.465, lng: -0.301 },
      { lat: 39.435, lng: -0.298 },
      { lat: 39.431, lng: -0.335 },
    ];
    const pointInside = { lat: 39.448, lng: -0.316 };
    expect(GeofenceEngineService.isInsidePolygon(pointInside, polygon)).toBe(
      true,
    );
  });

  it("should detect a point outside a polygon", () => {
    const polygon = [
      { lat: 39.462, lng: -0.332 },
      { lat: 39.465, lng: -0.301 },
      { lat: 39.435, lng: -0.298 },
      { lat: 39.431, lng: -0.335 },
    ];
    const pointOutside = { lat: 39.5, lng: -0.25 }; // North of the polygon
    expect(GeofenceEngineService.isInsidePolygon(pointOutside, polygon)).toBe(
      false,
    );
  });

  it("should evaluate geofence correctly with polygon JSON", () => {
    const geofence = {
      centerLat: 39.4485,
      centerLng: -0.3168,
      radiusMeters: 4500,
      polygonCoordinatesJson: JSON.stringify([
        [39.462, -0.332],
        [39.465, -0.301],
        [39.435, -0.298],
        [39.431, -0.335],
      ]),
    };
    const pointInside = { lat: 39.448, lng: -0.316 };
    const pointOutside = { lat: 39.51, lng: -0.21 };
    expect(
      GeofenceEngineService.evaluatePointAgainstGeofence(pointInside, geofence),
    ).toBe(true);
    expect(
      GeofenceEngineService.evaluatePointAgainstGeofence(
        pointOutside,
        geofence,
      ),
    ).toBe(false);
  });
});
