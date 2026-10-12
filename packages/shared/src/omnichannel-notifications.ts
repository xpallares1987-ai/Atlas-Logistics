/**
 * Omnichannel Notifications & Driver Dispatch Engine
 * Microsoft Teams Adaptive Cards 1.5 & Telegram Driver/Yard Gateway
 */

// =========================================================================
// 1. TYPES & DATA STRUCTURES: MS TEAMS ADAPTIVE CARDS 1.5
// =========================================================================

export type OperationalAnomalyType =
  | "SPAIN_FWD_REF_DUPLICATE"
  | "CUSTOMS_CANAL_ROJO"
  | "COLD_CHAIN_TEMP_BREACH"
  | "HAZMAT_VIOLATION"
  | "GROSS_PROFIT_LEAKAGE"
  | "BL_RELEASE_BLOCKED"
  | "ETA_P1_CRITICAL_DELAY"
  | "DEMURRAGE_DETENTION_SPIKE";

export interface AnomalyPayloadContext {
  gsid: string;
  forwardingRef?: string;
  title?: string;
  description?: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  operator?: string;
  detectedAt?: string;
  location?: string;
  transportMode?: string;
  metadata?: Record<string, string | number | boolean | undefined>;
}

export interface WebhookAuditLog {
  id: string;
  anomalyType: OperationalAnomalyType;
  gsid: string;
  dispatchedAt: string;
  targetUrl: string;
  status: "DELIVERED" | "FAILED" | "SIMULATED";
  httpStatus?: number;
  errorMessage?: string;
  payloadPreview: Record<string, unknown>;
  hmacSignature?: string;
}

export interface AdaptiveCardFact {
  title: string;
  value: string;
}

export interface AdaptiveCardAction {
  type: "Action.OpenUrl" | "Action.Submit";
  title: string;
  url?: string;
  style?: "positive" | "destructive" | "default";
  data?: Record<string, unknown>;
}

// =========================================================================
// 2. CRYPTOGRAPHIC HMAC SIGNER (CROSS-ENVIRONMENT)
// =========================================================================

export function generateHmacSignature(content: string, secret: string = "atlas-scm-teams-secret-key-2026"): string {
  try {
    if (typeof process !== "undefined" && process?.versions?.node) {
      const getNodeCrypto = new Function('try { return require("crypto"); } catch(e) { return null; }');
      const nodeCrypto = getNodeCrypto();
      if (nodeCrypto && typeof nodeCrypto.createHmac === "function") {
        return nodeCrypto.createHmac("sha256", secret).update(content).digest("hex");
      }
    }
  } catch {
    // fallback below
  }

  // Deterministic fallback for browser or sandboxed test runs
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    hash = (hash << 5) - hash + content.charCodeAt(i) + secret.charCodeAt(i % secret.length);
    hash |= 0;
  }
  return `hmac_${Math.abs(hash).toString(16).padStart(32, "0")}`;
}

// =========================================================================
// 3. ADAPTIVE CARDS 1.5 TEMPLATE BUILDER
// =========================================================================

export function getSeverityHexColor(severity: string): string {
  switch (severity) {
    case "CRITICAL":
      return "#E11D48"; // Rose-600
    case "HIGH":
      return "#EA580C"; // Orange-600
    case "MEDIUM":
      return "#D97706"; // Amber-600
    case "LOW":
    default:
      return "#2563EB"; // Blue-600
  }
}

export function formatFactTitle(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

export function getAnomalyMetadata(
  type: OperationalAnomalyType,
  ctx: AnomalyPayloadContext
): {
  headline: string;
  description: string;
  bannerIcon: string;
  accentContainerColor: "attention" | "warning" | "emphasis" | "good" | "default";
} {
  switch (type) {
    case "SPAIN_FWD_REF_DUPLICATE":
      return {
        headline: "CRITICAL: Referencia Transitaria Duplicada en España",
        description: `Incidencia operacional detectada: El GSID "${ctx.gsid}" tiene múltiples referencias transitarias en España (${ctx.forwardingRef || "DUPLICATE"}). Esto viola la regla 1 de cumplimiento y requiere auditoría de bloqueo inmediato.`,
        bannerIcon: "🚫",
        accentContainerColor: "attention",
      };
    case "CUSTOMS_CANAL_ROJO":
      return {
        headline: "ALERTA ADUANERA: Canal Rojo (Inspección Física y Documental)",
        description: `Autoridad aduanera (AEAT / SAT / VUCEM) designó el expediente "${ctx.gsid}" a CANAL ROJO. Se requiere aforo físico completo de contenedor y cotejo arancelario antes del levante.`,
        bannerIcon: "🛑",
        accentContainerColor: "attention",
      };
    case "COLD_CHAIN_TEMP_BREACH":
      return {
        headline: "EXCEPCIÓN IOT: Excursión Térmica en Cadena de Frío",
        description: `Telemetría IoT reportó desviación severa de temperatura en contenedor reefer (${ctx.gsid}). Rango térmico excedido por más de 60 minutos con riesgo crítico de merma o daño en producto farmacéutico/perecedero.`,
        bannerIcon: "❄️",
        accentContainerColor: "warning",
      };
    case "HAZMAT_VIOLATION":
      return {
        headline: "HAZMAT CRÍTICO: No Conformidad IMDG / ADR de Mercancías Peligrosas",
        description: `Fallo de validación de segregación o etiquetado de mercancías peligrosas en expediente "${ctx.gsid}". Carga retenida en cuarentena a la espera de inspección pericial.`,
        bannerIcon: "☣️",
        accentContainerColor: "attention",
      };
    case "GROSS_PROFIT_LEAKAGE":
      return {
        headline: "CONTROL FINANCIERO: Fuga de Margen de Beneficio / Pérdida en Expediente",
        description: `El expediente "${ctx.gsid}" ha caído en margen negativo. Los costes de proveedor y estadías superan ampliamente las provisiones presupuestadas. Requiere anulación o autorización gerencial.`,
        bannerIcon: "📉",
        accentContainerColor: "warning",
      };
    case "BL_RELEASE_BLOCKED":
      return {
        headline: "LIBERACIÓN DOCUMENTAL: Bill of Lading Bloqueado (Facturas Impagadas)",
        description: `El control automático de crédito ha bloqueado la entrega y liberación del e-BL para "${ctx.gsid}". Existen facturas vencidas pendientes de cobro previo a la entrega de la mercancía.`,
        bannerIcon: "🔒",
        accentContainerColor: "emphasis",
      };
    case "ETA_P1_CRITICAL_DELAY":
      return {
        headline: "EXCEPCIÓN DE TRÁFICO: Retraso Crítico en ETA (> 48 hrs)",
        description: `Demora imprevista en la navegación/tránsito del tramo principal para "${ctx.gsid}". Conexiones ferroviarias y de acarreo secundario comprometidas.`,
        bannerIcon: "⏱️",
        accentContainerColor: "warning",
      };
    case "DEMURRAGE_DETENTION_SPIKE":
      return {
        headline: "ALERTA SOBREESTADÍAS: Vencimiento Inminente de Días Libres (D&D)",
        description: `Los costes de ocupación portuaria y demora de contenedor (D&D) comenzarán a devengarse en breve para "${ctx.gsid}". Se requiere retirada prioritaria de muelle.`,
        bannerIcon: "⚓",
        accentContainerColor: "warning",
      };
  }
}

export function generateAdaptiveCardPayload(
  type: OperationalAnomalyType,
  ctx: AnomalyPayloadContext
): Record<string, unknown> {
  const timestamp = ctx.detectedAt || new Date().toISOString();

  const baseFacts: AdaptiveCardFact[] = [
    { title: "GSID (Global Shipment ID)", value: ctx.gsid },
    { title: "Fecha de Detección", value: timestamp },
    { title: "Severidad", value: ctx.severity },
    { title: "Modo de Transporte", value: ctx.transportMode || "MULTIMODAL" },
  ];

  if (ctx.forwardingRef) {
    baseFacts.push({ title: "Referencia Transitaria", value: ctx.forwardingRef });
  }
  if (ctx.location) {
    baseFacts.push({ title: "Ubicación / Terminal", value: ctx.location });
  }

  if (ctx.metadata) {
    Object.entries(ctx.metadata).forEach(([k, v]) => {
      if (v !== undefined) {
        baseFacts.push({ title: formatFactTitle(k), value: String(v) });
      }
    });
  }

  const { headline, description, bannerIcon, accentContainerColor } = getAnomalyMetadata(type, ctx);

  const adaptiveCard = {
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    type: "AdaptiveCard",
    version: "1.5",
    msteams: {
      width: "Full",
    },
    body: [
      {
        type: "Container",
        style: accentContainerColor,
        bleed: true,
        items: [
          {
            type: "ColumnSet",
            columns: [
              {
                type: "Column",
                width: "auto",
                items: [
                  {
                    type: "TextBlock",
                    text: bannerIcon,
                    size: "ExtraLarge",
                    weight: "Bolder",
                  },
                ],
              },
              {
                type: "Column",
                width: "stretch",
                items: [
                  {
                    type: "TextBlock",
                    text: headline,
                    weight: "Bolder",
                    size: "Large",
                    wrap: true,
                  },
                  {
                    type: "TextBlock",
                    text: `ATLAS-LOGISTICS SCM CONTROL TOWER • SEVERIDAD ${ctx.severity}`,
                    isSubtle: true,
                    size: "Small",
                    spacing: "None",
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        type: "Container",
        spacing: "Medium",
        items: [
          {
            type: "TextBlock",
            text: description,
            wrap: true,
            size: "Medium",
          },
        ],
      },
      {
        type: "Container",
        spacing: "Medium",
        style: "emphasis",
        items: [
          {
            type: "FactSet",
            facts: baseFacts,
          },
        ],
      },
      {
        type: "TextBlock",
        text: `Disparado por Motor de Telemetría & Torre de Control • Operador Asignado: ${ctx.operator || "Dispatcher de Guardia"}`,
        isSubtle: true,
        size: "Small",
        spacing: "Medium",
      },
    ],
    actions: [
      {
        type: "Action.OpenUrl",
        title: `Inspeccionar ${ctx.gsid} en Torre de Control`,
        url: `http://localhost:3000/#/control-tower?gsid=${encodeURIComponent(ctx.gsid)}&focus=anomaly`,
        style: "positive",
      },
      {
        type: "Action.OpenUrl",
        title: "Abrir Sala de Incidentes (War Room)",
        url: `http://localhost:3000/#/war-room?incident=${encodeURIComponent(ctx.gsid)}`,
      },
    ],
  };

  return {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        contentUrl: null,
        content: adaptiveCard,
      },
    ],
  };
}

export function getSampleAnomalyContext(type: OperationalAnomalyType): AnomalyPayloadContext {
  switch (type) {
    case "SPAIN_FWD_REF_DUPLICATE":
      return {
        gsid: "GS-2026-MAD-99120",
        forwardingRef: "ES-MAD-FWD-44109",
        severity: "CRITICAL",
        operator: "Elena Navarro (Customs Lead - ES)",
        location: "Madrid Barajas Cargo Hub (ESMAD)",
        transportMode: "AIR",
        metadata: {
          duplicateRef: "ES-MAD-FWD-44109",
          previousAssignmentDate: "2026-09-18T10:14:00Z",
          ruleViolation: "CRITICAL_DOMAIN_RULE_1_SPAIN_MAX_ONE_FWD_REF",
          actionRequired: "Bloqueo operacional inmediato y auditoría",
        },
      };
    case "CUSTOMS_CANAL_ROJO":
      return {
        gsid: "GS-2026-VLC-11402",
        forwardingRef: "FWD-VLC-8821",
        severity: "CRITICAL",
        operator: "Carlos Méndez (Representante Aduanero OEA)",
        location: "Terminal Portuaria Noatum Valencia (ESVLC)",
        transportMode: "SEA",
        metadata: {
          duaNumber: "26-ES-0044-3021-9001245",
          canal: "CANAL ROJO (Aforo Físico y Documental)",
          muelleInspeccion: "Patio Fiscalizado Muelle de Levante",
          valorDeclaradoUSD: "$148,500.00",
          tiempoRetencionEstimado: "48 horas",
        },
      };
    case "COLD_CHAIN_TEMP_BREACH":
      return {
        gsid: "GS-2026-ROT-33290",
        forwardingRef: "FWD-PHARMA-004",
        severity: "HIGH",
        operator: "Daemon de Telemetría IoT Atlas",
        location: "Terminal ECT Delta Rotterdam (NLRTM)",
        transportMode: "SEA",
        metadata: {
          sensorId: "IOT-REEFER-7718",
          containerNumber: "MSKU-982341-2",
          cargoType: "Vacunas y Biológicos Sensibles (Pharma GDP)",
          umbralMaximoCelsius: "+4.0°C",
          temperaturaActual: "+14.8°C",
          duracionExcursionMinutos: 75,
        },
      };
    case "HAZMAT_VIOLATION":
      return {
        gsid: "GS-2026-ALG-55012",
        forwardingRef: "FWD-ALG-3391",
        severity: "CRITICAL",
        operator: "Oficial de Seguridad IMDG/ADR",
        location: "Puerto Bahía de Algeciras (ESALG)",
        transportMode: "SEA",
        metadata: {
          unNumber: "UN 1993",
          imoClass: "Clase 3 (Líquidos Inflamables)",
          packingGroup: "PG II",
          segregacionInfraccion: "Cercanía < 3m con Clase 5.1 (Comburentes)",
          zonaCuarentena: "Área de Aislamiento Peligroso AP-1",
        },
      };
    case "GROSS_PROFIT_LEAKAGE":
      return {
        gsid: "GS-2026-HAM-88310",
        forwardingRef: "FWD-HAM-2201",
        severity: "HIGH",
        operator: "Control de Gestión & Facturación",
        location: "Puerto de Hamburgo (DEHAM)",
        transportMode: "SEA",
        metadata: {
          provisionPresupuestadaUSD: "$12,400.00",
          costesRealesUSD: "$16,850.00",
          perdidaMargenBrutoUSD: "-$4,450.00",
          desviacionPorcentual: "-35.8%",
          decisionDMN: "REQUIERE_AUTORIZACION_GERENCIAL",
        },
      };
    case "BL_RELEASE_BLOCKED":
      return {
        gsid: "GS-2026-BCN-77401",
        forwardingRef: "FWD-BCN-0091",
        severity: "MEDIUM",
        operator: "Gatekeeper de Crédito y Tesorería",
        location: "Barcelona ZAL (ESBCN)",
        transportMode: "ROAD",
        metadata: {
          facturasVencidasContador: 2,
          saldoDeudorUSD: "$8,920.00",
          antiguedadMayorDias: 45,
          estadoLiberacion: "ENTREGA_EBL_SUSPENDIDA",
        },
      };
    case "ETA_P1_CRITICAL_DELAY":
      return {
        gsid: "GS-2026-SZX-66210",
        forwardingRef: "FWD-SZX-4412",
        severity: "HIGH",
        operator: "Torre de Control Marítima",
        location: "Estrecho de Malaca (En Tránsito)",
        transportMode: "SEA",
        metadata: {
          buque: "MSC GÜLSÜN",
          retrasoAcumuladoHoras: 58,
          nuevoEtaPuerto: "2026-10-18T14:00:00Z",
          enlacesAfectados: "Conexión ferroviaria Valencia-Zaragoza",
        },
      };
    case "DEMURRAGE_DETENTION_SPIKE":
      return {
        gsid: "GS-2026-BIO-22914",
        forwardingRef: "FWD-BIO-7719",
        severity: "HIGH",
        operator: "Monitor D&D de Terminal",
        location: "Puerto de Bilbao (ESBIO)",
        transportMode: "SEA",
        metadata: {
          diasLibresRestantes: 0,
          tarifaDiariaDndEUR: "145.00 €/día",
          costeAcumuladoEUR: "580.00 €",
          accionUrgente: "Retirada inmediata con camión portacontenedor",
        },
      };
  }
}

// =========================================================================
// 4. TELEGRAM DRIVER & YARD DISPATCH ENGINE
// =========================================================================

export type TelegramDriverReportType =
  | "GATE_OUT_TIMESTAMP"
  | "YARD_DELAY"
  | "FUEL_RECEIPT"
  | "POD_SUBMISSION";

export interface TelegramDriverMessage {
  messageId: string;
  driverName: string;
  telegramChatId: string;
  truckId: string;
  reportType: TelegramDriverReportType;
  details: string;
  amountOrMinutes?: number;
  location?: string;
  photoUrl?: string;
  timestamp: string;
  status: "PROCESSED_SCM" | "PENDING_REVIEW";
}

export interface TelegramDispatchOrder {
  orderId: string;
  driverName: string;
  telegramChatId: string;
  truckId: string;
  pickupLocation: string;
  deliveryLocation: string;
  cargoDescription: string;
  containerNumber?: string;
  scheduledPickupTime: string;
  dispatchedAt: string;
  status: "DISPATCHED" | "ACKNOWLEDGED" | "COMPLETED";
}

export function createDriverReport(
  driverName: string,
  telegramChatId: string,
  truckId: string,
  reportType: TelegramDriverReportType,
  details: string,
  amountOrMinutes?: number,
  location?: string
): TelegramDriverMessage {
  return {
    messageId: `TG-MSG-${Math.floor(1000 + Math.random() * 9000)}`,
    driverName,
    telegramChatId,
    truckId,
    reportType,
    details,
    amountOrMinutes,
    location: location || "Terminal Aduanera / Patio Operativo",
    timestamp: new Date().toISOString(),
    status: "PROCESSED_SCM",
  };
}

export function createDispatchOrder(params: {
  driverName: string;
  telegramChatId: string;
  truckId: string;
  pickupLocation: string;
  deliveryLocation: string;
  cargoDescription: string;
  containerNumber?: string;
  scheduledPickupTime?: string;
}): TelegramDispatchOrder {
  return {
    orderId: `DSP-ORD-${Math.floor(10000 + Math.random() * 90000)}`,
    driverName: params.driverName,
    telegramChatId: params.telegramChatId,
    truckId: params.truckId,
    pickupLocation: params.pickupLocation,
    deliveryLocation: params.deliveryLocation,
    cargoDescription: params.cargoDescription,
    containerNumber: params.containerNumber,
    scheduledPickupTime: params.scheduledPickupTime || new Date(Date.now() + 7200000).toISOString(),
    dispatchedAt: new Date().toISOString(),
    status: "DISPATCHED",
  };
}
