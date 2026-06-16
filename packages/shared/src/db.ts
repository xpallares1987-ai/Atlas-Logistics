import Dexie, { Table } from 'dexie';

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

export class SharedDatabase extends Dexie {
  shipments!: Table<DbShipment>;
  xmlCache!: Table<DbXmlCache>;
  diagrams!: Table<DbDiagram>;

  constructor(dbName: string = 'ControlTowerDB') {
    super(dbName);
    this.version(1).stores({
      shipments: '++id, customerOrder, warehouse, origin, loadCode, status',
    });
    this.version(2).stores({
      shipments: '++id, customerOrder, warehouse, origin, loadCode, status',
      xmlCache: 'key, updatedAt',
    });
    this.version(3).stores({
      shipments: '++id, customerOrder, warehouse, origin, loadCode, status',
      xmlCache: 'key, updatedAt',
      diagrams: 'id, name, updatedAt',
    });
  }
}
