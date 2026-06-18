'use client';

export type AddressType = 
  | 'Cliente' 
  | 'Aduanas' 
  | 'Transportista' 
  | 'Naviera' 
  | 'Agente' 
  | 'Almacén' 
  | 'Aérea' 
  | 'Terminal' 
  | 'Seguros';

export interface CompanyAddress {
  id: string;
  name: string;
  taxId: string; // CIF / NIF
  type: AddressType;
  street: string;
  city: string;
  stateProv: string;
  country: string;
  postalCode: string;
  phone: string;
  email: string;
  contactPerson: string;
  notes?: string;
}

const DEFAULT_ADDRESSES: CompanyAddress[] = [
  {
    id: 'addr-1',
    name: 'Mediterranean Imports S.L.',
    taxId: 'B65432109',
    type: 'Cliente',
    street: 'Calle de Mallorca 120, Entresuelo',
    city: 'Barcelona',
    stateProv: 'Cataluña',
    country: 'España',
    postalCode: '08008',
    phone: '+34 934 567 890',
    email: 'logistica@medimports.es',
    contactPerson: 'Carlos Martínez',
    notes: 'Cliente preferente de importación FCL desde Asia.'
  },
  {
    id: 'addr-2',
    name: 'Aduanas & Despachos Galdós',
    taxId: 'A48223344',
    type: 'Aduanas',
    street: 'Paseo de Colón 4, Planta 3',
    city: 'Barcelona',
    stateProv: 'Cataluña',
    country: 'España',
    postalCode: '08002',
    phone: '+34 932 201 155',
    email: 'galdos@galdosaduanas.com',
    contactPerson: 'Victoria Galdós',
    notes: 'Despachante de aduanas partner homologado para inspecciones en PIF.'
  },
  {
    id: 'addr-3',
    name: 'Maersk Spain S.A.',
    taxId: 'A28994433',
    type: 'Naviera',
    street: 'Plaza Manuel Gómez Moreno 2',
    city: 'Madrid',
    stateProv: 'Madrid',
    country: 'España',
    postalCode: '28020',
    phone: '+34 913 456 000',
    email: 'spasales@maersk.com',
    contactPerson: 'Alberto Gil',
    notes: 'Línea marítima principal o sede central representada en el mercado.'
  },
  {
    id: 'addr-4',
    name: 'CMA CGM Iberia SL',
    taxId: 'B60228899',
    type: 'Naviera',
    street: 'Avenida Diagonal 640',
    city: 'Barcelona',
    stateProv: 'Cataluña',
    country: 'España',
    postalCode: '08017',
    phone: '+34 933 634 000',
    email: 'ibesales@cma-cgm.com',
    contactPerson: 'Marta Soler',
  },
  {
    id: 'addr-5',
    name: 'Transitarios Reunidos Barcelona',
    taxId: 'B58229988',
    type: 'Agente',
    street: 'Vía Laietana 18, Principal',
    city: 'Barcelona',
    stateProv: 'Cataluña',
    country: 'España',
    postalCode: '08003',
    phone: '+34 932 998 877',
    email: 'bcn@transitariosreunidos.es',
    contactPerson: 'Esteban Ruiz',
    notes: 'Agente de aduanas y embarques corresponsal en origen.'
  },
  {
    id: 'addr-6',
    name: 'Transportes Terrestres Hispania S.A.',
    taxId: 'A50884433',
    type: 'Transportista',
    street: 'Avinguda de les Drassanes 12',
    city: 'Barcelona',
    stateProv: 'Cataluña',
    country: 'España',
    postalCode: '08001',
    phone: '+34 931 112 233',
    email: 'trafico@hispaniatransporte.com',
    contactPerson: 'Joaquín Soria',
    notes: 'Flota propia de camiones porta-contenedores.'
  },
  {
    id: 'addr-7',
    name: 'Almacén Logístico del Prat S.A.',
    taxId: 'A61224455',
    type: 'Almacén',
    street: 'ZAL Prat, Sector 1, Vial B',
    city: 'El Prat de Llobregat',
    stateProv: 'Cataluña',
    country: 'España',
    postalCode: '08820',
    phone: '+34 935 889 900',
    email: 'operaciones@almacenprat.com',
    contactPerson: 'Laura Sans',
    notes: 'Almacén externo tipo DDA / ADT con rampas de consolidación.'
  },
  {
    id: 'addr-8',
    name: 'Seguros Marítimos Helvetia SL',
    taxId: 'B48772211',
    type: 'Seguros',
    street: 'Calle Serrano 80',
    city: 'Madrid',
    stateProv: 'Madrid',
    country: 'España',
    postalCode: '28006',
    phone: '+34 912 345 678',
    email: 'marine.claims@helvetiaseguros.es',
    contactPerson: 'Ignacio Ortiz',
  },
  {
    id: 'addr-9',
    name: 'MSC Terminal Barcelona',
    taxId: 'A62778811',
    type: 'Terminal',
    street: 'Muelle Sud, s/n',
    city: 'Barcelona',
    stateProv: 'Cataluña',
    country: 'España',
    postalCode: '08039',
    phone: '+34 934 439 200',
    email: 'operaciones@terminalbcn.msc.com',
    contactPerson: 'Javier Marín',
  },
  {
    id: 'addr-10',
    name: 'Global Forwarding Shanghai',
    taxId: 'CHN-9988771',
    type: 'Agente',
    street: 'Room 1205, Century Avenue 88',
    city: 'Shanghai',
    stateProv: 'Shanghai',
    country: 'China',
    postalCode: '200120',
    phone: '+86 21 6888 1234',
    email: 'shanghai@globalfwd.cn',
    contactPerson: 'Wei Dong',
    notes: 'Agente corresponsal asiático clave para reservas LCL/FCL.'
  }
];

export function getAddresses(): CompanyAddress[] {
  if (typeof window === 'undefined') return DEFAULT_ADDRESSES;
  const stored = localStorage.getItem('sys_modeler_addresses');
  if (!stored) {
    localStorage.setItem('sys_modeler_addresses', JSON.stringify(DEFAULT_ADDRESSES));
    return DEFAULT_ADDRESSES;
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    return DEFAULT_ADDRESSES;
  }
}

export function saveAddresses(addresses: CompanyAddress[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('sys_modeler_addresses', JSON.stringify(addresses));
}

export function getAddressesByType(type: AddressType): CompanyAddress[] {
  return getAddresses().filter(addr => addr.type === type);
}

export function getAddressesByTypes(types: AddressType[]): CompanyAddress[] {
  return getAddresses().filter(addr => types.includes(addr.type));
}
