/**
 * Dangerous Goods Master Catalog & IMDG 7.2.4 Segregation Engine
 * Deterministic resolution of UN substances, hazard classes, and pair-wise chemical segregation rules.
 */

export interface UnSubstanceDefinition {
  unNumber: string;
  properShippingName: string;
  technicalNameDefault?: string;
  primaryClass: string;
  subsidiaryClasses?: string[];
  packingGroup: "PG_I" | "PG_II" | "PG_III" | "NONE";
  flashPointCelsius?: number;
  isMarinePollutant: boolean;
  lqInnerLimitKgOrL: number; // Max allowed per inner receptacle for LQ
  eqCode: "E0" | "E1" | "E2" | "E3" | "E4" | "E5";
  adrTransportCategory: number; // 0, 1, 2, 3, 4
  adrTunnelCode: string; // 'B', 'B/D', 'C/E', 'D/E', 'E'
  kemlerNumber: string; // '33', '80', 'X88'
  emsFire: string; // 'F-E', 'F-A'
  emsSpillage: string; // 'S-E', 'S-B'
  iataPassengerMaxNet?: number; // kg or L
  iataCargoMaxNet?: number; // kg or L
  iataPackingInstructionPassenger?: string;
  iataPackingInstructionCargo?: string;
}

export const UN_MASTER_CATALOG: Record<string, UnSubstanceDefinition> = {
  "UN 1203": {
    unNumber: "UN 1203",
    properShippingName: "GASOLINE",
    technicalNameDefault: "Motor Spirit / Gasolina Auto",
    primaryClass: "3",
    packingGroup: "PG_II",
    flashPointCelsius: -45,
    isMarinePollutant: true,
    lqInnerLimitKgOrL: 1.0,
    eqCode: "E2",
    adrTransportCategory: 2,
    adrTunnelCode: "D/E",
    kemlerNumber: "33",
    emsFire: "F-E",
    emsSpillage: "S-E",
    iataPassengerMaxNet: 5,
    iataCargoMaxNet: 60,
    iataPackingInstructionPassenger: "353",
    iataPackingInstructionCargo: "364",
  },
  "UN 1789": {
    unNumber: "UN 1789",
    properShippingName: "HYDROCHLORIC ACID",
    technicalNameDefault: "Ácido Clorhídrico 37% en solución acuosa",
    primaryClass: "8",
    packingGroup: "PG_II",
    flashPointCelsius: undefined,
    isMarinePollutant: false,
    lqInnerLimitKgOrL: 1.0,
    eqCode: "E2",
    adrTransportCategory: 2,
    adrTunnelCode: "E",
    kemlerNumber: "80",
    emsFire: "F-A",
    emsSpillage: "S-B",
    iataPassengerMaxNet: 1,
    iataCargoMaxNet: 30,
    iataPackingInstructionPassenger: "851",
    iataPackingInstructionCargo: "855",
  },
  "UN 1993": {
    unNumber: "UN 1993",
    properShippingName: "FLAMMABLE LIQUID, N.O.S.",
    technicalNameDefault: "Solución de Etanol e Isopropanol",
    primaryClass: "3",
    packingGroup: "PG_III",
    flashPointCelsius: 24,
    isMarinePollutant: false,
    lqInnerLimitKgOrL: 5.0,
    eqCode: "E1",
    adrTransportCategory: 3,
    adrTunnelCode: "D/E",
    kemlerNumber: "30",
    emsFire: "F-E",
    emsSpillage: "S-E",
    iataPassengerMaxNet: 60,
    iataCargoMaxNet: 220,
    iataPackingInstructionPassenger: "355",
    iataPackingInstructionCargo: "366",
  },
  "UN 3480": {
    unNumber: "UN 3480",
    properShippingName: "LITHIUM ION BATTERIES",
    technicalNameDefault: "Baterías recargables de Ión-Litio para automoción",
    primaryClass: "9",
    packingGroup: "NONE",
    flashPointCelsius: undefined,
    isMarinePollutant: false,
    lqInnerLimitKgOrL: 0,
    eqCode: "E0",
    adrTransportCategory: 2,
    adrTunnelCode: "E",
    kemlerNumber: "90",
    emsFire: "F-A",
    emsSpillage: "S-I",
    iataPassengerMaxNet: 0, // Forbidden on Passenger Aircraft
    iataCargoMaxNet: 35,
    iataPackingInstructionCargo: "965",
  },
  "UN 1072": {
    unNumber: "UN 1072",
    properShippingName: "OXYGEN, COMPRESSED",
    technicalNameDefault: "Oxígeno Medicinal Comprimido",
    primaryClass: "2.2",
    subsidiaryClasses: ["5.1"],
    packingGroup: "NONE",
    flashPointCelsius: undefined,
    isMarinePollutant: false,
    lqInnerLimitKgOrL: 0.12,
    eqCode: "E0",
    adrTransportCategory: 3,
    adrTunnelCode: "E",
    kemlerNumber: "25",
    emsFire: "F-C",
    emsSpillage: "S-W",
    iataPassengerMaxNet: 75,
    iataCargoMaxNet: 150,
    iataPackingInstructionPassenger: "200",
    iataPackingInstructionCargo: "200",
  },
  "UN 0004": {
    unNumber: "UN 0004",
    properShippingName: "AMMONIUM PICRATE",
    technicalNameDefault: "Picrato Amónico Seco",
    primaryClass: "1.1D",
    packingGroup: "NONE",
    flashPointCelsius: undefined,
    isMarinePollutant: false,
    lqInnerLimitKgOrL: 0,
    eqCode: "E0",
    adrTransportCategory: 0,
    adrTunnelCode: "B",
    kemlerNumber: "1.1D",
    emsFire: "F-B",
    emsSpillage: "S-Y",
    iataPassengerMaxNet: 0,
    iataCargoMaxNet: 0,
  },
  "UN 2794": {
    unNumber: "UN 2794",
    properShippingName: "BATTERIES, WET, FILLED WITH ACID",
    technicalNameDefault: "Acumuladores eléctricos de plomo-ácido",
    primaryClass: "8",
    packingGroup: "NONE",
    flashPointCelsius: undefined,
    isMarinePollutant: false,
    lqInnerLimitKgOrL: 1.0,
    eqCode: "E0",
    adrTransportCategory: 3,
    adrTunnelCode: "E",
    kemlerNumber: "80",
    emsFire: "F-A",
    emsSpillage: "S-B",
    iataPassengerMaxNet: 30,
    iataCargoMaxNet: 50,
    iataPackingInstructionPassenger: "870",
    iataPackingInstructionCargo: "870",
  },
  "UN 3082": {
    unNumber: "UN 3082",
    properShippingName: "ENVIRONMENTALLY HAZARDOUS SUBSTANCE, LIQUID, N.O.S.",
    technicalNameDefault: "Mezcla de biocidas industriales biodegradables",
    primaryClass: "9",
    packingGroup: "PG_III",
    flashPointCelsius: undefined,
    isMarinePollutant: true,
    lqInnerLimitKgOrL: 5.0,
    eqCode: "E1",
    adrTransportCategory: 3,
    adrTunnelCode: "-",
    kemlerNumber: "90",
    emsFire: "F-A",
    emsSpillage: "S-F",
    iataPassengerMaxNet: 450,
    iataCargoMaxNet: 450,
    iataPackingInstructionPassenger: "964",
    iataPackingInstructionCargo: "964",
  },
};

/**
 * IMO IMDG Code Table 7.2.4 Segregation Matrix
 * Segregation codes between primary/subsidiary hazard classes:
 * 0 = None, 1 = Away from (3m), 2 = Separated from (6m / bulkhead),
 * 3 = Separated by complete compartment, 4 = Separated longitudinally, X = Prohibited.
 */
export const IMDG_SEGREGATION_TABLE: Record<string, Record<string, string>> = {
  "1.1D": {
    "1.1D": "0",
    "2.1": "4",
    "2.2": "2",
    "2.3": "2",
    "3": "4",
    "4.1": "4",
    "4.2": "4",
    "4.3": "4",
    "5.1": "4",
    "5.2": "4",
    "6.1": "2",
    "6.2": "4",
    "7": "2",
    "8": "4",
    "9": "X",
  },
  "2.1": {
    "1.1D": "4",
    "2.1": "0",
    "2.2": "0",
    "2.3": "0",
    "3": "2",
    "4.1": "1",
    "4.2": "2",
    "4.3": "1",
    "5.1": "2",
    "5.2": "2",
    "6.1": "0",
    "6.2": "0",
    "7": "0",
    "8": "1",
    "9": "0",
  },
  "2.2": {
    "1.1D": "2",
    "2.1": "0",
    "2.2": "0",
    "2.3": "0",
    "3": "1",
    "4.1": "0",
    "4.2": "1",
    "4.3": "0",
    "5.1": "0",
    "5.2": "1",
    "6.1": "0",
    "6.2": "0",
    "7": "0",
    "8": "0",
    "9": "0",
  },
  "3": {
    "1.1D": "4",
    "2.1": "2",
    "2.2": "1",
    "2.3": "0",
    "3": "0",
    "4.1": "0",
    "4.2": "2",
    "4.3": "1",
    "5.1": "2",
    "5.2": "2",
    "6.1": "0",
    "6.2": "0",
    "7": "0",
    "8": "X",
    "9": "0",
  },
  "5.1": {
    "1.1D": "4",
    "2.1": "2",
    "2.2": "0",
    "2.3": "0",
    "3": "2",
    "4.1": "2",
    "4.2": "2",
    "4.3": "2",
    "5.1": "0",
    "5.2": "2",
    "6.1": "1",
    "6.2": "1",
    "7": "0",
    "8": "2",
    "9": "0",
  },
  "8": {
    "1.1D": "4",
    "2.1": "1",
    "2.2": "0",
    "2.3": "0",
    "3": "X",
    "4.1": "1",
    "4.2": "1",
    "4.3": "1",
    "5.1": "2",
    "5.2": "2",
    "6.1": "0",
    "6.2": "0",
    "7": "0",
    "8": "0",
    "9": "0",
  },
  "9": {
    "1.1D": "X",
    "2.1": "0",
    "2.2": "0",
    "2.3": "0",
    "3": "0",
    "4.1": "0",
    "4.2": "0",
    "4.3": "0",
    "5.1": "0",
    "5.2": "0",
    "6.1": "0",
    "6.2": "0",
    "7": "0",
    "8": "0",
    "9": "0",
  },
};

export interface SegregationPairConflict {
  itemAId: string;
  itemAUn: string;
  itemAClass: string;
  itemBId: string;
  itemBUn: string;
  itemBClass: string;
  segregationCode: string;
  severity: "PROHIBITED" | "DISTANCE_REQUIRED" | "COMPATIBLE";
  ruleDescription: string;
  advice: string;
}

export interface SegregationAuditResult {
  containerOrVehicleNumber: string;
  totalItemsEvaluated: number;
  overallStatus:
    "COMPLIANT_SEGREGATED" | "INCOMPATIBLE_VIOLATION" | "SEGREGATION_REQUIRED";
  totalConflicts: number;
  conflicts: SegregationPairConflict[];
  certificateStatement: string;
}

export class DgCatalogSegregationService {
  /**
   * Retrieves a UN substance from the master catalog or generates a safe fallback definition.
   */
  public static getSubstance(unNumber: string): UnSubstanceDefinition {
    const norm = unNumber.trim().toUpperCase();
    const formatted = norm.startsWith("UN ")
      ? norm
      : `UN ${norm.replace(/^UN/, "").trim()}`;
    return (
      UN_MASTER_CATALOG[formatted] || {
        unNumber: formatted,
        properShippingName: "DANGEROUS GOODS, N.O.S.",
        primaryClass: "9",
        packingGroup: "PG_III",
        isMarinePollutant: false,
        lqInnerLimitKgOrL: 0,
        eqCode: "E0",
        adrTransportCategory: 3,
        adrTunnelCode: "E",
        kemlerNumber: "90",
        emsFire: "F-A",
        emsSpillage: "S-F",
      }
    );
  }

  /**
   * Evaluates the pair-wise segregation rule between two hazard classes according to IMDG Table 7.2.4.
   */
  public static evaluatePairSegregation(
    classA: string,
    classB: string,
  ): {
    code: string;
    severity: "PROHIBITED" | "DISTANCE_REQUIRED" | "COMPATIBLE";
    description: string;
    advice: string;
  } {
    const cA = classA.trim();
    const cB = classB.trim();

    // Check direct matrix or symmetrical lookup
    const code =
      IMDG_SEGREGATION_TABLE[cA]?.[cB] ||
      IMDG_SEGREGATION_TABLE[cB]?.[cA] ||
      "0";

    switch (code) {
      case "X":
        return {
          code: "X",
          severity: "PROHIBITED",
          description:
            "Incompatible — Prohibida la carga conjunta en el mismo contenedor o vehículo.",
          advice:
            "Debe embalarse y estibarse en unidades de transporte totalmente independientes.",
        };
      case "4":
        return {
          code: "4",
          severity: "DISTANCE_REQUIRED",
          description:
            "Segregación Grado 4 — Separado longitudinalmente por todo un compartimento o bodega.",
          advice:
            "Prohibido en la misma unidad de carga (CTU). Requiere bodegas separadas a bordo.",
        };
      case "3":
        return {
          code: "3",
          severity: "DISTANCE_REQUIRED",
          description:
            "Segregación Grado 3 — Separado por todo un compartimento completo.",
          advice:
            "Prohibido en el mismo contenedor. Requiere estiba en bodegas distintas.",
        };
      case "2":
        return {
          code: "2",
          severity: "DISTANCE_REQUIRED",
          description:
            "Segregación Grado 2 — Separado de... (mínimo 6 metros en cubierta o mamparo estanco).",
          advice:
            "No pueden co-cargarse en el mismo contenedor cerrado estándar.",
        };
      case "1":
        return {
          code: "1",
          severity: "DISTANCE_REQUIRED",
          description:
            "Segregación Grado 1 — Lejos de... (mínimo 3 metros de distancia).",
          advice:
            "En el mismo contenedor se permite únicamente con bultos estancos y distancia física reglamentaria.",
        };
      case "0":
      default:
        return {
          code: "0",
          severity: "COMPATIBLE",
          description:
            "Compatible — No se exige segregación especial bajo el cuadro general IMDG 7.2.4.",
          advice:
            "Permitida la carga conjunta siempre que los embalajes estén homologados y trincados.",
        };
    }
  }

  /**
   * Audits full segregation compatibility for all items loaded in a single container or vehicle.
   */
  public static auditContainerSegregation(params: {
    containerOrVehicleNumber: string;
    items: { id: string; unNumber: string; primaryClass: string }[];
  }): SegregationAuditResult {
    const conflicts: SegregationPairConflict[] = [];
    const n = params.items.length;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const itemA = params.items[i];
        const itemB = params.items[j];
        const evalResult = this.evaluatePairSegregation(
          itemA.primaryClass,
          itemB.primaryClass,
        );

        if (evalResult.severity !== "COMPATIBLE") {
          conflicts.push({
            itemAId: itemA.id,
            itemAUn: itemA.unNumber,
            itemAClass: itemA.primaryClass,
            itemBId: itemB.id,
            itemBUn: itemB.unNumber,
            itemBClass: itemB.primaryClass,
            segregationCode: evalResult.code,
            severity: evalResult.severity,
            ruleDescription: evalResult.description,
            advice: evalResult.advice,
          });
        }
      }
    }

    let overallStatus:
      | "COMPLIANT_SEGREGATED"
      | "INCOMPATIBLE_VIOLATION"
      | "SEGREGATION_REQUIRED" = "COMPLIANT_SEGREGATED";

    if (
      conflicts.some(
        (c) =>
          c.severity === "PROHIBITED" ||
          c.segregationCode === "4" ||
          c.segregationCode === "3" ||
          c.segregationCode === "2",
      )
    ) {
      overallStatus = "INCOMPATIBLE_VIOLATION";
    } else if (conflicts.some((c) => c.severity === "DISTANCE_REQUIRED")) {
      overallStatus = "SEGREGATION_REQUIRED";
    }

    const certStatement =
      overallStatus === "COMPLIANT_SEGREGATED"
        ? `Auditoría de segregación satisfactoria para la unidad ${params.containerOrVehicleNumber}. Todas las mercancías peligrosas son químicamente compatibles bajo IMDG 7.2.4.`
        : `ALERTA DE SEGREGACIÓN: Se han detectado ${conflicts.length} incompatibilidad(es) química(s) en la unidad ${params.containerOrVehicleNumber}. Prohibida la expedición conjunta.`;

    return {
      containerOrVehicleNumber: params.containerOrVehicleNumber,
      totalItemsEvaluated: n,
      overallStatus,
      totalConflicts: conflicts.length,
      conflicts,
      certificateStatement: certStatement,
    };
  }
}
