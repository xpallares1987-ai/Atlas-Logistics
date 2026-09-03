import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "html",
  timeout: 120000,
  expect: {
    timeout: 30000,
  },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 60000,
    navigationTimeout: 60000,
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
          command: "pnpm run start:backend",
          url: "http://localhost:3001/api/auth/me",
          reuseExistingServer: true,
          timeout: 120000,
        },
        {
          command: "pnpm --filter @atlas/frontend dev",
          url: baseURL,
          reuseExistingServer: true,
          timeout: 120000,
        },
      ]
    : undefined,
});
