import { db } from "../../db/index.js";
import { tradeSanctions, hsCodes } from "../../db/schema/operations.js";
import { eq, or } from "drizzle-orm";

export interface ComplianceAuditInput {
  eoriNumber?: string;
  consigneeName?: string;
  originCountry: string;
  destinationCountry?: string;
  hsCode: string;
  customsValue: number;
  grossWeightKg?: number;
  hasPreferentialOriginCert?: boolean;
  attachedDocumentTypes?: string[]; // e.g. ['DOC-INV', 'DOC-HBL', 'DOC-PKL', 'DOC-COO']
}

export interface ComplianceRuleOutcome {
  ruleId: string;
  ruleName: string;
  category: "EORI" | "SANCTIONS" | "DUAL_USE" | "VALUATION" | "DOCUMENTATION";
  passed: boolean;
  riskPoints: number;
  severity: "INFO" | "WARNING" | "CRITICAL";
  message: string;
}

export interface ComplianceAuditResult {
  riskScore: number; // 0 - 100
  channel: "Green Channel" | "Orange Channel" | "Red Channel";
  channelSpanish:
    | "Canal Verde (Levante)"
    | "Canal Naranja (Documental)"
    | "Canal Rojo (Físico)";
  statusSummary: string;
  rulesEvaluated: ComplianceRuleOutcome[];
  triggeredFlags: string[];
  recommendedActions: string[];
  isCleared: boolean;
}

export class ComplianceService {
  /**
   * Deterministic customs compliance audit and risk channel determination.
   */
  static async auditDeclaration(
    input: ComplianceAuditInput,
  ): Promise<ComplianceAuditResult> {
    const origin = input.originCountry.trim().toUpperCase();
    const destination = (input.destinationCountry || "ES").trim().toUpperCase();
    const rules: ComplianceRuleOutcome[] = [];
    const attachedDocs = (input.attachedDocumentTypes || []).map((d) =>
      d.toUpperCase(),
    );

    let totalRiskPoints = 0;

    // --- RULE 1: EORI FORMAT & VALIDATION ---
    const eori = input.eoriNumber?.trim().toUpperCase() || "";
    const eoriRegex = /^[A-Z]{2}[A-Z0-9]{8,15}$/;
    if (!eori) {
      totalRiskPoints += 30;
      rules.push({
        ruleId: "EORI-01",
        ruleName: "EORI Obligatorio",
        category: "EORI",
        passed: false,
        riskPoints: 30,
        severity: "CRITICAL",
        message:
          "Número EORI no proporcionado. El despacho aduanero en la UE requiere EORI válido.",
      });
    } else if (!eoriRegex.test(eori)) {
      totalRiskPoints += 25;
      rules.push({
        ruleId: "EORI-02",
        ruleName: "Formato de EORI",
        category: "EORI",
        passed: false,
        riskPoints: 25,
        severity: "WARNING",
        message: `El EORI ${eori} no cumple la estructura sintáctica estándar de la UE (ISO 2 letras + 8-15 caracteres).`,
      });
    } else {
      rules.push({
        ruleId: "EORI-01",
        ruleName: "EORI Válido",
        category: "EORI",
        passed: true,
        riskPoints: 0,
        severity: "INFO",
        message: `EORI ${eori} verificado y conforme a la normativa aduanera europea.`,
      });
    }

    // --- RULE 2: TRADE SANCTIONS & EMBARGO SCREENING ---
    const sanctionsList = await db
      .select()
      .from(tradeSanctions)
      .where(
        or(
          eq(tradeSanctions.countryCode, origin),
          eq(tradeSanctions.countryCode, destination),
        ),
      );

    const activeSanction = sanctionsList.find((s) => s.isActive !== 0);
    if (activeSanction) {
      if (activeSanction.sanctionType === "EMBARGO") {
        totalRiskPoints += 85;
        rules.push({
          ruleId: "SANC-01",
          ruleName: "Embargo Comercial Activo",
          category: "SANCTIONS",
          passed: false,
          riskPoints: 85,
          severity: "CRITICAL",
          message: `El país de origen ${origin} (${activeSanction.countryName}) está sujeto a embargo comercial total.`,
        });
      } else {
        totalRiskPoints += 45;
        rules.push({
          ruleId: "SANC-02",
          ruleName: "Régimen Sancionador Restrictivo",
          category: "SANCTIONS",
          passed: false,
          riskPoints: 45,
          severity: "CRITICAL",
          message: `El país ${origin} está sujeto a medidas restrictivas sectoriales: ${activeSanction.description || "Comercio controlado"}.`,
        });
      }
    } else {
      rules.push({
        ruleId: "SANC-01",
        ruleName: "Screening de Sanciones Internacionales",
        category: "SANCTIONS",
        passed: true,
        riskPoints: 0,
        severity: "INFO",
        message: `Ni el origen (${origin}) ni el destino (${destination}) figuran en listas de embargo comercial.`,
      });
    }

    // --- RULE 3: DUAL-USE COMMODITY SCREENING ---
    const cleanHs = input.hsCode.replace(/[\.\s]/g, "");
    const hsData = await db
      .select()
      .from(hsCodes)
      .where(eq(hsCodes.code, input.hsCode))
      .limit(1);

    const isDualUseDb = hsData[0]?.isDualUse === 1;
    const isDualUseChapter =
      cleanHs.startsWith("9013") ||
      cleanHs.startsWith("8802") ||
      cleanHs.startsWith("8401");

    if (isDualUseDb || isDualUseChapter) {
      totalRiskPoints += 65;
      rules.push({
        ruleId: "DUAL-01",
        ruleName: "Mercancía de Doble Uso (Militar / Civil)",
        category: "DUAL_USE",
        passed: false,
        riskPoints: 65,
        severity: "CRITICAL",
        message: `El código arancelario ${input.hsCode} corresponde a material de doble uso sujeto al Reglamento (UE) 2021/821.`,
      });
    } else {
      rules.push({
        ruleId: "DUAL-01",
        ruleName: "Control de Doble Uso",
        category: "DUAL_USE",
        passed: true,
        riskPoints: 0,
        severity: "INFO",
        message: `Mercancía clasificada fuera del catálogo de productos y tecnologías de doble uso.`,
      });
    }

    // --- RULE 4: VALUATION & UNDERVALUATION HEURISTICS ---
    const customsVal = input.customsValue || 0;
    const weight = input.grossWeightKg || 0;
    if (customsVal <= 0) {
      totalRiskPoints += 35;
      rules.push({
        ruleId: "VAL-01",
        ruleName: "Valor en Aduana Nulo",
        category: "VALUATION",
        passed: false,
        riskPoints: 35,
        severity: "CRITICAL",
        message: "El valor CIF declarado no puede ser inferior o igual a 0.",
      });
    } else if (weight > 100 && customsVal / weight < 0.2) {
      totalRiskPoints += 30;
      rules.push({
        ruleId: "VAL-02",
        ruleName: "Alerta de Subvaloración",
        category: "VALUATION",
        passed: false,
        riskPoints: 30,
        severity: "WARNING",
        message: `Ratio valor/peso anómalo (${(customsVal / weight).toFixed(2)} €/kg para ${weight} kg). Sospecha de infravaloración arancelaria.`,
      });
    } else {
      rules.push({
        ruleId: "VAL-01",
        ruleName: "Consistencia de Valoración CIF",
        category: "VALUATION",
        passed: true,
        riskPoints: 0,
        severity: "INFO",
        message: `Valor CIF declarado (${customsVal.toLocaleString("es-ES")} €) coherente con los umbrales estadísticos de la partida.`,
      });
    }

    // --- RULE 5: DOCUMENTARY COMPLETENESS ---
    const hasInvoice =
      attachedDocs.includes("DOC-INV") || attachedDocs.includes("N935");
    const hasBl =
      attachedDocs.includes("DOC-HBL") || attachedDocs.includes("N705");

    if (!hasInvoice && attachedDocs.length > 0) {
      totalRiskPoints += 20;
      rules.push({
        ruleId: "DOC-01",
        ruleName: "Factura Comercial",
        category: "DOCUMENTATION",
        passed: false,
        riskPoints: 20,
        severity: "WARNING",
        message: "Falta factura comercial definitiva (Código AEAT: N935).",
      });
    }

    if (!hasBl && attachedDocs.length > 0) {
      totalRiskPoints += 15;
      rules.push({
        ruleId: "DOC-02",
        ruleName: "Documento de Transporte (B/L)",
        category: "DOCUMENTATION",
        passed: false,
        riskPoints: 15,
        severity: "WARNING",
        message:
          "Falta conocimiento de embarque / Bill of Lading (Código AEAT: N705).",
      });
    }

    if (input.hasPreferentialOriginCert) {
      const hasCoo =
        attachedDocs.includes("DOC-COO") || attachedDocs.includes("N954");
      if (!hasCoo && attachedDocs.length > 0) {
        totalRiskPoints += 30;
        rules.push({
          ruleId: "DOC-03",
          ruleName: "Certificado de Origen Preferencial (EUR.1)",
          category: "DOCUMENTATION",
          passed: false,
          riskPoints: 30,
          severity: "CRITICAL",
          message:
            "Se solicita trato arancelario preferencial pero no se adjunta el certificado EUR.1 / ATR (N954).",
        });
      }
    }

    // Normalized Score (Max 100)
    const riskScore = Math.min(100, Math.max(0, totalRiskPoints));

    // Channel Assignment Matrix
    let channel: "Green Channel" | "Orange Channel" | "Red Channel" =
      "Green Channel";
    let channelSpanish:
      | "Canal Verde (Levante)"
      | "Canal Naranja (Documental)"
      | "Canal Rojo (Físico)" = "Canal Verde (Levante)";

    if (riskScore > 60) {
      channel = "Red Channel";
      channelSpanish = "Canal Rojo (Físico)";
    } else if (riskScore > 20) {
      channel = "Orange Channel";
      channelSpanish = "Canal Naranja (Documental)";
    }

    const failedRules = rules.filter((r) => !r.passed);
    const triggeredFlags = failedRules.map((r) => `${r.ruleId}: ${r.message}`);

    const recommendedActions: string[] = [];
    if (channel === "Green Channel") {
      recommendedActions.push(
        "Generar DUA de importación y proceder al levante automático.",
      );
      recommendedActions.push(
        "Emitir carta de pago para liquidación de derechos e IVA.",
      );
    } else if (
      channel === "Canal Naranja (Documental)" ||
      channel === "Orange Channel"
    ) {
      recommendedActions.push(
        "Aportar factura comercial y justificantes de transporte en la sede electrónica.",
      );
      recommendedActions.push(
        "Solicitar cotejo de certificados de origen ante la aduana de despacho.",
      );
    } else {
      recommendedActions.push(
        "Notificar al consignatario para inspección ocular y apertura de precintos en terminal.",
      );
      recommendedActions.push(
        "Presentar autorización de despacho para mercancías restringidas / doble uso.",
      );
    }

    return {
      riskScore,
      channel,
      channelSpanish,
      statusSummary:
        channel === "Green Channel"
          ? "Cumplimiento aduanero óptimo. Despacho directo autorizado."
          : channel === "Orange Channel"
            ? "Revisión documental requerida por la administración aduanera."
            : "Inspección física obligatoria por alerta de seguridad/sanciones.",
      rulesEvaluated: rules,
      triggeredFlags,
      recommendedActions,
      isCleared: channel === "Green Channel",
    };
  }
}
