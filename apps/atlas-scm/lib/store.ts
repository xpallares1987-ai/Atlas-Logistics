import {
  Rate,
  Location,
  Shipment,
  DocumentRecord,
  User,
  Milestone,
} from "../types/scm";

export const mockLocations: Location[] = [
  { code: "CNSHA", name: "Shanghai", country: "China", type: "PORT" },
  { code: "ESBCN", name: "Barcelona", country: "Spain", type: "PORT" },
  { code: "USLAX", name: "Los Angeles", country: "USA", type: "PORT" },
];

let ratesStore: Rate[] = [];

let shipmentsStore: Shipment[] = [
  {
    id: "SHP-001",
    reference: "FWD-2026-001",
    mblNumber: "MSCU123456789",
    hblNumber: "HBL-FWD-8899",
    carrier: "MSC",
    origin: "CNSHA",
    destination: "USLAX",
    incoterm: "FOB",
    customsStatus: "CLEARED",
    cargoDetails: {
      hsCode: "8517.18",
      description: "Dispositivos de Telecomunicación y Convertidores Lógicos",
      weightKg: 18500,
      volumeCbm: 54,
      cargoType: "GENERAL",
    },
    etd: "2026-06-10",
    eta: "2026-06-28",
    status: "IN_TRANSIT",
    mode: "FCL_40",
    containers: [
      {
        containerNumber: "MSCU7788990",
        type: "FCL_40",
        sealNumber: "S-1234",
        grossWeightKg: 18500,
      },
    ],
    milestones: [
      {
        id: "M-1",
        type: "BOOKED",
        location: "CNSHA",
        date: "2026-06-01",
        description: "Booking confirmed with carrier",
      },
      {
        id: "M-2",
        type: "GATE_IN",
        location: "CNSHA Terminal",
        date: "2026-06-08",
        description: "Container gated in at origin port",
      },
      {
        id: "M-3",
        type: "DEPARTED",
        location: "CNSHA",
        date: "2026-06-10",
        description: "Vessel departed origin",
      },
    ],
    delayed: false,
  },
  {
    id: "SHP-002",
    reference: "FWD-2026-002",
    mblNumber: "MSCU987654321",
    hblNumber: "HBL-FWD-8822",
    carrier: "Maersk",
    origin: "CNSHA",
    destination: "ESBCN",
    incoterm: "CIF",
    customsStatus: "PENDING",
    cargoDetails: {
      hsCode: "8708.29",
      description: "Autopartes y Componentes Mecánicos de Acoplados",
      weightKg: 12000,
      volumeCbm: 32,
      cargoType: "GENERAL",
    },
    etd: "2026-06-01",
    eta: "2026-06-18",
    status: "IN_TRANSIT",
    mode: "FCL_20",
    containers: [
      {
        containerNumber: "MRKU5544332",
        type: "FCL_20",
        sealNumber: "S-7766",
        grossWeightKg: 12000,
      },
    ],
    milestones: [
      {
        id: "M-201",
        type: "BOOKED",
        location: "CNSHA",
        date: "2026-05-25",
        description: "Booking confirm",
      },
      {
        id: "M-202",
        type: "DEPARTED",
        location: "CNSHA",
        date: "2026-06-01",
        description: "Departed via Maersk Altair",
      },
    ],
    delayed: false,
  },
  {
    id: "SHP-003",
    reference: "FWD-2026-003",
    mblNumber: "CMAU112233445",
    hblNumber: "HBL-FWD-8833",
    carrier: "CMA CGM",
    origin: "CNSHA",
    destination: "ESBCN",
    incoterm: "EXW",
    customsStatus: "HELD_FOR_INSPECTION",
    cargoDetails: {
      hsCode: "2905.11",
      description: "Metanol y Alcoholes Derivados Industriales",
      weightKg: 21000,
      volumeCbm: 40,
      cargoType: "HAZMAT",
      unNumber: "UN1230",
    },
    etd: "2026-05-24",
    eta: "2026-06-14",
    status: "IN_TRANSIT",
    mode: "FCL_40",
    containers: [
      {
        containerNumber: "CMAU3388221",
        type: "FCL_40",
        sealNumber: "S-5544",
        grossWeightKg: 21000,
      },
    ],
    milestones: [
      {
        id: "M-301",
        type: "BOOKED",
        location: "CNSHA",
        date: "2026-05-18",
        description: "Hazmat booking approved",
      },
      {
        id: "M-302",
        type: "DEPARTED",
        location: "CNSHA",
        date: "2026-05-24",
        description: "Vessel departed under special routing rules",
      },
    ],
    delayed: true,
  },
  {
    id: "SHP-004",
    reference: "FWD-2026-004",
    mblNumber: "HLCU998877665",
    hblNumber: "HBL-FWD-8844",
    carrier: "Hapag-Lloyd",
    origin: "CNSHA",
    destination: "ESBCN",
    incoterm: "DAP",
    customsStatus: "CLEARED",
    cargoDetails: {
      hsCode: "3926.90",
      description: "Artículos Plásticos de Consumo Directo Masivo",
      weightKg: 5400,
      volumeCbm: 18,
      cargoType: "GENERAL",
    },
    etd: "2026-05-15",
    eta: "2026-06-12",
    status: "ARRIVED",
    mode: "LCL",
    containers: [
      {
        containerNumber: "HLXU1100223",
        type: "LCL",
        sealNumber: "S-3321",
        grossWeightKg: 5400,
      },
    ],
    milestones: [
      {
        id: "M-401",
        type: "BOOKED",
        location: "CNSHA",
        date: "2026-05-10",
        description: "LCL booking confirmed",
      },
      {
        id: "M-402",
        type: "DEPARTED",
        location: "CNSHA",
        date: "2026-05-15",
        description: "Vessel departed",
      },
      {
        id: "M-403",
        type: "ARRIVED",
        location: "ESBCN",
        date: "2026-06-12",
        description: "Vessel arrived at destination port",
      },
    ],
    delayed: false,
  },
  {
    id: "SHP-005",
    reference: "FWD-2026-005",
    mblNumber: "AFR9922883",
    hblNumber: "HBL-FWD-8855",
    carrier: "Air France Cargo",
    origin: "USLAX",
    destination: "ESBCN",
    incoterm: "DDP",
    customsStatus: "PENDING",
    cargoDetails: {
      hsCode: "8471.30",
      description:
        "Portátiles y Unidades de Procesamiento de Datos de Alta Densidad",
      weightKg: 850,
      volumeCbm: 4.5,
      cargoType: "GENERAL",
    },
    etd: "2026-06-25",
    eta: "2026-06-27",
    status: "BOOKED",
    mode: "AIR",
    containers: [],
    milestones: [
      {
        id: "M-501",
        type: "BOOKED",
        location: "USLAX Air Terminal",
        date: "2026-06-14",
        description: "Air freight space booked and allocated",
      },
    ],
    delayed: false,
  },
];

let documentsStore: DocumentRecord[] = [
  {
    id: "DOC-001",
    type: "HBL",
    shipmentId: "SHP-001",
    documentNumber: "HBL-FWD-8899",
    shipper: "Tech Supplier Ltd, Shanghai",
    consignee: "Global Imports Inc, Los Angeles",
    notifyParty: "Same as Consignee",
    vessel: "MSC ROSA",
    voyage: "V-100E",
    portOfLoading: "Shanghai, China",
    portOfDischarge: "Los Angeles, USA",
    marksAndNumbers: "N/M",
    descriptionOfGoods: "ELECTRONIC COMPONENTS - 100 PALLETS",
    grossWeightKg: 18500,
    volumeCbm: 54,
    issueDate: "2026-08-16",
    status: "ISSUED",
  },
];

let usersStore: User[] = [
  {
    id: "USR-001",
    name: "Admin User",
    email: "admin@forwarderos.com",
    role: "ADMIN",
    status: "ACTIVE",
    createdAt: "2026-01-01",
  },
  {
    id: "USR-002",
    name: "John Doe",
    email: "johndoe@forwarderos.com",
    role: "OPERATOR",
    status: "ACTIVE",
    createdAt: "2026-02-15",
  },
  {
    id: "USR-003",
    name: "Jane Smith",
    email: "jsmith@forwarderos.com",
    role: "SALES",
    status: "ACTIVE",
    createdAt: "2026-03-10",
  },
  {
    id: "USR-004",
    name: "Client Corp",
    email: "logistics@clientcorp.com",
    role: "CUSTOMER",
    status: "ACTIVE",
    createdAt: "2026-05-22",
  },
];

export const getStoreRates = (): Rate[] => ratesStore;
export const getStoreLocations = (): Location[] => mockLocations;
export const appendRate = (rate: Rate) => {
  ratesStore = [rate, ...ratesStore];
};

export const getStoreShipments = (): Shipment[] => shipmentsStore;
export const appendShipment = (shipment: Shipment) => {
  shipmentsStore = [shipment, ...shipmentsStore];
};
export const updateStoreShipment = (id: string, updates: Partial<Shipment>) => {
  shipmentsStore = shipmentsStore.map((s) =>
    s.id === id ? { ...s, ...updates } : s,
  );
};
export const addStoreMilestone = (shipmentId: string, milestone: Milestone) => {
  shipmentsStore = shipmentsStore.map((s) => {
    if (s.id === shipmentId) {
      return { ...s, milestones: [...s.milestones, milestone] };
    }
    return s;
  });
};

export const getStoreDocuments = (): DocumentRecord[] => documentsStore;
export const appendDocument = (doc: DocumentRecord) => {
  documentsStore = [doc, ...documentsStore];
};

export const getStoreUsers = (): User[] => usersStore;
export const appendUser = (user: User) => {
  usersStore = [user, ...usersStore];
};
export const updateStoreUserStatus = (
  id: string,
  status: "ACTIVE" | "INACTIVE",
) => {
  usersStore = usersStore.map((u) => (u.id === id ? { ...u, status } : u));
};
