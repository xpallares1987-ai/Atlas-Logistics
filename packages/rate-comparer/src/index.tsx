// @ts-nocheck
import React from "react";
import { Provider } from "react-redux";
import { store } from "./shared/store";
import RatesContent from "./RatesContent";
import "./locale";
import { initializeApp, getApps } from "firebase/app";

if (!getApps().length) {
  initializeApp({
    projectId: "demo-atlas",
    apiKey: "demo-api-key",
    appId: "1:12345:web:12345"
  });
}

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

/**
 * FreightComparerApp — embeddable entry point (no sidebar).
 * The host app (AppLayout) already provides navigation, so we render
 * only the rates content area here, wrapped with its Redux store.
 */
export default function FreightComparerApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <RatesContent />
      </Provider>
    </QueryClientProvider>
  );
}

