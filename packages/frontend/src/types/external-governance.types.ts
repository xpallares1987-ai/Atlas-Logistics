import {
  DataSourceDto,
  SourceRecordDto,
  EntitySourceLinkDto,
  UnlocodeEntry,
  UnlocodeStats,
  DataSourceType,
  ExternalEntityType,
  MatchMethod,
} from "@atlas/shared";

export type ActiveGovernanceTab = "sources" | "unlocode" | "records" | "links";

export type HashVerificationStatus =
  "idle" | "verifying" | "valid" | "mismatch";

export interface GovernanceMetrics {
  totalSources: number;
  totalRecords: number;
  totalLinks: number;
  unlocodeCount: number;
  trieNodes: number;
  lruSize: number;
}

export interface UnlocodeLookupResult {
  entry: UnlocodeEntry;
  latencyMs: number;
}

export interface IngestRecordFormData {
  sourceCode: string;
  externalId: string;
  sourceUrl?: string;
  rawJson: string;
  versionTag?: string;
}

export interface CreateEntityLinkFormData {
  entityType: ExternalEntityType;
  entityId: string;
  sourceRecordId: string;
  matchConfidence: number;
  matchMethod: MatchMethod;
  verifiedBy?: string;
}

export interface UpsertUnlocodeFormData {
  location: string;
  name: string;
  country: string;
  lat?: number;
  lng?: number;
  status?: string;
}

export type {
  DataSourceDto,
  SourceRecordDto,
  EntitySourceLinkDto,
  UnlocodeEntry,
  UnlocodeStats,
  DataSourceType,
  ExternalEntityType,
  MatchMethod,
};
