export type DocumentType = 'HBL' | 'MBL' | 'MANIFEST' | 'COMMERCIAL_INVOICE';
export type DocumentStatus = 'DRAFT' | 'ISSUED' | 'APPROVED' | 'VOID';

export interface BLLineItem {
  id: string;
  marks: string;
  pkgs: string;
  description: string;
  weight: string;
  measurement: string;
}

export interface BLPayload {
  shipper: string;
  consignee: string;
  notifyParty: string;
  preCarriageBy: string;
  placeOfReceipt: string;
  vesselVoyage: string;
  portOfLoading: string;
  portOfDischarge: string;
  placeOfDelivery: string;
  freightPayableAt: string;
  numberOfOriginals: string;
  declaredValue: string;
  lines: BLLineItem[];
  freightTerms: 'PREPAID' | 'COLLECT';
  remarks: string;
}

export interface ManifestContainer {
  id: string;
  containerNumber: string;
  sealNumber: string;
  type: string;
  weight: string;
  volume: string;
  pkgs: string;
}

export interface ManifestPayload {
  vesselVoyage: string;
  portOfLoading: string;
  portOfDischarge: string;
  agentAtDestination: string;
  containers: ManifestContainer[];
  remarks: string;
}

export interface DocumentRecord {
  id: string;
  bookingRef: string;
  type: DocumentType;
  documentNumber: string;
  issueDate: string;
  status: DocumentStatus;
  payload: BLPayload | ManifestPayload | any; // Type narrowed based on document Type
  createdAt: string;
  updatedAt: string;
}

export type MilestoneType = 'BOOKING_CONFIRMED' | 'EMPTY_PICKUP' | 'GATE_IN' | 'LOADED_ON_VESSEL' | 'ETD' | 'TRANSSHIPMENT' | 'ETA' | 'DISCHARGED' | 'GATE_OUT' | 'DELIVERED';

export interface TrackingMilestone {
  id: string;
  shipmentId: string;
  containerId?: string;
  type: MilestoneType;
  location: string;
  date: string;
  description: string;
  status: 'PENDING' | 'COMPLETED' | 'DELAYED';
  createdAt: string;
}

export interface ContainerTracking {
  id: string;
  shipmentId: string;
  containerNumber: string;
  type: string;
  sealNumber: string;
  currentStatus: string;
  lastLocation: string;
}
