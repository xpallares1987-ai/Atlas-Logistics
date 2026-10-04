import { describe, it, expect, beforeAll } from "vitest";
import {
  EdiTokenizer,
  EdifactService,
  X12Service,
  EdiDispatcherService,
} from "./index.js";
import { db } from "../../db/index.js";
import { ediPartners, ediInterchanges, ediMessages, shipments, companies } from "../../db/schema/index.js";
import { eq } from "drizzle-orm";

describe("B2B EDI Engine (UN/EDIFACT & ANSI X12)", () => {
  const sampleEdifactIftsta =
    "UNB+UNOA:2+MAERSKLINE:ZZ+ATLASLOG:ZZ+261004:1430+100021'BGM+7+BK-2026-8819+9'RFF+BM:MSK992011'DTM+137:202610041200:203'LOC+7+ESVLC:139:6+VALENCIA PORT'LOC+11+USNYC:139:6+NEW YORK HARBOR'STS+1+VD'UNT+7+100021'UNZ+1+100021'";

  const sampleEdifactHold =
    "UNB+UNOA:2+MSCGVA:01+ATLASLOG:ZZ+261004:1615+100022'BGM+7+BK-2026-8819+9'RFF+BM:MEDU881023'DTM+137:202610041600:203'LOC+7+ESBCN:139:6+BARCELONA PORT'STS+1+X4'UNT+6+100022'UNZ+1+100022'";

  const sampleX12_214 =
    "ISA*00*          *00*          *02*KNIGHTSWIFT    *ZZ*ATLASLOG       *261004*1540*U*00401*000008821*0*P*>~GS*QM*KNIGHTSWIFT*ATLASLOG*20261004*1540*8821*X*004010~ST*214*0001~B10*KS-991201*BK-2026-8819*KNIGHTSWIFT~LX*1~AT7*X6*NS***20261004*1530*LT~MS1*MADRID*ES*ES~SE*6*0001~GE*1*8821~IEA*1*000008821~";

  const sampleX12_Delivered =
    "ISA*00*          *00*          *ZZ*JBHUNT         *ZZ*ATLASLOG       *261004*1800*U*00401*000009941*0*P*>~GS*QM*JBHUNT*ATLASLOG*20261004*1800*9941*X*004010~ST*214*0001~B10*JB-441092*BK-2026-8819*JBHUNT~LX*1~AT7*AG*NS***20261004*1745*LT~MS1*VALENCIA*ES*ES~SE*6*0001~GE*1*9941~IEA*1*000009941~";

  describe("EdiTokenizer", () => {
    it("should correctly detect EDI standards", () => {
      expect(EdiTokenizer.detectStandard(sampleEdifactIftsta)).toBe("EDIFACT");
      expect(EdiTokenizer.detectStandard("UNA:+.? 'UNB+...")).toBe("EDIFACT");
      expect(EdiTokenizer.detectStandard(sampleX12_214)).toBe("ANSI_X12");
      expect(EdiTokenizer.detectStandard("INVALID DATA")).toBe("UNKNOWN");
    });

    it("should tokenize EDIFACT segments with release characters", () => {
      const edifactWithEscape =
        "UNB+UNOA:2+SENDER:ZZ+RCV:ZZ+261004:1200+1'BGM+7+BK?+SPECIAL+9'FTX+AAA+++GOODS?: TEST'UNT+3+1'UNZ+1+1'";
      const ast = EdiTokenizer.tokenizeEdifact(edifactWithEscape);

      expect(ast.standard).toBe("EDIFACT");
      expect(ast.segments.length).toBe(5);

      const bgm = ast.segments.find((s) => s.tag === "BGM");
      expect(bgm).toBeDefined();
      // Second element should have preserved 'BK+SPECIAL' without splitting on '+'
      expect(bgm?.elements[1]).toBe("BK+SPECIAL");

      const ftx = ast.segments.find((s) => s.tag === "FTX");
      expect(ftx).toBeDefined();
    });

    it("should tokenize ANSI X12 segments with fixed width headers and element separators", () => {
      const ast = EdiTokenizer.tokenizeX12(sampleX12_214);
      expect(ast.standard).toBe("ANSI_X12");
      expect(ast.delimiters.elementSeparator).toBe("*");
      expect(ast.delimiters.segmentTerminator).toBe("~");

      const st = ast.segments.find((s) => s.tag === "ST");
      expect(st).toBeDefined();
      expect(st?.elements[0]).toBe("214");

      const b10 = ast.segments.find((s) => s.tag === "B10");
      expect(b10).toBeDefined();
      expect(b10?.elements[0]).toBe("KS-991201");
      expect(b10?.elements[1]).toBe("BK-2026-8819");
    });
  });

  describe("EdifactService", () => {
    it("should parse IFTSTA vessel departure report correctly", () => {
      const ast = EdiTokenizer.tokenize(sampleEdifactIftsta);
      const events = EdifactService.parseIFTSTA(ast);

      expect(events.length).toBe(1);
      const ev = events[0];
      expect(ev.senderId).toBe("MAERSKLINE");
      expect(ev.receiverId).toBe("ATLASLOG");
      expect(ev.bookingReference).toBe("BK-2026-8819");
      expect(ev.billOfLading).toBe("MSK992011");
      expect(ev.statusCode).toBe("VD");
      expect(ev.milestone).toBe("VESSEL_DEPARTED");
      expect(ev.isException).toBe(false);
      expect(ev.locationName).toBe("NEW YORK HARBOR");
    });

    it("should detect and flag exceptions on Customs Hold IFTSTA", () => {
      const ast = EdiTokenizer.tokenize(sampleEdifactHold);
      const events = EdifactService.parseIFTSTA(ast);

      expect(events.length).toBe(1);
      const ev = events[0];
      expect(ev.senderId).toBe("MSCGVA");
      expect(ev.statusCode).toBe("X4");
      expect(ev.milestone).toBe("CUSTOMS_HOLD");
      expect(ev.isException).toBe(true);
      expect(ev.exceptionReason).toContain("Retención aduanera");
    });

    it("should generate valid UN/EDIFACT IFTMIN shipping instruction", () => {
      const rawIftmin = EdifactService.generateIFTMIN(
        {
          bookingReference: "BK-2026-TEST",
          consignor: { name: "ACME EXPORTS SL", city: "MADRID", country: "ES" },
          consignee: { name: "GLOBAL IMPORTS LLC", city: "NEW YORK", country: "US" },
          portOfLoading: { code: "ESVLC", name: "PORT OF VALENCIA" },
          portOfDischarge: { code: "USNYC", name: "NEW YORK CONTAINER TERMINAL" },
          cargoDescription: "INDUSTRIAL AUTOMATION ROBOTICS",
          grossWeightKg: 14500,
          containerNumber: "MSKU9918231",
          containerType: "40HC",
        },
        "ATLASLOG",
        "MAERSKLINE",
      );

      expect(rawIftmin).toContain("UNA:+.? '");
      expect(rawIftmin).toContain("UNB+UNOA:2+ATLASLOG:ZZ+MAERSKLINE:ZZ");
      expect(rawIftmin).toContain("UNH+1+IFTMIN:D:96B:UN'");
      expect(rawIftmin).toContain("BGM+340+BK-2026-TEST+9'");
      expect(rawIftmin).toContain("NAD+CZ+++ACME EXPORTS SL");
      expect(rawIftmin).toContain("NAD+CN+++GLOBAL IMPORTS LLC");
      expect(rawIftmin).toContain("LOC+9+ESVLC:139:6+PORT OF VALENCIA'");
      expect(rawIftmin).toContain("LOC+11+USNYC:139:6+NEW YORK CONTAINER TERMINAL'");
      expect(rawIftmin).toContain("EQD+CN+MSKU9918231+40HC:102:5'");
      expect(rawIftmin).toContain("UNT+");
      expect(rawIftmin).toContain("UNZ+1+");
    });

    it("should generate official CONTRL acknowledgment with correct status code", () => {
      const ackAccepted = EdifactService.generateCONTRL(
        "100021",
        "MAERSKLINE",
        "ATLASLOG",
        true,
      );
      expect(ackAccepted).toContain("UNH+1+CONTRL:D:96B:UN'");
      expect(ackAccepted).toContain("UCI+100021+MAERSKLINE:ZZ+ATLASLOG:ZZ+7'");

      const ackRejected = EdifactService.generateCONTRL(
        "100021",
        "MAERSKLINE",
        "ATLASLOG",
        false,
      );
      expect(ackRejected).toContain("UCI+100021+MAERSKLINE:ZZ+ATLASLOG:ZZ+4'");
    });
  });

  describe("X12Service", () => {
    it("should parse ANSI X12 214 carrier status report correctly", () => {
      const ast = EdiTokenizer.tokenize(sampleX12_214);
      const events = X12Service.parse214(ast);

      expect(events.length).toBe(1);
      const ev = events[0];
      expect(ev.senderId).toBe("KNIGHTSWIFT");
      expect(ev.referenceNumber).toBe("KS-991201");
      expect(ev.bookingReference).toBe("BK-2026-8819");
      expect(ev.statusCode).toBe("X6");
      expect(ev.milestone).toBe("IN_TRANSIT");
      expect(ev.locationCity).toBe("MADRID");
      expect(ev.isException).toBe(false);
    });

    it("should parse delivered milestone in ANSI X12 214", () => {
      const ast = EdiTokenizer.tokenize(sampleX12_Delivered);
      const events = X12Service.parse214(ast);

      expect(events.length).toBe(1);
      const ev = events[0];
      expect(ev.senderId).toBe("JBHUNT");
      expect(ev.statusCode).toBe("AG");
      expect(ev.milestone).toBe("DELIVERED");
      expect(ev.isException).toBe(false);
    });

    it("should generate valid ANSI X12 204 motor load tender", () => {
      const raw204 = X12Service.generate204(
        {
          bookingReference: "BK-2026-ROAD-01",
          carrierScac: "KNIG",
          shipper: {
            name: "VALENCIA CENTRAL LOGISTICS",
            address: "AVDA DEL PUERTO 100",
            city: "VALENCIA",
            state: "VC",
            postalCode: "46024",
          },
          consignee: {
            name: "MADRID DISTRIBUTION CENTER",
            address: "POLIGONO COBO CALLEJA 44",
            city: "MADRID",
            state: "MD",
            postalCode: "28947",
          },
          pickupDate: "20261005",
          deliveryDate: "20261006",
          cargoDescription: "PALLETIZED PHARMA & MEDICAL GOODS",
          totalWeightLbs: 22000,
          totalQuantity: 24,
        },
        "ATLASLOG",
        "KNIGHTSWIFT",
      );

      expect(raw204).toContain("ISA*00*");
      expect(raw204).toContain("GS*SM*ATLASLOG*KNIGHTSWIFT*");
      expect(raw204).toContain("ST*204*0001~");
      expect(raw204).toContain("B2*KNIG*BK-2026-ROAD-01***L~");
      expect(raw204).toContain("N1*SH*VALENCIA CENTRAL LOGISTICS~");
      expect(raw204).toContain("N1*CN*MADRID DISTRIBUTION CENTER~");
      expect(raw204).toContain("G62*68*20261005~");
      expect(raw204).toContain("G62*70*20261006~");
      expect(raw204).toContain("S5*1*LD*22000*L*24~");
      expect(raw204).toContain("SE*");
      expect(raw204).toContain("GE*1*");
      expect(raw204).toContain("IEA*1*");
    });

    it("should generate ANSI X12 997 functional acknowledgment", () => {
      const ack = X12Service.generate997("000008821", "KNIGHTSWIFT", "ATLASLOG", true);
      expect(ack).toContain("GS*FA*ATLASLOG*KNIGHTSWIFT*");
      expect(ack).toContain("ST*997*0001~");
      expect(ack).toContain("AK1*QM*");
      expect(ack).toContain("AK2*214*0001~");
      expect(ack).toContain("AK5*A~");
      expect(ack).toContain("AK9*A*1*1*1~");
    });
  });

  describe("EdiDispatcherService (Persistence & Flow)", () => {
    it("should process inbound EDIFACT payload, store in DB, and return CONTRL ACK", async () => {
      const result = await EdiDispatcherService.processInboundPayload(
        sampleEdifactIftsta,
      );

      expect(result.interchangeId).toBeDefined();
      expect(result.standard).toBe("EDIFACT");
      expect(result.senderId).toBe("MAERSKLINE");
      expect(result.status).toBe("APPLIED");
      expect(result.ackPayload).toContain("CONTRL");
      expect(result.messagesProcessed).toBe(1);
      expect(result.extractedMilestones).toContain("VESSEL_DEPARTED");

      // Verify DB persistence
      const saved = await db
        .select()
        .from(ediInterchanges)
        .where(eq(ediInterchanges.id, result.interchangeId));
      expect(saved.length).toBe(1);
      expect(saved[0].senderId).toBe("MAERSKLINE");
      expect(saved[0].ackStatus).toBe("ACCEPTED");
    });

    it("should process inbound ANSI X12 214 payload, store in DB, and return 997 ACK", async () => {
      const result = await EdiDispatcherService.processInboundPayload(sampleX12_214);

      expect(result.interchangeId).toBeDefined();
      expect(result.standard).toBe("ANSI_X12");
      expect(result.senderId).toBe("KNIGHTSWIFT");
      expect(result.status).toBe("APPLIED");
      expect(result.ackPayload).toContain("997");
      expect(result.messagesProcessed).toBe(1);
      expect(result.extractedMilestones).toContain("IN_TRANSIT");

      const saved = await db
        .select()
        .from(ediInterchanges)
        .where(eq(ediInterchanges.id, result.interchangeId));
      expect(saved.length).toBe(1);
      expect(saved[0].standard).toBe("ANSI_X12");
    });

    it("should generate and store outbound IFTMIN", async () => {
      const outbound = await EdiDispatcherService.generateOutbound({
        format: "IFTMIN",
        bookingReference: "BK-OUT-991",
        senderId: "ATLASLOG",
        receiverId: "MAERSKLINE",
        instructionData: {
          bookingReference: "BK-OUT-991",
          consignor: { name: "IBERIA EXPORT SL" },
          consignee: { name: "US IMPORT CORP" },
          portOfLoading: { code: "ESVLC", name: "VALENCIA" },
          portOfDischarge: { code: "USNYC", name: "NEW YORK" },
          cargoDescription: "CERAMIC TILES",
          grossWeightKg: 20000,
        },
      });

      expect(outbound.interchangeId).toBeDefined();
      expect(outbound.rawPayload).toContain("IFTMIN");
      expect(outbound.format).toBe("IFTMIN");

      const saved = await db
        .select()
        .from(ediInterchanges)
        .where(eq(ediInterchanges.id, outbound.interchangeId));
      expect(saved.length).toBe(1);
      expect(saved[0].direction).toBe("OUTBOUND");
    });

    it("should list trading partners including seeded carriers", async () => {
      const partners = await EdiDispatcherService.listPartners();
      expect(partners.length).toBeGreaterThanOrEqual(4);
      const senderIds = partners.map((p) => p.senderId);
      expect(senderIds).toContain("MAERSKLINE");
      expect(senderIds).toContain("KNIGHTSWIFT");
    });
  });
});
