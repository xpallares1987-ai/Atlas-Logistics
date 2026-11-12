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
  searchUnlocodes,
  upsertUnlocode,
  DEFAULT_UNLOCODE_HUBS,
  getUnlocodeStats,
  UnlocodeEntry,
} from "@atlas/shared";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { outboxBus } from "../scm/kernel/outbox-bus.js";

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
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
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
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
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
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
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
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
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
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
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
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 6. High-Performance UN/LOCODE Lookup (Using In-Memory Prefix Trie & LRU)
  fastify.get("/unlocode/lookup", async (request, reply) => {
    try {
      const q = ((request.query as any)?.q || "").trim();
      const country = (request.query as any)?.country;
      const limit = Math.min(
        100,
        parseInt((request.query as any)?.limit || "20", 10),
      );

      if (!q) {
        return reply.send({
          success: true,
          data: DEFAULT_UNLOCODE_HUBS.slice(0, limit),
          stats: getUnlocodeStats(),
        });
      }

      const results = searchUnlocodes(q, country, limit);
      return reply.send({
        success: true,
        count: results.length,
        data: results,
        stats: getUnlocodeStats(),
      });
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 7. Write-Through Cache: Update/Upsert UN/LOCODE in Hot Memory + SQLite
  fastify.post("/unlocode/upsert", async (request, reply) => {
    try {
      const entry = request.body as UnlocodeEntry;
      if (!entry || !entry.location || !entry.name || !entry.country) {
        return reply.status(400).send({
          success: false,
          error:
            "Invalid UN/LOCODE entry: location, name and country are mandatory.",
        });
      }

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
            rawPayload: entry as any,
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
              rawPayload: entry as any,
              sha256Hash: sha256,
              retrievedAt: now,
              updatedAt: now,
            },
          });
      }

      return reply.status(200).send({
        success: true,
        message: `Port '${entry.location}' (${entry.name}) updated via Write-Through Cache in RAM and SQLite.`,
        entry,
        recordId,
        stats: getUnlocodeStats(),
      });
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
    }
  });
};

export default externalGovernanceRoutes;
