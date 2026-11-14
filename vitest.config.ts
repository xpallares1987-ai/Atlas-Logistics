import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    fileParallelism: false,
    env: {
      COOKIE_SECRET: "test-cookie-secret-min-32-chars-long-for-vitest",
      JWT_SECRET: "test-jwt-secret-min-32-chars-long-for-vitest",
      NODE_ENV: "test",
      USE_REDIS_MOCK: "true",
    },
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/tests/e2e/**",
      "**/.worktrees/**",
      "**/.{idea,git,cache,output,temp}/**",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "json-summary", "html"],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
        "src/scm/contexts/orders/**": { lines: 80, statements: 80 },
        "src/scm/contexts/shipment-execution/**": { lines: 85, statements: 85 },
        "src/scm/contexts/transport-planning/**": { lines: 85, statements: 85 },
        "src/scm/contexts/shipment-consolidation/**": {
          lines: 85,
          statements: 85,
        },
      },
    },
  },
});
