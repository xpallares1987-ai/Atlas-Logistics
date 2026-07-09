import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// @ts-ignore
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  base: "/Atlas-Logistics/",
  plugins: [
    react(),
    tailwindcss(),
    nodePolyfills(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        maximumFileSizeToCacheInBytes: 10485760, // 10 MiB
      },
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "masked-icon.svg"],
      manifest: {
        name: "SCM Freight Forwarding",
        short_name: "ControlTower",
        description: "Plataforma SCM para operativas de Freight Forwarding",
        theme_color: "#ffffff",
        background_color: "#f9fafb",
        display: "standalone",
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
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes("lucide-react")) return "vendor-lucide";
          if (id.includes("recharts")) return "vendor-recharts";
          if (id.includes("leaflet")) return "vendor-leaflet";
          if (id.includes("three") || id.includes("@react-three"))
            return "vendor-three";
          if (id.includes("firebase")) return "vendor-firebase";
          if (id.includes("xlsx")) return "vendor-xlsx";
          if (id.includes("bpmn") || id.includes("camunda"))
            return "vendor-bpmn";
          if (id.includes("d3")) return "vendor-d3";
          if (id.includes("react-router")) return "vendor-router";
          if (id.includes("react") || id.includes("react-dom"))
            return "vendor-react";
          if (id.includes("node_modules")) return "vendor";
        },
      },
    },
  },
});
