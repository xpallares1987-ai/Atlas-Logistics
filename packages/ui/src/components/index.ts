/**
 * @file index.ts
 * @description Canonical root barrel for `@atlas/ui` shared React components, hooks, modals, and layout primitives.
 * @module @atlas/ui/components
 * @see {@link docs/adr/0020-modular-frontend-decomposition-and-naming-standards.md}
 */

import "./index.css";
import "./i18n";

export * from "./hooks";
export * from "./auth";
export * from "./Modal";
export * from "./Toast";
export * from "@atlas/shared";
export * from "./Button";
export * from "./Input";
export * from "./Switch";
export * from "./Checkbox";
export * from "./Select";
export * from "./Table";
export * from "./DynamicRateEngine";
export * from "./AddressSelector";
export * from "./BlCardPreview";
export * from "./DrayageRouteMap";
