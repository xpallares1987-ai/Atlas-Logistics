export type TransportMode = 'FCL_20' | 'FCL_40' | 'LCL' | 'AIR';
export type ChargeType = 'PER_UNIT' | 'PER_BL' | 'PER_CBM' | 'PER_KG' | 'FIXED';
export type Incoterm = 'EXW' | 'FCA' | 'FAS' | 'FOB' | 'CFR' | 'CIF' | 'CPT' | 'CIP' | 'DAP' | 'DPU' | 'DDP';
export type CargoType = 'GENERAL' | 'HAZMAT' | 'PERISHABLE' | 'OVERSIZED' | 'RO_RO';
export type CustomsStatus = 'PENDING' | 'CLEARED' | 'HELD_FOR_INSPECTION' | 'IN_BOND';

export interface Location {
  code: string;
  name: string;
  country: string;
  type: 'PORT' | 'AIRPORT' | 'TERMINAL' | 'CUSTOMS_DEPOT';
}

export interface CargoDetails {
  hsCode: string;
  description: string;
  weightKg: number;
  volumeCbm: number;
  cargoType: CargoType;
  unNumber?: string; // Optional for HAZMAT
}

export interface Surcharge {
  id: string;
  code: string;
  name: string;
  amount: number;
  currency: string;
  chargeType: ChargeType;
}

export interface Rate {
  id: string;
  carrier: string;
  origin: string;
  destination: string;
  mode: TransportMode;
  basePrice: number;
  currency: string;
  transitTimeDays: number;
  validity: string;
  surcharges: Surcharge[];
}

export type ShipmentStatus = 'BOOKED' | 'IN_TRANSIT' | 'ARRIVED' | 'DELIVERED';
export type MilestoneType = 'BOOKED' | 'GATE_IN' | 'LOADED' | 'DEPARTED' | 'TRANSSHIPMENT' | 'ARRIVED' | 'DISCHARGED' | 'GATE_OUT' | 'DELIVERED';

export interface Milestone {
  id: string;
  type: MilestoneType;
  location: string;
  date: string;
  description: string;
}

export interface Container {
  containerNumber: string;
  type: TransportMode;
  sealNumber: string;
  grossWeightKg: number;
}

export interface Shipment {
  id: string | number; // Added number support for Drizzle integer IDs
  reference: string;
  mblNumber: string;
  hblNumber: string;
  tracking_number?: string; // Drizzle field
  carrier: string;
  origin: string;
  destination: string;
  origin_port?: string; // Drizzle field
  destination_port?: string; // Drizzle field
  incoterm?: Incoterm | string;
  cargoDetails?: CargoDetails;
  customsStatus?: CustomsStatus;
  etd: string;
  eta: string;
  status: ShipmentStatus | string;
  mode: TransportMode;
  containers: Container[];
  milestones: Milestone[];
  delayed?: boolean;
  type?: 'Direct' | 'MBL' | 'HBL' | string;
  parent_shipment_id?: number | null;
}

export type DocumentType = 'MBL' | 'HBL' | 'CARGO_MANIFEST';

export interface DocumentRecord {
  id: string;
  type: DocumentType;
  shipmentId: string;
  documentNumber: string;
  shipper: string;
  consignee: string;
  notifyParty: string;
  vessel: string;
  voyage: string;
  portOfLoading: string;
  portOfDischarge: string;
  marksAndNumbers: string;
  descriptionOfGoods: string;
  grossWeightKg: number;
  volumeCbm: number;
  issueDate: string;
  status: 'DRAFT' | 'ISSUED';
}

export type UserRole = 'ADMIN' | 'OPERATOR' | 'SALES' | 'CUSTOMER';
export type UserStatus = 'ACTIVE' | 'INACTIVE';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  lastLogin?: string;
  createdAt: string;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
}

export interface Customer {
  id: string;
  name: string;
  taxId: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: Address;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Route {
  id: string;
  originCode: string;
  destinationCode: string;
  interimNodes: string[]; // Codes of ports/airports
  mode: TransportMode;
  estimatedTransitTimeDays: number;
}
