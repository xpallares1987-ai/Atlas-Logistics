/**
 * scheduled-import.ts
 * Polls a remote URL at a configurable interval and imports new data
 * into the dashboard store when a file changes (detected via ETag / Last-Modified).
 *
 * Usage:
 *   const stop = startScheduledImport({ url: '...', intervalMs: 60000, type: 'operational' });
 *   // Later:
 *   stop();
 */
'use client';

import type { ReportType, UploadedFile } from '../types/dashboard';
import { parseFile } from './csv-parser';
import { buildMappingState, applyMapping, autoMatchColumns } from './column-mapper';
import { useDashboardStore } from './data-store';

export interface ScheduledImportConfig {
  url: string;
  type: ReportType;
  intervalMs?: number;   // default 60 000 ms (1 min)
  onSuccess?: (rowCount: number) => void;
  onError?: (err: Error) => void;
}

interface EtagCache {
  etag?: string;
  lastModified?: string;
}

const cache: Record<string, EtagCache> = {};

async function fetchAndImport(config: ScheduledImportConfig): Promise<void> {
  const { url, type } = config;

  const prev = cache[url] ?? {};
  const headers: Record<string, string> = {};
  if (prev.etag)         headers['If-None-Match']     = prev.etag;
  if (prev.lastModified) headers['If-Modified-Since'] = prev.lastModified;

  let response: Response;
  try {
    response = await fetch(url, { headers, cache: 'no-store' });
  } catch (err) {
    config.onError?.(err instanceof Error ? err : new Error(String(err)));
    return;
  }

  if (response.status === 304) return; // not modified

  if (!response.ok) {
    config.onError?.(new Error(`HTTP ${response.status}`));
    return;
  }

  // Update cache headers
  cache[url] = {
    etag: response.headers.get('ETag') ?? undefined,
    lastModified: response.headers.get('Last-Modified') ?? undefined,
  };

  // Convert response to a File-like object and parse
  const blob = await response.blob();
  const fileName = url.split('/').pop() ?? 'import.csv';
  const file = new File([blob], fileName);

  try {
    const parsed = await parseFile(file);
    const mappings = autoMatchColumns(parsed.columns, type);
    const mapping = buildMappingState(fileName, parsed.columns, parsed.rows, type);
    const rows = applyMapping(mapping.rawData, mappings, type);

    const uploadedFile: UploadedFile = {
      id:          `scheduled-${url}`,
      name:        `⏱ ${fileName} (auto)`,
      type,
      uploadedAt:  new Date().toISOString(),
      rowCount:    rows.length,
    };

    const store = useDashboardStore.getState();
    if (type === 'operational') store.addOperational(rows as never, uploadedFile);
    else if (type === 'financial') store.addFinancial(rows as never, uploadedFile);
    else store.addExceptions(rows as never, uploadedFile);

    config.onSuccess?.(rows.length);
  } catch (err) {
    config.onError?.(err instanceof Error ? err : new Error(String(err)));
  }
}

export function startScheduledImport(config: ScheduledImportConfig): () => void {
  const intervalMs = config.intervalMs ?? 60_000;

  // Run immediately
  fetchAndImport(config);

  const id = setInterval(() => fetchAndImport(config), intervalMs);
  return () => clearInterval(id);
}
