/**
 * Dangerous Goods Transport Document Formatter & Validator Service
 * Formats regulatory transport descriptions under IMDG Cap 5.4, IATA DGR Sec 8, and ADR Cap 5.4.
 */

export interface DgItemDocumentInput {
  unNumber: string;
  properShippingName: string;
  technicalChemicalName?: string;
  primaryHazardClass: string;
  subsidiaryHazardClasses?: string;
  packingGroup: "PG_I" | "PG_II" | "PG_III" | "NONE";
  flashPointCelsius?: number;
  isMarinePollutant: boolean;
  packageCount: number;
  packageTypeDescription: string;
  totalNetQuantity: number;
  unitOfMeasure: "LITERS" | "KILOGRAMS" | "GRAMS" | "MILLILITERS";
  totalGrossMassKg: number;
  isLimitedQuantityLq?: boolean;
}

export class DgTransportDocumentService {
  /**
   * Builds the official legal UN Dangerous Goods Description String.
   * Format: UN Number, Proper Shipping Name (Technical Name), Class (Subrisks), Packing Group, (Flashpoint), MARINE POLLUTANT, LQ
   */
  public static formatUnDescription(item: DgItemDocumentInput): string {
    const parts: string[] = [];

    // 1. UN Number
    const un = item.unNumber.trim().toUpperCase().startsWith("UN")
      ? item.unNumber.trim().toUpperCase()
      : `UN ${item.unNumber.trim()}`;
    parts.push(un);

    // 2. Proper Shipping Name + Technical Name
    let psn = item.properShippingName.trim().toUpperCase();
    if (psn.includes("N.O.S.") || psn.includes("N.E.P.")) {
      if (item.technicalChemicalName) {
        psn += ` (${item.technicalChemicalName.trim().toUpperCase()})`;
      }
    }
    parts.push(psn);

    // 3. Class & Subrisk
    let classStr = item.primaryHazardClass.trim();
    if (item.subsidiaryHazardClasses) {
      classStr += ` (${item.subsidiaryHazardClasses.trim()})`;
    }
    parts.push(classStr);

    // 4. Packing Group
    if (item.packingGroup && item.packingGroup !== "NONE") {
      parts.push(item.packingGroup.replace("_", " "));
    }

    // 5. Flashpoint (mandatory for maritime if <= 60 °C)
    if (item.flashPointCelsius !== undefined && item.flashPointCelsius <= 60) {
      parts.push(`(${item.flashPointCelsius} °C c.c.)`);
    }

    // 6. Marine Pollutant
    if (item.isMarinePollutant) {
      parts.push("MARINE POLLUTANT");
    }

    // 7. Limited Quantity
    if (item.isLimitedQuantityLq) {
      parts.push("LIMITED QUANTITY");
    }

    return parts.join(", ");
  }

  /**
   * Compiles shipment totals and generates the certified shipper's declaration statement.
   */
  public static compileShipmentSummary(items: DgItemDocumentInput[]): {
    totalPackages: number;
    totalGrossMassKg: number;
    totalNetQuantityKgOrL: number;
    formattedDescriptions: string[];
    certificationStatement: string;
  } {
    let packages = 0;
    let grossMass = 0;
    let netQty = 0;
    const formatted: string[] = [];

    for (const item of items) {
      packages += item.packageCount;
      grossMass += item.totalGrossMassKg;
      netQty += item.totalNetQuantity;
      formatted.push(this.formatUnDescription(item));
    }

    const certStatement =
      "I hereby declare that the contents of this consignment are fully and accurately described above by the proper shipping name, " +
      "and are classified, packaged, marked and labelled/placarded, and are in all respects in proper condition for transport " +
      "according to the applicable international and national governmental regulations (IMO IMDG Code, IATA DGR, UNECE ADR).";

    return {
      totalPackages: packages,
      totalGrossMassKg: Math.round(grossMass * 100) / 100,
      totalNetQuantityKgOrL: Math.round(netQty * 100) / 100,
      formattedDescriptions: formatted,
      certificationStatement: certStatement,
    };
  }
}
