/**
 * @file index.ts
 * @description Barrel exports for the IATA ONE Record Hub & Cargo iQ e-AWB module.
 * @module @atlas/frontend/components/IataOneRecord
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

export { Header } from "./Header";
export type { HeaderProps } from "./Header";

export { JsonLdExplorer } from "./Tab/JsonLdExplorer";
export type { JsonLdExplorerProps } from "./Tab/JsonLdExplorer";

export { CargoIqTimeline } from "./Tab/CargoIqTimeline";
export type { CargoIqTimelineProps } from "./Tab/CargoIqTimeline";

export { EdgdStudio } from "./Tab/EdgdStudio";
export type { EdgdStudioProps } from "./Tab/EdgdStudio";

export { EawbDigitalPouch } from "./Tab/EawbDigitalPouch";
export type { EawbDigitalPouchProps } from "./Tab/EawbDigitalPouch";

export { useIataOneRecord } from "./hooks/useIataOneRecord";
