import { useState, useCallback } from "react";
import { useApiQuery, useApiMutation, useQueryClient } from "./useApiQuery";
import {
  DataSourceDto,
  SourceRecordDto,
  UnlocodeEntry,
  UnlocodeStats,
  CreateEntityLinkFormData,
  UpsertUnlocodeFormData,
} from "../types/external-governance.types";

interface SourcesResponse {
  success: boolean;
  count: number;
  data: DataSourceDto[];
}

interface RecordsResponse {
  success: boolean;
  count: number;
  data: SourceRecordDto[];
}

export interface JoinedEntityLink {
  link: {
    id: string;
    entityType: string;
    entityId: string;
    sourceRecordId: string;
    matchConfidence: number;
    matchMethod: string;
    verifiedAt: string;
    verifiedBy: string | null;
    createdAt: string;
  };
  sourceRecord: SourceRecordDto;
}

interface EntityLinksResponse {
  success: boolean;
  count: number;
  data: JoinedEntityLink[];
}

interface UnlocodeLookupResponse {
  success: boolean;
  count: number;
  data: UnlocodeEntry[];
  stats: UnlocodeStats;
}

export function useExternalGovernance() {
  const queryClient = useQueryClient();
  const [unlocodeQuery, setUnlocodeQuery] = useState("");
  const [lookupLatencyMs, setLookupLatencyMs] = useState(0);

  // 1. Data Sources Query
  const sourcesQuery = useApiQuery<SourcesResponse>(
    ["external-governance", "sources"],
    "/external-governance/sources",
  );

  // 2. Raw Records Query
  const recordsQuery = useApiQuery<RecordsResponse>(
    ["external-governance", "records"],
    "/external-governance/records",
  );

  // 3. Entity Links Query
  const entityLinksQuery = useApiQuery<EntityLinksResponse>(
    ["external-governance", "entity-links"],
    "/external-governance/entity-links",
  );

  // 4. UN/LOCODE Live Lookup Query
  const unlocodeLookupPath = unlocodeQuery.trim()
    ? `/external-governance/unlocode/lookup?q=${encodeURIComponent(unlocodeQuery.trim())}&limit=25`
    : "/external-governance/unlocode/lookup?limit=25";

  const unlocodeQueryState = useApiQuery<UnlocodeLookupResponse>(
    ["external-governance", "unlocode", unlocodeQuery],
    unlocodeLookupPath,
  );

  // 5. Ingest Raw Record Mutation
  const ingestRecordMutation = useApiMutation<any, any>(
    "/external-governance/records",
    "POST",
    {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["external-governance", "records"],
        });
      },
    },
  );

  // 6. Create Entity Link Mutation
  const createEntityLinkMutation = useApiMutation<
    any,
    CreateEntityLinkFormData
  >("/external-governance/entity-links", "POST", {
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["external-governance", "entity-links"],
      });
    },
  });

  // 7. Upsert UN/LOCODE (Write-Through Cache in RAM + SQLite)
  const upsertUnlocodeMutation = useApiMutation<any, UpsertUnlocodeFormData>(
    "/external-governance/unlocode/upsert",
    "POST",
    {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["external-governance", "unlocode"],
        });
        queryClient.invalidateQueries({
          queryKey: ["external-governance", "records"],
        });
      },
    },
  );

  // Custom search trigger with latency tracking
  const triggerUnlocodeSearch = useCallback(async (searchTerm: string) => {
    const startTime = performance.now();
    setUnlocodeQuery(searchTerm);
    const endTime = performance.now();
    setLookupLatencyMs(Math.round((endTime - startTime) * 100) / 100);
  }, []);

  return {
    // Data
    sources: sourcesQuery.data?.data || [],
    records: recordsQuery.data?.data || [],
    entityLinks: entityLinksQuery.data?.data || [],
    unlocodeEntries: unlocodeQueryState.data?.data || [],
    unlocodeStats: unlocodeQueryState.data?.stats || null,

    // Loading states
    isLoading:
      sourcesQuery.isLoading ||
      recordsQuery.isLoading ||
      entityLinksQuery.isLoading,
    isUnlocodeLoading: unlocodeQueryState.isLoading,

    // Errors
    error:
      sourcesQuery.error?.message ||
      recordsQuery.error?.message ||
      entityLinksQuery.error?.message ||
      null,

    // Latency & Search
    unlocodeQuery,
    lookupLatencyMs,
    triggerUnlocodeSearch,

    // Mutations
    ingestRecord: ingestRecordMutation.mutateAsync,
    isIngesting: ingestRecordMutation.isPending,
    createEntityLink: createEntityLinkMutation.mutateAsync,
    isLinking: createEntityLinkMutation.isPending,
    upsertUnlocode: upsertUnlocodeMutation.mutateAsync,
    isUpserting: upsertUnlocodeMutation.isPending,

    // Refreshers
    refetchAll: () => {
      sourcesQuery.refetch();
      recordsQuery.refetch();
      entityLinksQuery.refetch();
      unlocodeQueryState.refetch();
    },
  };
}
