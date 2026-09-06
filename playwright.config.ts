import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 1,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "html",
  timeout: 45000,
  expect: {
    timeout: 15000,
  },
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || "http://127.0.0.1:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15000,
    navigationTimeout: 20000,
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],

  webServer: process.env.CI
    ? [
        {
          command: "npx tsx src/server.ts",
          url: "http://127.0.0.1:3001/api/health",
          reuseExistingServer: true,
          timeout: 120000,
        },
        {
          command: "turbo run dev",
          url: "http://127.0.0.1:3000",
          reuseExistingServer: true,
          timeout: 120000,
        },
      ]
    : undefined,
});
