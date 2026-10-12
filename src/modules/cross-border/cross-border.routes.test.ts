import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

// Mock auth middleware and password hashing for integration tests
vi.mock("../../middleware/auth.js", () => ({
  authMiddleware: vi.fn(async () => {}),
  requireRole: vi.fn(() => async () => {}),
}));

vi.mock("oslo/password", () => ({
  Argon2id: vi.fn().mockImplementation(() => ({
    hash: vi.fn(async () => "mocked-hash"),
    verify: vi.fn(async () => true),
  })),
}));

import app from "../../app.js";

describe("Cross-Border USMCA & SAT Carta Porte 3.1 Routes Integration Tests", () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/cross-border/presets should return the 3 cross-border demo scenarios", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/cross-border/presets",
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.payload);
    expect(json.success).toBe(true);
    expect(json.presets).toHaveLength(3);
    expect(json.presets[0].presetId).toBe("laredo_automotive_immex");
    expect(json.presets[1].presetId).toBe("manzanillo_electronics_inbound");
    expect(json.presets[2].presetId).toBe("veracruz_reefer_perishable");
  });

  it("POST /api/cross-border/carta-porte/stamp should stamp CFDI 4.0 Carta Porte 3.1 with IdCCP and QR", async () => {
    const payload = {
      shipmentRef: "EXP-2026-NLD-4401",
      rfcEmisor: "ATR991012AB1",
      razonSocialEmisor: "ATLAS TRANSPORTES TRANSFRONTERIZOS S.A. DE C.V.",
      regimenFiscalEmisor: "601",
      rfcReceptor: "TEX840211XY9",
      razonSocialReceptor: "TEXAS LOGISTICS & ASSEMBLY CORP",
      origen: {
        tipoUbicacion: "Origen",
        rfc: "ATR991012AB1",
        nombre: "Parque Industrial Finsa Monterrey",
        direccion: "Carretera Monterrey-Saltillo Km 12",
        codigoPostal: "66350",
        fechaHora: "2026-10-14T06:00:00Z",
      },
      destino: {
        tipoUbicacion: "Destino",
        rfc: "TEX840211XY9",
        nombre: "Laredo Forwarding Crossdock & Inspection",
        direccion: "14000 Mines Road, Laredo, TX",
        codigoPostal: "78045",
        fechaHora: "2026-10-14T18:00:00Z",
      },
      distanciaRecorridaKm: 240.5,
      mercancias: [
        {
          claveProdServ: "25171500",
          descripcion: "Arneses eléctricos y piezas de transmisión para automotores",
          cantidad: 1400,
          claveUnidad: "H87",
          pesoKg: 18500,
          fraccionArancelaria: "8708.29.99",
          valorDeclaradoUsd: 145000,
        },
      ],
      autotransporte: {
        configVehicular: "T3S2",
        placa: "4821-LXZ",
        anioModelo: 2025,
        permisoSct: "TPAF01",
        numPermisoSct: "SCT-FED-482109",
        aseguradoraRespCivil: "Seguros Inbursa",
        polizaRespCivil: "INB-RC-88192-MX",
      },
      operador: {
        rfc: "MECJ800412KL1",
        nombre: "Juan Carlos Mendoza",
        numLicencia: "LIC-FED-NL-99120",
      },
      subtotalMxn: 28500,
      ivaMxn: 4560,
      retencionIvaMxn: 1140,
      totalMxn: 31920,
    };

    const response = await app.inject({
      method: "POST",
      url: "/api/cross-border/carta-porte/stamp",
      payload,
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.payload);
    expect(json.success).toBe(true);
    expect(json.data.cfdiVersion).toBe("4.0");
    expect(json.data.cartaPorteVersion).toBe("3.1");
    expect(json.data.idCCP).toHaveLength(36);
    expect(json.data.idCCP.startsWith("CCC")).toBe(true);
    expect(json.data.uuid).toBeDefined();
    expect(json.data.stampedXml).toContain(`IdCCP="${json.data.idCCP}"`);
    expect(json.data.qrCodeSatUrl).toContain("verificacfdi.facturaelectronica.sat.gob.mx");
  });

  it("POST /api/cross-border/carta-porte/stamp should return 400 when missing required fields", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/cross-border/carta-porte/stamp",
      payload: { shipmentRef: "INVALID-NO-RFC" },
    });

    expect(response.statusCode).toBe(400);
    const json = JSON.parse(response.payload);
    expect(json.error).toBeDefined();
    expect(json.issues).toBeDefined();
  });

  it("POST /api/cross-border/usmca/rvc should calculate regional value content and qualification", async () => {
    const payload = {
      hsCode: "8708.29.99",
      productDescription: "Arneses automotrices",
      method: "NET_COST",
      netCostUsd: 145000,
      nonOriginatingMaterialsCostUsd: 33640,
    };

    const response = await app.inject({
      method: "POST",
      url: "/api/cross-border/usmca/rvc",
      payload,
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.payload);
    expect(json.success).toBe(true);
    expect(json.data.rvcPercentage).toBe(76.8);
    expect(json.data.thresholdRequiredPercentage).toBe(75.0);
    expect(json.data.qualifiesForUsmca).toBe(true);
    expect(json.data.preferentialDutyRatePercent).toBe(0.0);
  });

  it("POST /api/cross-border/immex/optimize should calculate tariff savings and pedimento type", async () => {
    const payload = {
      hsCode: "8708.29.99",
      goodsDescription: "Autopartes y transmisión",
      declaredValueUsd: 145000,
      originCountry: "US",
      isImmexProgramActive: true,
      usmcaEligible: true,
    };

    const response = await app.inject({
      method: "POST",
      url: "/api/cross-border/immex/optimize",
      payload,
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.payload);
    expect(json.success).toBe(true);
    expect(json.data.standardMfnDutyRatePercent).toBe(20.0);
    expect(json.data.standardDutyPayableUsd).toBe(29000);
    expect(json.data.immexDutyRatePercent).toBe(0.0);
    expect(json.data.immexDutyPayableUsd).toBe(0.0);
    expect(json.data.dutySavingsUsd).toBe(29000);
    expect(json.data.recommendedPedimentoType).toBe("AF_IMMEX");
    expect(json.data.vatCreditEligible).toBe(true);
  });

  it("POST /api/cross-border/customs/predict should calculate dwell time and gate-out prediction", async () => {
    const payload = {
      pedimentoNumber: "26-24-3019-1002931",
      customsPortCode: "MXNLD",
      trafficLightOutcome: "GREEN_CLEARANCE",
      fraccionArancelaria: "8708.29.99",
      importerRfc: "ATR991012AB1",
      hasReeferCargo: false,
    };

    const response = await app.inject({
      method: "POST",
      url: "/api/cross-border/customs/predict",
      payload,
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.payload);
    expect(json.success).toBe(true);
    expect(json.data.portCode).toBe("MXNLD");
    expect(json.data.estimatedDwellHours).toBe(14.0);
    expect(json.data.confidenceScorePercent).toBe(94);
    expect(json.data.riskCategory).toBe("LOW_RISK");
    expect(json.data.keyPredictors).toHaveLength(2);
  });
});
