import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
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
      "**/.{idea,git,cache,output,temp}/**",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },
  },
});
