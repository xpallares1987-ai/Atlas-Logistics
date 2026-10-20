import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import federation from "@originjs/vite-plugin-federation";
import { VitePWA } from "vite-plugin-pwa";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/",
  plugins: [
    react(),
    nodePolyfills(),
    federation({
      name: "host",
      remotes: {
        dashboard: "http://127.0.0.1:5174/assets/remoteEntry.js",
        warehouse: "http://127.0.0.1:5175/assets/remoteEntry.js",
        rates: "http://127.0.0.1:5176/assets/remoteEntry.js",
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
    VitePWA({
      registerType: "autoUpdate",
      devOptions: {
        enabled: false,
      },
      manifest: {
        name: "Atlas Logistics ERP",
        short_name: "Atlas",
        description: "Next-Gen Logistics ERP System",
        theme_color: "#4f46e5",
        background_color: "#ffffff",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5000000, // 5MB to accommodate three.js
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "@atlas/mfe-warehouse": path.resolve(import.meta.dirname, "../mfe-warehouse"),
      "@atlas/rate-comparer": path.resolve(import.meta.dirname, "../rate-comparer"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: parseInt(process.env.VITE_PORT || "3100", 10),
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL || "http://127.0.0.1:3001",
        changeOrigin: true,
        ws: true,
      },
      "/ws": {
        target: process.env.VITE_API_URL || "http://127.0.0.1:3001",
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
