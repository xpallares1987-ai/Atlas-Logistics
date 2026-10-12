import { describe, it, expect } from "vitest";
import {
  generateIdCCP,
  buildAndStampCartaPorte31,
  calculateUsmcaRegionalValueContent,
  calculateImmexTariffOptimization,
  predictCustomsDwellTime,
  USMCA_DEMO_PRESETS,
  CartaPorteInput,
} from "./cross-border-usmca.js";

describe("Cross-Border USMCA & SAT Carta Porte 3.1 Engine Tests", () => {
  describe("generateIdCCP & buildAndStampCartaPorte31", () => {
    it("should generate a 36-character SAT-compliant IdCCP starting with CCC", () => {
      const idCCP1 = generateIdCCP();
      const idCCP2 = generateIdCCP();
      expect(idCCP1).toHaveLength(36);
      expect(idCCP1.startsWith("CCC")).toBe(true);
      expect(idCCP2).toHaveLength(36);
      expect(idCCP2.startsWith("CCC")).toBe(true);
      expect(idCCP1).not.toBe(idCCP2);
    });

    it("should build and stamp CFDI 4.0 with Complemento Carta Porte 3.1 XML and SAT QR code", () => {
      const sampleInput: CartaPorteInput = {
        shipmentRef: "TEST-EXP-001",
        rfcEmisor: "EXP010101AA1",
        razonSocialEmisor: "TEST EXPORTER SA DE CV",
        regimenFiscalEmisor: "601",
        rfcReceptor: "IMP020202BB2",
        razonSocialReceptor: "TEST IMPORTER LLC",
        origen: {
          tipoUbicacion: "Origen",
          rfc: "EXP010101AA1",
          nombre: "Planta Toluca",
          direccion: "Av Central 123",
          codigoPostal: "50000",
          fechaHora: "2026-10-15T08:00:00Z",
        },
        destino: {
          tipoUbicacion: "Destino",
          rfc: "IMP020202BB2",
          nombre: "Laredo Crossdock",
          direccion: "World Trade Bridge",
          codigoPostal: "88000",
          fechaHora: "2026-10-16T14:00:00Z",
        },
        distanciaRecorridaKm: 980.5,
        mercancias: [
          {
            claveProdServ: "25171000",
            descripcion: "Bobinas y piezas industriales",
            cantidad: 10,
            claveUnidad: "H87",
            pesoKg: 12500,
            fraccionArancelaria: "8708.29.99",
            materialPeligroso: true,
            claveMaterialPeligroso: "UN1993",
            tipoEmbalaje: "4G",
            valorDeclaradoUsd: 45000,
          },
          {
            claveProdServ: "25171000",
            descripcion: "Accesorios de montaje",
            cantidad: 5,
            claveUnidad: "H87",
            pesoKg: 3200,
            fraccionArancelaria: "8708.29.99",
            valorDeclaradoUsd: 12000,
          },
        ],
        autotransporte: {
          configVehicular: "T3S2",
          placa: "4421-XB2",
          anioModelo: 2024,
          permisoSct: "TPAF01",
          numPermisoSct: "SCT-FED-99120",
          aseguradoraRespCivil: "AXA Seguros",
          polizaRespCivil: "AXA-POL-992",
          aseguradoraMedioAmbiente: "GMX Seguros",
          polizaMedioAmbiente: "GMX-POL-441",
        },
        operador: {
          rfc: "ROGM820101CC3",
          nombre: "Juan Perez",
          numLicencia: "LIC-NL-8841",
        },
        subtotalMxn: 32000,
        ivaMxn: 5120,
        retencionIvaMxn: 1280,
        totalMxn: 35840,
      };

      const result = buildAndStampCartaPorte31(sampleInput);

      expect(result.cfdiVersion).toBe("4.0");
      expect(result.cartaPorteVersion).toBe("3.1");
      expect(result.idCCP).toHaveLength(36);
      expect(result.idCCP.startsWith("CCC")).toBe(true);
      expect(result.uuid).toContain("SAT-");
      expect(result.totalWeightKg).toBe(15700);
      expect(result.totalFreightMxn).toBe(35840);
      expect(result.qrCodeSatUrl).toContain("verificacfdi.facturaelectronica.sat.gob.mx");
      expect(result.qrCodeSatUrl).toContain(`id=${result.uuid}`);
      expect(result.qrCodeSatUrl).toContain("re=EXP010101AA1");
      expect(result.qrCodeSatUrl).toContain("rr=IMP020202BB2");
      expect(result.stampedXml).toContain('xmlns:cartaporte31="http://www.sat.gob.mx/CartaPorte31"');
      expect(result.stampedXml).toContain(`IdCCP="${result.idCCP}"`);
      expect(result.stampedXml).toContain('ConfigVehicular="T3S2"');
      expect(result.stampedXml).toContain('MaterialPeligroso="Sí"');
      expect(result.stampedXml).toContain('CveMaterialPeligroso="UN1993"');
      expect(result.stampedXml).toContain("tfd:TimbreFiscalDigital");
    });
  });

  describe("calculateUsmcaRegionalValueContent", () => {
    it("should calculate RVC using Transaction Value (VT) method with default 60% threshold", () => {
      const result = calculateUsmcaRegionalValueContent({
        hsCode: "8471.30.01",
        productDescription: "Equipos de procesamiento de datos",
        method: "TRANSACTION_VALUE",
        transactionValueUsd: 100000,
        nonOriginatingMaterialsCostUsd: 35000,
      });

      // RVC = ((100000 - 35000) / 100000) * 100 = 65%
      expect(result.rvcPercentage).toBe(65.0);
      expect(result.thresholdRequiredPercentage).toBe(60.0);
      expect(result.qualifiesForUsmca).toBe(true);
      expect(result.preferentialDutyRatePercent).toBe(0.0);
      expect(result.breakdown.regionalContentValueUsd).toBe(65000);
    });

    it("should calculate RVC using Net Cost (CN) method for automotive parts with 75% threshold", () => {
      // HS code 8708 is automotive -> auto-assigns 75% threshold
      const result = calculateUsmcaRegionalValueContent({
        hsCode: "8708.29.99",
        productDescription: "Componentes de suspensión",
        method: "NET_COST",
        netCostUsd: 200000,
        nonOriginatingMaterialsCostUsd: 45000,
      });

      // RVC = ((200000 - 45000) / 200000) * 100 = 77.5%
      expect(result.rvcPercentage).toBe(77.5);
      expect(result.thresholdRequiredPercentage).toBe(75.0);
      expect(result.qualifiesForUsmca).toBe(true);
      expect(result.preferentialDutyRatePercent).toBe(0.0);
    });

    it("should mark goods as non-qualifying when RVC falls below threshold", () => {
      const result = calculateUsmcaRegionalValueContent({
        hsCode: "8708.29.99",
        productDescription: "Componentes de suspensión importados de Asia",
        method: "NET_COST",
        netCostUsd: 100000,
        nonOriginatingMaterialsCostUsd: 40000, // RVC = 60%, below 75% automotive requirement
      });

      expect(result.rvcPercentage).toBe(60.0);
      expect(result.thresholdRequiredPercentage).toBe(75.0);
      expect(result.qualifiesForUsmca).toBe(false);
      expect(result.preferentialDutyRatePercent).toBe(15.0);
    });
  });

  describe("calculateImmexTariffOptimization", () => {
    it("should exempt 100% of IGI duties when IMMEX program is active (AF_IMMEX pedimento)", () => {
      const result = calculateImmexTariffOptimization({
        hsCode: "8708.29.99", // 20% automotive rate
        goodsDescription: "Autopartes de transmisión",
        declaredValueUsd: 150000,
        originCountry: "US",
        isImmexProgramActive: true,
      });

      expect(result.standardMfnDutyRatePercent).toBe(20.0);
      expect(result.standardDutyPayableUsd).toBe(30000);
      expect(result.immexDutyRatePercent).toBe(0.0);
      expect(result.immexDutyPayableUsd).toBe(0.0);
      expect(result.dutySavingsUsd).toBe(30000);
      expect(result.recommendedPedimentoType).toBe("AF_IMMEX");
      expect(result.vatCreditEligible).toBe(true);
      expect(result.maxPermanenceMonths).toBe(18);
    });

    it("should recommend T1_USMCA when IMMEX is inactive but USMCA origin is satisfied", () => {
      const result = calculateImmexTariffOptimization({
        hsCode: "8542.31.01", // 15% electronics rate
        goodsDescription: "Microprocesadores IoT",
        declaredValueUsd: 80000,
        originCountry: "CA",
        isImmexProgramActive: false,
        usmcaEligible: true,
      });

      expect(result.standardMfnDutyRatePercent).toBe(15.0);
      expect(result.immexDutyRatePercent).toBe(0.0);
      expect(result.dutySavingsUsd).toBe(12000);
      expect(result.recommendedPedimentoType).toBe("T1_USMCA");
    });

    it("should recommend A1_GENERAL and full duty when not IMMEX and non-USMCA origin", () => {
      const result = calculateImmexTariffOptimization({
        hsCode: "7208.51.01", // 25% steel rate
        goodsDescription: "Laminados de acero caliente",
        declaredValueUsd: 100000,
        originCountry: "CN",
        isImmexProgramActive: false,
        usmcaEligible: false,
      });

      expect(result.standardMfnDutyRatePercent).toBe(25.0);
      expect(result.immexDutyRatePercent).toBe(25.0);
      expect(result.immexDutyPayableUsd).toBe(25000);
      expect(result.dutySavingsUsd).toBe(0);
      expect(result.recommendedPedimentoType).toBe("A1_GENERAL");
    });

    it("should assign 24 months permanence for machinery under HS chapter 84", () => {
      const result = calculateImmexTariffOptimization({
        hsCode: "8479.89.99",
        goodsDescription: "Maquinaria industrial robotizada",
        declaredValueUsd: 500000,
        originCountry: "US",
        isImmexProgramActive: true,
      });

      expect(result.maxPermanenceMonths).toBe(24);
    });
  });

  describe("predictCustomsDwellTime", () => {
    it("should predict fast clearance for green light at Nuevo Laredo (MXNLD)", () => {
      const result = predictCustomsDwellTime({
        pedimentoNumber: "26-24-3019-1002931",
        customsPortCode: "MXNLD",
        trafficLightOutcome: "GREEN_CLEARANCE",
        fraccionArancelaria: "8708.29.99",
        importerRfc: "ATR991012AB1",
        hasReeferCargo: false,
      });

      expect(result.portCode).toBe("MXNLD");
      expect(result.estimatedDwellHours).toBe(14.0);
      expect(result.riskCategory).toBe("LOW_RISK");
      expect(result.confidenceScorePercent).toBe(94);
      expect(new Date(result.predictedGateOutTimestamp).getTime()).toBeGreaterThan(Date.now());
    });

    it("should account for +36 hours red light inspection delay at Manzanillo (MXZLO)", () => {
      const result = predictCustomsDwellTime({
        pedimentoNumber: "26-16-3019-8809121",
        customsPortCode: "MXZLO",
        trafficLightOutcome: "RED_INSPECTION",
        fraccionArancelaria: "8542.31.01",
        importerRfc: "SOL180801KK2",
        hasReeferCargo: false,
      });

      // Base 24h + 36h red light = 60h
      expect(result.estimatedDwellHours).toBe(60.0);
      expect(result.riskCategory).toBe("HIGH_RISK");
      expect(result.redChannelProbabilityPercent).toBe(100);
      expect(result.keyPredictors.some((p) => p.feature.includes("Semáforo"))).toBe(true);
      expect(result.recommendedActions.length).toBeGreaterThan(0);
    });

    it("should apply 0.85x perishable priority multiplier for reefer cargo at Veracruz (MXVER)", () => {
      const result = predictCustomsDwellTime({
        pedimentoNumber: "26-43-3019-1104882",
        customsPortCode: "MXVER",
        trafficLightOutcome: "GREEN_CLEARANCE",
        fraccionArancelaria: "3002.20.01",
        importerRfc: "FAR990214KK1",
        hasReeferCargo: true,
      });

      // Base 26h * 0.85 = 22.1h
      expect(result.estimatedDwellHours).toBe(22.1);
      expect(result.keyPredictors.some((p) => p.feature.includes("Reefer"))).toBe(true);
    });
  });

  describe("USMCA_DEMO_PRESETS", () => {
    it("should provide 3 complete and valid cross-border demo scenarios", () => {
      const presets = Object.values(USMCA_DEMO_PRESETS);
      expect(presets).toHaveLength(3);

      for (const preset of presets) {
        expect(preset.presetId).toBeDefined();
        expect(preset.title).toBeDefined();
        expect(preset.description).toBeDefined();

        // Stamping run
        const stamped = buildAndStampCartaPorte31(preset.cartaPorteInput);
        expect(stamped.uuid).toBeDefined();
        expect(stamped.idCCP).toHaveLength(36);

        // RVC run
        const rvc = calculateUsmcaRegionalValueContent(preset.rvcInput);
        expect(rvc.rvcPercentage).toBeGreaterThan(0);

        // IMMEX run
        const immex = calculateImmexTariffOptimization(preset.immexInput);
        expect(immex.dutySavingsUsd).toBeGreaterThanOrEqual(0);

        // Dwell run
        const dwell = predictCustomsDwellTime(preset.dwellInput);
        expect(dwell.estimatedDwellHours).toBeGreaterThan(0);
      }
    });
  });
});
