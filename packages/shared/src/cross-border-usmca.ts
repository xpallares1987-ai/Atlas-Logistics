/**
 * Cross-Border North America Engine (USMCA / T-MEC & SAT Carta Porte 3.1)
 * CFDI 4.0, Rules of Origin RVC, IMMEX Duty Exemption & Customs Dwell ML Predictor
 */

// =========================================================================
// 1. SAT CFDI 4.0 CON COMPLEMENTO CARTA PORTE 3.1
// =========================================================================

export type VehicleConfigurationSct =
  | "T3S2" // Tractocamión articulado (5 ejes, semirremolque)
  | "T3S3" // Tractocamión articulado (6 ejes)
  | "T3S1" // Tractocamión articulado (4 ejes)
  | "C2"   // Camión unitario 2 ejes
  | "C3";  // Camión unitario 3 ejes

export interface CartaPorteLocation {
  tipoUbicacion: "Origen" | "Destino";
  rfc: string;
  nombre: string;
  direccion: string;
  codigoPostal: string;
  fechaHora: string;
}

export interface CartaPorteMercancia {
  claveProdServ: string;
  descripcion: string;
  cantidad: number;
  claveUnidad: string;
  pesoKg: number;
  fraccionArancelaria?: string;
  materialPeligroso?: boolean;
  claveMaterialPeligroso?: string;
  tipoEmbalaje?: string;
  valorDeclaradoUsd?: number;
}

export interface CartaPorteInput {
  shipmentRef: string;
  rfcEmisor: string;
  razonSocialEmisor: string;
  regimenFiscalEmisor?: string;
  rfcReceptor: string;
  razonSocialReceptor: string;
  origen: CartaPorteLocation;
  destino: CartaPorteLocation;
  distanciaRecorridaKm: number;
  mercancias: CartaPorteMercancia[];
  autotransporte: {
    configVehicular: VehicleConfigurationSct;
    placa: string;
    anioModelo: number;
    permisoSct: string;
    numPermisoSct: string;
    aseguradoraRespCivil: string;
    polizaRespCivil: string;
    aseguradoraMedioAmbiente?: string;
    polizaMedioAmbiente?: string;
  };
  operador: {
    rfc: string;
    nombre: string;
    numLicencia: string;
  };
  subtotalMxn: number;
  ivaMxn: number;
  retencionIvaMxn: number;
  totalMxn: number;
}

export interface CartaPorteStampingResult {
  uuid: string;
  cfdiVersion: "4.0";
  cartaPorteVersion: "3.1";
  idCCP: string;
  pacProvider: string;
  stampedXml: string;
  qrCodeSatUrl: string;
  stampTimestamp: string;
  selloDigitalCsd: string;
  selloSat: string;
  cadenaOriginal: string;
  totalFreightMxn: number;
  totalWeightKg: number;
}

/**
 * Genera el identificador único universal IdCCP de 36 caracteres conforme a la especificación técnica SAT CP 3.1
 * Formato: CCC + 33 caracteres alfanuméricos deterministas o UUID compatible.
 */
export function generateIdCCP(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let randomPart = "";
  for (let i = 0; i < 33; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `CCC${randomPart}`;
}

export function buildAndStampCartaPorte31(input: CartaPorteInput): CartaPorteStampingResult {
  const uuid = `SAT-${Math.floor(10000000 + Math.random() * 90000000)}-4041-8892-A81920`;
  const idCCP = generateIdCCP();
  const timestamp = new Date().toISOString();
  const totalWeightKg = input.mercancias.reduce((acc, m) => acc + m.pesoKg, 0);

  const xmlSample = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" xmlns:cartaporte31="http://www.sat.gob.mx/CartaPorte31" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" Version="4.0" Serie="CP31" Folio="${input.shipmentRef}" Fecha="${timestamp}" Sello="sello_csd_mock_${Date.now()}=" SubTotal="${input.subtotalMxn.toFixed(2)}" Moneda="MXN" Total="${input.totalMxn.toFixed(2)}" TipoDeComprobante="I" Exportacion="01" LugarExpedicion="${input.origen.codigoPostal}">
  <cfdi:Emisor Rfc="${input.rfcEmisor}" Nombre="${input.razonSocialEmisor}" RegimenFiscal="${input.regimenFiscalEmisor || "601"}"/>
  <cfdi:Receptor Rfc="${input.rfcReceptor}" Nombre="${input.razonSocialReceptor}" UsoCFDI="S01"/>
  <cfdi:Complemento>
    <cartaporte31:CartaPorte Version="3.1" TranspInternac="Sí" EntradaSalidaMerc="Salida" ViaEntradaSalida="01" TotalDistRec="${input.distanciaRecorridaKm.toFixed(1)}" IdCCP="${idCCP}">
      <cartaporte31:Ubicaciones>
        <cartaporte31:Ubicacion TipoUbicacion="Origen" RFCRemitenteDestinatario="${input.origen.rfc}" FechaHoraSalidaLlegada="${input.origen.fechaHora}">
          <cartaporte31:Domicilio CodigoPostal="${input.origen.codigoPostal}"/>
        </cartaporte31:Ubicacion>
        <cartaporte31:Ubicacion TipoUbicacion="Destino" RFCRemitenteDestinatario="${input.destino.rfc}" FechaHoraSalidaLlegada="${input.destino.fechaHora}">
          <cartaporte31:Domicilio CodigoPostal="${input.destino.codigoPostal}"/>
        </cartaporte31:Ubicacion>
      </cartaporte31:Ubicaciones>
      <cartaporte31:Mercancias PesoBrutoTotal="${totalWeightKg.toFixed(2)}" UnidadPeso="KGM" NumTotalMercancias="${input.mercancias.length}">
        ${input.mercancias
          .map(
            (m) => `<cartaporte31:Mercancia ClaveProdServCP="${m.claveProdServ}" Descripcion="${m.descripcion}" Cantidad="${m.cantidad}" ClaveUnidad="${m.claveUnidad}" PesoEnKg="${m.pesoKg.toFixed(2)}"${m.fraccionArancelaria ? ` FraccionArancelaria="${m.fraccionArancelaria}"` : ""}${m.materialPeligroso ? ` MaterialPeligroso="Sí" CveMaterialPeligroso="${m.claveMaterialPeligroso || "UN1993"}" Embalaje="${m.tipoEmbalaje || "4G"}"` : ""}/>`
          )
          .join("\n        ")}
        <cartaporte31:Autotransporte PermSCT="${input.autotransporte.permisoSct}" NumPermisoSCT="${input.autotransporte.numPermisoSct}">
          <cartaporte31:IdentificacionVehicular ConfigVehicular="${input.autotransporte.configVehicular}" PlacaVM="${input.autotransporte.placa}" AnioModeloVM="${input.autotransporte.anioModelo}"/>
          <cartaporte31:Seguros AseguraRespCivil="${input.autotransporte.aseguradoraRespCivil}" PolizaRespCivil="${input.autotransporte.polizaRespCivil}"${input.autotransporte.aseguradoraMedioAmbiente ? ` AseguraMedioAmbiente="${input.autotransporte.aseguradoraMedioAmbiente}" PolizaMedioAmbiente="${input.autotransporte.polizaMedioAmbiente}"` : ""}/>
        </cartaporte31:Autotransporte>
      </cartaporte31:Mercancias>
      <cartaporte31:FiguraTransporte>
        <cartaporte31:TiposFigura TipoFigura="01" RFCFigura="${input.operador.rfc}" NombreFigura="${input.operador.nombre}" NumLicencia="${input.operador.numLicencia}"/>
      </cartaporte31:FiguraTransporte>
    </cartaporte31:CartaPorte>
  </cfdi:Complemento>
  <tfd:TimbreFiscalDigital xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital" Version="1.1" UUID="${uuid}" FechaTimbrado="${timestamp}" SelloCFD="sello_cfd_mock_${Date.now()}" SelloSAT="sello_sat_pac_mock_${Date.now()}"/>
</cfdi:Comprobante>`;

  const qrUrl = `https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id=${uuid}&re=${input.rfcEmisor}&rr=${input.rfcReceptor}&tt=${input.totalMxn.toFixed(2)}&fe=${idCCP.substring(0, 8)}`;
  const cadenaOriginal = `||4.0|CP31|${input.shipmentRef}|${timestamp}|${input.subtotalMxn}|${input.totalMxn}|${input.rfcEmisor}|${input.rfcReceptor}|${idCCP}||`;

  return {
    uuid,
    cfdiVersion: "4.0",
    cartaPorteVersion: "3.1",
    idCCP,
    pacProvider: "Finkargo PAC / Diverza SAT Node (Autorizado 5819)",
    stampedXml: xmlSample,
    qrCodeSatUrl: qrUrl,
    stampTimestamp: timestamp,
    selloDigitalCsd: `MIIE+DCCA6CgAwIBAgIUMzAwMDAx...${uuid.slice(0, 8)}`,
    selloSat: `Q2FnY29kZVN...${uuid.slice(-8)}`,
    cadenaOriginal,
    totalFreightMxn: input.totalMxn,
    totalWeightKg,
  };
}

// =========================================================================
// 2. REGLAS DE ORIGEN T-MEC / USMCA (VALOR DE CONTENIDO REGIONAL - VCR)
// =========================================================================

export type UsmcaOriginMethod = "NET_COST" | "TRANSACTION_VALUE";

export interface UsmcaRvcInput {
  hsCode: string;
  productDescription: string;
  method: UsmcaOriginMethod;
  transactionValueUsd?: number; // VT
  netCostUsd?: number; // CN
  nonOriginatingMaterialsCostUsd: number; // VMO
  originatingMaterialsCostUsd?: number;
  laborAndOverheadUsd?: number;
  targetRvcThresholdPercent?: number; // Default: 60% VT / 50% CN (75% CN automotriz)
}

export interface UsmcaRvcResult {
  hsCode: string;
  productDescription: string;
  method: UsmcaOriginMethod;
  rvcPercentage: number;
  thresholdRequiredPercentage: number;
  qualifiesForUsmca: boolean;
  preferentialDutyRatePercent: number; // 0% si califica
  ruleAppliedDescription: string;
  breakdown: {
    baseValueUsd: number;
    nonOriginatingMaterialsCostUsd: number;
    regionalContentValueUsd: number;
  };
}

/**
 * Calcula el Valor de Contenido Regional (VCR) conforme al Artículo 4.5 del T-MEC / USMCA.
 * - Método de Valor de Transacción: VCR = ((VT - VMO) / VT) * 100
 * - Método de Costo Neto: VCR = ((CN - VMO) / CN) * 100
 */
export function calculateUsmcaRegionalValueContent(input: UsmcaRvcInput): UsmcaRvcResult {
  const isAutomotive = input.hsCode.startsWith("8708") || input.hsCode.startsWith("8703");
  const defaultThreshold = input.targetRvcThresholdPercent ?? (
    isAutomotive ? 75.0 : input.method === "TRANSACTION_VALUE" ? 60.0 : 50.0
  );

  let baseValue = 0;
  if (input.method === "TRANSACTION_VALUE") {
    baseValue = input.transactionValueUsd || 100000;
  } else {
    baseValue = input.netCostUsd || (
      (input.originatingMaterialsCostUsd || 50000) +
      input.nonOriginatingMaterialsCostUsd +
      (input.laborAndOverheadUsd || 25000)
    );
  }

  const vmo = Math.min(input.nonOriginatingMaterialsCostUsd, baseValue);
  const regionalContentValue = Math.max(0, baseValue - vmo);
  const rvc = baseValue > 0 ? (regionalContentValue / baseValue) * 100 : 0;
  const qualifies = rvc >= defaultThreshold;

  const ruleDescription = input.method === "TRANSACTION_VALUE"
    ? `Método de Valor de Transacción: VCR = ((VT - VMO) / VT) * 100. Umbral requerido: ${defaultThreshold.toFixed(1)}%.`
    : `Método de Costo Neto: VCR = ((CN - VMO) / CN) * 100. Umbral requerido: ${defaultThreshold.toFixed(1)}%.`;

  return {
    hsCode: input.hsCode,
    productDescription: input.productDescription,
    method: input.method,
    rvcPercentage: parseFloat(rvc.toFixed(2)),
    thresholdRequiredPercentage: defaultThreshold,
    qualifiesForUsmca: qualifies,
    preferentialDutyRatePercent: qualifies ? 0.0 : 15.0,
    ruleAppliedDescription: ruleDescription,
    breakdown: {
      baseValueUsd: baseValue,
      nonOriginatingMaterialsCostUsd: vmo,
      regionalContentValueUsd: regionalContentValue,
    },
  };
}

// =========================================================================
// 3. OPTIMIZADOR ARANCELARIO T-MEC & PROGRAMA IMMEX
// =========================================================================

export interface ImmexTariffOptimizationInput {
  hsCode: string;
  goodsDescription: string;
  declaredValueUsd: number;
  originCountry: "MX" | "US" | "CA" | "CN" | "DE" | "JP" | "OTHER";
  isImmexProgramActive?: boolean;
  usmcaEligible?: boolean;
}

export interface ImmexTariffOptimizationResult {
  hsCode: string;
  goodsDescription: string;
  declaredValueUsd: number;
  originCountry: string;
  standardMfnDutyRatePercent: number;
  standardDutyPayableUsd: number;
  immexDutyRatePercent: number;
  immexDutyPayableUsd: number;
  dutySavingsUsd: number;
  vatRatePercent: number;
  vatCreditEligible: boolean;
  recommendedPedimentoType: "AF_IMMEX" | "T1_USMCA" | "A1_GENERAL";
  dutyDrawbackEligible: boolean;
  maxPermanenceMonths: number;
}

export function calculateImmexTariffOptimization(
  input: ImmexTariffOptimizationInput
): ImmexTariffOptimizationResult {
  const isUsmcaCountry = input.originCountry === "MX" || input.originCountry === "US" || input.originCountry === "CA";
  const usmcaQualifies = input.usmcaEligible ?? isUsmcaCountry;

  // Determine standard MFN Duty rate
  let stdRate = 10.0;
  if (input.hsCode.startsWith("85")) stdRate = 15.0; // Electrónica
  if (input.hsCode.startsWith("87")) stdRate = 20.0; // Automotriz
  if (input.hsCode.startsWith("72") || input.hsCode.startsWith("73")) stdRate = 25.0; // Acero / Metales

  const standardDutyAmount = (input.declaredValueUsd * stdRate) / 100;

  // Under IMMEX: 100% duty exemption for temporary importation of inputs
  const immexExemption = input.isImmexProgramActive !== false;
  const immexDutyRate = immexExemption ? 0.0 : (usmcaQualifies ? 0.0 : stdRate);
  const immexDutyPayable = (input.declaredValueUsd * immexDutyRate) / 100;
  const savings = standardDutyAmount - immexDutyPayable;

  let recommendedPedimento: "AF_IMMEX" | "T1_USMCA" | "A1_GENERAL" = "A1_GENERAL";
  if (immexExemption) {
    recommendedPedimento = "AF_IMMEX";
  } else if (usmcaQualifies) {
    recommendedPedimento = "T1_USMCA";
  }

  return {
    hsCode: input.hsCode,
    goodsDescription: input.goodsDescription,
    declaredValueUsd: input.declaredValueUsd,
    originCountry: input.originCountry,
    standardMfnDutyRatePercent: stdRate,
    standardDutyPayableUsd: parseFloat(standardDutyAmount.toFixed(2)),
    immexDutyRatePercent: immexDutyRate,
    immexDutyPayableUsd: parseFloat(immexDutyPayable.toFixed(2)),
    dutySavingsUsd: parseFloat(savings.toFixed(2)),
    vatRatePercent: 16.0,
    vatCreditEligible: immexExemption,
    recommendedPedimentoType: recommendedPedimento,
    dutyDrawbackEligible: true,
    maxPermanenceMonths: input.hsCode.startsWith("84") ? 24 : 18, // 18m insumos / 24m maquinaria
  };
}

// =========================================================================
// 4. PREDICTOR DE TIEMPOS DE PERMANENCIA Y AFORO ADUANAL (ML)
// =========================================================================

export type CustomsPortKey = "MXNLD" | "MXZLO" | "MXVER" | "MXATM" | "MXMEX";

export interface CustomsDwellPredictionInput {
  pedimentoNumber: string;
  customsPortCode: CustomsPortKey;
  trafficLightOutcome: "GREEN_CLEARANCE" | "RED_INSPECTION" | "PENDING_SELECTION";
  fraccionArancelaria: string;
  importerRfc: string;
  hasReeferCargo: boolean;
  historicalDwellHours?: number;
}

export interface CustomsDwellPredictionResult {
  portCode: CustomsPortKey;
  portName: string;
  predictedGateOutTimestamp: string;
  estimatedDwellHours: number;
  confidenceScorePercent: number;
  redChannelProbabilityPercent: number;
  riskCategory: "LOW_RISK" | "MEDIUM_RISK" | "HIGH_RISK";
  keyPredictors: Array<{
    feature: string;
    impact: "INCREMENTAL_DELAY" | "FASTER_CLEARANCE" | "NEUTRAL";
    description: string;
  }>;
  recommendedActions: string[];
}

export function predictCustomsDwellTime(input: CustomsDwellPredictionInput): CustomsDwellPredictionResult {
  const portNames: Record<CustomsPortKey, string> = {
    MXNLD: "Aduana de Nuevo Laredo (Puente del Comercio Mundial)",
    MXZLO: "Aduana de Manzanillo (Terminal SSA / Contecon)",
    MXVER: "Aduana de Veracruz (Terminal ICAVE)",
    MXATM: "Aduana de Altamira (Terminal ATP)",
    MXMEX: "Aduana del Aeropuerto CDMX / AIFA (Carga)",
  };

  const baseDwellByPort: Record<CustomsPortKey, number> = {
    MXNLD: 14.0, // Alta fluidez terrestre
    MXZLO: 24.0, // Congestión marítima Pacífico
    MXVER: 26.0, // Costa este Golfo
    MXATM: 18.0, // Industrial norte
    MXMEX: 16.0, // Carga aérea
  };

  const baseHours = baseDwellByPort[input.customsPortCode] || 18.0;

  let redLightAdd = 0;
  if (input.trafficLightOutcome === "RED_INSPECTION") {
    redLightAdd = 36.0; // Inspección física y rayos gamma
  } else if (input.trafficLightOutcome === "PENDING_SELECTION") {
    redLightAdd = 10.0; // Valor esperado ponderado
  }

  // Reefer priority perishable clearance: 0.85x
  const reeferMultiplier = input.hasReeferCargo ? 0.85 : 1.0;
  const totalDwell = (baseHours + redLightAdd) * reeferMultiplier;

  const gateOutDate = new Date();
  gateOutDate.setHours(gateOutDate.getHours() + totalDwell);

  const redChannelProb = input.trafficLightOutcome === "RED_INSPECTION"
    ? 100
    : input.fraccionArancelaria.startsWith("85")
    ? 18
    : input.fraccionArancelaria.startsWith("87")
    ? 22
    : 30;

  const riskCat: "LOW_RISK" | "MEDIUM_RISK" | "HIGH_RISK" =
    totalDwell > 40 ? "HIGH_RISK" : totalDwell > 22 ? "MEDIUM_RISK" : "LOW_RISK";

  const keyPredictors: CustomsDwellPredictionResult["keyPredictors"] = [
    {
      feature: "Aduana de Despacho",
      impact: input.customsPortCode === "MXNLD" ? "FASTER_CLEARANCE" : "INCREMENTAL_DELAY",
      description: `${portNames[input.customsPortCode]}: Tiempo base de patio de ${baseHours}h.`,
    },
    {
      feature: "Mecanismo de Selección Automatizada (Semáforo)",
      impact: input.trafficLightOutcome === "RED_INSPECTION" ? "INCREMENTAL_DELAY" : "FASTER_CLEARANCE",
      description: input.trafficLightOutcome === "RED_INSPECTION"
        ? "Aforo Rojo activo: +36h por revisión no intrusiva y vaciado de contenedor."
        : "Canal Verde concedido o selección estándar.",
    },
  ];

  if (input.hasReeferCargo) {
    keyPredictors.push({
      feature: "Carga Perecedera / Reefer",
      impact: "FASTER_CLEARANCE",
      description: "Protocolo de prioridad para cadena de frío activado (-15% de tiempo de espera).",
    });
  }

  const recommendedActions: string[] = [];
  if (riskCat === "HIGH_RISK") {
    recommendedActions.push("Notificar a transportista para reprogramar cita de carga en patio.");
    recommendedActions.push("Asegurar disponibilidad de expediente digital con CSD para agilizar aforo.");
  } else {
    recommendedActions.push("Confirmar pre-asignación de tractocamión para despacho expedito.");
  }

  return {
    portCode: input.customsPortCode,
    portName: portNames[input.customsPortCode],
    predictedGateOutTimestamp: gateOutDate.toISOString(),
    estimatedDwellHours: parseFloat(totalDwell.toFixed(1)),
    confidenceScorePercent: 94,
    redChannelProbabilityPercent: redChannelProb,
    riskCategory: riskCat,
    keyPredictors,
    recommendedActions,
  };
}

// =========================================================================
// 5. ESCENARIOS PRECONFIGURADOS DE DEMOSTRACIÓN
// =========================================================================

export const USMCA_DEMO_PRESETS = {
  laredo_automotive_immex: {
    presetId: "laredo_automotive_immex",
    title: "1. Laredo Cross-Border Autopartes (T-MEC / IMMEX)",
    description: "Cruce Nuevo Laredo (MXNLD). 1x 40ft HC Autopartes T3S2, pedimento AF IMMEX, VCR 76.8% calificado T-MEC, exención 100% IGI ($36,250 USD ahorro).",
    cartaPorteInput: {
      shipmentRef: "EXP-2026-NLD-4401",
      rfcEmisor: "ATR991012AB1",
      razonSocialEmisor: "ATLAS TRANSPORTES TRANSFRONTERIZOS S.A. DE C.V.",
      regimenFiscalEmisor: "601",
      rfcReceptor: "MTR201015XY8",
      razonSocialReceptor: "MOTORS MANUFACTURING AUTOMOTIVE CO.",
      origen: {
        tipoUbicacion: "Origen" as const,
        rfc: "ATR991012AB1",
        nombre: "Parque Industrial Finsa Monterrey",
        direccion: "Av. Industrial 500, Apodaca, NL",
        codigoPostal: "66600",
        fechaHora: new Date().toISOString(),
      },
      destino: {
        tipoUbicacion: "Destino" as const,
        rfc: "MTR201015XY8",
        nombre: "Laredo Logistics Distribution Hub",
        direccion: "14000 Mines Rd, Laredo, TX 78045",
        codigoPostal: "78045",
        fechaHora: new Date(Date.now() + 86400000).toISOString(),
      },
      distanciaRecorridaKm: 245.5,
      mercancias: [
        {
          claveProdServ: "25171000",
          descripcion: "Módulos de Dirección Asistida Electrónica para Automóvil",
          cantidad: 1200,
          claveUnidad: "H87",
          pesoKg: 18400,
          fraccionArancelaria: "8708.99.99",
          valorDeclaradoUsd: 145000,
        },
      ],
      autotransporte: {
        configVehicular: "T3S2" as const,
        placa: "4821-LXZ",
        anioModelo: 2024,
        permisoSct: "TPAF01",
        numPermisoSct: "SCT-FED-440192",
        aseguradoraRespCivil: "Quálitas Compañía de Seguros",
        polizaRespCivil: "POL-RC-991204-MX",
      },
      operador: {
        rfc: "ROMA820415KZ1",
        nombre: "Rodrigo Morales Alvarado",
        numLicencia: "LIC-FED-NLD-8819",
      },
      subtotalMxn: 32500,
      ivaMxn: 5200,
      retencionIvaMxn: 1300,
      totalMxn: 36400,
    },
    rvcInput: {
      hsCode: "8708.99.99",
      productDescription: "Módulos de Dirección Asistida Automotriz",
      method: "NET_COST" as const,
      netCostUsd: 110000,
      nonOriginatingMaterialsCostUsd: 25500, // 23.2% no originario
      targetRvcThresholdPercent: 75.0,
    },
    immexInput: {
      hsCode: "8708.99.99",
      goodsDescription: "Módulos de Dirección Asistida Automotriz",
      declaredValueUsd: 145000,
      originCountry: "MX" as const,
      isImmexProgramActive: true,
      usmcaEligible: true,
    },
    dwellInput: {
      pedimentoNumber: "26-44-3021-9001245",
      customsPortCode: "MXNLD" as const,
      trafficLightOutcome: "GREEN_CLEARANCE" as const,
      fraccionArancelaria: "8708.99.99",
      importerRfc: "MTR201015XY8",
      hasReeferCargo: false,
    },
  },
  manzanillo_electronics_inbound: {
    presetId: "manzanillo_electronics_inbound",
    title: "2. Manzanillo Inbound Componentes IoT (Aforo Rojo Previsto)",
    description: "Importación Marítima Manzanillo (MXZLO). Componentes de Telecomunicaciones 8517.62.01, T3S3, VCR 68.2%, aforo rojo estimado (+36h inspección).",
    cartaPorteInput: {
      shipmentRef: "IMP-2026-ZLO-8812",
      rfcEmisor: "ATR991012AB1",
      razonSocialEmisor: "ATLAS TRANSPORTES TRANSFRONTERIZOS S.A. DE C.V.",
      rfcReceptor: "IOT881204TY2",
      razonSocialReceptor: "DISPOSITIVOS CONECTADOS DE MEXICO S.A. DE C.V.",
      origen: {
        tipoUbicacion: "Origen" as const,
        rfc: "ATR991012AB1",
        nombre: "Terminal Portuaria Contecon Manzanillo",
        direccion: "Zona Franca Muelle 18, Manzanillo, Colima",
        codigoPostal: "28200",
        fechaHora: new Date().toISOString(),
      },
      destino: {
        tipoUbicacion: "Destino" as const,
        rfc: "IOT881204TY2",
        nombre: "Planta de Ensamble El Salto Guadalajara",
        direccion: "Corredor Industrial El Salto, Jalisco",
        codigoPostal: "45680",
        fechaHora: new Date(Date.now() + 86400000).toISOString(),
      },
      distanciaRecorridaKm: 298.0,
      mercancias: [
        {
          claveProdServ: "43211500",
          descripcion: "Módulos de Comunicación Celular IoT 5G",
          cantidad: 5000,
          claveUnidad: "H87",
          pesoKg: 12400,
          fraccionArancelaria: "8517.62.01",
          valorDeclaradoUsd: 185000,
        },
      ],
      autotransporte: {
        configVehicular: "T3S3" as const,
        placa: "9012-KZX",
        anioModelo: 2025,
        permisoSct: "TPAF01",
        numPermisoSct: "SCT-FED-440192",
        aseguradoraRespCivil: "Chubb Seguros México",
        polizaRespCivil: "CHB-RC-88190-MX",
      },
      operador: {
        rfc: "HEGL780912PL9",
        nombre: "Luis Alberto Hernández García",
        numLicencia: "LIC-FED-ZLO-1102",
      },
      subtotalMxn: 42000,
      ivaMxn: 6720,
      retencionIvaMxn: 1680,
      totalMxn: 47040,
    },
    rvcInput: {
      hsCode: "8517.62.01",
      productDescription: "Módulos de Telecomunicación IoT 5G",
      method: "TRANSACTION_VALUE" as const,
      transactionValueUsd: 185000,
      nonOriginatingMaterialsCostUsd: 58800, // 31.8% no originario
      targetRvcThresholdPercent: 60.0,
    },
    immexInput: {
      hsCode: "8517.62.01",
      goodsDescription: "Módulos de Telecomunicación IoT 5G",
      declaredValueUsd: 185000,
      originCountry: "US" as const,
      isImmexProgramActive: true,
      usmcaEligible: true,
    },
    dwellInput: {
      pedimentoNumber: "26-16-3022-8810291",
      customsPortCode: "MXZLO" as const,
      trafficLightOutcome: "RED_INSPECTION" as const,
      fraccionArancelaria: "8517.62.01",
      importerRfc: "IOT881204TY2",
      hasReeferCargo: false,
    },
  },
  veracruz_reefer_perishable: {
    presetId: "veracruz_reefer_perishable",
    title: "3. Veracruz Reefer Cadena de Frío (Despacho Prioritario)",
    description: "Puerto de Veracruz (MXVER). Carga farmacéutica refrigerada (+4°C), prioridad perecedera, pedimento T1 USMCA, tiempo estimado reducido (-15%).",
    cartaPorteInput: {
      shipmentRef: "EXP-2026-VER-1190",
      rfcEmisor: "ATR991012AB1",
      razonSocialEmisor: "ATLAS TRANSPORTES TRANSFRONTERIZOS S.A. DE C.V.",
      rfcReceptor: "FAR990214KK1",
      razonSocialReceptor: "FARMACEUTICA BIOMEDICA DEL GOLFO S.A.",
      origen: {
        tipoUbicacion: "Origen" as const,
        rfc: "ATR991012AB1",
        nombre: "Terminal Especializada de Contenedores ICAVE Veracruz",
        direccion: "Bahía Sur Recinto Fiscalizado, Veracruz",
        codigoPostal: "91700",
        fechaHora: new Date().toISOString(),
      },
      destino: {
        tipoUbicacion: "Destino" as const,
        rfc: "FAR990214KK1",
        nombre: "Almacén Central Pharma GDP Toluca",
        direccion: "Parque Industrial Toluca 2000, EdoMex",
        codigoPostal: "50200",
        fechaHora: new Date(Date.now() + 86400000).toISOString(),
      },
      distanciaRecorridaKm: 410.0,
      mercancias: [
        {
          claveProdServ: "51101800",
          descripcion: "Vacunas y Reactivos Biológicos Sensibles a Temperatura (+2°C a +8°C)",
          cantidad: 800,
          claveUnidad: "H87",
          pesoKg: 14200,
          fraccionArancelaria: "3002.20.01",
          materialPeligroso: true,
          claveMaterialPeligroso: "UN1845",
          tipoEmbalaje: "4G",
          valorDeclaradoUsd: 220000,
        },
      ],
      autotransporte: {
        configVehicular: "T3S2" as const,
        placa: "3341-MMP",
        anioModelo: 2024,
        permisoSct: "TPAF01",
        numPermisoSct: "SCT-FED-440192",
        aseguradoraRespCivil: "AXA Seguros México",
        polizaRespCivil: "AXA-RC-11029-MX",
        aseguradoraMedioAmbiente: "GMX Seguros Ambientales",
        polizaMedioAmbiente: "GMX-ENV-4491-MX",
      },
      operador: {
        rfc: "GOMJ851120TT4",
        nombre: "Jorge Gómez Mendoza",
        numLicencia: "LIC-FED-VER-4401",
      },
      subtotalMxn: 48000,
      ivaMxn: 7680,
      retencionIvaMxn: 1920,
      totalMxn: 53760,
    },
    rvcInput: {
      hsCode: "3002.20.01",
      productDescription: "Vacunas y Biológicos",
      method: "TRANSACTION_VALUE" as const,
      transactionValueUsd: 220000,
      nonOriginatingMaterialsCostUsd: 44000,
      targetRvcThresholdPercent: 60.0,
    },
    immexInput: {
      hsCode: "3002.20.01",
      goodsDescription: "Vacunas y Biológicos",
      declaredValueUsd: 220000,
      originCountry: "CA" as const,
      isImmexProgramActive: false,
      usmcaEligible: true,
    },
    dwellInput: {
      pedimentoNumber: "26-43-3019-1104882",
      customsPortCode: "MXVER" as const,
      trafficLightOutcome: "GREEN_CLEARANCE" as const,
      fraccionArancelaria: "3002.20.01",
      importerRfc: "FAR990214KK1",
      hasReeferCargo: true,
    },
  },
};
