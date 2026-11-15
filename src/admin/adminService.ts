/**
 * @file adminService.ts
 * @description Administrative initialization services and root user provisioning.
 * @module @atlas/api/admin
 * @see {@link docs/adr/0023-native-web-crypto-session-migration.md}
 */

import { hashPassword } from "../lib/auth.js";
import * as schema from "../db/schema/index.js";
import { db } from "../db/index.js";

// ============================================================================
// 1. ADMIN USER INITIALIZATION
// ============================================================================

export async function createAdmin(): Promise<void> {
  const hashedPassword = await hashPassword("admin");
  await db
    .insert(schema.users)
    .values({
      id: "admin_user_id",
      email: "admin@atlas.com",
      hashedPassword,
      role: "ADMIN",
    })
    .onConflictDoUpdate({
      target: schema.users.email,
      set: { hashedPassword },
    });
  console.log("Admin user created/updated successfully!");
}
