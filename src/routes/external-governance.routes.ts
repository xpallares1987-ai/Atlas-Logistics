/**
 * @file external-governance.routes.ts
 * @description Operational route handlers for external master data governance, source record ingestion, entity linking, and UN/LOCODE hot-cache lookup.
 * @module @atlas/routes/external-governance
 * @see {@link docs/superpowers/plans/2026-11-15-issue-9-strict-eslint-restoration-routes.md}
 */

import { FastifyPluginAsync } from "fastify";
import { v4 as uuidv4 } from "uuid";
import crypto from "node:crypto";
import { db, client } from "../db/index.js";
import {
  dataSources,
  sourceRecords,
  entitySourceLinks,
} from "../db/schema/external_governance.js";
import { eq, and, desc } from "drizzle-orm";
import {
  ingestSourceRecordRequestSchema,
  createEntityLinkRequestSchema,
  upsertUnlocodeRequestSchema,
  upsertUnlocode,
  getUnlocodeStats,
  UnlocodeEntry,
  escapeHTML,
} from "@atlas/shared";
import { outboxBus } from "../scm/kernel/outbox-bus.js";
import {
  queryUnlocodeDirectory,
  getUnlocodeCountrySummaries,
} from "../services/unlocode-directory.service.js";

interface UnlocodeLookupQuery {
  q?: string;
  country?: string;
  mode?: string;
  limit?: string;
}

let tablesEnsured = false;

export async function ensureExternalGovernanceTables(): Promise<void> {
  if (tablesEnsured || !client?.execute) return;

  await client.execute(`CREATE TABLE IF NOT EXISTS data_sources (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'OPEN_DATA',
    website_url TEXT,
    terms_url TEXT,
    description TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    metadata TEXT,
    tags TEXT
  );`);

  await client.execute(`CREATE TABLE IF NOT EXISTS source_records (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL REFERENCES data_sources(id),
    external_id TEXT NOT NULL,
    source_url TEXT,
    raw_payload TEXT NOT NULL,
    normalized_payload TEXT,
    sha256_hash TEXT NOT NULL,
    retrieved_at INTEGER NOT NULL,
    version_tag TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    metadata TEXT,
    tags TEXT
  );`);

  await client.execute(`CREATE TABLE IF NOT EXISTS entity_source_links (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    source_record_id TEXT NOT NULL REFERENCES source_records(id),
    match_confidence REAL NOT NULL DEFAULT 1.0,
    match_method TEXT NOT NULL DEFAULT 'EXACT_CODE',
    verified_at INTEGER NOT NULL,
    verified_by TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    metadata TEXT,
    tags TEXT
  );`);

  await client.execute(
    `CREATE INDEX IF NOT EXISTS source_records_src_ext_idx ON source_records(source_id, external_id);`,
  );
  await client.execute(
    `CREATE INDEX IF NOT EXISTS entity_source_links_entity_idx ON entity_source_links(entity_type, entity_id);`,
  );

  tablesEnsured = true;
}

export const externalGovernanceRoutes: FastifyPluginAsync = async (fastify) => {
  await ensureExternalGovernanceTables();

  // 1. List Data Sources
  fastify.get("/sources", async (_request, reply) => {
    try {
      const sources = await db
        .select()
        .from(dataSources)
        .where(eq(dataSources.isDeleted, false));
      return reply.send({
        success: true,
        count: sources.length,
        data: sources,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Internal Server Error";
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // 2. Ingest Raw Source Record (JSON Mode + SHA-256 Hash + Outbox Event)
  fastify.post("/records", async (request, reply) => {
    try {
      const parsed = ingestSourceRecordRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: "Invalid payload format",
          details: parsed.error.issues,
        });
      }

      const {
        sourceCode,
        externalId,
        sourceUrl,
        rawPayload,
        normalizedPayload,
        versionTag,
      } = parsed.data;

      // Find or verify data source
      const [source] = await db
        .select()
        .from(dataSources)
        .where(eq(dataSources.code, sourceCode))
        .limit(1);

      if (!source) {
        return reply.status(404).send({
          success: false,
          error: `Data source '${sourceCode}' not found in registry. Register source first.`,
        });
      }

      const sha256 = crypto
        .createHash("sha256")
        .update(JSON.stringify(rawPayload))
        .digest("hex");

      const recordId = `srec_${uuidv4().replace(/-/g, "").slice(0, 16)}`;
      const now = new Date();

      await db.insert(sourceRecords).values({
        id: recordId,
        sourceId: source.id,
        externalId,
        sourceUrl,
        rawPayload,
        normalizedPayload,
        sha256Hash: sha256,
        retrievedAt: now,
        versionTag: versionTag || "v1.0",
        createdAt: now,
      });

      // Transactional Outbox Event (Append-Only Event Sourcing)
      await outboxBus.publish({
        eventId: uuidv4(),
        eventType: "external_data.record_ingested",
        schemaVersion: 1,
        producerContext: "ExternalDataGovernance",
        aggregateType: "SourceRecord",
        aggregateId: recordId,
        occurredAt: now.toISOString(),
        payload: {
          recordId,
          sourceCode,
          externalId,
          sha256Hash: sha256,
          retrievedAt: now.toISOString(),
        },
      });

      return reply.status(201).send({
        success: true,
        recordId,
        sha256Hash: sha256,
        externalId,
        retrievedAt: now,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Internal Server Error";
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // 3. List Source Records
  fastify.get("/records", async (request, reply) => {
    try {
      const query = request.query as { externalId?: string; sourceId?: string };
      const conditions = [eq(sourceRecords.isDeleted, false)];
      if (query.externalId) {
        conditions.push(eq(sourceRecords.externalId, query.externalId));
      }
      if (query.sourceId) {
        conditions.push(eq(sourceRecords.sourceId, query.sourceId));
      }

      const records = await db
        .select()
        .from(sourceRecords)
        .where(and(...conditions))
        .orderBy(desc(sourceRecords.retrievedAt))
        .limit(100);

      return reply.send({
        success: true,
        count: records.length,
        data: records,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Internal Server Error";
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // 4. Create Entity Source Link (Cross-Reference to Atlas Domain + Outbox)
  fastify.post("/entity-links", async (request, reply) => {
    try {
      const parsed = createEntityLinkRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: "Invalid entity link payload",
          details: parsed.error.issues,
        });
      }

      const {
        entityType,
        entityId,
        sourceRecordId,
        matchConfidence,
        matchMethod,
        verifiedBy,
      } = parsed.data;

      // Verify source record exists
      const [record] = await db
        .select()
        .from(sourceRecords)
        .where(eq(sourceRecords.id, sourceRecordId))
        .limit(1);

      if (!record) {
        return reply.status(404).send({
          success: false,
          error: `Source record '${sourceRecordId}' not found.`,
        });
      }

      const linkId = `esl_${uuidv4().replace(/-/g, "").slice(0, 16)}`;
      const now = new Date();

      await db.insert(entitySourceLinks).values({
        id: linkId,
        entityType,
        entityId,
        sourceRecordId,
        matchConfidence,
        matchMethod,
        verifiedAt: now,
        verifiedBy: verifiedBy || "system_operator",
        createdAt: now,
      });

      // Transactional Outbox Event (Append-Only Event Sourcing)
      await outboxBus.publish({
        eventId: uuidv4(),
        eventType: "external_data.entity_linked",
        schemaVersion: 1,
        producerContext: "ExternalDataGovernance",
        aggregateType: "EntitySourceLink",
        aggregateId: linkId,
        occurredAt: now.toISOString(),
        payload: {
          linkId,
          entityType,
          entityId,
          sourceRecordId,
          matchConfidence,
          matchMethod,
        },
      });

      return reply.status(201).send({
        success: true,
        linkId,
        entityType,
        entityId,
        sourceRecordId,
        matchConfidence,
        verifiedAt: now,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Internal Server Error";
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // 5. Query All Entity Links (with optional filters)
  fastify.get("/entity-links", async (request, reply) => {
    try {
      const query = request.query as { entityType?: string; entityId?: string };
      const conditions = [eq(entitySourceLinks.isDeleted, false)];
      if (query.entityType) {
        conditions.push(eq(entitySourceLinks.entityType, query.entityType));
      }
      if (query.entityId) {
        conditions.push(eq(entitySourceLinks.entityId, query.entityId));
      }

      const links = await db
        .select({
          link: entitySourceLinks,
          sourceRecord: sourceRecords,
        })
        .from(entitySourceLinks)
        .innerJoin(
          sourceRecords,
          eq(entitySourceLinks.sourceRecordId, sourceRecords.id),
        )
        .where(and(...conditions))
        .orderBy(desc(entitySourceLinks.createdAt))
        .limit(100);

      return reply.send({ success: true, count: links.length, data: links });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Internal Server Error";
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // 5b. Query Entity Links for a Given Entity
  fastify.get("/entity-links/:entityType/:entityId", async (request, reply) => {
    try {
      const { entityType, entityId } = request.params as {
        entityType: string;
        entityId: string;
      };

      const links = await db
        .select({
          link: entitySourceLinks,
          sourceRecord: sourceRecords,
        })
        .from(entitySourceLinks)
        .innerJoin(
          sourceRecords,
          eq(entitySourceLinks.sourceRecordId, sourceRecords.id),
        )
        .where(
          and(
            eq(entitySourceLinks.entityType, entityType),
            eq(entitySourceLinks.entityId, entityId),
            eq(entitySourceLinks.isDeleted, false),
          ),
        );

      return reply.send({ success: true, count: links.length, data: links });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Internal Server Error";
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // 6. High-Performance UN/LOCODE Lookup (Using In-Memory Prefix Trie & LRU)
  fastify.get<{ Querystring: UnlocodeLookupQuery }>(
    "/unlocode/lookup",
    async (request, reply) => {
      try {
        const rawQ = (request.query?.q || "").trim();
        const rawCountry = request.query?.country;
        const country = rawCountry
          ? String(rawCountry).trim().toUpperCase()
          : undefined;
        const rawMode = (request.query?.mode || "").trim().toLowerCase();
        const validModes = new Set(["port", "rail", "road", "airport", "icd"]);
        const mode = validModes.has(rawMode)
          ? (rawMode as "port" | "rail" | "road" | "airport" | "icd")
          : undefined;
        const limit = Math.min(100, parseInt(request.query?.limit || "20", 10));

        const { items, source, totalIndexed } = await queryUnlocodeDirectory({
          q: rawQ,
          country,
          mode,
          limit,
        });

        const sanitized = items.map((item) => ({
          location: escapeHTML(item.location),
          name: escapeHTML(item.name),
          country: escapeHTML(item.country),
          subdivision: item.subdivision
            ? escapeHTML(item.subdivision)
            : undefined,
          functionClassifier: item.functionClassifier
            ? escapeHTML(item.functionClassifier)
            : undefined,
          isPort: item.isPort,
          isRailTerminal: item.isRailTerminal,
          isAirport: item.isAirport,
          isMultimodalIcd: item.isMultimodalIcd,
          iataCode: item.iataCode ? escapeHTML(item.iataCode) : undefined,
          coordinates: item.coordinates
            ? escapeHTML(item.coordinates)
            : undefined,
          status: item.status ? escapeHTML(item.status) : undefined,
        }));

        const memStats = getUnlocodeStats();
        const memTotal = Number(
          (memStats as unknown as { totalEntries?: number; total?: number })
            .totalEntries ??
            (memStats as unknown as { total?: number }).total ??
            0,
        );
        return reply.type("application/json").send({
          success: true,
          count: sanitized.length,
          source,
          data: sanitized,
          stats: {
            ...memStats,
            totalEntries: Math.max(
              Number.isFinite(memTotal) ? memTotal : 0,
              totalIndexed,
            ),
          },
        });
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Internal Server Error";
        return reply.status(500).send({ success: false, error: message });
      }
    },
  );

  // 6b. Official UN/LOCODE Country & Territory Summary Catalog (249 ISO 3166-1 territories)
  fastify.get("/unlocode/countries", async (_request, reply) => {
    try {
      const summary = await getUnlocodeCountrySummaries();
      return reply.type("application/json").send({
        success: true,
        ...summary,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Internal Server Error";
      return reply.status(500).send({ success: false, error: message });
    }
  });

  // 7. Write-Through Cache: Update/Upsert UN/LOCODE in Hot Memory + SQLite
  fastify.post("/unlocode/upsert", async (request, reply) => {
    try {
      const parsed = upsertUnlocodeRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error:
            "Invalid UN/LOCODE entry: location (5 uppercase chars), name and country (2 chars) are mandatory.",
          details: parsed.error.issues,
        });
      }

      const entry: UnlocodeEntry = {
        location: escapeHTML(parsed.data.location),
        name: escapeHTML(parsed.data.name),
        country: escapeHTML(parsed.data.country),
        coordinates: parsed.data.coordinates
          ? escapeHTML(parsed.data.coordinates)
          : undefined,
        status: parsed.data.status ? escapeHTML(parsed.data.status) : undefined,
        subdivision: parsed.data.subdivision
          ? escapeHTML(parsed.data.subdivision)
          : undefined,
        function: parsed.data.function
          ? escapeHTML(parsed.data.function)
          : undefined,
      };

      // Write-Through: Update In-Memory Trie and LRU immediately without server restart
      upsertUnlocode(entry);

      // Persist raw source record if UN/LOCODE data source exists
      const [src] = await db
        .select()
        .from(dataSources)
        .where(eq(dataSources.code, "UNLOCODE"))
        .limit(1);

      let recordId: string | undefined;
      if (src) {
        recordId = `srec_unlocode_${entry.location.toLowerCase()}`;
        const now = new Date();
        const sha256 = crypto
          .createHash("sha256")
          .update(JSON.stringify(entry))
          .digest("hex");

        await db
          .insert(sourceRecords)
          .values({
            id: recordId,
            sourceId: src.id,
            externalId: entry.location,
            rawPayload: entry as unknown as Record<string, unknown>,
            normalizedPayload: {
              locode: entry.location,
              portName: entry.name,
              countryCode: entry.country,
              coordinates: entry.coordinates,
            },
            sha256Hash: sha256,
            retrievedAt: now,
            versionTag: "write_through_hot_cache",
            createdAt: now,
          })
          .onConflictDoUpdate({
            target: sourceRecords.id,
            set: {
              rawPayload: entry as unknown as Record<string, unknown>,
              sha256Hash: sha256,
              retrievedAt: now,
              updatedAt: now,
            },
          });
      }

      return reply
        .type("application/json")
        .status(200)
        .send({
          success: true,
          message: `Port '${entry.location}' (${entry.name}) updated via Write-Through Cache in RAM and SQLite.`,
          entry,
          recordId,
          stats: getUnlocodeStats(),
        });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Internal Server Error";
      return reply.status(500).send({ success: false, error: message });
    }
  });
};

export default externalGovernanceRoutes;
