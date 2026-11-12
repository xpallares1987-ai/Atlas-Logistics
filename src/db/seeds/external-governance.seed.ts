/**
 * External Data Governance Deterministic Seeder
 *
 * Populates core authoritative data sources (UN/LOCODE, OpenStreetMap, GeoNames, GLEIF),
 * initial raw JSON payloads with cryptographic SHA-256 hashes, and binds them to
 * canonical Atlas locations and shipments (e.g. sh_demo_01).
 */

import { db } from "../index.js";
import {
  dataSources,
  sourceRecords,
  entitySourceLinks,
} from "../schema/external_governance.js";
import crypto from "node:crypto";
import { SeedContext } from "./index.js";

function sha256Json(payload: Record<string, unknown>): string {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
}

export async function seedExternalGovernance(
  _ctx?: Partial<SeedContext>,
): Promise<void> {
  const now = new Date();

  // 1. Seed Authoritative Data Sources
  const initialSources = [
    {
      id: "src_unlocode",
      code: "UNLOCODE",
      name: "United Nations Code for Trade and Transport Locations (UNECE)",
      type: "AUTHORITY" as const,
      websiteUrl: "https://unece.org/trade/cefact/unlocode",
      termsUrl: "https://unece.org/trade/terms-of-use",
      description:
        "Official UN/CEFACT geographic coding standard for world ports and logistics hubs.",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "src_osm",
      code: "OPENSTREETMAP",
      name: "OpenStreetMap Foundation / Nominatim Geocoding",
      type: "OPEN_DATA" as const,
      websiteUrl: "https://www.openstreetmap.org/",
      termsUrl: "https://operations.osmfoundation.org/policies/nominatim/",
      description: "Collaborative open mapping and global geocoding API.",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "src_geonames",
      code: "GEONAMES",
      name: "GeoNames Geographical Database",
      type: "OPEN_DATA" as const,
      websiteUrl: "https://www.geonames.org/",
      termsUrl: "https://www.geonames.org/about.html",
      description:
        "Global geographical database with over 11 million placenames.",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "src_gleif",
      code: "GLEIF",
      name: "Global Legal Entity Identifier Foundation",
      type: "REGULATORY" as const,
      websiteUrl: "https://www.gleif.org/",
      termsUrl: "https://www.gleif.org/en/about/terms-of-use",
      description:
        "Global registry of verified Legal Entity Identifiers (LEI) for carriers and financial institutions.",
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const src of initialSources) {
    await db
      .insert(dataSources)
      .values(src)
      .onConflictDoUpdate({
        target: dataSources.id,
        set: {
          code: src.code,
          name: src.name,
          type: src.type,
          websiteUrl: src.websiteUrl,
          termsUrl: src.termsUrl,
          description: src.description,
          updatedAt: now,
        },
      });
  }

  // 2. Seed Raw Source Records (UN/LOCODE Hubs + OSM Geocodes)
  const bcnPayload = {
    changeCode: "",
    country: "ES",
    location: "BCN",
    name: "Barcelona",
    nameWoDiacritics: "Barcelona",
    subdivision: "B",
    function: "12345---",
    status: "AI",
    date: "0201",
    iata: "BCN",
    coordinates: "4121N 00210E",
  };

  const rtmPayload = {
    changeCode: "",
    country: "NL",
    location: "RTM",
    name: "Rotterdam",
    nameWoDiacritics: "Rotterdam",
    subdivision: "ZH",
    function: "12345---",
    status: "AI",
    date: "0301",
    iata: "RTM",
    coordinates: "5155N 00428E",
  };

  const vlcPayload = {
    changeCode: "",
    country: "ES",
    location: "VLC",
    name: "Valencia",
    nameWoDiacritics: "Valencia",
    subdivision: "V",
    function: "12345---",
    status: "AI",
    date: "0107",
    iata: "VLC",
    coordinates: "3927N 00019W",
  };

  const shaPayload = {
    changeCode: "",
    country: "CN",
    location: "SHA",
    name: "Shanghai",
    nameWoDiacritics: "Shanghai",
    subdivision: "SH",
    function: "12345---",
    status: "AI",
    date: "0001",
    iata: "SHA",
    coordinates: "3113N 12130E",
  };

  const osmBcnPayload = {
    placeId: "osm_node_41210210",
    lat: 41.3542,
    lon: 2.1625,
    displayName:
      "Terminal de Contenedores de Barcelona, Port de Barcelona, Catalunya, España",
    osmType: "node",
    category: "marine",
    type: "port_terminal",
  };

  const initialRecords = [
    {
      id: "srec_unlocode_esbcn",
      sourceId: "src_unlocode",
      externalId: "ESBCN",
      sourceUrl: "https://service.unece.org/trade/locode/es.htm",
      rawPayload: bcnPayload,
      normalizedPayload: {
        locode: "ESBCN",
        portName: "Barcelona",
        countryCode: "ES",
        lat: 41.35,
        lng: 2.1666,
      },
      sha256Hash: sha256Json(bcnPayload),
      retrievedAt: now,
      versionTag: "2026-1",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "srec_unlocode_nlrtm",
      sourceId: "src_unlocode",
      externalId: "NLRTM",
      sourceUrl: "https://service.unece.org/trade/locode/nl.htm",
      rawPayload: rtmPayload,
      normalizedPayload: {
        locode: "NLRTM",
        portName: "Rotterdam",
        countryCode: "NL",
        lat: 51.9166,
        lng: 4.4666,
      },
      sha256Hash: sha256Json(rtmPayload),
      retrievedAt: now,
      versionTag: "2026-1",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "srec_unlocode_esvlc",
      sourceId: "src_unlocode",
      externalId: "ESVLC",
      sourceUrl: "https://service.unece.org/trade/locode/es.htm",
      rawPayload: vlcPayload,
      normalizedPayload: {
        locode: "ESVLC",
        portName: "Valencia",
        countryCode: "ES",
        lat: 39.45,
        lng: -0.3166,
      },
      sha256Hash: sha256Json(vlcPayload),
      retrievedAt: now,
      versionTag: "2026-1",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "srec_unlocode_cnsha",
      sourceId: "src_unlocode",
      externalId: "CNSHA",
      sourceUrl: "https://service.unece.org/trade/locode/cn.htm",
      rawPayload: shaPayload,
      normalizedPayload: {
        locode: "CNSHA",
        portName: "Shanghai",
        countryCode: "CN",
        lat: 31.2166,
        lng: 121.5,
      },
      sha256Hash: sha256Json(shaPayload),
      retrievedAt: now,
      versionTag: "2026-1",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "srec_osm_esbcn_terminal",
      sourceId: "src_osm",
      externalId: "osm_node_41210210",
      sourceUrl:
        "https://nominatim.openstreetmap.org/details.php?osmtype=N&osmid=41210210",
      rawPayload: osmBcnPayload,
      normalizedPayload: {
        name: "Terminal de Contenedores de Barcelona",
        lat: 41.3542,
        lng: 2.1625,
      },
      sha256Hash: sha256Json(osmBcnPayload),
      retrievedAt: now,
      versionTag: "osm_2026_q1",
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const rec of initialRecords) {
    await db
      .insert(sourceRecords)
      .values(rec)
      .onConflictDoUpdate({
        target: sourceRecords.id,
        set: {
          externalId: rec.externalId,
          sourceUrl: rec.sourceUrl,
          rawPayload: rec.rawPayload,
          normalizedPayload: rec.normalizedPayload,
          sha256Hash: rec.sha256Hash,
          retrievedAt: rec.retrievedAt,
          versionTag: rec.versionTag,
          updatedAt: now,
        },
      });
  }

  // 3. Seed Entity Source Links (Connecting to internal locations and canonical shipment)
  const initialLinks = [
    {
      id: "esl_port_esbcn",
      entityType: "PORT" as const,
      entityId: "ESBCN",
      sourceRecordId: "srec_unlocode_esbcn",
      matchConfidence: 1.0,
      matchMethod: "EXACT_CODE" as const,
      verifiedAt: now,
      verifiedBy: "automated_seed_engine",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "esl_port_nlrtm",
      entityType: "PORT" as const,
      entityId: "NLRTM",
      sourceRecordId: "srec_unlocode_nlrtm",
      matchConfidence: 1.0,
      matchMethod: "EXACT_CODE" as const,
      verifiedAt: now,
      verifiedBy: "automated_seed_engine",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "esl_shipment_sh_demo_01_origin",
      entityType: "SHIPMENT" as const,
      entityId: "sh_demo_01",
      sourceRecordId: "srec_unlocode_esbcn",
      matchConfidence: 1.0,
      matchMethod: "EXACT_CODE" as const,
      verifiedAt: now,
      verifiedBy: "system_provenance_pipeline",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "esl_container_msku9284712",
      entityType: "CONTAINER" as const,
      entityId: "MSKU9284712",
      sourceRecordId: "srec_osm_esbcn_terminal",
      matchConfidence: 0.98,
      matchMethod: "GEO_PROXIMITY" as const,
      verifiedAt: now,
      verifiedBy: "system_provenance_pipeline",
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const link of initialLinks) {
    await db
      .insert(entitySourceLinks)
      .values(link)
      .onConflictDoUpdate({
        target: entitySourceLinks.id,
        set: {
          entityType: link.entityType,
          entityId: link.entityId,
          sourceRecordId: link.sourceRecordId,
          matchConfidence: link.matchConfidence,
          matchMethod: link.matchMethod,
          verifiedAt: link.verifiedAt,
          verifiedBy: link.verifiedBy,
          updatedAt: now,
        },
      });
  }

  console.log(
    "✓ External Data Governance deterministic seeds applied (4 sources, 5 records, 4 entity links).",
  );
}
