import Dexie, { Table } from "dexie";
import { WarehouseTraffic, WarehouseInventoryItem } from "./types/warehouse";

export interface DbShipment {
  id?: string | number;
  origin?: string;
  customerOrder?: string;
  warehouse?: string;
  boardingDate?: string;
  deliveryDate?: string;
  forecastArrivalDate?: string;
  reelsCount?: string;
  weight?: string;
  extAddrNumber?: string;
  loadCode?: string;
  status?: string;
}

export interface DbXmlCache {
  key: string;
  content: string;
  updatedAt: number;
}

export interface DbDiagram {
  id: string;
  name: string;
  xml: string;
  updatedAt: number;
}

export interface DbSyncJob {
  id?: number;
  entity: string; // e.g., 'shipments', 'warehouseTraffic'
  action: "CREATE" | "UPDATE" | "DELETE";
  payload: any;
  status: "PENDING" | "COMPLETED" | "FAILED";
  createdAt: number;
}

export class SharedDatabase extends Dexie {
  shipments!: Table<DbShipment>;
  xmlCache!: Table<DbXmlCache>;
  diagrams!: Table<DbDiagram>;
  syncQueue!: Table<DbSyncJob>;
  warehouseTraffic!: Table<WarehouseTraffic>;
  warehouseInventory!: Table<WarehouseInventoryItem>;

  constructor(dbName: string = "ControlTowerDB") {
    super(dbName);
    this.version(1).stores({
      shipments: "++id, customerOrder, warehouse, origin, loadCode, status",
    });
    this.version(2).stores({
      shipments: "++id, customerOrder, warehouse, origin, loadCode, status",
      xmlCache: "key, updatedAt",
    });
    this.version(3).stores({
      shipments: "++id, customerOrder, warehouse, origin, loadCode, status",
      xmlCache: "key, updatedAt",
      diagrams: "id, name, updatedAt",
    });
    this.version(4).stores({
      shipments: "++id, customerOrder, warehouse, origin, loadCode, status",
      xmlCache: "key, updatedAt",
      diagrams: "id, name, updatedAt",
      syncQueue: "++id, entity, status, createdAt",
    });
    this.version(5).stores({
      shipments: "++id, customerOrder, warehouse, origin, loadCode, status",
      xmlCache: "key, updatedAt",
      diagrams: "id, name, updatedAt",
      syncQueue: "++id, entity, status, createdAt",
      warehouseTraffic: "id, shipmentId, status, type, createdAt",
      warehouseInventory:
        "id, warehouseId, ownership, customer, productCode, zone, status",
    });
  }
}
