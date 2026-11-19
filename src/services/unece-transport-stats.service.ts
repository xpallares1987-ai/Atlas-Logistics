/**
 * @file unece-transport-stats.service.ts
 * @description Live zero-cost UNECE PX-Web REST client (STAT__40-TRTRANS) and SQLite query
 * service for Road, Rail, Inland Waterway freight tonne-km and Transport Infrastructure datasets.
 * @module @atlas/services/unece-transport-stats
 * @see {@link https://w3.unece.org/PXWeb2015/pxweb/en/STAT/STAT__40-TRTRANS/}
 */

import fs from "node:fs";
import path from "node:path";
import { db } from "../db/index.js";
import {
  uneceTransportStatistics,
  NewUneceTransportStatistic,
} from "../db/schema/unece_standards.js";
import { and, desc, eq, gte, lte, SQL } from "drizzle-orm";

const PXWEB_BASE_URL =
  "https://w3.unece.org/PXWeb2015/api/v1/en/STAT/40-TRTRANS";

export const UNECE_CORRIDOR_COUNTRIES: ReadonlyArray<{
  m49: string;
  iso2: string;
  name: string;
}> = [
  { m49: "724", iso2: "ES", name: "Spain" },
  { m49: "276", iso2: "DE", name: "Germany" },
  { m49: "528", iso2: "NL", name: "Netherlands" },
  { m49: "250", iso2: "FR", name: "France" },
  { m49: "056", iso2: "BE", name: "Belgium" },
  { m49: "380", iso2: "IT", name: "Italy" },
  { m49: "616", iso2: "PL", name: "Poland" },
  { m49: "826", iso2: "GB", name: "United Kingdom" },
  { m49: "840", iso2: "US", name: "United States" },
] as const;

interface PxDatasetConfig {
  datasetCode: string;
  transportMode: "ROAD" | "RAIL" | "INLAND_WATERWAY" | "INFRASTRUCTURE";
  tablePath: string;
  metricLabel: string;
  unit: string;
  fixedFilters: Array<{ code: string; values: string[] }>;
}

const UNECE_DATASETS: readonly PxDatasetConfig[] = [
  {
    datasetCode: "TRROAD_GOODS_TKM",
    transportMode: "ROAD",
    tablePath: "02-TRROAD/03_en_TRRoadGoodsTkm_r.px",
    metricLabel: "Road Freight Goods Transport",
    unit: "Million tonne-km",
    fixedFilters: [
      { code: "Type of goods transport", values: ["TR.658"] },
      { code: "Topic", values: ["TR.8"] },
    ],
  },
  {
    datasetCode: "TRRAIL_GOODS_TKM",
    transportMode: "RAIL",
    tablePath: "05-TRRAIL/02_en_TRrailtonneskm_r.px",
    metricLabel: "Rail Freight Goods Transport",
    unit: "Million tonne-km",
    fixedFilters: [
      { code: "Type of transport", values: ["TR.646"] },
      { code: "Topic", values: ["TR.8"] },
    ],
  },
  {
    datasetCode: "TRINLWATER_TKM",
    transportMode: "INLAND_WATERWAY",
    tablePath: "09-TRInlWater/01_en_TRInlWaterTonKm_r.px",
    metricLabel: "Inland Waterway Freight Transport",
    unit: "Million tonne-km",
    fixedFilters: [
      { code: "Type of transport", values: ["TR.727"] },
      { code: "Topic", values: ["TR.8"] },
    ],
  },
  {
    datasetCode: "TRINFRA_RAIL_KM",
    transportMode: "INFRASTRUCTURE",
    tablePath: "11-TRINFRA/ZZZ_en_TRRailInfra1_r.px",
    metricLabel: "Total Railway Lines Operated",
    unit: "km",
    fixedFilters: [{ code: "Type of Track", values: ["TR.4"] }],
  },
  {
    datasetCode: "TRINFRA_MOTORWAY_KM",
    transportMode: "INFRASTRUCTURE",
    tablePath: "11-TRINFRA/ZZZ_en_TRInfraRoad_r.px",
    metricLabel: "Total Motorways Length",
    unit: "km",
    fixedFilters: [{ code: "Type of Road", values: ["TR.386"] }],
  },
] as const;

interface PxMetadataVariable {
  code: string;
  values: string[];
  valueTexts: string[];
}

interface PxJsonRow {
  key: string[];
  values: string[];
}

/**
 * Fetches live statistics from the UNECE PX-Web REST API (STAT__40-TRTRANS)
 * and upserts all numeric observations into SQLite `unece_transport_statistics`.
 */
export async function syncUneceTransportStatistics(options?: {
  writeSnapshotPath?: string;
}): Promise<{
  syncedCount: number;
  datasetsProcessed: string[];
  fetchedAt: string;
}> {
  const fetchedAt = new Date();
  const collected: NewUneceTransportStatistic[] = [];
  const datasetsProcessed: string[] = [];

  for (const ds of UNECE_DATASETS) {
    const url = `${PXWEB_BASE_URL}/${ds.tablePath}`;
    const metaRes = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!metaRes.ok) {
      throw new Error(
        `UNECE PX-Web metadata request failed (${metaRes.status}) for ${ds.tablePath}`,
      );
    }
    const meta = (await metaRes.json()) as {
      variables: PxMetadataVariable[];
    };

    const countryVar = meta.variables.find((v) => v.code === "Country");
    const yearVar = meta.variables.find((v) => v.code === "Year");
    if (!countryVar || !yearVar) continue;

    const availableCountries = UNECE_CORRIDOR_COUNTRIES.filter((c) =>
      countryVar.values.includes(c.m49),
    );
    const m49ToCountry = new Map(
      availableCountries.map((c) => [c.m49, c] as const),
    );

    // Take latest 10 years available in the table
    const yearSliceStart = Math.max(0, yearVar.values.length - 10);
    const selectedYearCodes = yearVar.values.slice(yearSliceStart);
    const yearCodeToLabel = new Map<string, number>();
    for (let i = yearSliceStart; i < yearVar.values.length; i++) {
      const parsedYear = parseInt(yearVar.valueTexts[i] || "", 10);
      if (!Number.isNaN(parsedYear)) {
        yearCodeToLabel.set(yearVar.values[i], parsedYear);
      }
    }

    const queryBody = {
      query: [
        ...ds.fixedFilters.map((f) => ({
          code: f.code,
          selection: { filter: "item", values: f.values },
        })),
        {
          code: "Country",
          selection: {
            filter: "item",
            values: availableCountries.map((c) => c.m49),
          },
        },
        {
          code: "Year",
          selection: { filter: "item", values: selectedYearCodes },
        },
      ],
      response: { format: "json" },
    };

    const dataRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(queryBody),
    });
    if (!dataRes.ok) {
      throw new Error(
        `UNECE PX-Web query failed (${dataRes.status}) for ${ds.tablePath}`,
      );
    }

    const payload = (await dataRes.json()) as {
      columns: Array<{ code: string; type: string }>;
      data: PxJsonRow[];
    };

    const keyCols = payload.columns.filter((c) => c.type !== "c");
    const countryIdx = keyCols.findIndex((c) => c.code === "Country");
    const yearIdx = keyCols.findIndex((c) => c.code === "Year");

    for (const row of payload.data || []) {
      const rawVal = row.values?.[0];
      if (!rawVal || rawVal === ".." || rawVal === "-" || rawVal === ".") {
        continue;
      }
      const numericVal = Number(rawVal);
      if (!Number.isFinite(numericVal)) continue;

      const m49 = row.key[countryIdx];
      const yCode = row.key[yearIdx];
      const country = m49ToCountry.get(m49);
      const year = yearCodeToLabel.get(yCode);
      if (!country || !year) continue;

      const id = `${ds.datasetCode}_${country.iso2}_${year}`;
      collected.push({
        id,
        datasetCode: ds.datasetCode,
        transportMode: ds.transportMode,
        countryCode: country.iso2,
        countryName: country.name,
        year,
        metricLabel: ds.metricLabel,
        value: Math.round(numericVal * 100) / 100,
        unit: ds.unit,
        sourceTableId: ds.tablePath,
        fetchedAt,
        createdAt: fetchedAt,
        updatedAt: fetchedAt,
      });
    }
    datasetsProcessed.push(ds.datasetCode);
  }

  for (const record of collected) {
    await db
      .insert(uneceTransportStatistics)
      .values(record)
      .onConflictDoUpdate({
        target: uneceTransportStatistics.id,
        set: {
          value: record.value,
          fetchedAt: record.fetchedAt,
          updatedAt: fetchedAt,
        },
      });
  }

  if (options?.writeSnapshotPath && collected.length > 0) {
    const dir = path.dirname(options.writeSnapshotPath);
    fs.mkdirSync(dir, { recursive: true });
    const serializable = collected.map((c) => ({
      id: c.id,
      datasetCode: c.datasetCode,
      transportMode: c.transportMode,
      countryCode: c.countryCode,
      countryName: c.countryName,
      year: c.year,
      metricLabel: c.metricLabel,
      value: c.value,
      unit: c.unit,
      sourceTableId: c.sourceTableId,
      fetchedAt: fetchedAt.toISOString(),
    }));
    fs.writeFileSync(
      options.writeSnapshotPath,
      JSON.stringify(serializable, null, 2),
      "utf8",
    );
  }

  return {
    syncedCount: collected.length,
    datasetsProcessed,
    fetchedAt: fetchedAt.toISOString(),
  };
}

/**
 * Seeds SQLite `unece_transport_statistics` deterministically from the committed
 * verified UNECE PX-Web snapshot JSON (zero network dependency in CI/tests).
 */
export async function seedUneceTransportStatsFromSnapshot(): Promise<number> {
  const snapshotPath = path.resolve(
    process.cwd(),
    "data/catalogs/unece-transport-stats-snapshot.json",
  );
  if (!fs.existsSync(snapshotPath)) {
    return 0;
  }

  const rows = JSON.parse(fs.readFileSync(snapshotPath, "utf8")) as Array<{
    id: string;
    datasetCode: string;
    transportMode: string;
    countryCode: string;
    countryName: string;
    year: number;
    metricLabel: string;
    value: number;
    unit: string;
    sourceTableId: string;
    fetchedAt: string;
  }>;

  const now = new Date();
  for (const r of rows) {
    await db
      .insert(uneceTransportStatistics)
      .values({
        id: r.id,
        datasetCode: r.datasetCode,
        transportMode: r.transportMode,
        countryCode: r.countryCode,
        countryName: r.countryName,
        year: r.year,
        metricLabel: r.metricLabel,
        value: r.value,
        unit: r.unit,
        sourceTableId: r.sourceTableId,
        fetchedAt: new Date(r.fetchedAt || now.toISOString()),
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: uneceTransportStatistics.id,
        set: {
          value: r.value,
          updatedAt: now,
        },
      });
  }

  return rows.length;
}

/**
 * Queries SQLite `unece_transport_statistics` with optional mode, country, and year bounds.
 */
export async function queryUneceTransportStatistics(filters: {
  mode?: string;
  country?: string;
  yearFrom?: number;
  yearTo?: number;
}) {
  const conditions: SQL[] = [];
  if (filters.mode && filters.mode !== "ALL") {
    conditions.push(
      eq(uneceTransportStatistics.transportMode, filters.mode.toUpperCase()),
    );
  }
  if (filters.country && filters.country !== "ALL") {
    conditions.push(
      eq(uneceTransportStatistics.countryCode, filters.country.toUpperCase()),
    );
  }
  if (typeof filters.yearFrom === "number" && !Number.isNaN(filters.yearFrom)) {
    conditions.push(gte(uneceTransportStatistics.year, filters.yearFrom));
  }
  if (typeof filters.yearTo === "number" && !Number.isNaN(filters.yearTo)) {
    conditions.push(lte(uneceTransportStatistics.year, filters.yearTo));
  }

  const rows = await db
    .select()
    .from(uneceTransportStatistics)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(
      desc(uneceTransportStatistics.year),
      uneceTransportStatistics.countryCode,
    );

  // Compute latest available modal split summary per mode for the selected country (or ES default)
  const targetCountry =
    filters.country && filters.country !== "ALL"
      ? filters.country.toUpperCase()
      : "ES";
  const countryRows = rows.filter((r) => r.countryCode === targetCountry);
  const latestByDataset = new Map<string, (typeof rows)[number]>();
  for (const r of countryRows) {
    if (!latestByDataset.has(r.datasetCode)) {
      latestByDataset.set(r.datasetCode, r);
    }
  }

  const roadTkm = latestByDataset.get("TRROAD_GOODS_TKM")?.value ?? 0;
  const railTkm = latestByDataset.get("TRRAIL_GOODS_TKM")?.value ?? 0;
  const iwwTkm = latestByDataset.get("TRINLWATER_TKM")?.value ?? 0;
  const totalTkm = roadTkm + railTkm + iwwTkm;

  return {
    count: rows.length,
    countryHighlight: targetCountry,
    modalSplit: {
      roadMillionTkm: roadTkm,
      railMillionTkm: railTkm,
      inlandWaterwayMillionTkm: iwwTkm,
      roadSharePct:
        totalTkm > 0 ? Math.round((roadTkm / totalTkm) * 1000) / 10 : 0,
      railSharePct:
        totalTkm > 0 ? Math.round((railTkm / totalTkm) * 1000) / 10 : 0,
      iwwSharePct:
        totalTkm > 0 ? Math.round((iwwTkm / totalTkm) * 1000) / 10 : 0,
      railInfraKm: latestByDataset.get("TRINFRA_RAIL_KM")?.value ?? 0,
      motorwayInfraKm: latestByDataset.get("TRINFRA_MOTORWAY_KM")?.value ?? 0,
      latestYear:
        latestByDataset.get("TRROAD_GOODS_TKM")?.year ??
        latestByDataset.get("TRRAIL_GOODS_TKM")?.year ??
        null,
    },
    data: rows,
  };
}
