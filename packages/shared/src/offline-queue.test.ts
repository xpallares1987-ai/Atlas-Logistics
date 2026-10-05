import { describe, it, expect, vi } from "vitest";
import {
  OfflineDocumentQueue,
  calculateBackoffDelay,
  QUEUE_CONFIG,
} from "./offline-queue";

describe("Offline Document Queue & Resilience Engine", () => {
  it("should calculate exponential backoff delay within boundaries", () => {
    const delay1 = calculateBackoffDelay(1);
    expect(delay1).toBeGreaterThanOrEqual(QUEUE_CONFIG.INITIAL_BACKOFF_MS);
    expect(delay1).toBeLessThanOrEqual(QUEUE_CONFIG.INITIAL_BACKOFF_MS + QUEUE_CONFIG.JITTER_MS);

    const delay5 = calculateBackoffDelay(5);
    expect(delay5).toBeGreaterThanOrEqual(16000);
    expect(delay5).toBeLessThanOrEqual(QUEUE_CONFIG.MAX_BACKOFF_MS + QUEUE_CONFIG.JITTER_MS);
  });

  it("should enqueue and manage offline documents", () => {
    const queue = new OfflineDocumentQueue();

    const doc = queue.enqueue({
      shipmentId: "SHP-2026-001",
      documentType: "CUSTOMS_PEDIMENTO",
      fileName: "pedimento-480.pdf",
      fileBase64: "JVBERi0xLjQK...",
      fileSize: "2.4 MB",
      comments: "Offline scan at terminal border",
      uploadedBy: "driver.alvarez@atlas-logistics.com",
    });

    expect(doc.id).toBeDefined();
    expect(doc.status).toBe("pending");
    expect(doc.retryCount).toBe(0);

    const stats = queue.getStats();
    expect(stats.total).toBe(1);
    expect(stats.pending).toBe(1);
  });

  it("should successfully process and flush queue when upload succeeds", async () => {
    const queue = new OfflineDocumentQueue();
    queue.enqueue({
      shipmentId: "SHP-2026-002",
      documentType: "BILL_OF_LADING",
      fileName: "bl-ocean.pdf",
      fileBase64: "JVBERi0...",
      fileSize: "1.1 MB",
      comments: "Port upload",
      uploadedBy: "agent.rodriguez@atlas-logistics.com",
    });

    const mockUpload = vi.fn().mockResolvedValue({ success: true, docId: "SRV-DOC-1" });

    const result = await queue.processQueue(mockUpload);
    expect(result.successCount).toBe(1);
    expect(result.failedCount).toBe(0);
    expect(queue.getStats().total).toBe(0);
    expect(mockUpload).toHaveBeenCalledTimes(1);
  });

  it("should transition to dead-letter queue after max retries exceed threshold", async () => {
    const queue = new OfflineDocumentQueue();
    const doc = queue.enqueue({
      shipmentId: "SHP-2026-FAIL",
      documentType: "CMR",
      fileName: "cmr-road.pdf",
      fileBase64: "...",
      fileSize: "500 KB",
      comments: "Failing upload",
      uploadedBy: "driver@atlas.com",
    });

    // Simulate 4 prior retries
    doc.retryCount = 4;
    queue.update(doc);

    const mockFailingUpload = vi.fn().mockRejectedValue(new Error("503 Service Unavailable"));

    const result = await queue.processQueue(mockFailingUpload, { force: true });
    expect(result.failedCount).toBe(1);

    const stats = queue.getStats();
    expect(stats.deadLetter).toBe(1);
    expect(stats.pending).toBe(0);

    // Resetting for retry
    const resetSuccess = queue.resetForRetry(doc.id);
    expect(resetSuccess).toBe(true);
    expect(queue.getStats().pending).toBe(1);

    // Clearing dead-letter queue
    doc.status = "dead_letter";
    queue.update(doc);
    const cleared = queue.clearDeadLetterQueue();
    expect(cleared).toBe(1);
    expect(queue.getStats().total).toBe(0);
  });
});
