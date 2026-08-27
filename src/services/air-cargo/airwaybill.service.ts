import { db } from "../../db/index.js";
import { airwayBills, iataAirports } from "../../db/schema/air_cargo.js";
import { eq, or, like, desc } from "drizzle-orm";

export interface AirwayBillFilter {
  type?: "MAWB" | "HAWB" | "DIRECT" | "ALL";
  status?: string;
  airport?: string;
  search?: string;
}

export interface AirlinePrefixInfo {
  prefix: string;
  airlineName: string;
  iataDesignator: string;
}

export const AIRLINE_REGISTRY: Record<string, AirlinePrefixInfo> = {
  "075": { prefix: "075", airlineName: "Iberia Cargo", iataDesignator: "IB" },
  "020": {
    prefix: "020",
    airlineName: "Lufthansa Cargo",
    iataDesignator: "LH",
  },
  "125": {
    prefix: "125",
    airlineName: "British Airways Cargo",
    iataDesignator: "BA",
  },
  "074": { prefix: "074", airlineName: "KLM Cargo", iataDesignator: "KL" },
  "016": {
    prefix: "016",
    airlineName: "United Airlines Cargo",
    iataDesignator: "UA",
  },
  "006": { prefix: "006", airlineName: "Delta Cargo", iataDesignator: "DL" },
  "176": {
    prefix: "176",
    airlineName: "Emirates SkyCargo",
    iataDesignator: "EK",
  },
  "160": {
    prefix: "160",
    airlineName: "Cathay Pacific Cargo",
    iataDesignator: "CX",
  },
};

export class AirwayBillService {
  /**
   * Computes the deterministic IATA Modulo 7 Checksum (IATA Resolution 600a).
   * Checksum = (First 7 digits) % 7
   */
  static calculateIataChecksum(serial7Digits: number | string): number {
    const num =
      typeof serial7Digits === "string"
        ? parseInt(serial7Digits, 10)
        : serial7Digits;
    if (isNaN(num) || num < 0) {
      throw new Error("Invalid serial number for IATA checksum");
    }
    return num % 7;
  }

  /**
   * Validates a MAWB number format and its Modulo 7 checksum.
   * Standard format: PPP-NNNNNNNC (where PPP = 3-digit prefix, NNNNNNN = 7-digit serial, C = 1-digit checksum)
   */
  static validateMawbNumber(mawbNumber: string): {
    isValid: boolean;
    prefix?: string;
    serial?: string;
    checksum?: number;
    expectedChecksum?: number;
    airlineName?: string;
    error?: string;
  } {
    if (!mawbNumber) {
      return { isValid: false, error: "MAWB number is required" };
    }

    const clean = mawbNumber.replace(/[\s-]/g, "");
    if (clean.length !== 11) {
      return {
        isValid: false,
        error:
          "MAWB number must have 11 digits (3-digit prefix + 7-digit serial + 1-digit checksum)",
      };
    }

    const prefix = clean.substring(0, 3);
    const serialStr = clean.substring(3, 10);
    const checksumStr = clean.substring(10, 11);

    const serial = parseInt(serialStr, 10);
    const checksum = parseInt(checksumStr, 10);

    if (isNaN(serial) || isNaN(checksum)) {
      return {
        isValid: false,
        error: "MAWB serial and checksum must be numeric",
      };
    }

    const expectedChecksum = serial % 7;
    const isValid = checksum === expectedChecksum;
    const airlineInfo = AIRLINE_REGISTRY[prefix];

    return {
      isValid,
      prefix,
      serial: serialStr,
      checksum,
      expectedChecksum,
      airlineName: airlineInfo ? airlineInfo.airlineName : "Unknown Airline",
      error: isValid
        ? undefined
        : `Invalid IATA Modulo 7 checksum. Provided '${checksum}', expected '${expectedChecksum}' (${serialStr} % 7 = ${expectedChecksum})`,
    };
  }

  /**
   * Formats a prefix and 7-digit serial into a standard IATA MAWB string (PPP-NNNNNNNC).
   */
  static formatMawbNumber(
    prefix: string,
    serial7Digits: number | string,
  ): string {
    const serialStr = String(serial7Digits).padStart(7, "0");
    const checksum = this.calculateIataChecksum(serialStr);
    return `${prefix}-${serialStr}${checksum}`;
  }

  /**
   * Generates a block of consecutive valid IATA MAWB numbers from a starting serial.
   */
  static generateMawbBlock(
    prefix: string,
    startSerial: number,
    count: number,
  ): string[] {
    const results: string[] = [];
    for (let i = 0; i < count; i++) {
      results.push(this.formatMawbNumber(prefix, startSerial + i));
    }
    return results;
  }

  /**
   * Lists all Airway Bills with consolidation relationship mapping.
   */
  static async listAirwayBills(filters: AirwayBillFilter = {}) {
    const records = await db
      .select()
      .from(airwayBills)
      .orderBy(desc(airwayBills.createdAt));

    let filtered = records;

    if (filters.type && filters.type !== "ALL") {
      filtered = filtered.filter((r) => r.type === filters.type);
    }

    if (filters.status && filters.status !== "ALL") {
      filtered = filtered.filter((r) => r.status === filters.status);
    }

    if (filters.airport) {
      const ap = filters.airport.toUpperCase();
      filtered = filtered.filter(
        (r) => r.originAirport === ap || r.destinationAirport === ap,
      );
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.awbNumber.toLowerCase().includes(q) ||
          (r.airlineName && r.airlineName.toLowerCase().includes(q)) ||
          (r.natureOfGoods && r.natureOfGoods.toLowerCase().includes(q)) ||
          (r.flightNumber && r.flightNumber.toLowerCase().includes(q)),
      );
    }

    // Map parent-child consolidation
    const mawbs = filtered.filter(
      (r) => r.type === "MAWB" || r.type === "DIRECT",
    );
    const hawbs = filtered.filter((r) => r.type === "HAWB");

    return mawbs.map((mawb) => {
      const children = hawbs.filter((h) => h.parentMawbId === mawb.id);
      return {
        ...mawb,
        consolidatedHawbs: children,
        hawbCount: children.length,
      };
    });
  }

  /**
   * Retrieves single AWB with its consolidation tree.
   */
  static async getAirwayBillById(id: string) {
    const [awb] = await db
      .select()
      .from(airwayBills)
      .where(eq(airwayBills.id, id))
      .limit(1);

    if (!awb) {
      return null;
    }

    let consolidatedHawbs: any[] = [];
    if (awb.type === "MAWB") {
      consolidatedHawbs = await db
        .select()
        .from(airwayBills)
        .where(eq(airwayBills.parentMawbId, awb.id));
    }

    return {
      ...awb,
      consolidatedHawbs,
    };
  }

  /**
   * Creates a new Airway Bill with automatic validation.
   */
  static async createAirwayBill(data: {
    type?: "MAWB" | "HAWB" | "DIRECT";
    awbNumber: string;
    airlinePrefix?: string;
    airlineName?: string;
    parentMawbId?: string;
    originAirport: string;
    destinationAirport: string;
    flightNumber?: string;
    flightDate?: Date;
    shipperData: any;
    consigneeData: any;
    issuingAgentData?: any;
    pieces: number;
    grossWeightKg: number;
    volumeCbm: number;
    volumetricWeightKg: number;
    chargeableWeightKg: number;
    rateClass?: string;
    ratePerKg: number;
    freightCharge: number;
    otherCharges?: any[];
    totalPrepaid?: number;
    totalCollect?: number;
    currency?: string;
    natureOfGoods: string;
    specialHandlingCodes?: string[];
    dgrDetails?: any;
    handlingInfo?: string;
    status?: string;
  }) {
    // If MAWB or DIRECT, validate Modulo 7 checksum
    if (data.type === "MAWB" || data.type === "DIRECT") {
      const validation = this.validateMawbNumber(data.awbNumber);
      if (!validation.isValid) {
        throw new Error(validation.error || "Invalid MAWB Modulo 7 checksum");
      }
      if (!data.airlineName && validation.airlineName) {
        data.airlineName = validation.airlineName;
      }
      if (!data.airlinePrefix && validation.prefix) {
        data.airlinePrefix = validation.prefix;
      }
    }

    const id = `awb_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const newRecord = {
      id,
      type: data.type || "DIRECT",
      awbNumber: data.awbNumber,
      airlinePrefix: data.airlinePrefix || null,
      airlineName: data.airlineName || null,
      parentMawbId: data.parentMawbId || null,
      originAirport: data.originAirport.toUpperCase(),
      destinationAirport: data.destinationAirport.toUpperCase(),
      flightNumber: data.flightNumber || null,
      flightDate: data.flightDate || null,
      shipperData: data.shipperData,
      consigneeData: data.consigneeData,
      issuingAgentData: data.issuingAgentData || {
        name: "ATLAS AIR CARGO SOLUTIONS",
        city: data.originAirport.toUpperCase(),
        iataCode: "78-4-0000/0001",
      },
      pieces: data.pieces,
      grossWeightKg: data.grossWeightKg,
      volumeCbm: data.volumeCbm,
      volumetricWeightKg: data.volumetricWeightKg,
      chargeableWeightKg: data.chargeableWeightKg,
      rateClass: data.rateClass || "N",
      ratePerKg: data.ratePerKg,
      freightCharge: data.freightCharge,
      otherCharges: data.otherCharges || [],
      totalPrepaid: data.totalPrepaid || 0,
      totalCollect: data.totalCollect || 0,
      currency: data.currency || "EUR",
      natureOfGoods: data.natureOfGoods,
      specialHandlingCodes: data.specialHandlingCodes || [],
      dgrDetails: data.dgrDetails || null,
      handlingInfo: data.handlingInfo || null,
      status: data.status || "BOOKED",
      eAwbCertified: true,
      awbData: {
        accountingInfo: "FREIGHT PREPAID / CASS SETTLEMENT",
        routing: `${data.originAirport} ${data.destinationAirport}`,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(airwayBills).values(newRecord);
    return newRecord;
  }
}
