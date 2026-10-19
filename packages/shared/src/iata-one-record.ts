/**
 * @file iata-one-record.ts
 * @description IATA ONE Record & Air Cargo e-AWB Linked Data Hub.
 * Implements W3C JSON-LD ontology for Air Cargo Logistics Objects, Cargo iQ milestone state machine
 * (FWB, FHL, RCS, DEP, ARR, RCF, NFD, DLV), and IATA Dangerous Goods Regulations (DGR) e-DGD validation.
 */

export type CargoIqMilestoneCode =
  | 'FWB' // e-AWB data captured
  | 'FHL' // House AWB list received
  | 'RCS' // Ready for Carriage (Received from Shipper)
  | 'DEP' // Flight Departed
  | 'ARR' // Flight Arrived
  | 'RCF' // Received from Flight (Ramp transfer / Warehouse check-in)
  | 'NFD' // Consignee Notified for Delivery
  | 'DLV'; // Consignment Delivered

export type MilestoneSlaStatus = 'COMPLETED' | 'ON_SCHEDULE' | 'WARNING_AT_RISK' | 'SLA_BREACHED';

export interface OneRecordActor {
  '@type': 'Actor';
  name: string;
  iataCode?: string;
  address?: string;
  contactEmail?: string;
}

export interface OneRecordPiece {
  '@type': 'Piece';
  pieceId: string;
  sequenceNumber: number;
  grossWeightKg: number;
  dimensionsCm: {
    length: number;
    width: number;
    height: number;
  };
  volumeCbm: number;
  specialHandlingCodes: string[]; // 'PIL', 'COL', 'CAO', 'ICE', etc.
}

export interface OneRecordTransportMovement {
  '@type': 'TransportMovement';
  flightNumber: string;
  carrierCode: string; // e.g. 'IB', 'EK', 'AM', 'LH'
  originAirport: string; // IATA e.g. 'BCN', 'MAD', 'ZAZ'
  destinationAirport: string; // IATA e.g. 'JFK', 'DXB', 'MEX'
  scheduledDeparture: string; // ISO
  actualDeparture?: string;
  scheduledArrival: string; // ISO
  actualArrival?: string;
  aircraftType: string;
}

export interface OneRecordWaybill {
  '@context': 'https://onerecord.iata.org/ns/cargo#';
  '@type': 'Waybill';
  waybillId: string;
  waybillPrefix: string; // 3 digits e.g. '075'
  waybillNumber: string; // 8 digits e.g. '82910482'
  fullAwbNumber: string; // '075-82910482'
  originAirport: string;
  destinationAirport: string;
  piecesCount: number;
  totalGrossWeightKg: number;
  totalVolumeCbm: number;
  chargeableWeightKg: number;
  natureAndQuantityOfGoods: string;
  shipper: OneRecordActor;
  consignee: OneRecordActor;
  issuingAgent: OneRecordActor;
  carrier: OneRecordActor;
  transportMovement: OneRecordTransportMovement;
  pieces: OneRecordPiece[];
  specialHandlingCodes: string[];
  createdDate: string;
  digitalSealHash: string;
}

export interface CargoIqMilestone {
  milestoneCode: CargoIqMilestoneCode;
  name: string;
  locationAirport: string;
  plannedTimestamp: string;
  actualTimestamp?: string;
  slaLimitTimestamp: string;
  status: MilestoneSlaStatus;
  deltaMinutes?: number;
  eventRemarks?: string;
}

export interface DangerousGoodsItem {
  unNumber: string; // e.g. 'UN1845', 'UN3481', 'UN1202'
  properShippingName: string;
  hazardClass: string; // '9', '3', '6.1', etc.
  subsidiaryRisk?: string;
  packingGroup?: 'I' | 'II' | 'III';
  packageQuantity: number;
  netQuantityPerPackageKg: number;
  totalNetQuantityKg: number;
  packingInstruction: string; // e.g. 'PI 954', 'PI 967'
  aircraftRestriction: 'PAX_AND_CARGO' | 'CARGO_AIRCRAFT_ONLY';
}

export interface EDgdValidationResult {
  isCompliant: boolean;
  unNumber: string;
  packingInstruction: string;
  aircraftRestriction: 'PAX_AND_CARGO' | 'CARGO_AIRCRAFT_ONLY';
  violations: string[];
  handlingAdvisories: string[];
  validationSealHash: string;
}

// ============================================================================
// IATA DGR DANGEROUS GOODS VALIDATION ENGINE
// ============================================================================

export function validateDangerousGoodsDeclaration(item: DangerousGoodsItem): EDgdValidationResult {
  const violations: string[] = [];
  const advisories: string[] = [];

  // 1. UN Number Format
  if (!/^UN\d{4}$/.test(item.unNumber)) {
    violations.push(`Formato UN Number inválido: ${item.unNumber}. Debe coincidir con UN seguido de 4 dígitos.`);
  }

  // 2. Class and Packing Instruction Cross-Validation
  if (item.unNumber === 'UN1845') {
    // Carbon Dioxide, solid (Dry Ice)
    if (item.hazardClass !== '9') {
      violations.push(`Clase de peligro incorrecta para Dry Ice (${item.unNumber}). Debe ser Clase 9.`);
    }
    if (item.packingInstruction !== 'PI 954') {
      violations.push(`Instrucción de embalaje IATA DGR incorrecta. Para UN1845 debe especificarse PI 954.`);
    }
    advisories.push('Verificar ventilación adecuada en bodega para evacuación de gas CO2 sublimado.');
    advisories.push('Etiquetado obligatorio: Clase 9 Misceláneos + Etiqueta de Hielo Seco con peso neto en kg.');
  } else if (item.unNumber === 'UN3481') {
    // Lithium ion batteries contained in equipment
    if (item.hazardClass !== '9') {
      violations.push(`Clase incorrecta para Baterías de Ion-Litio. Debe ser Clase 9.`);
    }
    if (!['PI 966', 'PI 967'].includes(item.packingInstruction)) {
      violations.push(`Instrucción de embalaje inválida para UN3481. Debe ser PI 966 (empaquetadas con) o PI 967 (contenidas en).`);
    }
    advisories.push('Estado de carga (SoC) recomendado < 30% conforme a IATA Lithium Battery Guidance.');
    advisories.push('Etiqueta de manipulación de baterías de litio obligatoria con teléfono de emergencia 24/7.');
  }

  // 3. Aircraft Restriction Check
  if (item.aircraftRestriction === 'CARGO_AIRCRAFT_ONLY') {
    advisories.push('ATENCIÓN: Carga prohibida en aviones de pasaje. Etiqueta "Cargo Aircraft Only" (CAO) mandatoria.');
  }

  const isCompliant = violations.length === 0;

  // Compute digital validation hash
  let hash = 0x811c9dc5;
  const rawStr = `${item.unNumber}|${item.packingInstruction}|${item.aircraftRestriction}|${isCompliant}`;
  for (let i = 0; i < rawStr.length; i++) {
    hash ^= rawStr.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  const hex = (hash >>> 0).toString(16).padStart(8, '0');
  const validationSealHash = `IATA-DGR-${hex}${hex.split('').reverse().join('')}${hex}`;

  return {
    isCompliant,
    unNumber: item.unNumber,
    packingInstruction: item.packingInstruction,
    aircraftRestriction: item.aircraftRestriction,
    violations,
    handlingAdvisories: advisories,
    validationSealHash
  };
}

// ============================================================================
// CARGO IQ MILESTONE EVALUATION
// ============================================================================

export function evaluateMilestoneSla(
  milestone: CargoIqMilestone,
  currentTimeMs: number = Date.now()
): CargoIqMilestone {
  const plannedMs = new Date(milestone.plannedTimestamp).getTime();
  const slaLimitMs = new Date(milestone.slaLimitTimestamp).getTime();

  if (milestone.actualTimestamp) {
    const actualMs = new Date(milestone.actualTimestamp).getTime();
    const deltaMinutes = Math.round((actualMs - plannedMs) / (60 * 1000));
    const status: MilestoneSlaStatus = actualMs <= slaLimitMs ? 'COMPLETED' : 'SLA_BREACHED';

    return {
      ...milestone,
      status,
      deltaMinutes
    };
  }

  // If not completed yet:
  if (currentTimeMs > slaLimitMs) {
    return {
      ...milestone,
      status: 'SLA_BREACHED',
      deltaMinutes: Math.round((currentTimeMs - plannedMs) / (60 * 1000))
    };
  } else if (currentTimeMs > plannedMs) {
    return {
      ...milestone,
      status: 'WARNING_AT_RISK',
      deltaMinutes: Math.round((currentTimeMs - plannedMs) / (60 * 1000))
    };
  }

  return {
    ...milestone,
    status: 'ON_SCHEDULE',
    deltaMinutes: 0
  };
}

// ============================================================================
// DEMO SEED PRESETS
// ============================================================================

export const SEED_ONE_RECORD_WAYBILLS: OneRecordWaybill[] = [
  {
    '@context': 'https://onerecord.iata.org/ns/cargo#',
    '@type': 'Waybill',
    waybillId: 'WBL-075-82910482',
    waybillPrefix: '075',
    waybillNumber: '82910482',
    fullAwbNumber: '075-82910482',
    originAirport: 'BCN',
    destinationAirport: 'JFK',
    piecesCount: 4,
    totalGrossWeightKg: 850.0,
    totalVolumeCbm: 3.4,
    chargeableWeightKg: 850.0,
    natureAndQuantityOfGoods: 'Pharmaceutical Vaccines & Biological Samples in Dry Ice',
    shipper: {
      '@type': 'Actor',
      name: 'BioPharma Laboratories Catalonia S.A.',
      address: 'Parc Científic de Barcelona, ES',
      contactEmail: 'logistics@biopharmacat.com'
    },
    consignee: {
      '@type': 'Actor',
      name: 'Manhattan BioResearch Institute',
      address: '1st Avenue, New York, NY 10016, US',
      contactEmail: 'receiving@manhattanbioresearch.org'
    },
    issuingAgent: {
      '@type': 'Actor',
      name: 'Atlas Air Logistics Barcelona Hub',
      iataCode: 'BCN-AG-0418'
    },
    carrier: {
      '@type': 'Actor',
      name: 'Iberia Líneas Aéreas',
      iataCode: 'IB'
    },
    transportMovement: {
      '@type': 'TransportMovement',
      flightNumber: 'IB6251',
      carrierCode: 'IB',
      originAirport: 'BCN',
      destinationAirport: 'JFK',
      scheduledDeparture: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
      scheduledArrival: new Date(Date.now() + 15 * 3600 * 1000).toISOString(),
      aircraftType: 'Airbus A350-900'
    },
    pieces: [
      {
        '@type': 'Piece',
        pieceId: 'PC-001',
        sequenceNumber: 1,
        grossWeightKg: 212.5,
        dimensionsCm: { length: 80, width: 60, height: 70 },
        volumeCbm: 0.336,
        specialHandlingCodes: ['PIL', 'COL', 'ICE']
      },
      {
        '@type': 'Piece',
        pieceId: 'PC-002',
        sequenceNumber: 2,
        grossWeightKg: 212.5,
        dimensionsCm: { length: 80, width: 60, height: 70 },
        volumeCbm: 0.336,
        specialHandlingCodes: ['PIL', 'COL', 'ICE']
      },
      {
        '@type': 'Piece',
        pieceId: 'PC-003',
        sequenceNumber: 3,
        grossWeightKg: 212.5,
        dimensionsCm: { length: 80, width: 60, height: 70 },
        volumeCbm: 0.336,
        specialHandlingCodes: ['PIL', 'COL', 'ICE']
      },
      {
        '@type': 'Piece',
        pieceId: 'PC-004',
        sequenceNumber: 4,
        grossWeightKg: 212.5,
        dimensionsCm: { length: 80, width: 60, height: 70 },
        volumeCbm: 0.336,
        specialHandlingCodes: ['PIL', 'COL', 'ICE']
      }
    ],
    specialHandlingCodes: ['PIL', 'COL', 'ICE'],
    createdDate: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    digitalSealHash: 'SHA256-4b9e11c88c11e94b4b9e11c8'
  },
  {
    '@context': 'https://onerecord.iata.org/ns/cargo#',
    '@type': 'Waybill',
    waybillId: 'WBL-139-44109283',
    waybillPrefix: '139',
    waybillNumber: '44109283',
    fullAwbNumber: '139-44109283',
    originAirport: 'MAD',
    destinationAirport: 'MEX',
    piecesCount: 2,
    totalGrossWeightKg: 320.0,
    totalVolumeCbm: 1.2,
    chargeableWeightKg: 320.0,
    natureAndQuantityOfGoods: 'Industrial Automation Sensors with Lithium Batteries',
    shipper: {
      '@type': 'Actor',
      name: 'Iberian Robotics & Sensorics S.L.',
      address: 'Alcobendas, Madrid, ES'
    },
    consignee: {
      '@type': 'Actor',
      name: 'Manufacturas Querétaro S.A. de C.V.',
      address: 'Querétaro, MX'
    },
    issuingAgent: {
      '@type': 'Actor',
      name: 'Atlas Cargo Madrid Forwarding'
    },
    carrier: {
      '@type': 'Actor',
      name: 'Aeroméxico Cargo',
      iataCode: 'AM'
    },
    transportMovement: {
      '@type': 'TransportMovement',
      flightNumber: 'AM002',
      carrierCode: 'AM',
      originAirport: 'MAD',
      destinationAirport: 'MEX',
      scheduledDeparture: new Date(Date.now() + 10 * 3600 * 1000).toISOString(),
      scheduledArrival: new Date(Date.now() + 22 * 3600 * 1000).toISOString(),
      aircraftType: 'Boeing 787-9'
    },
    pieces: [
      {
        '@type': 'Piece',
        pieceId: 'PC-101',
        sequenceNumber: 1,
        grossWeightKg: 160.0,
        dimensionsCm: { length: 60, width: 50, height: 50 },
        volumeCbm: 0.15,
        specialHandlingCodes: ['ELI']
      },
      {
        '@type': 'Piece',
        pieceId: 'PC-102',
        sequenceNumber: 2,
        grossWeightKg: 160.0,
        dimensionsCm: { length: 60, width: 50, height: 50 },
        volumeCbm: 0.15,
        specialHandlingCodes: ['ELI']
      }
    ],
    specialHandlingCodes: ['ELI'],
    createdDate: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
    digitalSealHash: 'SHA256-7a1f88d22d88f1a77a1f88d2'
  }
];

export const SEED_CARGO_IQ_TIMELINE: CargoIqMilestone[] = [
  {
    milestoneCode: 'FWB',
    name: 'Transmisión e-AWB Recibida',
    locationAirport: 'BCN',
    plannedTimestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    actualTimestamp: new Date(Date.now() - 3.8 * 3600 * 1000).toISOString(),
    slaLimitTimestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    status: 'COMPLETED',
    deltaMinutes: 12,
    eventRemarks: 'Mensaje FWB v17 procesado en Cargo Link.'
  },
  {
    milestoneCode: 'FHL',
    name: 'Manifiesto House AWB Procesado',
    locationAirport: 'BCN',
    plannedTimestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    actualTimestamp: new Date(Date.now() - 2.9 * 3600 * 1000).toISOString(),
    slaLimitTimestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    status: 'COMPLETED',
    deltaMinutes: 6,
    eventRemarks: 'Consolidación de 4 bultos validada.'
  },
  {
    milestoneCode: 'RCS',
    name: 'Carga Recibida del Expedidor (Ready for Carriage)',
    locationAirport: 'BCN',
    plannedTimestamp: new Date(Date.now() - 1.5 * 3600 * 1000).toISOString(),
    actualTimestamp: new Date(Date.now() - 1.2 * 3600 * 1000).toISOString(),
    slaLimitTimestamp: new Date(Date.now() - 0.5 * 3600 * 1000).toISOString(),
    status: 'COMPLETED',
    deltaMinutes: 18,
    eventRemarks: 'Control de seguridad raio-X y pesaje verificado en Terminal de Carga BCN.'
  },
  {
    milestoneCode: 'DEP',
    name: 'Salida de Vuelo (Vuelo IB6251)',
    locationAirport: 'BCN',
    plannedTimestamp: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
    slaLimitTimestamp: new Date(Date.now() + 6.5 * 3600 * 1000).toISOString(),
    status: 'ON_SCHEDULE',
    eventRemarks: 'Paletizado ULD en posición de espera rampa.'
  },
  {
    milestoneCode: 'ARR',
    name: 'Llegada de Vuelo (JFK Terminal 7)',
    locationAirport: 'JFK',
    plannedTimestamp: new Date(Date.now() + 15 * 3600 * 1000).toISOString(),
    slaLimitTimestamp: new Date(Date.now() + 15.5 * 3600 * 1000).toISOString(),
    status: 'ON_SCHEDULE'
  },
  {
    milestoneCode: 'RCF',
    name: 'Descarga de Vuelo y Check-in Almacén',
    locationAirport: 'JFK',
    plannedTimestamp: new Date(Date.now() + 17 * 3600 * 1000).toISOString(),
    slaLimitTimestamp: new Date(Date.now() + 18 * 3600 * 1000).toISOString(),
    status: 'ON_SCHEDULE'
  },
  {
    milestoneCode: 'NFD',
    name: 'Aviso de Llegada al Destinatario',
    locationAirport: 'JFK',
    plannedTimestamp: new Date(Date.now() + 18.5 * 3600 * 1000).toISOString(),
    slaLimitTimestamp: new Date(Date.now() + 19.5 * 3600 * 1000).toISOString(),
    status: 'ON_SCHEDULE'
  },
  {
    milestoneCode: 'DLV',
    name: 'Entrega Final al Consignatario',
    locationAirport: 'JFK',
    plannedTimestamp: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    slaLimitTimestamp: new Date(Date.now() + 26 * 3600 * 1000).toISOString(),
    status: 'ON_SCHEDULE'
  }
];

export const SEED_DANGEROUS_GOODS: DangerousGoodsItem[] = [
  {
    unNumber: 'UN1845',
    properShippingName: 'Carbon dioxide, solid (Dry Ice)',
    hazardClass: '9',
    packageQuantity: 4,
    netQuantityPerPackageKg: 15.0,
    totalNetQuantityKg: 60.0,
    packingInstruction: 'PI 954',
    aircraftRestriction: 'PAX_AND_CARGO'
  },
  {
    unNumber: 'UN3481',
    properShippingName: 'Lithium ion batteries contained in equipment',
    hazardClass: '9',
    packageQuantity: 2,
    netQuantityPerPackageKg: 8.5,
    totalNetQuantityKg: 17.0,
    packingInstruction: 'PI 967',
    aircraftRestriction: 'PAX_AND_CARGO'
  }
];
