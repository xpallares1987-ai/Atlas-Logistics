/**
 * @file index.ts
 * @description Barrel exports for the Rail Freight & Intermodal CIM module.
 * @module @atlas/frontend/components/RailFreight
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

export { Header } from "./Header";
export type { HeaderProps } from "./Header";

export { Consignments } from "./Tab/Consignments";
export type { ConsignmentsProps } from "./Tab/Consignments";

export { TrainConsist } from "./Tab/TrainConsist";
export type { TrainConsistProps } from "./Tab/TrainConsist";

export { AxleAudit } from "./Tab/AxleAudit";
export type { AxleAuditProps } from "./Tab/AxleAudit";

export { UpdateConsignmentStatus } from "./Modal/UpdateConsignmentStatus";
export type { UpdateConsignmentStatusProps } from "./Modal/UpdateConsignmentStatus";

export { useRailFreight } from "./hooks/useRailFreight";
