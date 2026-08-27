import { Page } from "@playwright/test";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "atlas-logistics-jwt-secret-key-super-secure";

export async function loginAsAdmin(page: Page) {
  try {
    const response = await page.request.post(
      "http://localhost:3001/api/auth/login",
      {
        data: {
          email: "admin@atlas.com",
          password: "password123",
        },
      },
    );

    if (response.ok()) {
      const json = await response.json();
      const token = json.token;
      if (token) {
        await page.addInitScript((tok) => {
          localStorage.setItem("atlas_token", tok);
        }, token);
        return;
      }
    }
  } catch (err) {
    // Fallback to locally signed token
  }

  const fallbackToken = jwt.sign(
    {
      id: "admin_user_id",
      email: "admin@atlas.com",
      role: "ADMIN",
      name: "Admin User",
    },
    JWT_SECRET,
    { expiresIn: "24h" },
  );

  await page.addInitScript((tok) => {
    localStorage.setItem("atlas_token", tok);
  }, fallbackToken);
}
