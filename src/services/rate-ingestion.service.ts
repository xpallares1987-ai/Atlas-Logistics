import { v4 as uuidv4 } from "uuid";
import { db } from "../db/index.js";
import {
  rates,
  lanes,
  addresses,
  locations,
  locationAliases,
  rateImportBatches,
  surcharges,
} from "../db/schema/index.js";
import { eq, and, or, sql } from "drizzle-orm";
import { redis } from "../config/redis.js";
import { logger } from "../config/logger.js";

// Common UN/LOCODE seed dictionary for instant matching
const SEED_PORT_MAP: Record<string, { locode: string; name: string }> = {
  // Spain
  ESBCN: { locode: "ESBCN", name: "Barcelona" },
  BARCELONA: { locode: "ESBCN", name: "Barcelona" },
  BCN: { locode: "ESBCN", name: "Barcelona" },
  ESVLC: { locode: "ESVLC", name: "Valencia" },
  VALENCIA: { locode: "ESVLC", name: "Valencia" },
  VLC: { locode: "ESVLC", name: "Valencia" },
  ESALG: { locode: "ESALG", name: "Algeciras" },
  ALGECIRAS: { locode: "ESALG", name: "Algeciras" },
  ESBIO: { locode: "ESBIO", name: "Bilbao" },
  BILBAO: { locode: "ESBIO", name: "Bilbao" },
  ESVGO: { locode: "ESVGO", name: "Vigo" },
  VIGO: { locode: "ESVGO", name: "Vigo" },

  // Northern Europe
  NLRTM: { locode: "NLRTM", name: "Rotterdam" },
  ROTTERDAM: { locode: "NLRTM", name: "Rotterdam" },
  RTM: { locode: "NLRTM", name: "Rotterdam" },
  BEANR: { locode: "BEANR", name: "Antwerp" },
  ANTWERP: { locode: "BEANR", name: "Antwerp" },
  ANR: { locode: "BEANR", name: "Antwerp" },
  DEHAM: { locode: "DEHAM", name: "Hamburg" },
  HAMBURG: { locode: "DEHAM", name: "Hamburg" },
  HAM: { locode: "DEHAM", name: "Hamburg" },
  DEBRV: { locode: "DEBRV", name: "Bremerhaven" },
  BREMERHAVEN: { locode: "DEBRV", name: "Bremerhaven" },
  FRLEH: { locode: "FRLEH", name: "Le Havre" },
  LEHAVRE: { locode: "FRLEH", name: "Le Havre" },
  GBFXT: { locode: "GBFXT", name: "Felixstowe" },
  FELIXSTOWE: { locode: "GBFXT", name: "Felixstowe" },

  // Asia - China & Hubs
  CNSHA: { locode: "CNSHA", name: "Shanghai" },
  SHANGHAI: { locode: "CNSHA", name: "Shanghai" },
  SHA: { locode: "CNSHA", name: "Shanghai" },
  CNNGB: { locode: "CNNGB", name: "Ningbo" },
  NINGBO: { locode: "CNNGB", name: "Ningbo" },
  NGB: { locode: "CNNGB", name: "Ningbo" },
  CNSZX: { locode: "CNSZX", name: "Shenzhen" },
  SHENZHEN: { locode: "CNSZX", name: "Shenzhen" },
  YANTIAN: { locode: "CNSZX", name: "Shenzhen (Yantian)" },
  SHEKOU: { locode: "CNSZX", name: "Shenzhen (Shekou)" },
  CNTAO: { locode: "CNTAO", name: "Qingdao" },
  QINGDAO: { locode: "CNTAO", name: "Qingdao" },
  CNXMN: { locode: "CNXMN", name: "Xiamen" },
  XIAMEN: { locode: "CNXMN", name: "Xiamen" },
  CNTXG: { locode: "CNTXG", name: "Tianjin" },
  TIANJIN: { locode: "CNTXG", name: "Tianjin" },
  SGSIN: { locode: "SGSIN", name: "Singapore" },
  SINGAPORE: { locode: "SGSIN", name: "Singapore" },
  SIN: { locode: "SGSIN", name: "Singapore" },
  KRPUS: { locode: "KRPUS", name: "Busan" },
  BUSAN: { locode: "KRPUS", name: "Busan" },
  PUS: { locode: "KRPUS", name: "Busan" },
  JPYOK: { locode: "JPYOK", name: "Yokohama" },
  YOKOHAMA: { locode: "JPYOK", name: "Yokohama" },
  AEDXB: { locode: "AEDXB", name: "Dubai" },
  DUBAI: { locode: "AEDXB", name: "Dubai" },
  JEBELALI: { locode: "AEDXB", name: "Jebel Ali" },

  // Americas
  USNYC: { locode: "USNYC", name: "New York" },
  NEWYORK: { locode: "USNYC", name: "New York" },
  NYC: { locode: "USNYC", name: "New York" },
  USLAX: { locode: "USLAX", name: "Los Angeles" },
  LOSANGELES: { locode: "USLAX", name: "Los Angeles" },
  LAX: { locode: "USLAX", name: "Los Angeles" },
  USLGB: { locode: "USLGB", name: "Long Beach" },
  LONGBEACH: { locode: "USLGB", name: "Long Beach" },
  USSAV: { locode: "USSAV", name: "Savannah" },
  SAVANNAH: { locode: "USSAV", name: "Savannah" },
  USMIA: { locode: "USMIA", name: "Miami" },
  MIAMI: { locode: "USMIA", name: "Miami" },
};

export interface ResolvedPort {
  original: string;
  resolved: boolean;
  locode?: string;
  name?: string;
  confidence: number;
}

export interface ParsedRateRow {
  rowNumber: number;
  originRaw: string;
  destinationRaw: string;
  originLocode?: string;
  destinationLocode?: string;
  carrier: string;
  containerType: string;
  baseOceanFreight: number;
  baf: number;
  pss: number;
  thc: number;
  currency: string;
  serviceLine: string;
  transitDays: number;
  validFrom: string;
  validTo: string;
  extraSurcharges?: {
    name: string;
    amount: number;
    currency: string;
    calcBasis: string;
  }[];
  status?: "NEW" | "UPDATE" | "SAME" | "INVALID";
  validationError?: string;
}

/**
 * Normalizes input string for port/alias matching
 */
export function normalizeAliasKey(str: string): string {
  if (!str) return "";
  return str
    .trim()
    .toUpperCase()
    .replace(/[\s\-_/\\,.]+/g, "");
}

/**
 * Resolves a port/city name to its canonical UN/LOCODE
 */
export async function resolvePort(portName: string): Promise<ResolvedPort> {
  const trimmed = (portName || "").trim();
  if (!trimmed) {
    return { original: portName, resolved: false, confidence: 0 };
  }

  const cleanKey = normalizeAliasKey(trimmed);

  // 1. Direct check in seed map
  if (SEED_PORT_MAP[cleanKey]) {
    const entry = SEED_PORT_MAP[cleanKey];
    return {
      original: portName,
      resolved: true,
      locode: entry.locode,
      name: entry.name,
      confidence: 1.0,
    };
  }

  // 2. Check in locationAliases database table
  try {
    const aliasRecord = await db
      .select({
        locationId: locationAliases.locationId,
        confidence: locationAliases.confidence,
        locationName: locations.name,
      })
      .from(locationAliases)
      .innerJoin(locations, eq(locationAliases.locationId, locations.id))
      .where(eq(locationAliases.alias, cleanKey))
      .limit(1);

    if (aliasRecord.length > 0) {
      return {
        original: portName,
        resolved: true,
        locode: aliasRecord[0].locationId,
        name: aliasRecord[0].locationName,
        confidence: aliasRecord[0].confidence,
      };
    }
  } catch (err) {
    logger.warn({ err }, "Error querying location_aliases table");
  }

  // 3. Check directly in locations table (by ID or exact name)
  try {
    const directLocation = await db
      .select({ id: locations.id, name: locations.name })
      .from(locations)
      .where(
        sql`upper(${locations.id}) = ${trimmed.toUpperCase()} OR upper(${locations.name}) = ${trimmed.toUpperCase()}`,
      )
      .limit(1);

    if (directLocation.length > 0) {
      return {
        original: portName,
        resolved: true,
        locode: directLocation[0].id,
        name: directLocation[0].name,
        confidence: 0.95,
      };
    }
  } catch (err) {
    logger.warn({ err }, "Error querying locations table");
  }

  return {
    original: portName,
    resolved: false,
    confidence: 0,
  };
}

/**
 * Ensures a location exists in the database
 */
export async function ensureLocationExists(
  locode: string,
  name: string,
): Promise<void> {
  try {
    const existing = await db
      .select({ id: locations.id })
      .from(locations)
      .where(eq(locations.id, locode))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(locations).values({
        id: locode,
        name: name || locode,
        type: "PORT",
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
        isActive: true,
      });
    }
  } catch (err) {
    logger.warn({ err }, `Could not ensure location ${locode}`);
  }
}

/**
 * Ensures carrier exists in DB
 */
export async function ensureCarrierExists(
  carrierName: string,
): Promise<string> {
  const cleanName = (carrierName || "Standard Carrier").trim();
  const scacCandidate = cleanName.substring(0, 4).toUpperCase();
  try {
    const existing = await db
      .select({ id: addresses.id })
      .from(addresses)
      .where(
        and(
          eq(addresses.addressType, "CAR"),
          or(
            sql`upper(${addresses.tradeName}) = ${cleanName.toUpperCase()}`,
            sql`upper(${addresses.companyName}) = ${cleanName.toUpperCase()}`,
            sql`upper(${addresses.tradeName}) LIKE ${`%${cleanName.toUpperCase()}%`}`,
            sql`upper(${addresses.companyName}) LIKE ${`%${cleanName.toUpperCase()}%`}`,
          ),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      return existing[0].id;
    }

    const newId = `addr_carr_${uuidv4().substring(0, 8)}`;
    // Defensively ensure parent company and address_types exist
    await db.run(sql`
      INSERT OR IGNORE INTO companies (id, name, created_at, is_active)
      VALUES ('c-1', 'Default Enterprise Carrier Group', strftime('%s', 'now'), 1)
    `);
    await db.run(sql`
      INSERT OR IGNORE INTO address_types (code, name, created_at, is_active)
      VALUES ('CAR', 'Carrier', strftime('%s', 'now'), 1)
    `);

    await db.insert(addresses).values({
      id: newId,
      companyId: "c-1",
      addressType: "CAR",
      companyName: cleanName,
      tradeName: cleanName,
      street1: "Port Terminal Access Way",
      zipCode: "08039",
      city: "Barcelona",
      country: "ES",
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false,
      isActive: true,
    });

    return newId;
  } catch (err) {
    logger.warn({ err }, `Error ensuring carrier ${cleanName}`);
    return "addr_carr_maersk";
  }
}

/**
 * Ensures lane exists between origin and destination
 */
export async function ensureLaneExists(
  originLocode: string,
  destinationLocode: string,
): Promise<string> {
  try {
    const existing = await db
      .select({ id: lanes.id })
      .from(lanes)
      .where(
        and(
          eq(lanes.originLocationId, originLocode),
          eq(lanes.destinationLocationId, destinationLocode),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      return existing[0].id;
    }

    const newLaneId = `lane-${uuidv4().substring(0, 8)}`;
    await db.insert(lanes).values({
      id: newLaneId,
      originLocationId: originLocode,
      destinationLocationId: destinationLocode,
      distance: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false,
      isActive: true,
    });
    return newLaneId;
  } catch (err) {
    logger.warn(
      { err },
      `Error ensuring lane ${originLocode}-${destinationLocode}`,
    );
    return `lane-${originLocode}-${destinationLocode}`;
  }
}

/**
 * Previews rates from raw table rows
 */
export async function previewRates(
  rawRows: any[],
  defaultCarrier?: string,
): Promise<{
  totalRows: number;
  previewRows: ParsedRateRow[];
  ambiguousPorts: { original: string; occurrences: number }[];
  summary: {
    newCount: number;
    updateCount: number;
    sameCount: number;
    invalidCount: number;
  };
}> {
  const previewRows: ParsedRateRow[] = [];
  const ambiguousPortsMap = new Map<string, number>();

  let newCount = 0;
  let updateCount = 0;
  let sameCount = 0;
  let invalidCount = 0;

  for (let idx = 0; idx < rawRows.length; idx++) {
    const row = rawRows[idx];
    const rowNum = idx + 1;

    const originRaw = String(
      row.pol || row.origin || row.puerto_origen || "",
    ).trim();
    const destRaw = String(
      row.pod || row.destination || row.puerto_destino || "",
    ).trim();
    const carrierName = String(
      row.carrier || row.naviera || defaultCarrier || "Maersk",
    ).trim();
    const containerType = String(
      row.containerType || row.equipo || row.type || "40HC",
    )
      .toUpperCase()
      .trim();

    if (!originRaw || !destRaw) {
      invalidCount++;
      previewRows.push({
        rowNumber: rowNum,
        originRaw,
        destinationRaw: destRaw,
        carrier: carrierName,
        containerType,
        baseOceanFreight: 0,
        baf: 0,
        pss: 0,
        thc: 0,
        currency: "USD",
        serviceLine: "Direct",
        transitDays: 0,
        validFrom: new Date().toISOString().split("T")[0],
        validTo: new Date(Date.now() + 30 * 86400000)
          .toISOString()
          .split("T")[0],
        status: "INVALID",
        validationError: "Origen o Destino vacío",
      });
      continue;
    }

    const resolvedOrigin = await resolvePort(originRaw);
    const resolvedDest = await resolvePort(destRaw);

    if (!resolvedOrigin.resolved) {
      ambiguousPortsMap.set(
        originRaw,
        (ambiguousPortsMap.get(originRaw) || 0) + 1,
      );
    }
    if (!resolvedDest.resolved) {
      ambiguousPortsMap.set(destRaw, (ambiguousPortsMap.get(destRaw) || 0) + 1);
    }

    const baseOceanFreight =
      parseFloat(
        String(row.baseOceanFreight || row.oceanFreight || row.flete || 0),
      ) || 0;
    const baf = parseFloat(String(row.baf || row.fuel || 0)) || 0;
    const pss = parseFloat(String(row.pss || row.peakSeason || 0)) || 0;
    const thc = parseFloat(String(row.thc || row.handling || 0)) || 0;
    const currency = String(row.currency || row.moneda || "USD").toUpperCase();
    const transitDays =
      parseInt(String(row.transitDays || row.transitTime || 25), 10) || 25;
    const serviceLine = String(row.serviceLine || "Standard Service");

    const validFrom = row.validFrom
      ? new Date(row.validFrom).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];
    const validTo = row.validTo
      ? new Date(row.validTo).toISOString().split("T")[0]
      : new Date(Date.now() + 60 * 86400000).toISOString().split("T")[0];

    // Check if existing rate matches
    let status: "NEW" | "UPDATE" | "SAME" = "NEW";
    if (resolvedOrigin.resolved && resolvedDest.resolved) {
      try {
        const existingRates = await db
          .select({
            id: rates.id,
            baseRate: rates.baseRate,
            baf: rates.baf,
            pss: rates.pss,
            thc: rates.thc,
          })
          .from(rates)
          .innerJoin(lanes, eq(rates.laneId, lanes.id))
          .where(
            and(
              eq(lanes.originLocationId, resolvedOrigin.locode!),
              eq(lanes.destinationLocationId, resolvedDest.locode!),
              eq(rates.containerType, containerType),
            ),
          )
          .limit(1);

        if (existingRates.length > 0) {
          const ex = existingRates[0];
          if (
            ex.baseRate === baseOceanFreight &&
            ex.baf === baf &&
            ex.pss === pss &&
            ex.thc === thc
          ) {
            status = "SAME";
            sameCount++;
          } else {
            status = "UPDATE";
            updateCount++;
          }
        } else {
          status = "NEW";
          newCount++;
        }
      } catch {
        status = "NEW";
        newCount++;
      }
    } else {
      status = "NEW";
      newCount++;
    }

    previewRows.push({
      rowNumber: rowNum,
      originRaw,
      destinationRaw: destRaw,
      originLocode: resolvedOrigin.locode,
      destinationLocode: resolvedDest.locode,
      carrier: carrierName,
      containerType,
      baseOceanFreight,
      baf,
      pss,
      thc,
      currency,
      serviceLine,
      transitDays,
      validFrom,
      validTo,
      status,
    });
  }

  const ambiguousPorts = Array.from(ambiguousPortsMap.entries()).map(
    ([original, occurrences]) => ({
      original,
      occurrences,
    }),
  );

  return {
    totalRows: rawRows.length,
    previewRows,
    ambiguousPorts,
    summary: { newCount, updateCount, sameCount, invalidCount },
  };
}

/**
 * Executes the transactional bulk import
 */
export async function bulkImportRates(payload: {
  fileName: string;
  carrierId?: string;
  rates: ParsedRateRow[];
  newAliases?: { alias: string; locationId: string }[];
  userId?: string;
}): Promise<{
  batchId: string;
  totalRows: number;
  insertedCount: number;
  updatedCount: number;
  failedCount: number;
}> {
  const batchId = `batch-${uuidv4().substring(0, 8)}`;
  let insertedCount = 0;
  let updatedCount = 0;
  let failedCount = 0;
  const errorsList: { row: number; error: string }[] = [];

  // 1. Save newly learned location aliases
  if (payload.newAliases && payload.newAliases.length > 0) {
    for (const item of payload.newAliases) {
      const cleanKey = normalizeAliasKey(item.alias);
      if (cleanKey && item.locationId) {
        try {
          await ensureLocationExists(item.locationId, item.locationId);
          await db
            .insert(locationAliases)
            .values({
              id: `alias-${uuidv4().substring(0, 8)}`,
              alias: cleanKey,
              locationId: item.locationId,
              learnedFrom: payload.fileName || "EXCEL_IMPORT",
              confidence: 1.0,
              createdAt: new Date(),
            })
            .onConflictDoNothing();
        } catch (err) {
          logger.warn({ err }, `Could not persist alias ${cleanKey}`);
        }
      }
    }
  }

  // 2. Process rates
  for (const row of payload.rates) {
    try {
      // Validate or fallback locodes
      let originLocode = row.originLocode;
      let destLocode = row.destinationLocode;

      if (!originLocode) {
        const resolved = await resolvePort(row.originRaw);
        originLocode =
          resolved.locode ||
          `UN-${normalizeAliasKey(row.originRaw).substring(0, 5)}`;
      }
      if (!destLocode) {
        const resolved = await resolvePort(row.destinationRaw);
        destLocode =
          resolved.locode ||
          `UN-${normalizeAliasKey(row.destinationRaw).substring(0, 5)}`;
      }

      await ensureLocationExists(originLocode, row.originRaw);
      await ensureLocationExists(destLocode, row.destinationRaw);

      const resolvedCarrierId =
        payload.carrierId || (await ensureCarrierExists(row.carrier));
      const resolvedLaneId = await ensureLaneExists(originLocode, destLocode);

      const validFromDate = row.validFrom
        ? new Date(row.validFrom)
        : new Date();
      const validToDate = row.validTo
        ? new Date(row.validTo)
        : new Date(Date.now() + 60 * 86400000);

      // Check for existing rate to upsert
      const existing = await db
        .select({ id: rates.id })
        .from(rates)
        .where(
          and(
            eq(rates.carrierId, resolvedCarrierId),
            eq(rates.laneId, resolvedLaneId),
            eq(rates.containerType, row.containerType),
          ),
        )
        .limit(1);

      let targetRateId = "";

      if (existing.length > 0) {
        // UPDATE existing rate
        targetRateId = existing[0].id;
        await db
          .update(rates)
          .set({
            baseRate: row.baseOceanFreight,
            baf: row.baf,
            pss: row.pss,
            thc: row.thc,
            transitDays: row.transitDays,
            serviceLine: row.serviceLine,
            validFrom: validFromDate,
            validTo: validToDate,
            updatedAt: new Date(),
          })
          .where(eq(rates.id, targetRateId));
        updatedCount++;
      } else {
        // INSERT new rate
        targetRateId = `rate-${uuidv4().substring(0, 8)}`;
        await db.insert(rates).values({
          id: targetRateId,
          carrierId: resolvedCarrierId,
          laneId: resolvedLaneId,
          containerType: row.containerType,
          baseRate: row.baseOceanFreight,
          baf: row.baf,
          pss: row.pss,
          thc: row.thc,
          serviceLine: row.serviceLine,
          transitDays: row.transitDays,
          validFrom: validFromDate,
          validTo: validToDate,
          createdAt: new Date(),
          updatedAt: new Date(),
          isDeleted: false,
          isActive: true,
        });
        insertedCount++;
      }

      // Handle extra surcharges if present
      if (row.extraSurcharges && row.extraSurcharges.length > 0) {
        for (const extra of row.extraSurcharges) {
          await db.insert(surcharges).values({
            id: `sur-${uuidv4().substring(0, 8)}`,
            rateId: targetRateId,
            name: extra.name,
            amount: extra.amount,
            currency: extra.currency || "USD",
            calcBasis: extra.calcBasis || "PER_CONTAINER",
            createdAt: new Date(),
            updatedAt: new Date(),
            isDeleted: false,
            isActive: true,
          });
        }
      }
    } catch (err: any) {
      failedCount++;
      errorsList.push({
        row: row.rowNumber,
        error: err?.message || String(err),
      });
    }
  }

  // 3. Create batch audit record
  await db.insert(rateImportBatches).values({
    id: batchId,
    fileName: payload.fileName,
    carrierId: payload.carrierId || null,
    totalRows: payload.rates.length,
    insertedCount,
    updatedCount,
    failedCount,
    status:
      failedCount === 0
        ? "COMPLETED"
        : failedCount === payload.rates.length
          ? "FAILED"
          : "PARTIAL",
    errorsJson: errorsList.length > 0 ? JSON.stringify(errorsList) : null,
    importedBy: payload.userId || null,
    createdAt: new Date(),
  });

  // 4. Invalidate Redis cache keys pattern atlas:rates:*
  try {
    const keys = await redis.keys("atlas:rates:*");
    if (keys.length > 0) {
      await redis.del(...keys);
      logger.info(`Purged ${keys.length} cached rate entries from Redis.`);
    }
  } catch (err) {
    logger.warn({ err }, "Could not invalidate Redis rate cache keys");
  }

  return {
    batchId,
    totalRows: payload.rates.length,
    insertedCount,
    updatedCount,
    failedCount,
  };
}

/**
 * Retrieves recent import batches with carrier metadata
 */
export async function getImportBatches(limit = 20) {
  try {
    return await db
      .select({
        id: rateImportBatches.id,
        fileName: rateImportBatches.fileName,
        carrierName: sql<string>`COALESCE(${addresses.tradeName}, ${addresses.companyName})`,
        totalRows: rateImportBatches.totalRows,
        insertedCount: rateImportBatches.insertedCount,
        updatedCount: rateImportBatches.updatedCount,
        failedCount: rateImportBatches.failedCount,
        status: rateImportBatches.status,
        createdAt: rateImportBatches.createdAt,
      })
      .from(rateImportBatches)
      .leftJoin(addresses, eq(rateImportBatches.carrierId, addresses.id))
      .orderBy(sql`${rateImportBatches.createdAt} DESC`)
      .limit(limit);
  } catch (err) {
    logger.warn({ err }, "Error fetching import batches");
    return [];
  }
}
