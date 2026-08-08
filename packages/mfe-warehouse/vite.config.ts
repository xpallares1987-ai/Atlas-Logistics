import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import federation from "@originjs/vite-plugin-federation";

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: "warehouse",
      filename: "remoteEntry.js",
      exposes: {
        "./WarehouseOps": "./src/WarehouseOps.tsx",
      },
      shared: [
        "react",
        "react-dom",
        "react-router-dom",
        "@tanstack/react-query",
        "lucide-react",
        "tailwindcss",
      ],
    }),
  ],
  build: {
    target: "esnext",
    lib: {
      entry: "src/WarehouseOps.tsx",
      formats: ["es"],
    },
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "react-router-dom",
        "@tanstack/react-query",
        "lucide-react",
        "tailwindcss",
      ],
    },
  },
});
