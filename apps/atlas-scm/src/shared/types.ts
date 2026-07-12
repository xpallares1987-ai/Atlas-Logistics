export interface DataRow {
  [key: string]: string | number | boolean | Date | DataRow[] | undefined;
  _children?: DataRow[];
}

export interface BoardingItem {
  [key: string]: string | undefined;
  Origin: string;
  "Customer Order": string;
  Warehouse: string;
  POL: string;
  "Final Destination": string;
  "Fecha Lim. Carga": string;
  "Delivery Date": string;
  "Forecast Arrival": string;
  Bultos: string;
  "Weight (Tons)": string;
  "Ext. Addr. Number": string;
}

export interface ReceptionItem {
  [key: string]: string | undefined;
  Origin: string;
  Warehouse: string;
  Status: string;
  "Load Code": string;
  "Plate Number": string;
  "Estimated Arrival at WH": string;
  "Ext. Addr. Number": string;
  "Final Destination": string;
  "Customer Order": string;
  "Item Number": string;
  "Reel Year": string;
  "Paper Code": string;
  "Product Description": string;
  "Grammage (GM)": string;
  "Diameter (CM)": string;
  "Roll Width (CM)": string;
  "Roll Length (CM)": string;
  "Weight (Kgs)": string;
}

export interface StockItem {
  [key: string]: string | undefined;
  Origin: string;
  Warehouse: string;
  "Ext. Addr. Number": string;
  "Product Code": string;
  "Item Number": string;
  Description: string;
  Grammage: string;
  Diameter: string;
  "Roll Width": string;
  Weight: string;
  "Load Code"?: string;
  "Customer Name"?: string;
}

export type LogisticsItem = BoardingItem | ReceptionItem | StockItem;

export interface Milestone {
  label: string;
  key: string;
  completed: boolean;
  date?: string;
}

export interface Note {
  id: string;
  text: string;
  author: string;
  date: string;
}

export interface AuditLog {
  id: string;
  action: string;
  author: string;
  timestamp: string;
  details: string;
}

export type ShipmentStatus =
  "booking" | "transit" | "customs" | "delivered" | "delayed";
export type ShipmentMode = "sea" | "air" | "land";

export interface Shipment {
  id: string;
  reference: string;
  container: string;
  carrier?: string;
  origin: string;
  destination: string;
  originCoords: [number, number];
  destCoords: [number, number];
  status: ShipmentStatus;
  mode: ShipmentMode;
  eta: string;
  milestones: Milestone[];
  portArrivalDate?: string;
  freeTimeDays: number;
  demurrageRate: number;
  notes?: Note[];
  auditHistory?: AuditLog[];
}
