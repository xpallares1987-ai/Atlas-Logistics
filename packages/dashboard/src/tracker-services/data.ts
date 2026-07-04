export interface Milestone {
  label: string;
  key: string;
  completed: boolean;
  date?: string;
}

export interface Shipment {
  id: string;
  reference: string;
  container: string;
  origin: string;
  destination: string;
  originCoords: [number, number];
  destCoords: [number, number];
  status: 'booking' | 'transit' | 'customs' | 'delivered';
  mode: 'sea' | 'air' | 'land';
  eta: string;
  milestones: Milestone[];
  portArrivalDate?: string;
  freeTimeDays: number;
  demurrageRate: number;
}

export const mockShipments: Shipment[] = [
  { 
    id: '1', reference: 'HAWB-9921', container: 'MSCU1234567', 
    origin: 'Shanghai', destination: 'Barcelona',
    originCoords: [31.2304, 121.4737], destCoords: [41.3851, 2.1734],
    status: 'transit', mode: 'sea', eta: '2026-05-10', freeTimeDays: 7, demurrageRate: 150,
    milestones: [
      { label: 'Booking', key: 'booking', completed: true },
      { label: 'En Tránsito', key: 'transit', completed: true },
      { label: 'Entregado', key: 'delivered', completed: false }
    ]
  },
  { 
    id: '2', reference: 'AIR-4452', container: 'MAWB-778899', 
    origin: 'Frankfurt', destination: 'Mexico City',
    originCoords: [50.1109, 8.6821], destCoords: [19.4326, -99.1332],
    status: 'booking', mode: 'air', eta: '2026-04-30', freeTimeDays: 3, demurrageRate: 50,
    milestones: [
      { label: 'Booking', key: 'booking', completed: true },
      { label: 'Salida', key: 'transit', completed: false }
    ]
  },
  { 
    id: '3', reference: 'HAWB-7710', container: 'HLXU1122334', 
    origin: 'Ningbo', destination: 'Madrid',
    originCoords: [29.8683, 121.5440], destCoords: [40.4168, -3.7038],
    status: 'customs', mode: 'sea', eta: '2026-04-26', portArrivalDate: '2026-04-20', freeTimeDays: 4, demurrageRate: 120,
    milestones: [
      { label: 'En Puerto', key: 'port', completed: true },
      { label: 'Aduanas', key: 'customs', completed: true }
    ]
  }
];



