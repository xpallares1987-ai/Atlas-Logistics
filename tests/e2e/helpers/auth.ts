import { Page } from "@playwright/test";

export async function loginAsAdmin(page: Page) {
  const response = await page.request.post(
    "http://localhost:3001/api/auth/login",
    {
      data: {
        email: "admin@atlas.com",
        password: "password123",
      },
    },
  );

  if (!response.ok()) {
    throw new Error(`E2E admin login returned HTTP ${response.status()}`);
  }

  const { token } = await response.json();
  if (!token) {
    throw new Error("E2E admin login response did not include a token");
  }

  await page.addInitScript((storedToken) => {
    localStorage.setItem("atlas_token", storedToken);
  }, token);
}
