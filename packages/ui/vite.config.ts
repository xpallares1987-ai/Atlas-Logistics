import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";
import path from "path";
const deps = [
  "@react-three/drei",
  "@react-three/fiber",
  "@tanstack/react-virtual",
  "@types/three",
  "clsx",
  "dexie",
  "firebase",
  "framer-motion",
  "idb",
  "leaflet",
  "leaflet.markercluster",
  "lucide-react",
  "lz-string",
  "next",
  "react",
  "react-dom",
  "recharts",
  "sax",
  "tailwind-merge",
  "three",
  "xml2js",
  "zod",
];

const makeExternalPredicate = (externalArr: string[]) => {
  if (externalArr.length === 0) return () => false;
  const pattern = new RegExp(`^(${externalArr.join("|")})($|/)`);
  return (id: string) => pattern.test(id);
};

export default defineConfig({
  plugins: [
    react(),
    dts({ insertTypesEntry: true, tsconfigPath: "./tsconfig.app.json" }),
  ],
  define: {
    "process.env.NODE_ENV": JSON.stringify(
      process.env.NODE_ENV || "production",
    ),
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "ControlTowerUI",
      formats: ["es"],
      fileName: (format) => `index.${format}.js`,
      cssFileName: "control-tower-ui",
    },
    rollupOptions: {
      external: makeExternalPredicate(deps),
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
        },
      },
    },
  },
  resolve: {
    alias: {
      "@torre/shared": path.resolve(__dirname, "src/shared"),
    },
  },
});
