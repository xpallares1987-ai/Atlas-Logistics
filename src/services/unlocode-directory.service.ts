/**
 * @file unlocode-directory.service.ts
 * @description Indexed SQLite query service over the full official UNECE UN/LOCODE 2022-2
 * catalog (~115,841 locations) plus ISO 3166-1 country/territory statistics, with automatic
 * fallback to the in-memory trie when running on an unseeded unit-test database.
 * @module @atlas/services/unlocode-directory
 */

import fs from "node:fs";
import path from "node:path";
import { db } from "../db/index.js";
import { unlocodeLocations } from "../db/schema/unlocode.js";
import { and, asc, eq, like, or, sql, SQL } from "drizzle-orm";
import {
  DEFAULT_UNLOCODE_HUBS,
  getUnlocodeStats,
  searchUnlocodes,
} from "@atlas/shared";

export interface UnlocodeSearchItem {
  location: string;
  name: string;
  country: string;
  subdivision?: string;
  functionClassifier?: string;
  isPort?: boolean;
  isRailTerminal?: boolean;
  isAirport?: boolean;
  isMultimodalIcd?: boolean;
  iataCode?: string;
  coordinates?: string;
  latitude?: number | null;
  longitude?: number | null;
  status?: string;
}

export interface UnlocodeCountrySummary {
  code: string;
  name: string;
  totalLocations: number;
  portsCount: number;
  airportsCount: number;
  railTerminalsCount: number;
}

let cachedCountryNames: Map<string, string> | null = null;

function loadCountryNameMap(): Map<string, string> {
  if (cachedCountryNames) return cachedCountryNames;
  const map = new Map<string, string>();
  const filePath = path.resolve(
    process.cwd(),
    "data/catalogs/unlocode-countries-2022-2.json",
  );
  if (fs.existsSync(filePath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as Array<{
        code: string;
        name: string;
      }>;
      for (const row of parsed) {
        map.set(row.code.toUpperCase(), row.name);
      }
    } catch {
      // Ignore parse fallback
    }
  }
  cachedCountryNames = map;
  return map;
}

export async function queryUnlocodeDirectory(options: {
  q?: string;
  country?: string;
  mode?: "port" | "rail" | "road" | "airport" | "icd";
  limit?: number;
}): Promise<{
  items: UnlocodeSearchItem[];
  source: "sqlite_unlocode_2022_2" | "in_memory_fallback";
  totalIndexed: number;
}> {
  const limit = Math.min(100, Math.max(1, options.limit ?? 20));
  const q = (options.q || "").trim();
  const country = (options.country || "").trim().toUpperCase();

  try {
    const countRows = await db
      .select({ cnt: sql<number>`count(*)` })
      .from(unlocodeLocations);
    const totalIndexed = Number(countRows[0]?.cnt ?? 0);

    if (totalIndexed > 0) {
      const conditions: SQL[] = [];

      if (country && country.length === 2) {
        conditions.push(eq(unlocodeLocations.countryCode, country));
      }

      if (options.mode === "port") {
        conditions.push(eq(unlocodeLocations.isPort, true));
      } else if (options.mode === "rail") {
        conditions.push(eq(unlocodeLocations.isRailTerminal, true));
      } else if (options.mode === "road") {
        conditions.push(eq(unlocodeLocations.isRoadTerminal, true));
      } else if (options.mode === "airport") {
        conditions.push(eq(unlocodeLocations.isAirport, true));
      } else if (options.mode === "icd") {
        conditions.push(eq(unlocodeLocations.isMultimodalIcd, true));
      }

      if (q) {
        const upperQ = q.toUpperCase();
        const searchCond = or(
          eq(unlocodeLocations.unLocode, upperQ),
          eq(unlocodeLocations.locationCode, upperQ),
          like(unlocodeLocations.unLocode, `${upperQ}%`),
          like(unlocodeLocations.locationCode, `${upperQ}%`),
          like(unlocodeLocations.nameWoDiacritics, `${q}%`),
          like(unlocodeLocations.name, `%${q}%`),
          eq(unlocodeLocations.iataCode, upperQ),
        );
        if (searchCond) conditions.push(searchCond);
      } else if (!country && !options.mode) {
        // Default quick-view: prioritize major maritime/multimodal hubs
        conditions.push(eq(unlocodeLocations.isPort, true));
        conditions.push(eq(unlocodeLocations.isRailTerminal, true));
      }

      const rows = await db
        .select()
        .from(unlocodeLocations)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(
          q
            ? sql`CASE WHEN ${unlocodeLocations.unLocode} = ${q.toUpperCase()} THEN 0 WHEN ${unlocodeLocations.unLocode} LIKE ${`${q.toUpperCase()}%`} THEN 1 ELSE 2 END`
            : asc(unlocodeLocations.unLocode),
          asc(unlocodeLocations.nameWoDiacritics),
        )
        .limit(limit);

      if (rows.length > 0 || q || country || options.mode) {
        return {
          items: rows.map((r) => ({
            location: r.unLocode,
            name: r.name,
            country: r.countryCode,
            subdivision: r.subdivisionCode || undefined,
            functionClassifier: r.functionClassifier,
            isPort: r.isPort,
            isRailTerminal: r.isRailTerminal,
            isAirport: r.isAirport,
            isMultimodalIcd: r.isMultimodalIcd,
            iataCode: r.iataCode || undefined,
            coordinates: r.rawCoordinates || undefined,
            latitude: r.latitude,
            longitude: r.longitude,
            status: r.status,
          })),
          source: "sqlite_unlocode_2022_2",
          totalIndexed,
        };
      }
    }
  } catch {
    // Fall back to in-memory trie if unlocode_locations table is unavailable
  }

  const fallbackList = q
    ? searchUnlocodes(q, country || undefined, limit)
    : DEFAULT_UNLOCODE_HUBS.slice(0, limit);

  return {
    items: fallbackList.map((item) => ({
      location: item.location,
      name: item.name,
      country: item.country,
      coordinates: item.coordinates,
      status: item.status,
    })),
    source: "in_memory_fallback",
    totalIndexed: getUnlocodeStats().totalEntries,
  };
}

export async function getUnlocodeCountrySummaries(): Promise<{
  totalCountries: number;
  totalLocations: number;
  countries: UnlocodeCountrySummary[];
}> {
  const nameMap = loadCountryNameMap();
  const rows = await db
    .select({
      countryCode: unlocodeLocations.countryCode,
      totalLocations: sql<number>`count(*)`,
      portsCount: sql<number>`sum(case when ${unlocodeLocations.isPort} = 1 then 1 else 0 end)`,
      airportsCount: sql<number>`sum(case when ${unlocodeLocations.isAirport} = 1 then 1 else 0 end)`,
      railTerminalsCount: sql<number>`sum(case when ${unlocodeLocations.isRailTerminal} = 1 then 1 else 0 end)`,
    })
    .from(unlocodeLocations)
    .groupBy(unlocodeLocations.countryCode)
    .orderBy(asc(unlocodeLocations.countryCode));

  let totalLocations = 0;
  const countries: UnlocodeCountrySummary[] = rows.map((r) => {
    const cnt = Number(r.totalLocations || 0);
    totalLocations += cnt;
    const code = r.countryCode.toUpperCase();
    return {
      code,
      name: nameMap.get(code) || code,
      totalLocations: cnt,
      portsCount: Number(r.portsCount || 0),
      airportsCount: Number(r.airportsCount || 0),
      railTerminalsCount: Number(r.railTerminalsCount || 0),
    };
  });

  return {
    totalCountries: countries.length,
    totalLocations,
    countries,
  };
}
