import { z } from "zod";

export type DataSourceType =
  "OPEN_DATA" | "AUTHORITY" | "COMMERCIAL_API" | "REGULATORY";

export type ExternalEntityType =
  "PORT" | "LOCATION" | "VESSEL" | "CARRIER" | "SHIPMENT" | "CONTAINER";

export type MatchMethod =
  "EXACT_CODE" | "FUZZY_NAME" | "GEO_PROXIMITY" | "MANUAL";

export interface DataSourceDto {
  id: string;
  code: string;
  name: string;
  type: DataSourceType;
  websiteUrl?: string | null;
  termsUrl?: string | null;
  description?: string | null;
  createdAt?: string | Date;
}

export interface SourceRecordDto<
  TRaw = Record<string, unknown>,
  TNorm = Record<string, unknown>,
> {
  id: string;
  sourceId: string;
  externalId: string;
  sourceUrl?: string | null;
  rawPayload: TRaw;
  normalizedPayload?: TNorm | null;
  sha256Hash: string;
  retrievedAt: string | Date;
  versionTag?: string | null;
}

export interface EntitySourceLinkDto {
  id: string;
  entityType: ExternalEntityType;
  entityId: string;
  sourceRecordId: string;
  matchConfidence: number;
  matchMethod: MatchMethod;
  verifiedAt: string | Date;
  verifiedBy?: string | null;
  sourceRecord?: SourceRecordDto;
}

// Zod validation schemas
export const ingestSourceRecordRequestSchema = z.object({
  sourceCode: z.string().min(1),
  externalId: z.string().min(1),
  sourceUrl: z.string().url().optional(),
  rawPayload: z.record(z.string(), z.any()),
  normalizedPayload: z.record(z.string(), z.any()).optional(),
  versionTag: z.string().optional(),
});

export type IngestSourceRecordRequest = z.infer<
  typeof ingestSourceRecordRequestSchema
>;

export const createEntityLinkRequestSchema = z.object({
  entityType: z.enum([
    "PORT",
    "LOCATION",
    "VESSEL",
    "CARRIER",
    "SHIPMENT",
    "CONTAINER",
  ]),
  entityId: z.string().min(1),
  sourceRecordId: z.string().min(1),
  matchConfidence: z.number().min(0).max(1).default(1.0),
  matchMethod: z
    .enum(["EXACT_CODE", "FUZZY_NAME", "GEO_PROXIMITY", "MANUAL"])
    .default("EXACT_CODE"),
  verifiedBy: z.string().optional(),
});

export type CreateEntityLinkRequest = z.infer<
  typeof createEntityLinkRequestSchema
>;
