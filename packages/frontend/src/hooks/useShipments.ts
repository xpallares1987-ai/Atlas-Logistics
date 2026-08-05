import { useQuery } from '@tanstack/react-query';

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
