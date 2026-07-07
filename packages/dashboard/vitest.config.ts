/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@torre/shared/assets": path.resolve(
        __dirname,
        "./packages/shared/assets",
      ),
      "@torre/shared": path.resolve(
        __dirname,
        "./packages/shared/src/index.ts",
      ),
      "@torre/ui/assets": path.resolve(__dirname, "./packages/ui/assets"),
      "@torre/ui": path.resolve(__dirname, "./packages/ui/src/index.ts"),
      "@control-tower/workers": path.resolve(
        __dirname,
        "./src/workers/pool.ts",
      ),
      "next/link": path.resolve(__dirname, "./node_modules/next/link.js"),
      "next/navigation": path.resolve(
        __dirname,
        "./node_modules/next/navigation.js",
      ),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/setupTests.ts"],
    exclude: ["node_modules", "packages/**", "tests/**", "dist/**"],
    coverage: {
      provider: "v8",
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
    server: {
      deps: {
        inline: ["@atlas/ui"],
      },
    },
  },
});
