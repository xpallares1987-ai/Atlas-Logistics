/**
 * @file index.ts
 * @description Types and domain contracts for IATA e-Freight, Air Cargo, e-AWB, and DGR/TCR handling.
 * @module @atlas/frontend/components/AirCargo/types
 */

export type AwbFilterType = "ALL" | "MAWB" | "HAWB" | "DIRECT";

export interface AirwayBillPiece {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  quantity: number;
}

export interface AirwayBillRecord {
  id: string;
  awbNumber: string;
  type: "MAWB" | "HAWB" | "DIRECT";
  airlineName?: string;
  flightNumber?: string;
  originAirport: string;
  destinationAirport: string;
  pieces?: number;
  grossWeightKg?: number;
  chargeableWeightKg: number;
  volumeCbm?: number;
  rateClass?: string;
  ratePerKg?: number;
  freightCharge?: number;
  totalPrepaid?: number;
  currency?: string;
  handlingInfo?: string;
  specialHandlingCodes?: string[];
  natureOfGoods?: string;
  shipperData?: {
    name: string;
    address: string;
    country: string;
    contact: string;
  };
  consigneeData?: {
    name: string;
    address: string;
    country: string;
    contact: string;
  };
  issuingAgentData?: {
    name: string;
    iataCode: string;
    cassAddress: string;
  };
  otherCharges?: Array<{
    code: string;
    name?: string;
    amount: number;
  }>;
  consolidatedHawbs?: AirwayBillRecord[];
}
