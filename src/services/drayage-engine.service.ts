/**
 * Drayage Routing & Tariff Engine Service
 *
 * Implements:
 * - OSRM OpenStreetMap routing with automatic geodesic Haversine fallback (100% free / $0 cost)
 * - Nearest maritime terminals & container depot resolver
 * - In-memory route caching for high-speed corridor queries
 */

import {
  calculateHaversineDistanceKm,
  estimateTruckTransitMinutes,
  formatTransitMinutes,
  calculateDrayageCosts,
  calculateDrayageCarbon,
  DrayageContainerType,
  DrayageQuoteResult,
  DrayageCoordinates,
} from "@atlas/shared";
import { db } from "../db/index.js";
import { addresses, AddressType } from "../db/schema/index.js";
import { eq, or, inArray } from "drizzle-orm";

interface OSRMRouteResponse {
  code: string;
  routes?: Array<{
    distance: number; // meters
    duration: number; // seconds
  }>;
}

interface RouteCacheEntry {
  distanceKm: number;
  transitMinutes: number;
  routingEngine: "OSRM_ROAD_NETWORK" | "HAVERSINE_ESTIMATED";
  expiresAt: number;
}

export interface DrayageQuoteRequest {
  originAddressId?: string;
  originCoords?: DrayageCoordinates;
  destinationAddressId?: string;
  destinationCoords?: DrayageCoordinates;
  containerType?: DrayageContainerType;
  cargoWeightKg?: number;
  isDangerousGoods?: boolean;
  requiresGenset?: boolean;
  baseRateEuro?: number;
  perKmRateEuro?: number;
}

export interface NearestTerminalResult {
  id: string;
  companyName: string;
  tradeName?: string | null;
  addressType: AddressType;
  unLocode?: string | null;
  city: string;
  country: string;
  lat: number;
  lon: number;
  distanceKm: number;
  transitMinutes: number;
  transitFormatted: string;
}

class DrayageEngineService {
  private routeCache = new Map<string, RouteCacheEntry>();
  private readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 Hours

  /**
   * Resolves distance and driving duration between two coordinates
   */
  async getRoute(
    origin: DrayageCoordinates,
    destination: DrayageCoordinates,
  ): Promise<{
    distanceKm: number;
    transitMinutes: number;
    transitFormatted: string;
    routingEngine: "OSRM_ROAD_NETWORK" | "HAVERSINE_ESTIMATED";
  }> {
    const cacheKey = `${origin.lat.toFixed(4)},${origin.lon.toFixed(4)}->${destination.lat.toFixed(4)},${destination.lon.toFixed(4)}`;
    const cached = this.routeCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return {
        distanceKm: cached.distanceKm,
        transitMinutes: cached.transitMinutes,
        transitFormatted: formatTransitMinutes(cached.transitMinutes),
        routingEngine: cached.routingEngine,
      };
    }

    // 1. Try OSRM OpenStreetMap Road Network API with 2.0s timeout
    try {
      const oLon = Number(origin.lon);
      const oLat = Number(origin.lat);
      const dLon = Number(destination.lon);
      const dLat = Number(destination.lat);

      // Validate finite numbers and legitimate WGS84 coordinate boundaries
      if (
        Number.isFinite(oLon) &&
        Number.isFinite(oLat) &&
        Number.isFinite(dLon) &&
        Number.isFinite(dLat) &&
        oLat >= -90 &&
        oLat <= 90 &&
        dLat >= -90 &&
        dLat <= 90 &&
        oLon >= -180 &&
        oLon <= 180 &&
        dLon >= -180 &&
        dLon <= 180
      ) {
        const fixedBase = "https://router.project-osrm.org";
        const sanitizedPath = `/route/v1/driving/${encodeURIComponent(oLon.toFixed(6))},${encodeURIComponent(oLat.toFixed(6))};${encodeURIComponent(dLon.toFixed(6))},${encodeURIComponent(dLat.toFixed(6))}`;
        const targetUrl = new URL(sanitizedPath, fixedBase);
        targetUrl.searchParams.set("overview", "false");

        // Verify hostname and protocol to protect against SSRF (CWE-918)
        if (
          targetUrl.protocol === "https:" &&
          targetUrl.hostname === "router.project-osrm.org"
        ) {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000);

          const res = await fetch(targetUrl.href, {
            headers: { "User-Agent": "AtlasLogistics-DrayageEngine/1.0" },
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (res.ok) {
            const json = (await res.json()) as OSRMRouteResponse;
            if (json.code === "Ok" && json.routes && json.routes.length > 0) {
              const r = json.routes[0];
              const distanceKm = Math.round((r.distance / 1000) * 10) / 10;
              // Add 15 mins for terminal gate-in / maneuver
              const transitMinutes = Math.round(r.duration / 60) + 15;

              const entry: RouteCacheEntry = {
                distanceKm,
                transitMinutes,
                routingEngine: "OSRM_ROAD_NETWORK",
                expiresAt: Date.now() + this.CACHE_TTL_MS,
              };
              this.routeCache.set(cacheKey, entry);

              return {
                distanceKm,
                transitMinutes,
                transitFormatted: formatTransitMinutes(transitMinutes),
                routingEngine: "OSRM_ROAD_NETWORK",
              };
            }
          }
        }
      }
    } catch {
      // Graceful fallback to Haversine below
    }

    // 2. Geodesic Haversine Fallback (with 1.28x road tortuosity factor)
    const distanceKm = calculateHaversineDistanceKm(origin, destination);
    const transitMinutes = estimateTruckTransitMinutes(distanceKm);

    const entry: RouteCacheEntry = {
      distanceKm,
      transitMinutes,
      routingEngine: "HAVERSINE_ESTIMATED",
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    };
    this.routeCache.set(cacheKey, entry);

    return {
      distanceKm,
      transitMinutes,
      transitFormatted: formatTransitMinutes(transitMinutes),
      routingEngine: "HAVERSINE_ESTIMATED",
    };
  }

  /**
   * Generates a complete Drayage Quote with route, cost breakdown and GLEC carbon footprint
   */
  async calculateQuote(
    request: DrayageQuoteRequest,
  ): Promise<DrayageQuoteResult> {
    let origin = request.originCoords;
    let destination = request.destinationCoords;

    // Resolve Origin from Database if ID provided
    if (!origin && request.originAddressId) {
      const res = await db
        .select()
        .from(addresses)
        .where(eq(addresses.id, request.originAddressId))
        .limit(1);
      if (res[0] && res[0].lat !== null && res[0].lon !== null) {
        origin = { lat: res[0].lat, lon: res[0].lon };
      }
    }

    // Resolve Destination from Database if ID provided
    if (!destination && request.destinationAddressId) {
      const res = await db
        .select()
        .from(addresses)
        .where(eq(addresses.id, request.destinationAddressId))
        .limit(1);
      if (res[0] && res[0].lat !== null && res[0].lon !== null) {
        destination = { lat: res[0].lat, lon: res[0].lon };
      }
    }

    if (!origin || !destination) {
      throw new Error(
        "Invalid coordinates: both origin and destination must have valid geographical coordinates.",
      );
    }

    const route = await this.getRoute(origin, destination);
    const containerType = request.containerType || "40HC";
    const cargoWeightKg = request.cargoWeightKg || 18500;

    const costs = calculateDrayageCosts({
      distanceKm: route.distanceKm,
      transitMinutes: route.transitMinutes,
      containerType,
      cargoWeightKg,
      isDangerousGoods: request.isDangerousGoods,
      requiresGenset: request.requiresGenset,
      baseRateEuro: request.baseRateEuro,
      perKmRateEuro: request.perKmRateEuro,
    });

    const emissions = calculateDrayageCarbon(route.distanceKm, cargoWeightKg);

    return {
      distanceKm: route.distanceKm,
      transitMinutes: route.transitMinutes,
      transitFormatted: route.transitFormatted,
      routingEngine: route.routingEngine,
      costs,
      emissions,
    };
  }

  /**
   * Finds nearest port terminals or inland depots from given origin
   */
  async findNearestTerminals(
    origin: DrayageCoordinates,
    limit = 5,
  ): Promise<NearestTerminalResult[]> {
    const terminals = await db
      .select()
      .from(addresses)
      .where(
        inArray(addresses.addressType, [
          "TRM",
          "AG",
          "WH",
          "TERMINAL",
          "PORT_AUTHORITY",
          "INLAND_DEPOT",
        ]),
      );

    const valid = terminals.filter(
      (t) => t.lat !== null && t.lon !== null && !isNaN(t.lat) && !isNaN(t.lon),
    );

    const results: NearestTerminalResult[] = [];

    for (const t of valid) {
      const destCoords: DrayageCoordinates = { lat: t.lat!, lon: t.lon! };
      const dist = calculateHaversineDistanceKm(origin, destCoords);
      const mins = estimateTruckTransitMinutes(dist);

      results.push({
        id: t.id,
        companyName: t.companyName,
        tradeName: t.tradeName,
        addressType: t.addressType,
        unLocode: t.unLocode,
        city: t.city,
        country: t.country,
        lat: t.lat!,
        lon: t.lon!,
        distanceKm: dist,
        transitMinutes: mins,
        transitFormatted: formatTransitMinutes(mins),
      });
    }

    results.sort((a, b) => a.distanceKm - b.distanceKm);
    return results.slice(0, limit);
  }
}

export const drayageEngineService = new DrayageEngineService();
