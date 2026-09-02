// src/admin/adminService.ts
import { Argon2id } from "oslo/password";
import * as schema from "../db/schema/index.js";
import { db } from "../db/index.js";

export async function createAdmin() {
  const hashedPassword = await new Argon2id().hash("admin");
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
