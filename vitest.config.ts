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
  },
});
