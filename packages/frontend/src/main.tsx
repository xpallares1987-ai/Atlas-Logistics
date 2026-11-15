import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "./i18n";
import { registerSW } from "virtual:pwa-register";
import { syncManager } from "@atlas/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { resolveApiUrl } from "./hooks/useApiQuery";

// Register service worker for PWA offline capabilities
if ("serviceWorker" in navigator) {
  registerSW({ immediate: true });
}

// Automatically sync when connection is restored
window.addEventListener("online", () => {
  console.info("Online again. Processing sync queue...");
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

// Intercept API fetch calls to seamlessly inject the stored auth token and resolve base API URL
const originalFetch = window.fetch;
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  let resolvedInput = input;
  let url = "";

  if (typeof input === "string") {
    url = input;
    const resolved = resolveApiUrl(input);
    if (resolved !== input) {
      resolvedInput = resolved;
      url = resolved;
    }
  } else if (input instanceof URL) {
    url = input.href;
    const resolved = resolveApiUrl(input.href);
    if (resolved !== input.href) {
      resolvedInput = new URL(resolved);
      url = resolved;
    }
  } else if (input instanceof Request) {
    url = input.url;
    const resolved = resolveApiUrl(input.url);
    if (resolved !== input.url) {
      resolvedInput = new Request(resolved, input);
      url = resolved;
    }
  }

  if (
    url.startsWith("/api") ||
    (typeof url === "string" && url.includes("/api/"))
  ) {
    const token =
      localStorage.getItem("atlas_token") || localStorage.getItem("token");
    if (token) {
      const headers = new Headers(
        init?.headers ||
          (resolvedInput instanceof Request ? resolvedInput.headers : {}),
      );
      if (!headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      init = { ...init, headers };
    }
  }
  return originalFetch(resolvedInput, init);
};

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
