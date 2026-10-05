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

describe("Smart Contracts, e-BL MLETR & Escrow Routes Integration Tests", () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/smart-contracts/presets should return all 3 predefined scenarios", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/smart-contracts/presets",
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.payload);
    expect(json.success).toBe(true);
    expect(json.presets).toHaveProperty("shanghai_valencia_full_success");
    expect(json.presets).toHaveProperty("mletr_bank_endorsement");
    expect(json.presets).toHaveProperty("tampered_seal_dispute");
  });

  it("POST /api/smart-contracts/select-preset should switch active scenario and state", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/smart-contracts/select-preset",
      payload: {
        scenarioId: "mletr_bank_endorsement",
      },
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.payload);
    expect(json.success).toBe(true);
    expect(json.data.scenarioId).toBe("mletr_bank_endorsement");
    expect(json.data.escrow.totalAmountUsd).toBe(112000);
    expect(json.data.ebl.currentTitleHolder).toBe("Banco Santander S.A. (Trade Finance)");
  });

  it("GET /api/smart-contracts/ledger should return the updated scenario state with valid chain", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/smart-contracts/ledger",
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.payload);
    expect(json.success).toBe(true);
    expect(json.scenarioId).toBe("mletr_bank_endorsement");
    expect(json.chainVerification.isValid).toBe(true);
    expect(json.ledger.length).toBeGreaterThanOrEqual(3);
  });

  it("POST /api/smart-contracts/endorse-title should endorse e-BL to another party and append TITLE_ENDORSED block", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/smart-contracts/endorse-title",
      payload: {
        toParty: "CMA CGM Freight Forwarding France",
        transferType: "SPECIAL_ENDORSEMENT",
      },
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.payload);
    expect(json.success).toBe(true);
    expect(json.data.ebl.currentTitleHolder).toBe("CMA CGM Freight Forwarding France");
    expect(json.data.endorsement.fromParty).toBe("Banco Santander S.A. (Trade Finance)");
    expect(json.data.block.payload.event).toBe("TITLE_ENDORSED");
    expect(json.data.block.txHash).toBeDefined();
  });

  it("POST /api/smart-contracts/verify-chain should verify the cryptographic integrity of the chain", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/smart-contracts/verify-chain",
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.payload);
    expect(json.success).toBe(true);
    expect(json.verification.isValid).toBe(true);
    expect(json.totalBlocks).toBeGreaterThan(0);
  });

  it("POST /api/smart-contracts/oracle-event should sequentially fulfill milestones and auto-settle upon completion", async () => {
    // Reset to mletr_bank_endorsement: EBL_ISSUED and VESSEL_DEPARTED are done.
    await app.inject({
      method: "POST",
      url: "/api/smart-contracts/select-preset",
      payload: { scenarioId: "mletr_bank_endorsement" },
    });

    // 1. SEAL_VERIFIED
    await app.inject({
      method: "POST",
      url: "/api/smart-contracts/oracle-event",
      payload: {
        milestoneKey: "SEAL_VERIFIED",
        sender: "IoT Smart Lock Gateway",
        details: "Precinto verificado intacto antes de cruce de canal.",
        iotTelemetry: {
          isoSealNumber: "MSK-HSS-10492",
          sealStatus: "INTACT",
          batteryPercent: 92,
        },
      },
    });

    // 2. CUSTOMS_CLEARED
    await app.inject({
      method: "POST",
      url: "/api/smart-contracts/oracle-event",
      payload: {
        milestoneKey: "CUSTOMS_CLEARED",
        sender: "Aduana Barcelona Oracle",
        details: "Despacho de importación concedido sin incidencias.",
      },
    });

    // 3. DISCHARGED_PORT
    await app.inject({
      method: "POST",
      url: "/api/smart-contracts/oracle-event",
      payload: {
        milestoneKey: "DISCHARGED_PORT",
        sender: "APM Terminals Barcelona",
        details: "Contenedor descargado de muelle a patio.",
      },
    });

    // 4. PROOF_OF_DELIVERY (Last condition -> Triggers AUTO_RELEASED settlement!)
    const response = await app.inject({
      method: "POST",
      url: "/api/smart-contracts/oracle-event",
      payload: {
        milestoneKey: "PROOF_OF_DELIVERY",
        sender: "Catalana de Energías Renovables Terminal Hub",
        details: "Contenedor recibido y validado en planta solar con firma digital e.firma.",
      },
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.payload);
    expect(json.success).toBe(true);
    expect(json.data.isAutoSettled).toBe(true);
    expect(json.data.escrow.status).toBe("AUTO_RELEASED");
    expect(json.data.escrow.releasedAmountUsd).toBe(112000);
    expect(json.data.escrow.settlementTxHash).toBeDefined();
    expect(json.data.ebl.status).toBe("SURRENDERED");
  });

  it("POST /api/smart-contracts/trigger-dispute should freeze escrow and register dispute block", async () => {
    await app.inject({
      method: "POST",
      url: "/api/smart-contracts/select-preset",
      payload: { scenarioId: "tampered_seal_dispute" },
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/smart-contracts/trigger-dispute",
      payload: {
        reason: "Discrepancia en peso de tara (-1,800 kg) y reporte de precinto forzado en escáner aduanero.",
      },
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.payload);
    expect(json.success).toBe(true);
    expect(json.data.escrow.status).toBe("DISPUTED");
    expect(json.data.escrow.disputeReason).toContain("Discrepancia en peso de tara");
    expect(json.data.block.payload.event).toBe("ESCROW_DISPUTED");
  });
});
