/**
 * @file offline-queue.ts
 * @description Resilient offline queue manager for document uploads, voyage manifests,
 * and pending mutations with exponential backoff, jitter, dead-letter queue handling,
 * and rate-limiting throttle to protect connectivity when restored.
 */

export interface QueuedDocument {
  id: string;
  shipmentId: string;
  documentType: string;
  fileName: string;
  fileBase64: string;
  fileSize: string;
  comments: string;
  uploadedBy: string;
  createdAt: number;
  parentDocumentId?: string;
  folderId?: string | null;
  retryCount: number;
  lastAttemptAt?: number;
  nextRetryAt?: number;
  lastError?: string;
  status: "pending" | "retrying" | "dead_letter";
}

export interface OfflineQueueStats {
  total: number;
  pending: number;
  retrying: number;
  deadLetter: number;
}

export const QUEUE_CONFIG = {
  MAX_RETRIES: 5,
  INITIAL_BACKOFF_MS: 1000,
  MAX_BACKOFF_MS: 32000,
  BACKOFF_FACTOR: 2,
  JITTER_MS: 500,
  REQUEST_THROTTLE_MS: 100,
} as const;

/**
 * Calculates exponential backoff delay with jitter.
 */
export function calculateBackoffDelay(retryCount: number): number {
  const base = Math.min(
    QUEUE_CONFIG.MAX_BACKOFF_MS,
    QUEUE_CONFIG.INITIAL_BACKOFF_MS * Math.pow(QUEUE_CONFIG.BACKOFF_FACTOR, Math.max(0, retryCount - 1)),
  );
  const jitter = Math.floor(Math.random() * QUEUE_CONFIG.JITTER_MS);
  return base + jitter;
}

/**
 * In-memory & IndexedDB compatible offline document queue engine.
 */
export class OfflineDocumentQueue {
  private queue: Map<string, QueuedDocument> = new Map();

  /**
   * Enqueues a new document for synchronization.
   */
  enqueue(
    doc: Omit<QueuedDocument, "id" | "createdAt" | "retryCount" | "status">,
  ): QueuedDocument {
    const id = `offline-doc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const queuedDoc: QueuedDocument = {
      ...doc,
      id,
      createdAt: Date.now(),
      retryCount: 0,
      status: "pending",
    };
    this.queue.set(id, queuedDoc);
    return queuedDoc;
  }

  /**
   * Updates an existing document in the queue.
   */
  update(doc: QueuedDocument): void {
    this.queue.set(doc.id, doc);
  }

  /**
   * Removes a document from the queue upon successful sync.
   */
  remove(id: string): boolean {
    return this.queue.delete(id);
  }

  /**
   * Returns all documents in the queue.
   */
  getAll(): QueuedDocument[] {
    return Array.from(this.queue.values());
  }

  /**
   * Retrieves queue metrics for monitoring and dashboard widgets.
   */
  getStats(): OfflineQueueStats {
    let pending = 0;
    let retrying = 0;
    let deadLetter = 0;

    for (const doc of this.queue.values()) {
      if (doc.status === "dead_letter") deadLetter++;
      else if (doc.status === "retrying") retrying++;
      else pending++;
    }

    return {
      total: this.queue.size,
      pending,
      retrying,
      deadLetter,
    };
  }

  /**
   * Clears all dead-letter documents.
   */
  clearDeadLetterQueue(): number {
    let count = 0;
    for (const [id, doc] of this.queue.entries()) {
      if (doc.status === "dead_letter") {
        this.queue.delete(id);
        count++;
      }
    }
    return count;
  }

  /**
   * Resets a dead-letter document to pending state for single-document retry.
   */
  resetForRetry(id: string): boolean {
    const doc = this.queue.get(id);
    if (doc) {
      doc.status = "pending";
      doc.retryCount = 0;
      doc.nextRetryAt = undefined;
      doc.lastError = undefined;
      return true;
    }
    return false;
  }

  /**
   * Synchronizes the queue using an injected upload processor.
   */
  async processQueue(
    uploadFn: (shipmentId: string, payload: any) => Promise<any>,
    options: { force?: boolean } = {},
  ): Promise<{ successCount: number; failedCount: number; skippedCount: number }> {
    const now = Date.now();
    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const doc of this.getAll()) {
      if (doc.status === "dead_letter" && !options.force) {
        skippedCount++;
        continue;
      }

      if (doc.nextRetryAt && now < doc.nextRetryAt && !options.force) {
        skippedCount++;
        continue;
      }

      try {
        await uploadFn(doc.shipmentId, {
          documentType: doc.documentType,
          fileName: doc.fileName,
          fileUrl: doc.fileBase64,
          uploadedBy: doc.uploadedBy,
          comments: `${doc.comments} (Synced from offline queue)`,
          fileSize: doc.fileSize,
          parentDocumentId: doc.parentDocumentId,
          folderId: doc.folderId,
        });

        this.remove(doc.id);
        successCount++;
      } catch (err: any) {
        const nextRetryCount = doc.retryCount + 1;
        const isDeadLetter = nextRetryCount >= QUEUE_CONFIG.MAX_RETRIES;

        doc.retryCount = nextRetryCount;
        doc.lastAttemptAt = Date.now();
        doc.lastError = err?.message || "Sync failed";
        doc.status = isDeadLetter ? "dead_letter" : "retrying";
        doc.nextRetryAt = isDeadLetter ? undefined : Date.now() + calculateBackoffDelay(nextRetryCount);

        this.update(doc);
        failedCount++;
      }

      if (QUEUE_CONFIG.REQUEST_THROTTLE_MS > 0) {
        await new Promise((resolve) => setTimeout(resolve, QUEUE_CONFIG.REQUEST_THROTTLE_MS));
      }
    }

    return { successCount, failedCount, skippedCount };
  }
}

export const offlineDocumentQueue = new OfflineDocumentQueue();
