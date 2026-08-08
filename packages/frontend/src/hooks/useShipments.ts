import { useApiQuery } from "./useApiQuery";

export interface Shipment {
  id: string;
  trackingNumber: string;
  status: string;
  origin: string;
  destination: string;
  vesselName: string;
  voyageNumber: string;
  serviceType: string;
  createdAt: string;
  type?: string;
  vessel?: string;
  progress?: number;
  eta?: string;
}

export function useShipments() {
  return useApiQuery<Shipment[]>(["shipments"], "/shipments");
}
