import { db } from "../../db/index.js";
import { dgrRegistry } from "../../db/schema/air_cargo.js";
import { eq } from "drizzle-orm";

export interface AirComplianceInput {
  natureOfGoods: string;
  unNumber?: string;
  grossWeightKg?: number;
  declaredValuePerKg?: number;
  isTempControlled?: boolean;
  tempRange?: string; // e.g. "+2C to +8C", "+15C to +25C", "-20C"
  isLithiumBattery?: boolean;
  batteryType?: "ION" | "METAL";
  batteryConfig?:
    "STANDALONE" | "PACKED_WITH_EQUIPMENT" | "CONTAINED_IN_EQUIPMENT";
  batterySection?: "IA" | "IB" | "II";
  hasDryIce?: boolean;
  dryIceNetWeightKg?: number;
}

export interface AirComplianceRuleEvaluation {
  ruleCode: string;
  name: string;
  status: "PASSED" | "FLAGGED" | "RESTRICTED";
  severity: "INFO" | "WARNING" | "CRITICAL";
  details: string;
}

export interface AirComplianceResult {
  isDgr: boolean;
  dgrClass: string | null;
  properShippingName: string | null;
  packingGroup: string | null;
  packingInstruction: string | null;
  aircraftRestriction:
    "PASSENGER_AND_CARGO" | "CARGO_AIRCRAFT_ONLY" | "FORBIDDEN";
  specialHandlingCodes: string[];
  requiredDocuments: string[];
  handlingInstructions: string;
  ruleEvaluations: AirComplianceRuleEvaluation[];
}

export class AirCargoComplianceService {
  /**
   * Deterministically screens an air cargo shipment for IATA Dangerous Goods,
   * Special Handling Codes (SHC), Lithium Batteries, Cold Chain, and Aircraft Restrictions.
   */
  static async screenCompliance(
    input: AirComplianceInput,
  ): Promise<AirComplianceResult> {
    const specialHandlingCodes = new Set<string>();
    const requiredDocuments = new Set<string>([
      "Neutral Air Waybill (IATA AWB)",
    ]);
    const ruleEvaluations: AirComplianceRuleEvaluation[] = [];

    let isDgr = false;
    let dgrClass: string | null = null;
    let properShippingName: string | null = null;
    let packingGroup: string | null = null;
    let packingInstruction: string | null = null;
    let aircraftRestriction:
      "PASSENGER_AND_CARGO" | "CARGO_AIRCRAFT_ONLY" | "FORBIDDEN" =
      "PASSENGER_AND_CARGO";

    const text =
      `${input.natureOfGoods || ""} ${input.unNumber || ""}`.toUpperCase();

    // 1. UN Number Registry Lookup
    let matchedUn = input.unNumber?.toUpperCase();
    if (!matchedUn) {
      const unMatch = text.match(/UN\s*(\d{4})/);
      if (unMatch) {
        matchedUn = `UN${unMatch[1]}`;
      }
    }

    if (matchedUn) {
      const [registryEntry] = await db
        .select()
        .from(dgrRegistry)
        .where(eq(dgrRegistry.unNumber, matchedUn))
        .limit(1);

      if (registryEntry) {
        isDgr = true;
        dgrClass = registryEntry.dgrClass;
        properShippingName = registryEntry.properShippingName;
        packingGroup = registryEntry.packingGroup || null;
        specialHandlingCodes.add(registryEntry.defaultShc);

        if (registryEntry.passengerLimitKg === "FORBIDDEN") {
          aircraftRestriction = "CARGO_AIRCRAFT_ONLY";
          specialHandlingCodes.add("CAO");
          packingInstruction = registryEntry.packingInstructionCao;
          ruleEvaluations.push({
            ruleCode: "IATA-DGR-CAO",
            name: "Restricción de Aeronave de Carga Exclusiva (CAO)",
            status: "RESTRICTED",
            severity: "CRITICAL",
            details: `${matchedUn} está prohibido en aviones de pasajeros según IATA DGR. Asignado código CAO (Cargo Aircraft Only).`,
          });
        } else {
          packingInstruction = registryEntry.packingInstructionPax;
        }

        requiredDocuments.add(
          "DGD (Shipper's Declaration for Dangerous Goods)",
        );
        ruleEvaluations.push({
          ruleCode: "IATA-DGR-UN-MATCH",
          name: "Mercancía Peligrosa Registrada (UN DGR)",
          status: "FLAGGED",
          severity: "WARNING",
          details: `Identificado número ${matchedUn}: ${properShippingName} (${dgrClass}, Grupo de Embalaje ${packingGroup || "N/A"}). Requiere DGD oficial y embalaje homologado ONU.`,
        });
      }
    }

    // 2. Lithium Battery Strategic Screening (IATA DGR Section II / PI965-PI970)
    const isLithium =
      input.isLithiumBattery ||
      text.includes("LITHIUM") ||
      text.includes("BATERIA") ||
      text.includes("BATTERY") ||
      matchedUn === "UN3480" ||
      matchedUn === "UN3481" ||
      matchedUn === "UN3090" ||
      matchedUn === "UN3091";

    if (isLithium) {
      const isMetal =
        input.batteryType === "METAL" ||
        text.includes("METAL") ||
        matchedUn === "UN3090" ||
        matchedUn === "UN3091";

      const isStandalone =
        input.batteryConfig === "STANDALONE" ||
        matchedUn === "UN3480" ||
        matchedUn === "UN3090" ||
        (input.batteryConfig !== "CONTAINED_IN_EQUIPMENT" &&
          input.batteryConfig !== "PACKED_WITH_EQUIPMENT" &&
          matchedUn !== "UN3481" &&
          matchedUn !== "UN3091" &&
          !text.includes("CONTAIN") &&
          !text.includes("EQUIPMENT") &&
          !text.includes("EQUIPO"));

      if (isMetal) {
        specialHandlingCodes.add("ELM");
        if (isStandalone) {
          aircraftRestriction = "CARGO_AIRCRAFT_ONLY";
          specialHandlingCodes.add("CAO");
          packingInstruction = "PI968";
          isDgr = true;
          dgrClass = "Class 9";
          requiredDocuments.add(
            "DGD (Shipper's Declaration for Dangerous Goods)",
          );
          requiredDocuments.add("Lithium Battery Mark & CAO Label");
          ruleEvaluations.push({
            ruleCode: "IATA-DGR-LITHIUM-METAL",
            name: "Baterías de Metal Litio Autónomas (UN 3090)",
            status: "RESTRICTED",
            severity: "CRITICAL",
            details:
              "Las baterías de metal litio autónomas (UN 3090) están terminantemente prohibidas en aviones de pasaje. Instrucción de embalaje PI968.",
          });
        } else {
          aircraftRestriction = "PASSENGER_AND_CARGO";
          packingInstruction = "PI970";
          requiredDocuments.add("Lithium Battery Handling Mark");
          ruleEvaluations.push({
            ruleCode: "IATA-DGR-LITHIUM-METAL-EQ",
            name: "Baterías de Metal Litio en Equipo (UN 3091)",
            status: "FLAGGED",
            severity: "INFO",
            details:
              "UN 3091 embalado o contenido en equipos. Sujeto a Sección II PI970 con etiqueta de manipulación de baterías de litio.",
          });
        }
      } else {
        // Lithium Ion (UN 3480 / UN 3481)
        specialHandlingCodes.add("ELI");
        if (isStandalone) {
          aircraftRestriction = "CARGO_AIRCRAFT_ONLY";
          specialHandlingCodes.add("CAO");
          packingInstruction = "PI965";
          isDgr = true;
          dgrClass = "Class 9";
          requiredDocuments.add(
            "DGD (Shipper's Declaration for Dangerous Goods)",
          );
          requiredDocuments.add("Lithium Battery Mark & CAO Label");
          ruleEvaluations.push({
            ruleCode: "IATA-DGR-LITHIUM-ION",
            name: "Baterías de Ion-Litio Autónomas (UN 3480)",
            status: "RESTRICTED",
            severity: "CRITICAL",
            details:
              "Las celdas y baterías de ion litio sueltas (UN 3480) deben transportarse exclusivamente en aeronaves de carga (CAO) al 30% máx de SoC.",
          });
        } else {
          aircraftRestriction = "PASSENGER_AND_CARGO";
          packingInstruction = "PI967";
          isDgr = false;
          requiredDocuments.add("Lithium Battery Handling Mark");
          ruleEvaluations.push({
            ruleCode: "IATA-DGR-LITHIUM-ION-EQ",
            name: "Baterías de Ion-Litio en Equipo (UN 3481)",
            status: "PASSED",
            severity: "INFO",
            details:
              "UN 3481 contenido en equipos. Cumple Sección II PI967. Apto para aviones de pasajeros y carga sin necesidad de DGD.",
          });
        }
      }
    }

    // 3. Dry Ice (UN 1845) Handling
    const hasDryIce =
      input.hasDryIce ||
      text.includes("DRY ICE") ||
      text.includes("HIELO SECO") ||
      matchedUn === "UN1845";
    if (hasDryIce) {
      specialHandlingCodes.add("ICE");
      isDgr = true;
      if (!dgrClass) dgrClass = "Class 9";
      if (!packingInstruction) packingInstruction = "PI954";
      requiredDocuments.add("Dry Ice Declaration / AWB Net Weight Endorsement");

      const netWeight = input.dryIceNetWeightKg || 5;
      ruleEvaluations.push({
        ruleCode: "IATA-DGR-DRY-ICE",
        name: "Hielo Seco / Dióxido de Carbono Sólido (UN 1845)",
        status: "FLAGGED",
        severity: "WARNING",
        details: `Cargamento refrigerado con Hielo Seco (UN 1845). Requiere mención en la casilla Handling Information de la AWB (Net Qty: ${netWeight} kg) y ventilación controlada en bodega.`,
      });
    }

    // 4. Cold Chain & Temperature Controlled Goods
    const isPerishable =
      input.isTempControlled ||
      text.includes("VACCINE") ||
      text.includes("VACUNA") ||
      text.includes("PHARMA") ||
      text.includes("PLASMA") ||
      text.includes("BIOTECH") ||
      text.includes("INSULIN") ||
      text.includes("PERISHABLE") ||
      text.includes("PERECEDERO") ||
      text.includes("FROZEN");

    if (isPerishable) {
      specialHandlingCodes.add("PER");
      const tempRange =
        input.tempRange || (text.includes("FROZEN") ? "-20C" : "+2C to +8C");

      if (tempRange.includes("-20") || text.includes("FROZEN")) {
        specialHandlingCodes.add("FRO");
      } else if (tempRange.includes("15") || tempRange.includes("25")) {
        specialHandlingCodes.add("CRT"); // Controlled Room Temp
      } else {
        specialHandlingCodes.add("COL"); // Cool storage +2 to +8
      }

      requiredDocuments.add("Temperature Data Logger Certificate");
      requiredDocuments.add("Time & Temperature Sensitive Label");
      ruleEvaluations.push({
        ruleCode: "IATA-COLD-CHAIN",
        name: "Cadena de Frío y Mercancía Perecedera (IATA TCR)",
        status: "FLAGGED",
        severity: "INFO",
        details: `Carga termosensible IATA TCR. Rango prescrito: ${tempRange}. Asignados códigos especiales ${Array.from(specialHandlingCodes).join(", ")}.`,
      });
    }

    // 5. Valuable Cargo (VAL) Security Protocol
    const declaredVal = input.declaredValuePerKg || 0;
    if (
      declaredVal > 1000 ||
      text.includes("GOLD") ||
      text.includes("DIAMOND") ||
      text.includes("WATCHES") ||
      text.includes("VALUABLE")
    ) {
      specialHandlingCodes.add("VAL");
      requiredDocuments.add("High-Value Armed Escort Handover Manifest");
      ruleEvaluations.push({
        ruleCode: "IATA-SECURITY-VAL",
        name: "Carga de Alto Valor (Valuable Cargo VAL)",
        status: "FLAGGED",
        severity: "WARNING",
        details: `Valor declarado superior a 1.000 $/kg (${declaredVal.toFixed(2)} $/kg). Asignado código VAL. Requiere custodia bajo caja fuerte en terminal y escolta hasta aeronave.`,
      });
    }

    // Default general cargo evaluation if no rules flagged
    if (ruleEvaluations.length === 0) {
      specialHandlingCodes.add("GEN");
      ruleEvaluations.push({
        ruleCode: "IATA-GENERAL-CARGO",
        name: "Carga General Estándar (GEN)",
        status: "PASSED",
        severity: "INFO",
        details:
          "No se detectaron sustancias peligrosas, baterías autónomas ni requisitos de temperatura controlada. Apto para transporte aéreo comercial regular.",
      });
    }

    // Generate consolidated handling instruction string
    const shcList = Array.from(specialHandlingCodes);
    const handlingParts: string[] = [];

    if (shcList.includes("CAO")) handlingParts.push("CARGO AIRCRAFT ONLY.");
    if (shcList.includes("COL"))
      handlingParts.push("KEEP REFRIGERATED +2C TO +8C. DO NOT FREEZE.");
    if (shcList.includes("FRO")) handlingParts.push("KEEP FROZEN -20C.");
    if (shcList.includes("ICE"))
      handlingParts.push(
        `CONTAINS DRY ICE UN 1845 (${input.dryIceNetWeightKg || 5} KG).`,
      );
    if (shcList.includes("ELI"))
      handlingParts.push("LITHIUM ION BATTERIES IN COMPLIANCE WITH IATA DGR.");
    if (shcList.includes("ELM"))
      handlingParts.push(
        "LITHIUM METAL BATTERIES IN COMPLIANCE WITH IATA DGR.",
      );
    if (shcList.includes("VAL"))
      handlingParts.push(
        "VALUABLE CARGO - VAULT STORAGE & ARMED ESCORT REQUIRED.",
      );

    const handlingInstructions =
      handlingParts.join(" ") || "GENERAL CARGO - HANDLE WITH CARE.";

    return {
      isDgr,
      dgrClass,
      properShippingName,
      packingGroup,
      packingInstruction,
      aircraftRestriction,
      specialHandlingCodes: shcList,
      requiredDocuments: Array.from(requiredDocuments),
      handlingInstructions,
      ruleEvaluations,
    };
  }
}
