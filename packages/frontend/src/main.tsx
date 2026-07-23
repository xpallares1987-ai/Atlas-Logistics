import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "./i18n";
import { registerSW } from "virtual:pwa-register";
import { syncManager } from "@atlas/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { trpc } from "./utils/trpc";

// Register service worker for PWA offline capabilities
if ("serviceWorker" in navigator) {
  registerSW({ immediate: true });
}

// Automatically sync when connection is restored
window.addEventListener("online", () => {
  console.log("Online again. Processing sync queue...");
  syncManager.processQueue();
});

// Suppress harmless Three.js deprecation warnings from React-Three-Fiber
const originalWarn = console.warn;
console.warn = (...args) => {
  const msg = typeof args[0] === "string" ? args[0] : "";
  if (
    msg.includes("THREE.Clock") ||
    msg.includes("PCFSoftShadowMap") ||
    msg.includes("WebGLProgram")
  ) {
    return;
  }
  originalWarn(...args);
};

const queryClient = new QueryClient();
const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "http://localhost:3001/trpc",
      fetch: (url, options) => {
        return fetch(url, { ...options, credentials: "include" });
      },
    }),
  ],
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </trpc.Provider>
  </React.StrictMode>,
);
