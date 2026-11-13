import { FastifyPluginAsync } from "fastify";
import { v4 as uuidv4 } from "uuid";
import { db, client } from "../db/index.js";
import {
  addresses,
  addressContacts,
  addressTypes,
  companies,
  AddressType,
  ADDRESS_TYPE_DEFINITIONS,
  ENTERPRISE_COMPANY_GROUPS,
  normalizeAddressTypeCode,
  inferEnterpriseGroupId,
  canManageCorporateGroups,
  ContactRoleCategory,
  AddressVerificationStatus,
  AddressVerificationProvider,
} from "../db/schema/index.js";
import { eq, and, or, like, desc, inArray } from "drizzle-orm";
import {
  searchUnlocodes,
  formatAllBlBoxes,
  DEFAULT_UNLOCODE_HUBS,
  escapeHTML,
} from "@atlas/shared";
import { getCurrentTenant } from "../lib/tenancy/tenancy-context.js";
import { addressGeocodingService } from "../services/address-geocoding.service.js";

/**
 * Clean & normalize string for fuzzy duplicate comparison
 */
function normalizeString(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ")
    .replace(/\b(s\.?l\.?|s\.?a\.?|ltd|llc|gmbh|inc|corp|co)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Trigram / Token Jaccard similarity between two normalized strings
 */
function calculateSimilarity(str1: string, str2: string): number {
  const norm1 = normalizeString(str1);
  const norm2 = normalizeString(str2);

  if (norm1 === norm2) return 1.0;
  if (!norm1 || !norm2) return 0.0;

  const tokens1 = new Set(norm1.split(" "));
  const tokens2 = new Set(norm2.split(" "));

  let intersection = 0;
  for (const t of tokens1) {
    if (tokens2.has(t)) intersection++;
  }

  const union = new Set([...tokens1, ...tokens2]).size;
  return union === 0 ? 0 : intersection / union;
}

let tablesEnsured = false;
export async function ensureAddressesTables() {
  if (tablesEnsured || !client?.execute) return;

  // 1. Ensure companies Enterprise Group columns exist
  await client.execute(`CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    group_code TEXT,
    sector TEXT,
    headquarters_country TEXT,
    tax_id TEXT,
    credit_limit REAL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    metadata TEXT,
    tags TEXT
  );`);
  try {
    await client.execute(`ALTER TABLE companies ADD COLUMN group_code TEXT;`);
  } catch {}
  try {
    await client.execute(`ALTER TABLE companies ADD COLUMN sector TEXT;`);
  } catch {}
  try {
    await client.execute(
      `ALTER TABLE companies ADD COLUMN headquarters_country TEXT;`,
    );
  } catch {}

  // 2. Ensure address_types table exists and is seeded with canonical codes
  await client.execute(`CREATE TABLE IF NOT EXISTS address_types (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    metadata TEXT,
    tags TEXT
  );`);

  for (const def of ADDRESS_TYPE_DEFINITIONS) {
    await db
      .insert(addressTypes)
      .values({
        code: def.code,
        name: def.name,
        description: def.description,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: addressTypes.code,
        set: {
          name: def.name,
          description: def.description,
          updatedAt: new Date(),
        },
      });
  }

  // 3. Seed Enterprise Corporate Groups in companies
  for (const grp of ENTERPRISE_COMPANY_GROUPS) {
    await db
      .insert(companies)
      .values({
        id: grp.id,
        name: grp.name,
        groupCode: grp.groupCode,
        sector: grp.sector,
        headquartersCountry: grp.headquartersCountry,
        taxId: grp.taxId,
        creditLimit: grp.creditLimit,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: companies.id,
        set: {
          name: grp.name,
          groupCode: grp.groupCode,
          sector: grp.sector,
          headquartersCountry: grp.headquartersCountry,
          updatedAt: new Date(),
        },
      });
  }

  await client.execute(`CREATE TABLE IF NOT EXISTS addresses (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    address_type TEXT NOT NULL REFERENCES address_types(code),
    company_name TEXT NOT NULL,
    trade_name TEXT,
    tax_id TEXT,
    street_1 TEXT NOT NULL,
    street_2 TEXT,
    zip_code TEXT NOT NULL,
    city TEXT NOT NULL,
    federal_state TEXT,
    country TEXT NOT NULL,
    un_locode TEXT,
    is_default_shipper INTEGER DEFAULT 0,
    is_default_consignee INTEGER DEFAULT 0,
    is_default_notify INTEGER DEFAULT 0,
    notes TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    metadata TEXT,
    tags TEXT
  );`);

  try {
    await client.execute(
      `ALTER TABLE addresses ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;`,
    );
  } catch {}
  try {
    await client.execute(
      `ALTER TABLE addresses ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;`,
    );
  } catch {}
  try {
    await client.execute(`ALTER TABLE addresses ADD COLUMN metadata TEXT;`);
  } catch {}
  try {
    await client.execute(`ALTER TABLE addresses ADD COLUMN tags TEXT;`);
  } catch {}
  try {
    await client.execute(`ALTER TABLE addresses ADD COLUMN lat REAL;`);
  } catch {}
  try {
    await client.execute(`ALTER TABLE addresses ADD COLUMN lon REAL;`);
  } catch {}
  try {
    await client.execute(
      `ALTER TABLE addresses ADD COLUMN formatted_address TEXT;`,
    );
  } catch {}
  try {
    await client.execute(
      `ALTER TABLE addresses ADD COLUMN verification_status TEXT DEFAULT 'NOT_CHECKED';`,
    );
  } catch {}
  try {
    await client.execute(
      `ALTER TABLE addresses ADD COLUMN verification_provider TEXT;`,
    );
  } catch {}

  await client.execute(`CREATE TABLE IF NOT EXISTS address_contacts (
    id TEXT PRIMARY KEY,
    address_id TEXT NOT NULL REFERENCES addresses(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    mobile TEXT,
    role_category TEXT DEFAULT 'OPERATIONS',
    job_title TEXT,
    is_primary INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    metadata TEXT,
    tags TEXT
  );`);

  try {
    await client.execute(
      `ALTER TABLE address_contacts ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;`,
    );
  } catch {}
  try {
    await client.execute(
      `ALTER TABLE address_contacts ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;`,
    );
  } catch {}
  try {
    await client.execute(
      `ALTER TABLE address_contacts ADD COLUMN metadata TEXT;`,
    );
  } catch {}
  try {
    await client.execute(`ALTER TABLE address_contacts ADD COLUMN tags TEXT;`);
  } catch {}

  tablesEnsured = true;
}

const addressesRoutes: FastifyPluginAsync = async (fastify, opts) => {
  await ensureAddressesTables();

  // UN/LOCODE Lookup
  fastify.get("/unlocode-lookup", async (request, reply) => {
    try {
      const rawQ = ((request.query as any)?.q || "").trim();
      const q = escapeHTML(rawQ);
      if (!q) {
        const hubs = DEFAULT_UNLOCODE_HUBS.slice(0, 15).map((item) => ({
          location: escapeHTML(item.location),
          name: escapeHTML(item.name),
          country: escapeHTML(item.country),
          coordinates: item.coordinates
            ? escapeHTML(item.coordinates)
            : undefined,
          status: item.status ? escapeHTML(item.status) : undefined,
        }));
        return reply.type("application/json").send(hubs);
      }
      const results = searchUnlocodes(q, undefined, 20);
      const sanitized = results.map((item) => ({
        location: escapeHTML(item.location),
        name: escapeHTML(item.name),
        country: escapeHTML(item.country),
        coordinates: item.coordinates
          ? escapeHTML(item.coordinates)
          : undefined,
        status: item.status ? escapeHTML(item.status) : undefined,
      }));
      return reply.type("application/json").send(sanitized);
    } catch (err: any) {
      return reply.code(500).send({ error: err.message });
    }
  });

  // Smart Autocomplete Address Search (Hybrid: Google Maps + OSM Nominatim / Photon)
  fastify.get("/autocomplete", async (request, reply) => {
    try {
      const q = ((request.query as any)?.q || "").trim();
      const country = (request.query as any)?.country;
      if (!q || q.length < 2) {
        return [];
      }
      const results = await addressGeocodingService.searchAutocomplete(
        q,
        country,
      );
      return results;
    } catch (err: any) {
      return reply.code(500).send({ error: err.message });
    }
  });

  // Geocode address structured fields
  fastify.post("/geocode", async (request, reply) => {
    try {
      const body = (request.body as any) || {};
      const result = await addressGeocodingService.geocodeAddress(body);
      return result || { error: "Address could not be geocoded", found: false };
    } catch (err: any) {
      return reply.code(500).send({ error: err.message });
    }
  });

  // Helper to resolve caller role for Corporate Group Accounting/Controlling RBAC
  const resolveCallerRole = (request: any): string => {
    return (
      (request.user as any)?.role ||
      (request.headers?.["x-user-role"] as string) ||
      "ADMIN"
    );
  };

  // GET /api/addresses/types - Master Address Types catalog (CUS, CB, AG, HAU, CAR, INS, CAA, WH, FW, TRM)
  fastify.get("/types", async (_request, reply) => {
    try {
      const rows = await db.select().from(addressTypes);
      if (rows.length === 0) {
        return ADDRESS_TYPE_DEFINITIONS;
      }
      return rows;
    } catch (err: any) {
      return reply.code(500).send({ error: err.message });
    }
  });

  // GET /api/addresses/groups (and /companies) - Corporate Groups (Restricted to ACCOUNTING, CONTROLLING, ADMIN)
  const listEnterpriseGroupsHandler = async (request: any, reply: any) => {
    try {
      const callerRole = resolveCallerRole(request);
      if (!canManageCorporateGroups(callerRole)) {
        return reply.code(403).send({
          error:
            "Forbidden: Corporate Groups are restricted to Accounting, Controlling, and Admin users.",
        });
      }

      const [groupRows, addrRows] = await Promise.all([
        db.select().from(companies),
        db
          .select({
            id: addresses.id,
            companyId: addresses.companyId,
            companyName: addresses.companyName,
            addressType: addresses.addressType,
            country: addresses.country,
            city: addresses.city,
            unLocode: addresses.unLocode,
          })
          .from(addresses),
      ]);

      const enrichedGroups = groupRows.map((grp) => {
        const linked = addrRows.filter((a) => a.companyId === grp.id);
        const typeSet = Array.from(
          new Set(linked.map((a) => normalizeAddressTypeCode(a.addressType))),
        );
        const countries = Array.from(new Set(linked.map((a) => a.country)));
        return {
          ...grp,
          addressCount: linked.length,
          addressTypes: typeSet,
          countries,
          linkedAddresses: linked.map((a) => ({
            id: a.id,
            companyName: a.companyName,
            addressType: normalizeAddressTypeCode(a.addressType),
            city: a.city,
            country: a.country,
            unLocode: a.unLocode,
          })),
        };
      });

      return enrichedGroups.sort(
        (a, b) =>
          b.addressCount - a.addressCount || a.name.localeCompare(b.name),
      );
    } catch (err: any) {
      return reply.code(500).send({ error: err.message });
    }
  };

  fastify.get("/groups", listEnterpriseGroupsHandler);
  fastify.get("/companies", listEnterpriseGroupsHandler);

  // POST /api/addresses/groups - Create or update a Corporate Group (Restricted to ACCOUNTING, CONTROLLING, ADMIN)
  fastify.post("/groups", async (request, reply) => {
    try {
      const callerRole = resolveCallerRole(request);
      if (!canManageCorporateGroups(callerRole)) {
        return reply.code(403).send({
          error:
            "Forbidden: Corporate Groups are restricted to Accounting, Controlling, and Admin users.",
        });
      }

      const body = (request.body as any) || {};
      if (!body.name || !body.name.trim()) {
        return reply
          .code(400)
          .send({ error: "Corporate group name is required" });
      }
      const slug = body.name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");
      const groupId = body.id || `grp_${slug.substring(0, 24)}`;
      const now = new Date();

      await db
        .insert(companies)
        .values({
          id: groupId,
          name: body.name.trim(),
          groupCode:
            body.groupCode?.trim().toUpperCase() ||
            slug.substring(0, 6).toUpperCase(),
          sector: body.sector || "Global Logistics & Maritime",
          headquartersCountry:
            body.headquartersCountry?.trim().toUpperCase() || "ES",
          taxId: body.taxId?.trim().toUpperCase() || null,
          creditLimit:
            body.creditLimit !== undefined ? Number(body.creditLimit) : 1000000,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: companies.id,
          set: {
            name: body.name.trim(),
            groupCode:
              body.groupCode?.trim().toUpperCase() ||
              slug.substring(0, 6).toUpperCase(),
            sector: body.sector || "Global Logistics & Maritime",
            headquartersCountry:
              body.headquartersCountry?.trim().toUpperCase() || "ES",
            taxId: body.taxId?.trim().toUpperCase() || undefined,
            creditLimit:
              body.creditLimit !== undefined
                ? Number(body.creditLimit)
                : undefined,
            updatedAt: now,
          },
        });

      const created = await db
        .select()
        .from(companies)
        .where(eq(companies.id, groupId))
        .limit(1);
      return reply.code(201).send(created[0]);
    } catch (err: any) {
      return reply.code(500).send({ error: err.message });
    }
  });

  // PATCH /api/addresses/:id/corporate-group - Link a registered Address to a Corporate Group (Restricted to ACCOUNTING, CONTROLLING, ADMIN)
  fastify.patch("/:id/corporate-group", async (request, reply) => {
    try {
      const callerRole = resolveCallerRole(request);
      if (!canManageCorporateGroups(callerRole)) {
        return reply.code(403).send({
          error:
            "Forbidden: Linking addresses to a Corporate Group requires Accounting, Controlling, or Admin permissions.",
        });
      }

      const { id } = request.params as any;
      const body = (request.body as any) || {};
      const targetGroupId = body.companyId || body.groupId;
      if (!targetGroupId) {
        return reply
          .code(400)
          .send({ error: "companyId (Corporate Group ID) is required" });
      }

      const groupRow = await db
        .select()
        .from(companies)
        .where(eq(companies.id, targetGroupId))
        .limit(1);
      if (groupRow.length === 0) {
        return reply.code(404).send({ error: "Corporate Group not found" });
      }

      const updated = await db
        .update(addresses)
        .set({
          companyId: targetGroupId,
          updatedAt: new Date(),
        })
        .where(eq(addresses.id, id))
        .returning();

      if (updated.length === 0) {
        return reply.code(404).send({ error: "Address not found" });
      }

      return {
        ...updated[0],
        addressType: normalizeAddressTypeCode(updated[0].addressType),
        companyGroupName: groupRow[0].name,
        companyGroupCode: groupRow[0].groupCode,
      };
    } catch (err: any) {
      return reply.code(500).send({ error: err.message });
    }
  });

  // GET /api/addresses - List addresses with optional filters
  fastify.get("/", async (request, reply) => {
    try {
      const query = (request.query as any) || {};

      const conditions: any[] = [];
      const groupFilter = query.companyId || query.groupId;
      if (groupFilter && groupFilter !== "ALL") {
        conditions.push(eq(addresses.companyId, groupFilter));
      }

      const rawTypeFilter = query.type || query.addressType;
      if (rawTypeFilter && rawTypeFilter !== "ALL") {
        const rawTokens = String(rawTypeFilter)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        const expandedTypes = new Set<string>();
        for (const token of rawTokens) {
          const canonical = normalizeAddressTypeCode(token);
          expandedTypes.add(canonical);
          expandedTypes.add(token.toUpperCase());
          // Also include legacy equivalents so any un-migrated test fixtures match
          if (canonical === "CUS") {
            expandedTypes.add("CUSTOMER");
            expandedTypes.add("CONSIGNEE_NOTIFY");
          } else if (canonical === "CB") {
            expandedTypes.add("CUSTOMS_BROKER");
          } else if (canonical === "AG") {
            expandedTypes.add("AGENT");
            expandedTypes.add("PORT_AUTHORITY");
          } else if (canonical === "HAU") {
            expandedTypes.add("HAULIER");
          } else if (canonical === "CAR") {
            expandedTypes.add("CARRIER");
          } else if (canonical === "INS") {
            expandedTypes.add("INSURANCE");
          } else if (canonical === "CAA") {
            expandedTypes.add("CARRIER_AGENT");
          } else if (canonical === "WH") {
            expandedTypes.add("WAREHOUSE");
            expandedTypes.add("INLAND_DEPOT");
          } else if (canonical === "FW") {
            expandedTypes.add("FORWARDER");
          } else if (canonical === "TRM") {
            expandedTypes.add("TERMINAL");
          }
        }
        conditions.push(
          inArray(
            addresses.addressType,
            Array.from(expandedTypes) as AddressType[],
          ),
        );
      }

      if (query.unLocode) {
        conditions.push(eq(addresses.unLocode, query.unLocode.toUpperCase()));
      }
      if (query.search) {
        const term = `%${query.search}%`;
        conditions.push(
          or(
            like(addresses.companyName, term),
            like(addresses.tradeName, term),
            like(addresses.city, term),
            like(addresses.taxId, term),
            like(addresses.unLocode, term),
          ),
        );
      }

      const [rows, allGroups, allTypes] = await Promise.all([
        db
          .select()
          .from(addresses)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(addresses.createdAt)),
        db.select().from(companies),
        db.select().from(addressTypes),
      ]);

      const groupMap = new Map(allGroups.map((g) => [g.id, g]));
      const typeMap = new Map(allTypes.map((t) => [t.code, t]));
      const includeCorporateGroup = canManageCorporateGroups(
        resolveCallerRole(request),
      );

      // Fetch linked contacts for each address and enrich with Address Type definition
      // Corporate Group metadata is only exposed to ACCOUNTING, CONTROLLING, and ADMIN roles
      const results = await Promise.all(
        rows.map(async (addr) => {
          const contacts = await db
            .select()
            .from(addressContacts)
            .where(eq(addressContacts.addressId, addr.id));
          const canonicalCode = normalizeAddressTypeCode(addr.addressType);
          const group = groupMap.get(addr.companyId);
          const typeDef = typeMap.get(canonicalCode);
          return {
            ...addr,
            addressType: canonicalCode,
            addressTypeName: typeDef?.name || canonicalCode,
            ...(includeCorporateGroup
              ? {
                  companyGroupName: group?.name || addr.companyId,
                  companyGroupCode: group?.groupCode || null,
                }
              : {}),
            contacts,
          };
        }),
      );

      return results;
    } catch (err: any) {
      fastify.log.error(err, "Failed to list addresses");
      return reply.code(500).send({ error: err.message });
    }
  });

  // POST /api/addresses - Create address with duplicate detection & contacts
  fastify.post("/", async (request, reply) => {
    try {
      const tenant = getCurrentTenant();
      const body = (request.body as any) || {};
      const normalizedType = normalizeAddressTypeCode(body.addressType);

      const tenantId =
        body.companyId ||
        inferEnterpriseGroupId(
          body.companyName,
          normalizedType,
          tenant?.organizationId,
        );

      // Defensive guarantee that parent Enterprise Group exists in companies
      const existingGroup = await db
        .select()
        .from(companies)
        .where(eq(companies.id, tenantId))
        .limit(1);
      if (existingGroup.length === 0) {
        const knownDef = ENTERPRISE_COMPANY_GROUPS.find(
          (g) => g.id === tenantId,
        );
        await db
          .insert(companies)
          .values({
            id: tenantId,
            name:
              knownDef?.name ||
              body.companyGroupName ||
              body.companyName ||
              tenantId,
            groupCode:
              knownDef?.groupCode ||
              tenantId.replace(/^grp_/, "").substring(0, 6).toUpperCase(),
            sector: knownDef?.sector || "Global Logistics & Supply Chain",
            headquartersCountry:
              knownDef?.headquartersCountry || body.country || "ES",
            taxId: knownDef?.taxId || null,
            creditLimit: knownDef?.creditLimit || 1000000,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .onConflictDoNothing();
      }

      // Check existing addresses for duplicate detection
      const existing = await db
        .select()
        .from(addresses)
        .where(eq(addresses.companyId, tenantId));

      let matchedDuplicate: any = null;
      let highestScore = 0;

      for (const item of existing) {
        // 1. Tax ID Exact match
        if (
          body.taxId &&
          item.taxId &&
          body.taxId.trim().toUpperCase() === item.taxId.trim().toUpperCase()
        ) {
          matchedDuplicate = item;
          highestScore = 1.0;
          break;
        }

        // 2. Fuzzy text similarity match
        const proposedCombined = `${body.companyName || ""} ${body.street1 || ""} ${body.city || ""}`;
        const existingCombined = `${item.companyName || ""} ${item.street1 || ""} ${item.city || ""}`;
        const score = calculateSimilarity(proposedCombined, existingCombined);

        if (score > highestScore) {
          highestScore = score;
          if (score >= 0.8) {
            matchedDuplicate = item;
          }
        }
      }

      // If duplicate detected and overrideWarning is NOT confirmed:
      if (highestScore >= 0.8 && matchedDuplicate && !body.overrideWarning) {
        return reply.code(409).send({
          duplicateWarning: true,
          message:
            "Se ha detectado una dirección similar registrada para esta empresa.",
          matchScore: Math.round(highestScore * 100) / 100,
          matchedAddress: {
            id: matchedDuplicate.id,
            companyName: matchedDuplicate.companyName,
            addressType: matchedDuplicate.addressType,
            street1: matchedDuplicate.street1,
            city: matchedDuplicate.city,
            unLocode: matchedDuplicate.unLocode,
            taxId: matchedDuplicate.taxId,
          },
        });
      }

      const addressId = body.id || `addr_${uuidv4().substring(0, 8)}`;
      const now = new Date();

      // Geocoding & Verification Handling
      let lat =
        body.lat !== undefined && body.lat !== null && body.lat !== ""
          ? Number(body.lat)
          : null;
      let lon =
        body.lon !== undefined && body.lon !== null && body.lon !== ""
          ? Number(body.lon)
          : null;
      let formattedAddress = body.formattedAddress || null;
      let verificationStatus: AddressVerificationStatus =
        body.verificationStatus || "NOT_CHECKED";
      let verificationProvider: AddressVerificationProvider | null =
        body.verificationProvider || null;

      // If coordinates not already supplied from UI, attempt backend geocoding (with strict timeout)
      if (lat === null || lon === null || isNaN(lat) || isNaN(lon)) {
        if (process.env.NODE_ENV === "test") {
          verificationStatus = "MANUAL_UNVERIFIED";
          verificationProvider = "MANUAL";
        } else {
          try {
            const timeoutPromise = new Promise<null>((_, reject) =>
              setTimeout(() => reject(new Error("Geocode timeout")), 1200),
            );
            const geo = await Promise.race([
              addressGeocodingService.geocodeAddress({
                street1: body.street1,
                zipCode: body.zipCode,
                city: body.city,
                federalState: body.federalState,
                country: body.country,
              }),
              timeoutPromise,
            ]);
            if (geo && !isNaN(geo.lat) && !isNaN(geo.lon)) {
              lat = geo.lat;
              lon = geo.lon;
              formattedAddress = formattedAddress || geo.formattedAddress;
              verificationStatus = "VERIFIED";
              verificationProvider =
                geo.provider as AddressVerificationProvider;
            } else {
              verificationStatus = "MANUAL_UNVERIFIED";
              verificationProvider = "MANUAL";
            }
          } catch {
            verificationStatus = "MANUAL_UNVERIFIED";
            verificationProvider = "MANUAL";
          }
        }
      } else {
        if (!verificationStatus || verificationStatus === "NOT_CHECKED") {
          verificationStatus = "VERIFIED";
        }
        if (!verificationProvider) {
          verificationProvider = "MANUAL";
        }
      }

      const inserted = await db
        .insert(addresses)
        .values({
          id: addressId,
          companyId: tenantId,
          addressType: normalizedType as AddressType,
          companyName: body.companyName,
          tradeName: body.tradeName || null,
          taxId: body.taxId ? body.taxId.trim().toUpperCase() : null,
          street1: body.street1,
          street2: body.street2 || null,
          zipCode: body.zipCode,
          city: body.city,
          federalState: body.federalState || null,
          country: body.country,
          unLocode: body.unLocode ? body.unLocode.trim().toUpperCase() : null,
          isDefaultShipper: Boolean(body.isDefaultShipper),
          isDefaultConsignee: Boolean(body.isDefaultConsignee),
          isDefaultNotify: Boolean(body.isDefaultNotify),
          notes: body.notes || null,
          lat,
          lon,
          formattedAddress,
          verificationStatus,
          verificationProvider,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      const createdAddress = inserted[0];
      const createdContacts: any[] = [];

      if (Array.isArray(body.contacts) && body.contacts.length > 0) {
        for (const c of body.contacts) {
          const contactId = `ct_${uuidv4().substring(0, 8)}`;
          const insertedContact = await db
            .insert(addressContacts)
            .values({
              id: contactId,
              addressId: createdAddress.id,
              fullName: c.fullName,
              email: c.email,
              phone: c.phone || null,
              mobile: c.mobile || null,
              roleCategory: (c.roleCategory ||
                "OPERATIONS") as ContactRoleCategory,
              jobTitle: c.jobTitle || null,
              isPrimary: Boolean(c.isPrimary),
              createdAt: now,
              updatedAt: now,
            })
            .returning();
          createdContacts.push(insertedContact[0]);
        }
      }

      return reply.code(201).send({
        ...createdAddress,
        contacts: createdContacts,
      });
    } catch (err: any) {
      fastify.log.error(err, "Failed to create address");
      return reply.code(500).send({ error: err.message });
    }
  });

  // GET /api/addresses/:id - Get address with contacts and B/L format blocks
  fastify.get("/:id", async (request, reply) => {
    try {
      const { id } = request.params as any;
      const rows = await db
        .select()
        .from(addresses)
        .where(eq(addresses.id, id))
        .limit(1);

      if (rows.length === 0) {
        return reply.code(404).send({ error: "Address not found" });
      }

      const addr = rows[0];
      const canonicalCode = normalizeAddressTypeCode(addr.addressType);
      const [contacts, groupRows, typeRows] = await Promise.all([
        db
          .select()
          .from(addressContacts)
          .where(eq(addressContacts.addressId, id)),
        db
          .select()
          .from(companies)
          .where(eq(companies.id, addr.companyId))
          .limit(1),
        db
          .select()
          .from(addressTypes)
          .where(eq(addressTypes.code, canonicalCode))
          .limit(1),
      ]);

      const primaryContact = contacts.find((c) => c.isPrimary) || contacts[0];

      // Generate pre-rendered Maritime B/L party shape boxes
      const blBoxes = formatAllBlBoxes({
        shipper: {
          companyName: addr.companyName,
          tradeName: addr.tradeName || undefined,
          taxId: addr.taxId || undefined,
          street1: addr.street1,
          street2: addr.street2 || undefined,
          zipCode: addr.zipCode,
          city: addr.city,
          country: addr.country,
          unLocode: addr.unLocode || undefined,
        },
        shipperContact: primaryContact
          ? {
              fullName: primaryContact.fullName,
              email: primaryContact.email,
              phone: primaryContact.phone || undefined,
            }
          : undefined,
        consignee: {
          companyName: addr.companyName,
          tradeName: addr.tradeName || undefined,
          taxId: addr.taxId || undefined,
          street1: addr.street1,
          street2: addr.street2 || undefined,
          zipCode: addr.zipCode,
          city: addr.city,
          country: addr.country,
          unLocode: addr.unLocode || undefined,
        },
        notify: {
          companyName: addr.companyName,
          taxId: addr.taxId || undefined,
          street1: addr.street1,
          street2: addr.street2 || undefined,
          zipCode: addr.zipCode,
          city: addr.city,
          country: addr.country,
          unLocode: addr.unLocode || undefined,
        },
        notifyContact: primaryContact
          ? {
              fullName: primaryContact.fullName,
              email: primaryContact.email,
              phone: primaryContact.phone || undefined,
            }
          : undefined,
        agent: {
          companyName: addr.companyName,
          street1: addr.street1,
          zipCode: addr.zipCode,
          city: addr.city,
          country: addr.country,
          unLocode: addr.unLocode || undefined,
        },
        agentContact: primaryContact
          ? {
              fullName: primaryContact.fullName,
              phone: primaryContact.phone || undefined,
            }
          : undefined,
      });

      return {
        ...addr,
        addressType: canonicalCode,
        addressTypeName: typeRows[0]?.name || canonicalCode,
        companyGroupName: groupRows[0]?.name || addr.companyId,
        companyGroupCode: groupRows[0]?.groupCode || null,
        contacts,
        blBoxes,
      };
    } catch (err: any) {
      return reply.code(500).send({ error: err.message });
    }
  });

  // PUT /api/addresses/:id - Update address & sync contacts
  fastify.put("/:id", async (request, reply) => {
    try {
      const { id } = request.params as any;
      const body = (request.body as any) || {};
      const normalizedType = body.addressType
        ? normalizeAddressTypeCode(body.addressType)
        : undefined;

      if (body.companyId) {
        const existingGroup = await db
          .select()
          .from(companies)
          .where(eq(companies.id, body.companyId))
          .limit(1);
        if (existingGroup.length === 0) {
          const knownDef = ENTERPRISE_COMPANY_GROUPS.find(
            (g) => g.id === body.companyId,
          );
          await db
            .insert(companies)
            .values({
              id: body.companyId,
              name:
                knownDef?.name ||
                body.companyGroupName ||
                body.companyName ||
                body.companyId,
              groupCode:
                knownDef?.groupCode ||
                body.companyId
                  .replace(/^grp_/, "")
                  .substring(0, 6)
                  .toUpperCase(),
              sector: knownDef?.sector || "Global Logistics & Supply Chain",
              headquartersCountry:
                knownDef?.headquartersCountry || body.country || "ES",
              taxId: knownDef?.taxId || null,
              creditLimit: knownDef?.creditLimit || 1000000,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .onConflictDoNothing();
        }
      }

      const updated = await db
        .update(addresses)
        .set({
          companyId: body.companyId || undefined,
          addressType: normalizedType as AddressType | undefined,
          companyName: body.companyName,
          tradeName: body.tradeName || null,
          taxId: body.taxId ? body.taxId.trim().toUpperCase() : null,
          street1: body.street1,
          street2: body.street2 || null,
          zipCode: body.zipCode,
          city: body.city,
          federalState: body.federalState || null,
          country: body.country,
          unLocode: body.unLocode ? body.unLocode.trim().toUpperCase() : null,
          isDefaultShipper: Boolean(body.isDefaultShipper),
          isDefaultConsignee: Boolean(body.isDefaultConsignee),
          isDefaultNotify: Boolean(body.isDefaultNotify),
          notes: body.notes || null,
          lat:
            body.lat !== undefined
              ? body.lat !== null && body.lat !== ""
                ? Number(body.lat)
                : null
              : undefined,
          lon:
            body.lon !== undefined
              ? body.lon !== null && body.lon !== ""
                ? Number(body.lon)
                : null
              : undefined,
          formattedAddress:
            body.formattedAddress !== undefined
              ? body.formattedAddress
              : undefined,
          verificationStatus:
            (body.verificationStatus as AddressVerificationStatus) || undefined,
          verificationProvider:
            (body.verificationProvider as AddressVerificationProvider) ||
            undefined,
          updatedAt: new Date(),
        })
        .where(eq(addresses.id, id))
        .returning();

      if (updated.length === 0) {
        return reply.code(404).send({ error: "Address not found" });
      }

      // If contacts array provided, refresh contacts
      if (Array.isArray(body.contacts)) {
        await db
          .delete(addressContacts)
          .where(eq(addressContacts.addressId, id));
        for (const c of body.contacts) {
          await db.insert(addressContacts).values({
            id: c.id || `ct_${uuidv4().substring(0, 8)}`,
            addressId: id,
            fullName: c.fullName,
            email: c.email,
            phone: c.phone || null,
            mobile: c.mobile || null,
            roleCategory: c.roleCategory || "OPERATIONS",
            jobTitle: c.jobTitle || null,
            isPrimary: Boolean(c.isPrimary),
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }

      const finalContacts = await db
        .select()
        .from(addressContacts)
        .where(eq(addressContacts.addressId, id));

      return {
        ...updated[0],
        contacts: finalContacts,
      };
    } catch (err: any) {
      return reply.code(500).send({ error: err.message });
    }
  });

  // DELETE /api/addresses/:id - Delete address and cascade contacts
  fastify.delete("/:id", async (request, reply) => {
    try {
      const { id } = request.params as any;

      // Delete contacts first
      await db.delete(addressContacts).where(eq(addressContacts.addressId, id));

      const deleted = await db
        .delete(addresses)
        .where(eq(addresses.id, id))
        .returning();

      if (deleted.length === 0) {
        return reply.code(404).send({ error: "Address not found" });
      }

      return {
        success: true,
        message: "Address and contacts successfully deleted",
        id,
      };
    } catch (err: any) {
      return reply.code(500).send({ error: err.message });
    }
  });
};

export default addressesRoutes;
