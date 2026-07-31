import { useQuery } from '@tanstack/react-query';

export interface Shipment {
  id: string;
  referenceNumber: string;
  status: string;
  originLocationId: string;
  destinationLocationId: string;
  vessel: string;
  voyage: string;
  createdAt: string;
}

export function useShipments() {
  return useQuery({
    queryKey: ['shipments'],
    queryFn: async () => {
      const res = await fetch('/api/v1/shipments');
      if (!res.ok) {
        throw new Error('Failed to fetch shipments');
      }
      return res.json() as Promise<Shipment[]>;
    }
  });
}
