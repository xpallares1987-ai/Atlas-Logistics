import { IncotermCode } from "./incoterms-matrix.service.js";

export interface CustomsAdjustmentItem {
  type: "ADDITION" | "DEDUCTION";
  code: string;
  name: string;
  amount: number;
  currency: string;
  legalBasis: string;
}

export interface CustomsNormalizationResult {
  incotermCode: IncotermCode;
  invoiceValue: number;
  currency: string;
  customsValueCif: number;
  totalAdditions: number;
  totalDeductions: number;
  adjustments: CustomsAdjustmentItem[];
  statisticalValueEur: number;
  duaBox46Value: number; // Base Imponible Aduanera
  duaBox47DutyBasis: number;
  explanation: string;
}

export class CustomsNormalizerService {
  /**
   * Deterministically normalizes commercial contract invoice value into Customs CIF Valuation (Box 46 DUA / TARIC Base)
   * in accordance with EU Union Customs Code (UCC) Art. 70-74.
   */
  public static normalizeCustomsValue(params: {
    incotermCode: IncotermCode;
    invoiceValue: number;
    currency?: string;
    preCarriageCost?: number;
    exportFormalitiesCost?: number;
    internationalFreightCost?: number;
    insuranceCost?: number;
    destinationHandlingCost?: number;
    importDutyCost?: number;
    importVatCost?: number;
    exchangeRateToEur?: number;
  }): CustomsNormalizationResult {
    const {
      incotermCode,
      invoiceValue,
      currency = "EUR",
      preCarriageCost = 0,
      exportFormalitiesCost = 0,
      internationalFreightCost = 0,
      insuranceCost = 0,
      destinationHandlingCost = 0,
      importDutyCost = 0,
      importVatCost = 0,
      exchangeRateToEur = 1.0,
    } = params;

    const adjustments: CustomsAdjustmentItem[] = [];
    let calculatedCif = invoiceValue;

    switch (incotermCode) {
      case "EXW":
        // EXW: Invoice is factory price. Must ADD pre-carriage, export costs, freight and insurance to reach CIF.
        if (preCarriageCost > 0) {
          adjustments.push({
            type: "ADDITION",
            code: "PRE_CARRIAGE",
            name: "Transporte interior en país de origen hasta punto de salida",
            amount: preCarriageCost,
            currency,
            legalBasis: "CAU Art. 71.1.e(i)",
          });
        }
        if (exportFormalitiesCost > 0) {
          adjustments.push({
            type: "ADDITION",
            code: "EXPORT_FORMALITIES",
            name: "Gastos de despacho de exportación y licencias",
            amount: exportFormalitiesCost,
            currency,
            legalBasis: "CAU Art. 71.1.e",
          });
        }
        if (internationalFreightCost > 0) {
          adjustments.push({
            type: "ADDITION",
            code: "INTL_FREIGHT",
            name: "Flete internacional principal hasta frontera aduanera",
            amount: internationalFreightCost,
            currency,
            legalBasis: "CAU Art. 71.1.e(i)",
          });
        }
        if (insuranceCost > 0) {
          adjustments.push({
            type: "ADDITION",
            code: "INSURANCE",
            name: "Seguro internacional de transporte",
            amount: insuranceCost,
            currency,
            legalBasis: "CAU Art. 71.1.e(i)",
          });
        }
        calculatedCif =
          invoiceValue +
          preCarriageCost +
          exportFormalitiesCost +
          internationalFreightCost +
          insuranceCost;
        break;

      case "FCA":
      case "FAS":
      case "FOB":
        // FOB/FCA/FAS: Export cleared in origin. Must ADD international freight and insurance to reach CIF.
        if (internationalFreightCost > 0) {
          adjustments.push({
            type: "ADDITION",
            code: "INTL_FREIGHT",
            name: "Flete internacional principal hasta puerto/aeropuerto de entrada",
            amount: internationalFreightCost,
            currency,
            legalBasis: "CAU Art. 71.1.e(i)",
          });
        }
        if (insuranceCost > 0) {
          adjustments.push({
            type: "ADDITION",
            code: "INSURANCE",
            name: "Seguro de transporte marítimo/aéreo",
            amount: insuranceCost,
            currency,
            legalBasis: "CAU Art. 71.1.e(i)",
          });
        }
        calculatedCif = invoiceValue + internationalFreightCost + insuranceCost;
        break;

      case "CFR":
      case "CPT":
        // CFR/CPT: Freight included. Must ADD insurance to reach CIF.
        if (insuranceCost > 0) {
          adjustments.push({
            type: "ADDITION",
            code: "INSURANCE",
            name: "Seguro de transporte internacional no incluido en factura",
            amount: insuranceCost,
            currency,
            legalBasis: "CAU Art. 71.1.e(i)",
          });
        }
        calculatedCif = invoiceValue + insuranceCost;
        break;

      case "CIF":
      case "CIP":
        // CIF/CIP: Base is already CIF border value. No mandatory additions.
        calculatedCif = invoiceValue;
        break;

      case "DAP":
      case "DPU":
        // DAP/DPU: Delivery inside destination country. Must DEDUCT transport/handling after entry border if itemized.
        if (destinationHandlingCost > 0) {
          adjustments.push({
            type: "DEDUCTION",
            code: "POST_BORDER_TRANSPORT",
            name: "Gastos de transporte y manipulación posteriores a la entrada en territorio aduanero",
            amount: destinationHandlingCost,
            currency,
            legalBasis: "CAU Art. 72.a",
          });
          calculatedCif = Math.max(0, invoiceValue - destinationHandlingCost);
        } else {
          calculatedCif = invoiceValue;
        }
        break;

      case "DDP":
        // DDP: Delivered duty and taxes paid. Must DEDUCT import duty, import VAT, and post-border transport to calculate Customs CIF Value.
        if (importDutyCost > 0) {
          adjustments.push({
            type: "DEDUCTION",
            code: "IMPORT_DUTY",
            name: "Derechos de importación (Arancel TARIC)",
            amount: importDutyCost,
            currency,
            legalBasis: "CAU Art. 72.c",
          });
        }
        if (importVatCost > 0) {
          adjustments.push({
            type: "DEDUCTION",
            code: "IMPORT_VAT",
            name: "Impuesto sobre el Valor Añadido (IVA Importación)",
            amount: importVatCost,
            currency,
            legalBasis: "CAU Art. 72.c",
          });
        }
        if (destinationHandlingCost > 0) {
          adjustments.push({
            type: "DEDUCTION",
            code: "DESTINATION_INLAND",
            name: "Transporte interior en destino posterior a la entrada en aduana",
            amount: destinationHandlingCost,
            currency,
            legalBasis: "CAU Art. 72.a",
          });
        }
        calculatedCif = Math.max(
          0,
          invoiceValue -
            importDutyCost -
            importVatCost -
            destinationHandlingCost,
        );
        break;
    }

    const totalAdditions = adjustments
      .filter((a) => a.type === "ADDITION")
      .reduce((sum, a) => sum + a.amount, 0);

    const totalDeductions = adjustments
      .filter((a) => a.type === "DEDUCTION")
      .reduce((sum, a) => sum + a.amount, 0);

    const statisticalValueEur = Number(
      (calculatedCif * exchangeRateToEur).toFixed(2),
    );
    const duaBox46Value = statisticalValueEur;
    const duaBox47DutyBasis = statisticalValueEur;

    let explanation = `Valor en aduana normalizado según regla Incoterms® 2020 ${incotermCode}. `;
    if (totalAdditions > 0) {
      explanation += `Se incrementaron ${totalAdditions.toFixed(2)} ${currency} en concepto de fletes/seguros hasta frontera aduanera (CAU Art. 71). `;
    }
    if (totalDeductions > 0) {
      explanation += `Se dedujeron ${totalDeductions.toFixed(2)} ${currency} en concepto de aranceles, impuestos y transporte interior posterior a la entrada (CAU Art. 72).`;
    }

    return {
      incotermCode,
      invoiceValue: Number(invoiceValue.toFixed(2)),
      currency,
      customsValueCif: Number(calculatedCif.toFixed(2)),
      totalAdditions: Number(totalAdditions.toFixed(2)),
      totalDeductions: Number(totalDeductions.toFixed(2)),
      adjustments,
      statisticalValueEur,
      duaBox46Value,
      duaBox47DutyBasis,
      explanation: explanation.trim(),
    };
  }
}
