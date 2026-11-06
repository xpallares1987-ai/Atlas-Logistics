import { describe, it, expect } from "vitest";
import { client } from "../index.js";

describe("Phase 5 Database Tables in SQLite", () => {
  it("verifies all Phase 5 tables exist in sqlite_master", async () => {
    const res = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('demurrage_invoices', 'demurrage_suspensions', 'demurrage_disputes', 'ocean_booking_details', 'container_stowage_plans')",
    );
    const tableNames = res.rows.map((r: any) => r.name);
    expect(tableNames).toContain("demurrage_invoices");
    expect(tableNames).toContain("demurrage_suspensions");
    expect(tableNames).toContain("demurrage_disputes");
    expect(tableNames).toContain("ocean_booking_details");
    expect(tableNames).toContain("container_stowage_plans");
    expect(res.rows.length).toBe(5);
  });
});
