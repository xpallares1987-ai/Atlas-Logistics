import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "./i18n";
import { registerSW } from "virtual:pwa-register";
import { syncManager } from "@atlas/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

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

// Intercept API fetch calls to seamlessly inject the stored auth token
const originalFetch = window.fetch;
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : (input as Request).url;

  if (
    url.startsWith("/api") ||
    (typeof url === "string" && url.includes("/api/"))
  ) {
    const token =
      localStorage.getItem("atlas_token") || localStorage.getItem("token");
    if (token) {
      const headers = new Headers(
        init?.headers || (input instanceof Request ? input.headers : {}),
      );
      if (!headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      init = { ...init, headers };
    }
  }
  return originalFetch(input, init);
};

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
