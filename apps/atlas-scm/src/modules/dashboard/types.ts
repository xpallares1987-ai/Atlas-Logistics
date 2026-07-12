import {
  DataRow,
  BoardingItem,
  ReceptionItem,
  StockItem,
  LogisticsItem,
  Theme,
  Milestone,
  Note,
  AuditLog,
  ShipmentStatus,
  ShipmentMode,
  Shipment,
} from "@/components";

export type {
  DataRow,
  BoardingItem,
  ReceptionItem,
  StockItem,
  LogisticsItem,
  Theme,
  Milestone,
  Note,
  AuditLog,
  ShipmentStatus,
  ShipmentMode,
  Shipment,
};

export interface Database {
  [sheetName: string]: DataRow[];
}

export interface AppState {
  db: Database;
  currentTab: string;
  filterRes: DataRow[];
  pIndex: number;
  sortCol: string;
  sortAsc: boolean;
  theme: "light" | "dark";
}

export interface FilterCriteria {
  [column: string]: string[];
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  region: string;
  email: string;
  phone: string;
  status: "active" | "away" | "offline";
  specialties: string[];
}

export interface ShipmentFilters {
  term: string;
  status: string;
}
