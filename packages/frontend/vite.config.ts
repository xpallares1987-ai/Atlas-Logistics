import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import federation from "@originjs/vite-plugin-federation";
import { VitePWA } from "vite-plugin-pwa";
import devtoolsJson from "vite-plugin-devtools-json";

export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/",
  define: {
    "import.meta.env.VITE_CARTO_API_KEY": JSON.stringify(
      process.env.CARTO_API_KEY || process.env.VITE_CARTO_API_KEY || "",
    ),
  },
  plugins: [
    devtoolsJson({
      projectRoot: path.resolve(import.meta.dirname, "../.."),
    }),
    tailwindcss(),
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler", {}]],
      },
    }),
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
      ],
    }),
    VitePWA({
      registerType: "autoUpdate",
      useCredentials: true,
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
        maximumFileSizeToCacheInBytes: 5000000,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "@atlas/mfe-warehouse": path.resolve(
        import.meta.dirname,
        "../mfe-warehouse",
      ),
      "@atlas/rate-comparer": path.resolve(
        import.meta.dirname,
        "../rate-comparer",
      ),
    },
  },
  build: {
    target: "es2022",
    cssCodeSplit: true,
    modulePreload: {
      polyfill: false,
      resolveDependencies: (_filename, deps) => {
        return deps.filter(
          (dep) =>
            !dep.includes("three-") &&
            !dep.includes("bpmn-") &&
            !dep.includes("jspdf") &&
            !dep.includes("recharts-") &&
            !dep.includes("d3-") &&
            !dep.includes("DynamicRateEngine-") &&
            !dep.includes("components-") &&
            !dep.includes("proxy-") &&
            !dep.includes("src-") &&
            !dep.includes("html2canvas-") &&
            !dep.includes("purify") &&
            !dep.includes("sortable"),
        );
      },
    },
    chunkSizeWarningLimit: 2500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Isolate Module Federation runtime helper so it is never hoisted into
          // TLA chunks like lucide-icons or recharts-vendor (prevents ES module TLA deadlock).
          if (
            id.includes("__federation_fn_import") ||
            id.includes("__federation_fn_satisfy")
          ) {
            return "federation-runtime";
          }
          if (id.includes("node_modules")) {
            // Isolate React core & scheduler so __federation_shared_react never imports
            // from recharts-vendor or another chunk that awaits importShared("react").
            if (/[\\/]node_modules[\\/](react|scheduler)[\\/]/.test(id)) {
              return "react-core";
            }
            if (/[\\/]node_modules[\\/]react-dom[\\/]/.test(id)) {
              return "react-dom-core";
            }
            if (id.includes("@react-three/drei")) {
              return "three-drei-vendor";
            }
            if (id.includes("@react-three/fiber")) {
              return "three-fiber-vendor";
            }
            if (id.includes("three")) {
              return "three-core-vendor";
            }
            if (id.includes("recharts")) {
              return "recharts-vendor";
            }
            if (id.includes("d3-")) {
              return "d3-vendor";
            }
            if (id.includes("bpmn-js") && !id.endsWith(".css")) {
              return "bpmn-vendor";
            }
            if (id.includes("pdfjs-dist")) {
              return "pdfjs-dist-vendor";
            }
            if (id.includes("jspdf")) {
              return "jspdf-vendor";
            }
            if (id.includes("lucide-react")) {
              return "lucide-icons";
            }
          }
        },
      },
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
