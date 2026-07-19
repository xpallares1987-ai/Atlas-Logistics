import React from "react";
import { Provider } from "react-redux";
import { store } from "./store";
import RatesContent from "./RatesContent";

/**
 * FreightComparerApp — embeddable entry point (no sidebar).
 * The host app (AppLayout) already provides navigation, so we render
 * only the rates content area here.
 * For the standalone version with its own sidebar, use App.tsx directly.
 */
export default function FreightComparerApp() {
  return (
    <Provider store={store}>
      <RatesContent />
    </Provider>
  );
}
