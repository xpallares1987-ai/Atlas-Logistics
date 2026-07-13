// @ts-nocheck
export interface RateSurcharge {
  name: string;
  amount: number;
}

export interface FreightRateMock {
  id: string;
  carrier: string;
  pol: string;
  pod: string;
  transitTimeDays: number;
  validUntil: string;
  baseRate: number;
  currency: string;
  surcharges: RateSurcharge[];
  total: number;
  isDirect: boolean;
}

export const MOCK_RATES: FreightRateMock[] = [
  {
    id: "RATE-001",
    carrier: "Maersk",
    pol: "CNSHA (Shanghai)",
    pod: "NLRTM (Rotterdam)",
    transitTimeDays: 28,
    validUntil: "2026-07-31",
    baseRate: 1500,
    currency: "USD",
    surcharges: [
      { name: "BAF", amount: 250 },
      { name: "PSS", amount: 100 },
      { name: "THC Origin", amount: 120 },
      { name: "THC Dest", amount: 150 },
    ],
    total: 2120,
    isDirect: true,
  },
  {
    id: "RATE-002",
    carrier: "MSC",
    pol: "CNSHA (Shanghai)",
    pod: "NLRTM (Rotterdam)",
    transitTimeDays: 32,
    validUntil: "2026-07-15",
    baseRate: 1200,
    currency: "USD",
    surcharges: [
      { name: "BAF", amount: 280 },
      { name: "PSS", amount: 50 },
      { name: "THC Origin", amount: 110 },
      { name: "THC Dest", amount: 140 },
    ],
    total: 1780,
    isDirect: false,
  },
  {
    id: "RATE-003",
    carrier: "Hapag-Lloyd",
    pol: "CNYTN (Yantian)",
    pod: "DEHAM (Hamburg)",
    transitTimeDays: 26,
    validUntil: "2026-08-01",
    baseRate: 1800,
    currency: "USD",
    surcharges: [
      { name: "BAF", amount: 200 },
      { name: "PSS", amount: 150 },
      { name: "THC Origin", amount: 130 },
      { name: "THC Dest", amount: 160 },
      { name: "LSS", amount: 40 },
    ],
    total: 2480,
    isDirect: true,
  },
  {
    id: "RATE-004",
    carrier: "CMA CGM",
    pol: "ESBCN (Barcelona)",
    pod: "USNYC (New York)",
    transitTimeDays: 14,
    validUntil: "2026-07-20",
    baseRate: 2200,
    currency: "EUR",
    surcharges: [
      { name: "BAF", amount: 350 },
      { name: "THC Origin", amount: 180 },
      { name: "THC Dest", amount: 200 },
    ],
    total: 2930,
    isDirect: true,
  },
];

