export type TrafficStatus =
  "WAITING" | "DOCK_ASSIGNED" | "LOADING" | "UNLOADING" | "DISPATCHED";
export type DeviceType = "TRUCK" | "WAGON" | "CONTAINER_20" | "CONTAINER_40";
export type WarehouseZone = "DRY" | "COLD" | "HAZMAT" | "CROSS_DOCK";
export type OwnershipType = "INTERNAL" | "EXTERNAL";

export interface WarehouseItemMetadata {
  grammage?: number; // GM
  diameter?: number; // CM
  rollWidth?: number; // CM
  rollLength?: number; // CM
  netWeight?: number; // Kgs
  grossWeight?: number; // Kgs
  hsCode?: string;
  purchaseOrder?: string; // PO
  customerOrder?: string; // CO
  sealNumber?: string;
}

export interface WarehouseTraffic {
  id: string;
  shipmentId?: string; // Link to Shipments
  driverName?: string;
  deviceNumber: string; // Matricula / Vagon
  deviceType: DeviceType;
  status: TrafficStatus;
  eta: Date | string;
  assignedDock?: string;
  cargoDescription: string;
  totalWeightExpected: number;
  expectedQuantity: number;
  type: "INBOUND" | "OUTBOUND";
  createdAt: Date | string;
}

export interface WarehouseInventoryItem {
  id: string;
  warehouseId: string;
  ownership: OwnershipType; // PROPIO vs EXTERNO
  customer: string;
  buyer?: string;
  productCode: string;
  description: string;
  quantity: number;
  zone: WarehouseZone;
  metadata: WarehouseItemMetadata;
  receivedAt: Date | string;
  status: "IN_STOCK" | "RESERVED" | "DISPATCHED";
}
