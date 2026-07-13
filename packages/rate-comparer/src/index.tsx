// @ts-nocheck
import React from "react";
import RatesContent from "./RatesContent";

/**
 * FreightComparerApp — embeddable entry point (no sidebar).
 * The host app (AppLayout) already provides navigation, so we render
 * only the rates content area here.
 * For the standalone version with its own sidebar, use App.tsx directly.
 */
export default function FreightComparerApp() {
  return (
    <RatesContent />
  );
}

