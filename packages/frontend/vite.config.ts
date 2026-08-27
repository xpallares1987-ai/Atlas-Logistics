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
        dashboard: "http://localhost:5174/assets/remoteEntry.js",
      },
      shared: [
        "react",
        "react-dom",
        "react-router",
        "react-router-dom",
        "@tanstack/react-query",
        "lucide-react",
        "tailwindcss",
      ],
    }),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: {
        enabled: true,
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
      "@": path.resolve(__dirname, "./src"),
      "@atlas/mfe-warehouse": path.resolve(__dirname, "../mfe-warehouse"),
      "@atlas/rate-comparer": path.resolve(__dirname, "../rate-comparer"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules")) {
            if (id.includes("three") || id.includes("@react-three")) {
              return "vendor-three";
            }
            if (
              id.includes("bpmn-js") ||
              id.includes("diagram-js") ||
              id.includes("bpmn-moddle")
            ) {
              return "vendor-bpmn";
            }
            if (
              id.includes("recharts") ||
              id.includes("chart.js") ||
              id.includes("d3")
            ) {
              return "vendor-charts";
            }
            if (id.includes("lucide-react")) {
              return "vendor-icons";
            }
            if (id.includes("@tanstack") || id.includes("trpc")) {
              return "vendor-query";
            }
            if (id.includes("react-dom") || id.includes("react-router")) {
              return "vendor-react";
            }
          }
        },
      },
    },
  },
});
