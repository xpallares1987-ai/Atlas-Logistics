import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import federation from "@originjs/vite-plugin-federation";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: "rates",
      filename: "remoteEntry.js",
      exposes: {
        "./RateComparer": "./src/index.tsx",
      },
      shared: [
        "react",
        "react-dom",
        "@tanstack/react-query",
        "lucide-react",
      ],
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    port: 5176,
    cors: true,
  },
  build: {
    target: "esnext",
    lib: {
      entry: path.resolve(import.meta.dirname, "src/index.ts"),
      name: "AtlasRateComparer",
      formats: ["es"],
      fileName: () => `index.es.js`,
    },
    rollupOptions: {
      external: ["react", "react-dom"],
    },
  },
});
