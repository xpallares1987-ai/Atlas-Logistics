export interface CargoPieceInput {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  quantity: number;
  grossWeightKg?: number;
}

export interface AirRatingInput {
  originAirport: string;
  destinationAirport: string;
  pieces: CargoPieceInput[];
  actualGrossWeightKg: number;
  customRatePerKg?: number;
  currency?: string;
  fuelRatePerKg?: number;
  securityRatePerKg?: number;
  awbDocFee?: number;
  terminalHandlingRatePerKg?: number;
  terminalHandlingMin?: number;
}

export interface ItemizedCharge {
  code: string;
  name: string;
  amount: number;
  basis: string;
}

export interface AirRatingResult {
  totalPieces: number;
  actualGrossWeightKg: number;
  totalVolumeCbm: number;
  volumetricWeightKg: number;
  volumetricRatio: string; // "1:6000 (167 kg/m³)"
  isVolumetricHigher: boolean;
  chargeableWeightKg: number;
  rateClass: "M" | "N" | "Q45" | "Q100" | "Q300" | "Q500" | "Q1000";
  appliedRatePerKg: number;
  freightCharge: number;
  otherCharges: ItemizedCharge[];
  totalOtherCharges: number;
  totalFreightPayable: number;
  currency: string;
}

export class AirCargoRatingService {
  public static readonly IATA_VOLUMETRIC_DIVISOR = 6000; // cm³/kg
  public static readonly IATA_CBM_RATIO = 166.667; // kg/m³

  /**
   * Computes volume in cubic meters and IATA volumetric weight for a collection of packages.
   */
  static computeDimensions(pieces: CargoPieceInput[]): {
    totalPieces: number;
    volumeCbm: number;
    volumetricWeightKg: number;
  } {
    let totalPieces = 0;
    let totalVolumeCbm = 0;
    let totalVolWeightKg = 0;

    for (const p of pieces) {
      const qty = Math.max(1, p.quantity || 1);
      const l = Math.max(0, p.lengthCm || 0);
      const w = Math.max(0, p.widthCm || 0);
      const h = Math.max(0, p.heightCm || 0);

      const pieceCbm = (l * w * h) / 1_000_000;
      const pieceVolKg = (l * w * h) / this.IATA_VOLUMETRIC_DIVISOR;

      totalPieces += qty;
      totalVolumeCbm += pieceCbm * qty;
      totalVolWeightKg += pieceVolKg * qty;
    }

    return {
      totalPieces,
      volumeCbm: Number(totalVolumeCbm.toFixed(4)),
      volumetricWeightKg: Number(totalVolWeightKg.toFixed(2)),
    };
  }

  /**
   * Rounds chargeable weight up to the nearest standard IATA half-kilogram (0.5 kg).
   * Example: 12.1 kg -> 12.5 kg, 12.6 kg -> 13.0 kg.
   */
  static roundIataWeight(weightKg: number): number {
    return Math.ceil(weightKg * 2) / 2;
  }

  /**
   * Evaluates standard IATA rate tier and base rate per kg based on chargeable weight.
   */
  static evaluateRateTier(
    chargeableWeightKg: number,
    customRate?: number,
  ): {
    rateClass: "M" | "N" | "Q45" | "Q100" | "Q300" | "Q500" | "Q1000";
    ratePerKg: number;
    minCharge: number;
  } {
    const minCharge = 75.0; // Standard airline minimum charge (M)

    if (customRate && customRate > 0) {
      const rateClass =
        chargeableWeightKg >= 1000
          ? "Q1000"
          : chargeableWeightKg >= 500
            ? "Q500"
            : chargeableWeightKg >= 300
              ? "Q300"
              : chargeableWeightKg >= 100
                ? "Q100"
                : chargeableWeightKg >= 45
                  ? "Q45"
                  : "N";
      return { rateClass, ratePerKg: customRate, minCharge };
    }

    // Default standard IATA benchmark market rate breaks (Transatlantic / Transpacific baseline)
    if (chargeableWeightKg < 45) {
      return { rateClass: "N", ratePerKg: 6.5, minCharge };
    } else if (chargeableWeightKg < 100) {
      return { rateClass: "Q45", ratePerKg: 5.2, minCharge };
    } else if (chargeableWeightKg < 300) {
      return { rateClass: "Q100", ratePerKg: 4.4, minCharge };
    } else if (chargeableWeightKg < 500) {
      return { rateClass: "Q300", ratePerKg: 3.8, minCharge };
    } else if (chargeableWeightKg < 1000) {
      return { rateClass: "Q500", ratePerKg: 3.3, minCharge };
    } else {
      return { rateClass: "Q1000", ratePerKg: 2.9, minCharge };
    }
  }

  /**
   * Executes the full deterministic IATA air cargo rating computation.
   */
  static calculateRating(input: AirRatingInput): AirRatingResult {
    const dimResult = this.computeDimensions(input.pieces);
    const actualGross = Math.max(0, input.actualGrossWeightKg || 0);
    const volWeight = dimResult.volumetricWeightKg;

    // Chargeable weight is the greater of actual gross weight and volumetric weight
    const rawChargeable = Math.max(actualGross, volWeight);
    const chargeableWeightKg = this.roundIataWeight(rawChargeable);
    const isVolumetricHigher = volWeight > actualGross;

    // Rate tier
    const tier = this.evaluateRateTier(
      chargeableWeightKg,
      input.customRatePerKg,
    );
    let freightCharge = Number(
      (chargeableWeightKg * tier.ratePerKg).toFixed(2),
    );
    let appliedRateClass = tier.rateClass;

    // If freight charge is below airline minimum, apply 'M'
    if (freightCharge < tier.minCharge && !input.customRatePerKg) {
      freightCharge = tier.minCharge;
      appliedRateClass = "M";
    }

    // Itemized Surcharges
    const fuelRate =
      input.fuelRatePerKg !== undefined ? input.fuelRatePerKg : 0.95; // MYC default 0.95 €/kg
    const secRate =
      input.securityRatePerKg !== undefined ? input.securityRatePerKg : 0.15; // SCC default 0.15 €/kg
    const awbFee = input.awbDocFee !== undefined ? input.awbDocFee : 25.0; // AWC fixed 25.00 €
    const terminalRate =
      input.terminalHandlingRatePerKg !== undefined
        ? input.terminalHandlingRatePerKg
        : 0.15;
    const terminalMin =
      input.terminalHandlingMin !== undefined
        ? input.terminalHandlingMin
        : 35.0;

    const mycAmount = Number((chargeableWeightKg * fuelRate).toFixed(2));
    const sccAmount = Number((chargeableWeightKg * secRate).toFixed(2));
    const cgcAmount = Number(
      Math.max(terminalMin, chargeableWeightKg * terminalRate).toFixed(2),
    );

    const otherCharges: ItemizedCharge[] = [
      {
        code: "MYC",
        name: "Fuel Surcharge",
        amount: mycAmount,
        basis: `${chargeableWeightKg} kg @ ${fuelRate.toFixed(2)} /kg`,
      },
      {
        code: "SCC",
        name: "Security Surcharge",
        amount: sccAmount,
        basis: `${chargeableWeightKg} kg @ ${secRate.toFixed(2)} /kg`,
      },
      {
        code: "AWC",
        name: "Air Waybill Documentation Fee",
        amount: awbFee,
        basis: "Fixed Per AWB",
      },
      {
        code: "CGC",
        name: "Terminal Handling / Cargo Ground Charge",
        amount: cgcAmount,
        basis: `${chargeableWeightKg} kg @ ${terminalRate.toFixed(2)} /kg (min ${terminalMin.toFixed(2)})`,
      },
    ];

    const totalOtherCharges = Number(
      otherCharges.reduce((acc, c) => acc + c.amount, 0).toFixed(2),
    );
    const totalFreightPayable = Number(
      (freightCharge + totalOtherCharges).toFixed(2),
    );

    return {
      totalPieces: dimResult.totalPieces || 1,
      actualGrossWeightKg: actualGross,
      totalVolumeCbm: dimResult.volumeCbm,
      volumetricWeightKg: volWeight,
      volumetricRatio: "1:6000 (167 kg/m³)",
      isVolumetricHigher,
      chargeableWeightKg,
      rateClass: appliedRateClass,
      appliedRatePerKg: tier.ratePerKg,
      freightCharge,
      otherCharges,
      totalOtherCharges,
      totalFreightPayable,
      currency: input.currency || "EUR",
    };
  }
}
