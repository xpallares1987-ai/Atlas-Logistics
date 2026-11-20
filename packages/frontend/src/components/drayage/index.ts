/**
 * @file index.ts
 * @description Canonical barrel exports for drayage & haulage route maps, modals, and drawers.
 * @module @atlas/frontend/components/drayage
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

export {
  DrayageRouteMap,
  DrayageRouteMap as RouteMap,
  type RoutePoint,
} from "./RouteMap";
export {
  DigitalGatePassModal,
  DigitalGatePassModal as DigitalGatePass,
  type DrayageOrderDetails,
} from "./Modal/DigitalGatePass";
export {
  ShipmentDrayageDrawer,
  ShipmentDrayageDrawer as ShipmentDetails,
  type DrayageShipment,
} from "./Drawer/ShipmentDetails";
