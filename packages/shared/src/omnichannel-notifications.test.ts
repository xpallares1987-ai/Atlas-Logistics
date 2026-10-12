import { describe, it, expect } from "vitest";
import {
  generateAdaptiveCardPayload,
  getAnomalyMetadata,
  getSampleAnomalyContext,
  generateHmacSignature,
  createDriverReport,
  createDispatchOrder,
  OperationalAnomalyType,
} from "./omnichannel-notifications.js";

describe("Omnichannel Notifications & Dispatch Engine Tests", () => {
  const anomalyTypes: OperationalAnomalyType[] = [
    "SPAIN_FWD_REF_DUPLICATE",
    "CUSTOMS_CANAL_ROJO",
    "COLD_CHAIN_TEMP_BREACH",
    "HAZMAT_VIOLATION",
    "GROSS_PROFIT_LEAKAGE",
    "BL_RELEASE_BLOCKED",
    "ETA_P1_CRITICAL_DELAY",
    "DEMURRAGE_DETENTION_SPIKE",
  ];

  it("should generate sample contexts for all 8 operational anomaly types", () => {
    anomalyTypes.forEach((type) => {
      const ctx = getSampleAnomalyContext(type);
      expect(ctx.gsid).toBeDefined();
      expect(ctx.severity).toBeDefined();
      expect(ctx.operator).toBeDefined();
      expect(ctx.location).toBeDefined();
    });
  });

  it("should provide correct headline, icon, and accent container style for all 8 anomaly types", () => {
    anomalyTypes.forEach((type) => {
      const ctx = getSampleAnomalyContext(type);
      const meta = getAnomalyMetadata(type, ctx);
      expect(meta.headline).toBeDefined();
      expect(meta.bannerIcon).toBeDefined();
      expect(meta.description).toContain(ctx.gsid);
      expect(["attention", "warning", "emphasis"]).toContain(meta.accentContainerColor);
    });
  });

  it("should construct a compliant Microsoft Teams Adaptive Card v1.5 payload", () => {
    const ctx = getSampleAnomalyContext("COLD_CHAIN_TEMP_BREACH");
    const payload = generateAdaptiveCardPayload("COLD_CHAIN_TEMP_BREACH", ctx) as any;

    expect(payload.type).toBe("message");
    expect(payload.attachments).toHaveLength(1);

    const card = payload.attachments[0].content;
    expect(card.$schema).toBe("http://adaptivecards.io/schemas/adaptive-card.json");
    expect(card.type).toBe("AdaptiveCard");
    expect(card.version).toBe("1.5");
    expect(card.msteams.width).toBe("Full");

    // Check Body Containers
    expect(card.body).toHaveLength(4);
    expect(card.body[0].type).toBe("Container"); // Banner
    expect(card.body[1].type).toBe("Container"); // Description
    expect(card.body[2].type).toBe("Container"); // FactSet
    expect(card.body[3].type).toBe("TextBlock"); // Compliance notice

    // Check Action Buttons
    expect(card.actions).toHaveLength(2);
    expect(card.actions[0].type).toBe("Action.OpenUrl");
    expect(card.actions[0].url).toContain(encodeURIComponent(ctx.gsid));
  });

  it("should format metadata facts properly inside the FactSet", () => {
    const ctx = getSampleAnomalyContext("CUSTOMS_CANAL_ROJO");
    const payload = generateAdaptiveCardPayload("CUSTOMS_CANAL_ROJO", ctx) as any;
    const factSetContainer = payload.attachments[0].content.body[2];
    const facts = factSetContainer.items[0].facts;

    const gsidFact = facts.find((f: any) => f.title.includes("GSID"));
    expect(gsidFact).toBeDefined();
    expect(gsidFact.value).toBe(ctx.gsid);

    const channelFact = facts.find((f: any) => f.title.toLowerCase().includes("canal"));
    expect(channelFact).toBeDefined();
    expect(channelFact.value).toContain("CANAL ROJO");
  });

  it("should generate deterministic HMAC-SHA256 signatures for payload verification", () => {
    const content = JSON.stringify({ test: "anomaly", gsid: "GS-1001" });
    const secret = "my-test-secret-key-2026";
    const sig1 = generateHmacSignature(content, secret);
    const sig2 = generateHmacSignature(content, secret);

    expect(sig1).toBe(sig2);
    expect(sig1.length).toBeGreaterThan(10);
  });

  it("should create a valid TelegramDriverMessage report", () => {
    const report = createDriverReport(
      "Antonio Ramos",
      "@driver_antonio",
      "TRK-9902-ES",
      "YARD_DELAY",
      "Demora de 45 minutos en muelle de descarga Can Tunis por saturación de grúa.",
      45,
      "Barcelona Can Tunis (BCN)"
    );

    expect(report.messageId).toMatch(/^TG-MSG-\d{4}$/);
    expect(report.driverName).toBe("Antonio Ramos");
    expect(report.reportType).toBe("YARD_DELAY");
    expect(report.amountOrMinutes).toBe(45);
    expect(report.status).toBe("PROCESSED_SCM");
    expect(report.timestamp).toBeDefined();
  });

  it("should create a valid TelegramDispatchOrder assignment", () => {
    const order = createDispatchOrder({
      driverName: "Mateo Silva",
      telegramChatId: "@driver_mateo",
      truckId: "TRK-4411-VLC",
      pickupLocation: "Valencia Port Noatum Terminal Gate 2",
      deliveryLocation: "Mercadona Logistics Hub Ribarroja",
      cargoDescription: "1x 40ft HC Contenedor Bobinas Papel Kraft (24,500 kg)",
      containerNumber: "MEDU8829104",
    });

    expect(order.orderId).toMatch(/^DSP-ORD-\d{5}$/);
    expect(order.driverName).toBe("Mateo Silva");
    expect(order.status).toBe("DISPATCHED");
    expect(order.containerNumber).toBe("MEDU8829104");
    expect(order.dispatchedAt).toBeDefined();
  });
});
