export type CurrencyType = 'USD' | 'EUR' | 'GBP' | 'CNY';

export interface ContractRate {
  id: string;
  carrier: string;
  mode: 'FCL' | 'LCL' | 'AIR' | 'ROAD';
  pol: string;
  pod: string;
  equipment: string; // "40HC", "20GP", "Per CBM", "Per KG CHW"
  baseRate: number;
  bafSurcharge: number; // fuel/etc
  currency: CurrencyType;
  validFrom: string;
  validTo: string;
  transitTimeDays: number;
  allocationsTeu: number;
}
