// src/admin/adminService.ts
import { Argon2id } from "oslo/password";
import * as schema from "../db/schema/index.js";
import { db } from "../db/index.js";

export async function createAdmin() {
  const configuredPassword = process.env.ADMIN_PASSWORD;
  if (
    process.env.NODE_ENV === "production" &&
    (!configuredPassword || configuredPassword === "admin")
  ) {
    throw new Error(
      "ADMIN_PASSWORD must be set to a non-default value in production",
    );
  }

  const hashedPassword = await new Argon2id().hash(
    configuredPassword || "admin",
  );
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
