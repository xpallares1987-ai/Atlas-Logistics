import { test, expect } from "vitest";
import { createAdmin } from "./adminService.js";

// Simple sanity test – ensure the function runs without throwing.
// In a real test you would mock the DB, but for now we just call it.

test("admin service requires ADMIN_EMAIL and ADMIN_PASSWORD env vars", async () => {
  delete process.env.ADMIN_EMAIL;
  delete process.env.ADMIN_PASSWORD;
  await expect(createAdmin()).rejects.toThrow("ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required");
});
