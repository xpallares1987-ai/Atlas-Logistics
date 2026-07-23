import { SharedDatabase, DbSyncJob } from "./db.js";

export class SyncManager {
  private db: SharedDatabase;
  private isSyncing: boolean = false;
  private baseUrl: string;

  constructor(
    db: SharedDatabase,
    baseUrl: string = "http://localhost:3001/api",
  ) {
    this.db = db;
    const parsedUrl = new URL(baseUrl);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      throw new Error("Invalid protocol for baseUrl");
    }
    this.baseUrl = parsedUrl.toString().replace(/\/$/, "");
  }

  /**
   * Adds a job to the local Dexie queue to be synchronized later.
   */
  async addToQueue(
    entity: string,
    action: "CREATE" | "UPDATE" | "DELETE",
    payload: any,
  ): Promise<number> {
    const job: DbSyncJob = {
      entity,
      action,
      payload,
      status: "PENDING",
      createdAt: Date.now(),
    };

    // Convert Dexie Promise to standard Promise returning number
    const id = (await this.db.syncQueue.add(job)) as number;

    // Automatically attempt to sync if online
    if (typeof window !== "undefined" && navigator.onLine) {
      this.processQueue();
    }

    return id;
  }

  /**
   * Processes the entire pending queue via a dedicated batch endpoint.
   */
  async processQueue(): Promise<void> {
    if (this.isSyncing) return;
    if (typeof window !== "undefined" && !navigator.onLine) return;

    this.isSyncing = true;

    try {
      const pendingJobs = await this.db.syncQueue
        .where("status")
        .equals("PENDING")
        .sortBy("createdAt");

      if (pendingJobs.length === 0) return;

      const response = await fetch(new URL("/api/sync/batch", this.baseUrl).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobs: pendingJobs }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Batch Sync HTTP ${response.status}: ${errBody}`);
      }

      const result = await response.json();

      // Update local jobs based on server response
      // Expecting result.results to be an array of { id, status: 'COMPLETED' | 'FAILED', error? }
      for (const res of result.results) {
        if (res.id) {
          await this.db.syncQueue.update(res.id, { status: res.status });
        }
      }
    } catch (error) {
      console.error(`Failed to process batch sync:`, error);
      // We don't mark them as FAILED if it's a network error so they retry later
    } finally {
      this.isSyncing = false;
    }
  }
}
