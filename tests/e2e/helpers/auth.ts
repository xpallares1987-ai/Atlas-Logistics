import { Page, expect } from "@playwright/test";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "atlas-logistics-jwt-secret-key-super-secure";

export async function loginAsAdmin(page: Page) {
  const adminToken = jwt.sign(
    {
      id: "admin_user_id",
      email: "admin@atlas.com",
      role: "ADMIN",
      name: "Admin User",
    },
    JWT_SECRET,
    { expiresIn: "24h" },
  );

  await page.addInitScript((token) => {
    localStorage.setItem("atlas_token", token);
  }, adminToken);
}
