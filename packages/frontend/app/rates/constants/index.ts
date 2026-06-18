import { ContractRate } from '../types';

export const DEFAULT_RATES: ContractRate[] = [
  { id: 'RTE-001', carrier: 'Maersk Line', mode: 'FCL', pol: 'CNSHA', pod: 'ESBCN', equipment: '40HC', baseRate: 1850, bafSurcharge: 230, currency: 'USD', validFrom: '2026-01-01', validTo: '2026-07-31', transitTimeDays: 28, allocationsTeu: 150 },
  { id: 'RTE-002', carrier: 'COSCO Shipping', mode: 'FCL', pol: 'CNSHA', pod: 'ESBCN', equipment: '40HC', baseRate: 12500, bafSurcharge: 1500, currency: 'CNY', validFrom: '2026-02-15', validTo: '2026-08-15', transitTimeDays: 31, allocationsTeu: 100 },
  { id: 'RTE-003', carrier: 'MSC Maritime', mode: 'FCL', pol: 'ESBCN', pod: 'USNYC', equipment: '20GP', baseRate: 1350, bafSurcharge: 170, currency: 'EUR', validFrom: '2026-01-10', validTo: '2026-06-30', transitTimeDays: 14, allocationsTeu: 80 },
  { id: 'RTE-004', carrier: 'Cargolux Airlines', mode: 'AIR', pol: 'CNHKG', pod: 'ESMAD', equipment: 'Per KG CHW', baseRate: 3.20, bafSurcharge: 0.80, currency: 'EUR', validFrom: '2026-05-01', validTo: '2026-07-15', transitTimeDays: 2, allocationsTeu: 45 },
  { id: 'RTE-005', carrier: 'DHL Global Forwarding', mode: 'AIR', pol: 'SGSIN', pod: 'DEHAM', equipment: 'Per KG CHW', baseRate: 3.10, bafSurcharge: 0.70, currency: 'GBP', validFrom: '2026-04-01', validTo: '2026-09-30', transitTimeDays: 3, allocationsTeu: 30 },
  { id: 'RTE-006', carrier: 'Vanguard Logistics', mode: 'LCL', pol: 'SGSIN', pod: 'USLAX', equipment: 'Per CBM', baseRate: 75, bafSurcharge: 15, currency: 'USD', validFrom: '2026-02-01', validTo: '2026-08-31', transitTimeDays: 22, allocationsTeu: 120 },
  { id: 'RTE-007', carrier: 'Trans-Europa Freights', mode: 'ROAD', pol: 'DEHAM', pod: 'ESBCN', equipment: 'FTL Trailer', baseRate: 1950, bafSurcharge: 120, currency: 'EUR', validFrom: '2026-01-01', validTo: '2026-12-31', transitTimeDays: 4, allocationsTeu: 0 }
];

export const LINE_COLORS = ['#3f83f8', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#f43f5e'];
