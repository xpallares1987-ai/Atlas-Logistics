import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./i18n";
import "./index.css";
import { registerSW } from "virtual:pwa-register";
import { syncManager } from "@atlas/shared";

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

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
