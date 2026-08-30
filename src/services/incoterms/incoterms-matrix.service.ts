export type IncotermCode =
  | "EXW"
  | "FCA"
  | "CPT"
  | "CIP"
  | "DAP"
  | "DPU"
  | "DDP"
  | "FAS"
  | "FOB"
  | "CFR"
  | "CIF";

export type TransportCategory = "ANY_MODE" | "MARITIME_ONLY";

export type LifecycleStage =
  | "PACKAGING"
  | "LOADING_ORIGIN"
  | "PRE_CARRIAGE"
  | "EXPORT_CUSTOMS"
  | "ORIGIN_TERMINAL"
  | "MAIN_CARRIAGE"
  | "INSURANCE"
  | "DEST_TERMINAL"
  | "IMPORT_CUSTOMS"
  | "ON_CARRIAGE"
  | "UNLOADING_DEST";

export type Party = "SELLER" | "BUYER" | "OPTIONAL";

export interface StageAllocation {
  stage: LifecycleStage;
  name: string;
  costBearer: Party;
  riskBearer: Party;
  description: string;
}

export interface IncotermRuleDefinition {
  code: IncotermCode;
  name: string;
  transportCategory: TransportCategory;
  riskTransferPoint: string;
  costTransferPoint: string;
  insuranceRequirement: "NONE" | "MANDATORY_CLAUSE_A" | "MANDATORY_CLAUSE_C";
  customsExportBy: Party;
  customsImportBy: Party;
  description: string;
  stages: StageAllocation[];
}

export interface ModeValidationResult {
  isValid: boolean;
  isOptimal: boolean;
  warnings: string[];
  recommendation?: IncotermCode;
  explanation: string;
}

export interface InsuranceCalculationResult {
  incotermCode: IncotermCode;
  isMandatory: boolean;
  clauseType:
    "NONE" | "INSTITUTE_CARGO_CLAUSES_A" | "INSTITUTE_CARGO_CLAUSES_C";
  minimumInsuredValue: number; // 110% of CIF/CIP contract value
  currency: string;
  estimatedPremium: number;
  coverageDetails: string;
}

export class IncotermsMatrixService {
  /**
   * Deterministic repository of all 11 ICC Incoterms® 2020 Rules
   */
  private static readonly RULES: Record<IncotermCode, IncotermRuleDefinition> =
    {
      EXW: {
        code: "EXW",
        name: "Ex Works / En Fábrica",
        transportCategory: "ANY_MODE",
        riskTransferPoint:
          "En las instalaciones del vendedor antes de la carga.",
        costTransferPoint:
          "En las instalaciones del vendedor antes de la carga.",
        insuranceRequirement: "NONE",
        customsExportBy: "BUYER",
        customsImportBy: "BUYER",
        description:
          "Obligación mínima del vendedor. El comprador asume todos los costes y riesgos desde las instalaciones del vendedor.",
        stages: [
          {
            stage: "PACKAGING",
            name: "Embalaje y Verificación",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "El vendedor debe embalar adecuadamente la carga.",
          },
          {
            stage: "LOADING_ORIGIN",
            name: "Carga en Origen",
            costBearer: "BUYER",
            riskBearer: "BUYER",
            description: "El comprador carga a su coste y riesgo.",
          },
          {
            stage: "PRE_CARRIAGE",
            name: "Transporte Interior Origen",
            costBearer: "BUYER",
            riskBearer: "BUYER",
            description: "A cargo del comprador.",
          },
          {
            stage: "EXPORT_CUSTOMS",
            name: "Despacho de Exportación",
            costBearer: "BUYER",
            riskBearer: "BUYER",
            description:
              "El comprador tramita la exportación (atípico en comercio exterior).",
          },
          {
            stage: "ORIGIN_TERMINAL",
            name: "Manipulación Terminal Origen (OTHC)",
            costBearer: "BUYER",
            riskBearer: "BUYER",
            description: "A cargo del comprador.",
          },
          {
            stage: "MAIN_CARRIAGE",
            name: "Flete Internacional Principal",
            costBearer: "BUYER",
            riskBearer: "BUYER",
            description: "A cargo del comprador.",
          },
          {
            stage: "INSURANCE",
            name: "Seguro de Carga",
            costBearer: "BUYER",
            riskBearer: "BUYER",
            description: "Sin obligación, a discreción del comprador.",
          },
          {
            stage: "DEST_TERMINAL",
            name: "Manipulación Terminal Destino (DTHC)",
            costBearer: "BUYER",
            riskBearer: "BUYER",
            description: "A cargo del comprador.",
          },
          {
            stage: "IMPORT_CUSTOMS",
            name: "Despacho de Importación y Aranceles",
            costBearer: "BUYER",
            riskBearer: "BUYER",
            description: "A cargo del comprador.",
          },
          {
            stage: "ON_CARRIAGE",
            name: "Transporte Interior Destino",
            costBearer: "BUYER",
            riskBearer: "BUYER",
            description: "A cargo del comprador.",
          },
          {
            stage: "UNLOADING_DEST",
            name: "Descarga en Destino",
            costBearer: "BUYER",
            riskBearer: "BUYER",
            description: "A cargo del comprador.",
          },
        ],
      },
      FCA: {
        code: "FCA",
        name: "Free Carrier / Franco Porteador",
        transportCategory: "ANY_MODE",
        riskTransferPoint:
          "Al entregar la mercancía al transportista designado por el comprador.",
        costTransferPoint:
          "Al entregar al transportista designado (despachada de exportación).",
        insuranceRequirement: "NONE",
        customsExportBy: "SELLER",
        customsImportBy: "BUYER",
        description:
          "El vendedor entrega la mercancía al transportista designado en su almacén (cargada) o en terminal (sin descargar). Regla recomendada para contenedores.",
        stages: [
          {
            stage: "PACKAGING",
            name: "Embalaje y Verificación",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A cargo del vendedor.",
          },
          {
            stage: "LOADING_ORIGIN",
            name: "Carga en Origen",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description:
              "Vendedor carga si la entrega es en sus instalaciones.",
          },
          {
            stage: "PRE_CARRIAGE",
            name: "Transporte Interior Origen",
            costBearer: "BUYER",
            riskBearer: "BUYER",
            description:
              "A cargo del comprador (salvo si entrega es en terminal).",
          },
          {
            stage: "EXPORT_CUSTOMS",
            name: "Despacho de Exportación",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A cargo del vendedor.",
          },
          {
            stage: "ORIGIN_TERMINAL",
            name: "Manipulación Terminal Origen (OTHC)",
            costBearer: "BUYER",
            riskBearer: "BUYER",
            description: "A cargo del comprador.",
          },
          {
            stage: "MAIN_CARRIAGE",
            name: "Flete Internacional Principal",
            costBearer: "BUYER",
            riskBearer: "BUYER",
            description: "A cargo del comprador.",
          },
          {
            stage: "INSURANCE",
            name: "Seguro de Carga",
            costBearer: "BUYER",
            riskBearer: "BUYER",
            description: "A cargo del comprador si lo desea.",
          },
          {
            stage: "DEST_TERMINAL",
            name: "Manipulación Terminal Destino (DTHC)",
            costBearer: "BUYER",
            riskBearer: "BUYER",
            description: "A cargo del comprador.",
          },
          {
            stage: "IMPORT_CUSTOMS",
            name: "Despacho de Importación y Aranceles",
            costBearer: "BUYER",
            riskBearer: "BUYER",
            description: "A cargo del comprador.",
          },
          {
            stage: "ON_CARRIAGE",
            name: "Transporte Interior Destino",
            costBearer: "BUYER",
            riskBearer: "BUYER",
            description: "A cargo del comprador.",
          },
          {
            stage: "UNLOADING_DEST",
            name: "Descarga en Destino",
            costBearer: "BUYER",
            riskBearer: "BUYER",
            description: "A cargo del comprador.",
          },
        ],
      },
      CPT: {
        code: "CPT",
        name: "Carriage Paid To / Transporte Pagado Hasta",
        transportCategory: "ANY_MODE",
        riskTransferPoint:
          "Al entregar la mercancía al primer porteador en origen.",
        costTransferPoint:
          "En el lugar de destino convenido (flete principal pagado por el vendedor).",
        insuranceRequirement: "NONE",
        customsExportBy: "SELLER",
        customsImportBy: "BUYER",
        description:
          "El vendedor paga el transporte hasta destino, pero el riesgo se transfiere al entregar al primer transportista.",
        stages: [
          {
            stage: "PACKAGING",
            name: "Embalaje y Verificación",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A cargo del vendedor.",
          },
          {
            stage: "LOADING_ORIGIN",
            name: "Carga en Origen",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A cargo del vendedor.",
          },
          {
            stage: "PRE_CARRIAGE",
            name: "Transporte Interior Origen",
            costBearer: "SELLER",
            riskBearer: "BUYER",
            description:
              "Coste Vendedor, Riesgo Comprador tras primer porteador.",
          },
          {
            stage: "EXPORT_CUSTOMS",
            name: "Despacho de Exportación",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A cargo del vendedor.",
          },
          {
            stage: "ORIGIN_TERMINAL",
            name: "Manipulación Terminal Origen (OTHC)",
            costBearer: "SELLER",
            riskBearer: "BUYER",
            description: "Coste Vendedor, Riesgo Comprador.",
          },
          {
            stage: "MAIN_CARRIAGE",
            name: "Flete Internacional Principal",
            costBearer: "SELLER",
            riskBearer: "BUYER",
            description: "Coste Vendedor, Riesgo Comprador.",
          },
          {
            stage: "INSURANCE",
            name: "Seguro de Carga",
            costBearer: "BUYER",
            riskBearer: "BUYER",
            description: "Opcional a cargo del comprador.",
          },
          {
            stage: "DEST_TERMINAL",
            name: "Manipulación Terminal Destino (DTHC)",
            costBearer: "BUYER",
            riskBearer: "BUYER",
            description: "A cargo del comprador (salvo si incluido en flete).",
          },
          {
            stage: "IMPORT_CUSTOMS",
            name: "Despacho de Importación y Aranceles",
            costBearer: "BUYER",
            riskBearer: "BUYER",
            description: "A cargo del comprador.",
          },
          {
            stage: "ON_CARRIAGE",
            name: "Transporte Interior Destino",
            costBearer: "BUYER",
            riskBearer: "BUYER",
            description: "A cargo del comprador.",
          },
          {
            stage: "UNLOADING_DEST",
            name: "Descarga en Destino",
            costBearer: "BUYER",
            riskBearer: "BUYER",
            description: "A cargo del comprador.",
          },
        ],
      },
      CIP: {
        code: "CIP",
        name: "Carriage and Insurance Paid to / Transporte y Seguro Pagados Hasta",
        transportCategory: "ANY_MODE",
        riskTransferPoint:
          "Al entregar la mercancía al primer porteador en origen.",
        costTransferPoint:
          "En el lugar de destino convenido (flete + seguro All Risks pagados por el vendedor).",
        insuranceRequirement: "MANDATORY_CLAUSE_A",
        customsExportBy: "SELLER",
        customsImportBy: "BUYER",
        description:
          "El vendedor paga el transporte y seguro obligatorio Institute Cargo Clauses (A) (Todo Riesgo) por el 110% del valor.",
        stages: [
          {
            stage: "PACKAGING",
            name: "Embalaje y Verificación",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A cargo del vendedor.",
          },
          {
            stage: "LOADING_ORIGIN",
            name: "Carga en Origen",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A cargo del vendedor.",
          },
          {
            stage: "PRE_CARRIAGE",
            name: "Transporte Interior Origen",
            costBearer: "SELLER",
            riskBearer: "BUYER",
            description:
              "Coste Vendedor, Riesgo Comprador tras primer porteador.",
          },
          {
            stage: "EXPORT_CUSTOMS",
            name: "Despacho de Exportación",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A cargo del vendedor.",
          },
          {
            stage: "ORIGIN_TERMINAL",
            name: "Manipulación Terminal Origen (OTHC)",
            costBearer: "SELLER",
            riskBearer: "BUYER",
            description: "Coste Vendedor, Riesgo Comprador.",
          },
          {
            stage: "MAIN_CARRIAGE",
            name: "Flete Internacional Principal",
            costBearer: "SELLER",
            riskBearer: "BUYER",
            description: "Coste Vendedor, Riesgo Comprador.",
          },
          {
            stage: "INSURANCE",
            name: "Seguro de Carga (Cláusula A)",
            costBearer: "SELLER",
            riskBearer: "BUYER",
            description:
              "Vendedor obligado a contratar seguro Todo Riesgo (ICC A).",
          },
          {
            stage: "DEST_TERMINAL",
            name: "Manipulación Terminal Destino (DTHC)",
            costBearer: "BUYER",
            riskBearer: "BUYER",
            description: "A cargo del comprador (salvo si pactado en flete).",
          },
          {
            stage: "IMPORT_CUSTOMS",
            name: "Despacho de Importación y Aranceles",
            costBearer: "BUYER",
            riskBearer: "BUYER",
            description: "A cargo del comprador.",
          },
          {
            stage: "ON_CARRIAGE",
            name: "Transporte Interior Destino",
            costBearer: "BUYER",
            riskBearer: "BUYER",
            description: "A cargo del comprador.",
          },
          {
            stage: "UNLOADING_DEST",
            name: "Descarga en Destino",
            costBearer: "BUYER",
            riskBearer: "BUYER",
            description: "A cargo del comprador.",
          },
        ],
      },
      DAP: {
        code: "DAP",
        name: "Delivered at Place / Entregado en Lugar",
        transportCategory: "ANY_MODE",
        riskTransferPoint:
          "En el lugar de destino convenido sobre el transporte listo para ser descargado.",
        costTransferPoint: "En el lugar de destino convenido (sin descargar).",
        insuranceRequirement: "NONE",
        customsExportBy: "SELLER",
        customsImportBy: "BUYER",
        description:
          "El vendedor asume todos los costes y riesgos hasta el lugar de destino sin descargar. El comprador despacha de importación.",
        stages: [
          {
            stage: "PACKAGING",
            name: "Embalaje y Verificación",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A cargo del vendedor.",
          },
          {
            stage: "LOADING_ORIGIN",
            name: "Carga en Origen",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A cargo del vendedor.",
          },
          {
            stage: "PRE_CARRIAGE",
            name: "Transporte Interior Origen",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A cargo del vendedor.",
          },
          {
            stage: "EXPORT_CUSTOMS",
            name: "Despacho de Exportación",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A cargo del vendedor.",
          },
          {
            stage: "ORIGIN_TERMINAL",
            name: "Manipulación Terminal Origen (OTHC)",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A cargo del vendedor.",
          },
          {
            stage: "MAIN_CARRIAGE",
            name: "Flete Internacional Principal",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A cargo del vendedor.",
          },
          {
            stage: "INSURANCE",
            name: "Seguro de Carga",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A discreción del vendedor.",
          },
          {
            stage: "DEST_TERMINAL",
            name: "Manipulación Terminal Destino (DTHC)",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A cargo del vendedor.",
          },
          {
            stage: "IMPORT_CUSTOMS",
            name: "Despacho de Importación y Aranceles",
            costBearer: "BUYER",
            riskBearer: "BUYER",
            description: "A cargo del comprador.",
          },
          {
            stage: "ON_CARRIAGE",
            name: "Transporte Interior Destino",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A cargo del vendedor.",
          },
          {
            stage: "UNLOADING_DEST",
            name: "Descarga en Destino",
            costBearer: "BUYER",
            riskBearer: "BUYER",
            description: "A cargo del comprador.",
          },
        ],
      },
      DPU: {
        code: "DPU",
        name: "Delivered at Place Unloaded / Entregado en Lugar Descargado",
        transportCategory: "ANY_MODE",
        riskTransferPoint:
          "En el lugar/terminal de destino convenido, una vez descargada la mercancía.",
        costTransferPoint: "En el lugar/terminal de destino tras la descarga.",
        insuranceRequirement: "NONE",
        customsExportBy: "SELLER",
        customsImportBy: "BUYER",
        description:
          "Única regla donde el vendedor asume la obligación y el riesgo de descargar la carga en destino.",
        stages: [
          {
            stage: "PACKAGING",
            name: "Embalaje y Verificación",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A cargo del vendedor.",
          },
          {
            stage: "LOADING_ORIGIN",
            name: "Carga en Origen",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A cargo del vendedor.",
          },
          {
            stage: "PRE_CARRIAGE",
            name: "Transporte Interior Origen",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A cargo del vendedor.",
          },
          {
            stage: "EXPORT_CUSTOMS",
            name: "Despacho de Exportación",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A cargo del vendedor.",
          },
          {
            stage: "ORIGIN_TERMINAL",
            name: "Manipulación Terminal Origen (OTHC)",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A cargo del vendedor.",
          },
          {
            stage: "MAIN_CARRIAGE",
            name: "Flete Internacional Principal",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A cargo del vendedor.",
          },
          {
            stage: "INSURANCE",
            name: "Seguro de Carga",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A discreción del vendedor.",
          },
          {
            stage: "DEST_TERMINAL",
            name: "Manipulación Terminal Destino (DTHC)",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A cargo del vendedor.",
          },
          {
            stage: "IMPORT_CUSTOMS",
            name: "Despacho de Importación y Aranceles",
            costBearer: "BUYER",
            riskBearer: "BUYER",
            description: "A cargo del comprador.",
          },
          {
            stage: "ON_CARRIAGE",
            name: "Transporte Interior Destino",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A cargo del vendedor.",
          },
          {
            stage: "UNLOADING_DEST",
            name: "Descarga en Destino",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A cargo del vendedor.",
          },
        ],
      },
      DDP: {
        code: "DDP",
        name: "Delivered Duty Paid / Entregado Derechos Pagados",
        transportCategory: "ANY_MODE",
        riskTransferPoint:
          "En las instalaciones del comprador despachada para la importación y lista para descargar.",
        costTransferPoint:
          "En las instalaciones del comprador con aranceles e impuestos pagados.",
        insuranceRequirement: "NONE",
        customsExportBy: "SELLER",
        customsImportBy: "SELLER",
        description:
          "Máxima obligación del vendedor. Asume transporte, seguro, despacho de importación y pago de aranceles e IVA.",
        stages: [
          {
            stage: "PACKAGING",
            name: "Embalaje y Verificación",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A cargo del vendedor.",
          },
          {
            stage: "LOADING_ORIGIN",
            name: "Carga en Origen",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A cargo del vendedor.",
          },
          {
            stage: "PRE_CARRIAGE",
            name: "Transporte Interior Origen",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A cargo del vendedor.",
          },
          {
            stage: "EXPORT_CUSTOMS",
            name: "Despacho de Exportación",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A cargo del vendedor.",
          },
          {
            stage: "ORIGIN_TERMINAL",
            name: "Manipulación Terminal Origen (OTHC)",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A cargo del vendedor.",
          },
          {
            stage: "MAIN_CARRIAGE",
            name: "Flete Internacional Principal",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A cargo del vendedor.",
          },
          {
            stage: "INSURANCE",
            name: "Seguro de Carga",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A cargo del vendedor.",
          },
          {
            stage: "DEST_TERMINAL",
            name: "Manipulación Terminal Destino (DTHC)",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A cargo del vendedor.",
          },
          {
            stage: "IMPORT_CUSTOMS",
            name: "Despacho de Importación y Aranceles",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description:
              "A cargo del vendedor (incluye aranceles e impuestos).",
          },
          {
            stage: "ON_CARRIAGE",
            name: "Transporte Interior Destino",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A cargo del vendedor.",
          },
          {
            stage: "UNLOADING_DEST",
            name: "Descarga en Destino",
            costBearer: "BUYER",
            riskBearer: "BUYER",
            description: "A cargo del comprador.",
          },
        ],
      },
      FAS: {
        code: "FAS",
        name: "Free Alongside Ship / Franco al Costado del Buque",
        transportCategory: "MARITIME_ONLY",
        riskTransferPoint:
          "Al costado del buque en el muelle o barcaza del puerto de embarque designado.",
        costTransferPoint:
          "Al costado del buque en el puerto de embarque designado.",
        insuranceRequirement: "NONE",
        customsExportBy: "SELLER",
        customsImportBy: "BUYER",
        description:
          "Uso marítimo exclusivo para carga no contenedorizada o a granel. Entrega junto al buque.",
        stages: [
          {
            stage: "PACKAGING",
            name: "Embalaje y Verificación",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A cargo del vendedor.",
          },
          {
            stage: "LOADING_ORIGIN",
            name: "Carga en Origen",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A cargo del vendedor.",
          },
          {
            stage: "PRE_CARRIAGE",
            name: "Transporte Interior Origen",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A cargo del vendedor.",
          },
          {
            stage: "EXPORT_CUSTOMS",
            name: "Despacho de Exportación",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A cargo del vendedor.",
          },
          {
            stage: "ORIGIN_TERMINAL",
            name: "Manipulación Terminal Origen (OTHC)",
            costBearer: "BUYER",
            riskBearer: "BUYER",
            description: "A cargo del comprador (carga a bordo).",
          },
          {
            stage: "MAIN_CARRIAGE",
            name: "Flete Internacional Principal",
            costBearer: "BUYER",
            riskBearer: "BUYER",
            description: "A cargo del comprador.",
          },
          {
            stage: "INSURANCE",
            name: "Seguro de Carga",
            costBearer: "BUYER",
            riskBearer: "BUYER",
            description: "A cargo del comprador si lo desea.",
          },
          {
            stage: "DEST_TERMINAL",
            name: "Manipulación Terminal Destino (DTHC)",
            costBearer: "BUYER",
            riskBearer: "BUYER",
            description: "A cargo del comprador.",
          },
          {
            stage: "IMPORT_CUSTOMS",
            name: "Despacho de Importación y Aranceles",
            costBearer: "BUYER",
            riskBearer: "BUYER",
            description: "A cargo del comprador.",
          },
          {
            stage: "ON_CARRIAGE",
            name: "Transporte Interior Destino",
            costBearer: "BUYER",
            riskBearer: "BUYER",
            description: "A cargo del comprador.",
          },
          {
            stage: "UNLOADING_DEST",
            name: "Descarga en Destino",
            costBearer: "BUYER",
            riskBearer: "BUYER",
            description: "A cargo del comprador.",
          },
        ],
      },
      FOB: {
        code: "FOB",
        name: "Free on Board / Franco a Bordo",
        transportCategory: "MARITIME_ONLY",
        riskTransferPoint:
          "A bordo del buque en el puerto de embarque designado.",
        costTransferPoint:
          "A bordo del buque en el puerto de embarque designado.",
        insuranceRequirement: "NONE",
        customsExportBy: "SELLER",
        customsImportBy: "BUYER",
        description:
          "Regla marítima tradicional. El vendedor entrega estibada a bordo del buque. Si es contenedor, usar FCA.",
        stages: [
          {
            stage: "PACKAGING",
            name: "Embalaje y Verificación",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A cargo del vendedor.",
          },
          {
            stage: "LOADING_ORIGIN",
            name: "Carga en Origen",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A cargo del vendedor.",
          },
          {
            stage: "PRE_CARRIAGE",
            name: "Transporte Interior Origen",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A cargo del vendedor.",
          },
          {
            stage: "EXPORT_CUSTOMS",
            name: "Despacho de Exportación",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A cargo del vendedor.",
          },
          {
            stage: "ORIGIN_TERMINAL",
            name: "Manipulación Terminal Origen (OTHC)",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A cargo del vendedor (hasta estiba a bordo).",
          },
          {
            stage: "MAIN_CARRIAGE",
            name: "Flete Internacional Principal",
            costBearer: "BUYER",
            riskBearer: "BUYER",
            description: "A cargo del comprador.",
          },
          {
            stage: "INSURANCE",
            name: "Seguro de Carga",
            costBearer: "BUYER",
            riskBearer: "BUYER",
            description: "A cargo del comprador si lo desea.",
          },
          {
            stage: "DEST_TERMINAL",
            name: "Manipulación Terminal Destino (DTHC)",
            costBearer: "BUYER",
            riskBearer: "BUYER",
            description: "A cargo del comprador.",
          },
          {
            stage: "IMPORT_CUSTOMS",
            name: "Despacho de Importación y Aranceles",
            costBearer: "BUYER",
            riskBearer: "BUYER",
            description: "A cargo del comprador.",
          },
          {
            stage: "ON_CARRIAGE",
            name: "Transporte Interior Destino",
            costBearer: "BUYER",
            riskBearer: "BUYER",
            description: "A cargo del comprador.",
          },
          {
            stage: "UNLOADING_DEST",
            name: "Descarga en Destino",
            costBearer: "BUYER",
            riskBearer: "BUYER",
            description: "A cargo del comprador.",
          },
        ],
      },
      CFR: {
        code: "CFR",
        name: "Cost and Freight / Coste y Flete",
        transportCategory: "MARITIME_ONLY",
        riskTransferPoint:
          "A bordo del buque en el puerto de embarque en origen.",
        costTransferPoint:
          "En el puerto de destino convenido (flete marítimo pagado por el vendedor).",
        insuranceRequirement: "NONE",
        customsExportBy: "SELLER",
        customsImportBy: "BUYER",
        description:
          "El vendedor paga el flete marítimo, pero el riesgo se transfiere en origen una vez a bordo.",
        stages: [
          {
            stage: "PACKAGING",
            name: "Embalaje y Verificación",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A cargo del vendedor.",
          },
          {
            stage: "LOADING_ORIGIN",
            name: "Carga en Origen",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A cargo del vendedor.",
          },
          {
            stage: "PRE_CARRIAGE",
            name: "Transporte Interior Origen",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A cargo del vendedor.",
          },
          {
            stage: "EXPORT_CUSTOMS",
            name: "Despacho de Exportación",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A cargo del vendedor.",
          },
          {
            stage: "ORIGIN_TERMINAL",
            name: "Manipulación Terminal Origen (OTHC)",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A cargo del vendedor.",
          },
          {
            stage: "MAIN_CARRIAGE",
            name: "Flete Internacional Principal",
            costBearer: "SELLER",
            riskBearer: "BUYER",
            description: "Coste Vendedor, Riesgo Comprador tras carga a bordo.",
          },
          {
            stage: "INSURANCE",
            name: "Seguro de Carga",
            costBearer: "BUYER",
            riskBearer: "BUYER",
            description: "A cargo del comprador si lo desea.",
          },
          {
            stage: "DEST_TERMINAL",
            name: "Manipulación Terminal Destino (DTHC)",
            costBearer: "BUYER",
            riskBearer: "BUYER",
            description: "A cargo del comprador (salvo si incluido en flete).",
          },
          {
            stage: "IMPORT_CUSTOMS",
            name: "Despacho de Importación y Aranceles",
            costBearer: "BUYER",
            riskBearer: "BUYER",
            description: "A cargo del comprador.",
          },
          {
            stage: "ON_CARRIAGE",
            name: "Transporte Interior Destino",
            costBearer: "BUYER",
            riskBearer: "BUYER",
            description: "A cargo del comprador.",
          },
          {
            stage: "UNLOADING_DEST",
            name: "Descarga en Destino",
            costBearer: "BUYER",
            riskBearer: "BUYER",
            description: "A cargo del comprador.",
          },
        ],
      },
      CIF: {
        code: "CIF",
        name: "Cost, Insurance and Freight / Coste, Seguro y Flete",
        transportCategory: "MARITIME_ONLY",
        riskTransferPoint:
          "A bordo del buque en el puerto de embarque en origen.",
        costTransferPoint:
          "En el puerto de destino convenido (flete + seguro marítimo básico pagados por el vendedor).",
        insuranceRequirement: "MANDATORY_CLAUSE_C",
        customsExportBy: "SELLER",
        customsImportBy: "BUYER",
        description:
          "El vendedor paga el flete marítimo y seguro básico Institute Cargo Clauses (C) por el 110% del valor. Riesgo se transfiere a bordo en origen.",
        stages: [
          {
            stage: "PACKAGING",
            name: "Embalaje y Verificación",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A cargo del vendedor.",
          },
          {
            stage: "LOADING_ORIGIN",
            name: "Carga en Origen",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A cargo del vendedor.",
          },
          {
            stage: "PRE_CARRIAGE",
            name: "Transporte Interior Origen",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A cargo del vendedor.",
          },
          {
            stage: "EXPORT_CUSTOMS",
            name: "Despacho de Exportación",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A cargo del vendedor.",
          },
          {
            stage: "ORIGIN_TERMINAL",
            name: "Manipulación Terminal Origen (OTHC)",
            costBearer: "SELLER",
            riskBearer: "SELLER",
            description: "A cargo del vendedor.",
          },
          {
            stage: "MAIN_CARRIAGE",
            name: "Flete Internacional Principal",
            costBearer: "SELLER",
            riskBearer: "BUYER",
            description: "Coste Vendedor, Riesgo Comprador tras carga a bordo.",
          },
          {
            stage: "INSURANCE",
            name: "Seguro de Carga (Cláusula C)",
            costBearer: "SELLER",
            riskBearer: "BUYER",
            description: "Vendedor obligado a contratar seguro mínimo (ICC C).",
          },
          {
            stage: "DEST_TERMINAL",
            name: "Manipulación Terminal Destino (DTHC)",
            costBearer: "BUYER",
            riskBearer: "BUYER",
            description: "A cargo del comprador (salvo si pactado en flete).",
          },
          {
            stage: "IMPORT_CUSTOMS",
            name: "Despacho de Importación y Aranceles",
            costBearer: "BUYER",
            riskBearer: "BUYER",
            description: "A cargo del comprador.",
          },
          {
            stage: "ON_CARRIAGE",
            name: "Transporte Interior Destino",
            costBearer: "BUYER",
            riskBearer: "BUYER",
            description: "A cargo del comprador.",
          },
          {
            stage: "UNLOADING_DEST",
            name: "Descarga en Destino",
            costBearer: "BUYER",
            riskBearer: "BUYER",
            description: "A cargo del comprador.",
          },
        ],
      },
    };

  /**
   * Returns definition for a specific Incoterm
   */
  public static getRule(code: IncotermCode): IncotermRuleDefinition {
    const rule = this.RULES[code];
    if (!rule) {
      throw new Error(`Incoterm code "${code}" is invalid or unsupported.`);
    }
    return rule;
  }

  /**
   * Returns all 11 Incoterm definitions
   */
  public static getAllRules(): IncotermRuleDefinition[] {
    return Object.values(this.RULES);
  }

  /**
   * Validates transport mode compatibility and containerized cargo guardrails
   */
  public static validateModeCompatibility(params: {
    incotermCode: IncotermCode;
    transportMode: "OCEAN" | "AIR" | "ROAD" | "RAIL" | "MULTIMODAL";
    isContainerized?: boolean;
  }): ModeValidationResult {
    const { incotermCode, transportMode, isContainerized = false } = params;
    const rule = this.getRule(incotermCode);
    const warnings: string[] = [];

    // 1. Maritime-only check
    if (
      rule.transportCategory === "MARITIME_ONLY" &&
      transportMode !== "OCEAN"
    ) {
      let recommendation: IncotermCode = "FCA";
      if (incotermCode === "CFR") recommendation = "CPT";
      if (incotermCode === "CIF") recommendation = "CIP";
      if (incotermCode === "FAS") recommendation = "FCA";

      return {
        isValid: false,
        isOptimal: false,
        warnings: [
          `La regla ${incotermCode} es exclusiva de transporte marítimo o vías navegables interiores. No debe utilizarse para transporte ${transportMode}.`,
        ],
        recommendation,
        explanation: `Para transporte ${transportMode}, la Cámara de Comercio Internacional (ICC) establece el uso de la regla multimodal ${recommendation}.`,
      };
    }

    // 2. Containerized cargo guardrail on maritime terms (FOB/CFR/CIF)
    if (isContainerized && rule.transportCategory === "MARITIME_ONLY") {
      let recommendation: IncotermCode = "FCA";
      if (incotermCode === "CFR") recommendation = "CPT";
      if (incotermCode === "CIF") recommendation = "CIP";
      if (incotermCode === "FAS") recommendation = "FCA";

      warnings.push(
        `Uso subóptimo de ${incotermCode} en carga contenedorizada: El vendedor pierde el control físico de la mercancía al entregar el contenedor en la terminal portuaria, no cuando se estiba a bordo del buque.`,
      );

      return {
        isValid: true,
        isOptimal: false,
        warnings,
        recommendation,
        explanation: `La ICC recomienda expresamente utilizar ${recommendation} en lugar de ${incotermCode} para contenedores, alineando la transferencia de riesgo en la entrega a la terminal.`,
      };
    }

    return {
      isValid: true,
      isOptimal: true,
      warnings: [],
      explanation: `La regla ${incotermCode} es plenamente compatible y óptima para la operativa de transporte ${transportMode}.`,
    };
  }

  /**
   * Calculates mandatory insurance coverage under ICC Incoterms® 2020 (CIP vs CIF)
   */
  public static calculateInsuranceObligation(params: {
    incotermCode: IncotermCode;
    goodsValue: number;
    freightCost?: number;
    currency?: string;
  }): InsuranceCalculationResult {
    const {
      incotermCode,
      goodsValue,
      freightCost = 0,
      currency = "EUR",
    } = params;
    const rule = this.getRule(incotermCode);

    const baseCif = goodsValue + freightCost;
    // Incoterms 2020 mandatory minimum: 110% of CIF/CIP contract value
    const minimumInsuredValue = Number((baseCif * 1.1).toFixed(2));

    if (rule.insuranceRequirement === "MANDATORY_CLAUSE_A") {
      // CIP: Institute Cargo Clauses (A) - All Risks (~0.22% typical premium)
      const estimatedPremium = Number(
        (minimumInsuredValue * 0.0022).toFixed(2),
      );
      return {
        incotermCode,
        isMandatory: true,
        clauseType: "INSTITUTE_CARGO_CLAUSES_A",
        minimumInsuredValue,
        currency,
        estimatedPremium,
        coverageDetails:
          "Obligatorio: Cobertura máxima 'Todo Riesgo' Institute Cargo Clauses (A) o LMA/IUA equivalentes por el 110% del valor CIF/CIP de la mercancía.",
      };
    }

    if (rule.insuranceRequirement === "MANDATORY_CLAUSE_C") {
      // CIF: Institute Cargo Clauses (C) - Named Perils (~0.12% typical premium)
      const estimatedPremium = Number(
        (minimumInsuredValue * 0.0012).toFixed(2),
      );
      return {
        incotermCode,
        isMandatory: true,
        clauseType: "INSTITUTE_CARGO_CLAUSES_C",
        minimumInsuredValue,
        currency,
        estimatedPremium,
        coverageDetails:
          "Obligatorio: Cobertura mínima 'Riesgos Nominados' Institute Cargo Clauses (C) por el 110% del valor CIF de la mercancía.",
      };
    }

    return {
      incotermCode,
      isMandatory: false,
      clauseType: "NONE",
      minimumInsuredValue: 0,
      currency,
      estimatedPremium: 0,
      coverageDetails:
        "Sin obligación contractual de seguro por parte del vendedor. Se recomienda a las partes asegurar según su exposición al riesgo.",
    };
  }

  /**
   * Validates mandatory named place syntax
   */
  public static validateNamedPlaceSyntax(
    namedPlace: string,
    incotermCode: IncotermCode,
  ): {
    isValid: boolean;
    formattedString: string;
    error?: string;
  } {
    if (!namedPlace || namedPlace.trim().length < 3) {
      return {
        isValid: false,
        formattedString: "",
        error:
          "El lugar de entrega convenido (Named Place) es obligatorio y debe contener al menos la ciudad/puerto y país.",
      };
    }

    const cleaned = namedPlace.trim().replace(/\s+/g, " ");
    const hasIncotermsMention = /incoterms[®\s]*2020/i.test(cleaned);
    const firstToken = (cleaned.split(/\s+/, 1)[0] ?? "").replace(
      /[^\p{L}\p{N}]+$/u,
      "",
    );
    const hasIncotermCode =
      firstToken.localeCompare(incotermCode, undefined, {
        sensitivity: "accent",
      }) === 0;

    let formatted = cleaned;
    if (!hasIncotermCode) {
      formatted = `${incotermCode} ${formatted}`;
    }
    if (!hasIncotermsMention) {
      formatted = `${formatted} Incoterms® 2020`;
    }

    return {
      isValid: true,
      formattedString: formatted,
    };
  }
}
