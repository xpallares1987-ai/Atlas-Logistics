import { test, expect } from "vitest";
import { createAdmin } from "./adminService.js";

// Simple sanity test – ensure the function runs without throwing.
// In a real test you would mock the DB, but for now we just call it.

test("admin service creates or updates admin user", async () => {
  await expect(createAdmin()).resolves.not.toThrow();
});
