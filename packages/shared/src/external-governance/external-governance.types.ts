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

export const upsertUnlocodeRequestSchema = z.object({
  location: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^[A-Z0-9]{5}$/,
      "UN/LOCODE must be exactly 5 alphanumeric characters",
    ),
  name: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(
      /^[a-zA-Z0-9\s.,'()\-À-ÿ]+$/,
      "Port name contains invalid characters",
    ),
  country: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "Country code must be exactly 2 uppercase letters"),
  coordinates: z
    .union([
      z.string().regex(/^[0-9A-Za-z\s.,\-+]+$/),
      z
        .object({
          lat: z.number().optional(),
          lng: z.number().optional(),
        })
        .transform((c) =>
          c.lat !== undefined && c.lng !== undefined
            ? `${c.lat}, ${c.lng}`
            : undefined,
        ),
    ])
    .optional(),
  status: z
    .string()
    .trim()
    .max(10)
    .regex(/^[A-Za-z0-9]+$/, "Status contains invalid characters")
    .optional(),
  subdivision: z
    .string()
    .trim()
    .max(10)
    .regex(/^[A-Za-z0-9]+$/, "Subdivision contains invalid characters")
    .optional(),
  function: z
    .string()
    .trim()
    .max(20)
    .regex(/^[0-9\-]+$/, "Function contains invalid characters")
    .optional(),
});

export type UpsertUnlocodeRequest = z.infer<typeof upsertUnlocodeRequestSchema>;
