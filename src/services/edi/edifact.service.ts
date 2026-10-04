import {
  EdiTokenizer,
  EdiDocumentAST,
  EdiSegment,
  EdiCompositeElement,
} from "./edi-tokenizer.js";

export interface EdifactIftstaEvent {
  senderId: string;
  receiverId: string;
  controlNumber: string;
  bookingReference?: string;
  billOfLading?: string;
  statusCode: string;
  milestone: string;
  locationName?: string;
  locationCode?: string;
  eventTimestamp: string;
  containerNumber?: string;
  vesselName?: string;
  voyageNumber?: string;
  isException: boolean;
  exceptionReason?: string;
}

export interface EdifactIftminInstruction {
  bookingReference: string;
  consignor: { name: string; address?: string; city?: string; country?: string };
  consignee: { name: string; address?: string; city?: string; country?: string };
  notifyParty?: { name: string; address?: string; city?: string };
  portOfLoading: { code: string; name: string };
  portOfDischarge: { code: string; name: string };
  cargoDescription: string;
  grossWeightKg: number;
  totalVolumeCbm?: number;
  containerNumber?: string;
  containerType?: string;
  dangerousGoods?: { unNumber: string; imdgClass: string };
}

export class EdifactService {
  /**
   * Helper to retrieve simple or composite component
   */
  private static getElem(
    seg: EdiSegment,
    index: number,
    compIndex: number = 0,
  ): string {
    const el = seg.elements[index];
    if (!el) return "";
    if (typeof el === "string") return el;
    return (el as EdiCompositeElement).components[compIndex] || "";
  }

  /**
   * Map standard EDIFACT Status codes to Canonical Atlas Logistics Milestones
   */
  public static mapStatusCode(code: string): {
    milestone: string;
    isException: boolean;
    reason?: string;
  } {
    const upper = (code || "").toUpperCase().trim();
    switch (upper) {
      case "VD": // Vessel Departed
      case "DEP":
      case "82":
        return { milestone: "VESSEL_DEPARTED", isException: false };
      case "VA": // Vessel Arrived
      case "ARR":
      case "81":
        return { milestone: "ARRIVED_AT_PORT", isException: false };
      case "OA": // Out-gate loaded
      case "AG":
        return { milestone: "OUT_GATE", isException: false };
      case "X4": // Customs Hold
      case "H1":
      case "CUS_HOLD":
        return {
          milestone: "CUSTOMS_HOLD",
          isException: true,
          reason: "Retención aduanera notificada por la terminal o autoridad aduanera.",
        };
      case "X6": // En route
      case "EN_ROUTE":
        return { milestone: "IN_TRANSIT", isException: false };
      case "CD": // Cargo Delivered
      case "D":
      case "D1":
        return { milestone: "DELIVERED", isException: false };
      case "DIS": // Discharged
        return { milestone: "DISCHARGED", isException: false };
      case "LOD": // Loaded
        return { milestone: "LOADED_ON_BOARD", isException: false };
      case "DEL": // Delayed
        return {
          milestone: "DELAYED",
          isException: true,
          reason: "Retraso operativo notificado por el transportista.",
        };
      default:
        return { milestone: upper || "UNKNOWN_MILESTONE", isException: false };
    }
  }

  /**
   * Parse IFTSTA (International Multimodal Status Report)
   */
  public static parseIFTSTA(ast: EdiDocumentAST): EdifactIftstaEvent[] {
    const events: EdifactIftstaEvent[] = [];

    // Extract UNB interchange header
    const unb = ast.segments.find((s) => s.tag === "UNB");
    const senderId = unb ? this.getElem(unb, 1, 0) : "UNKNOWN_SENDER";
    const receiverId = unb ? this.getElem(unb, 2, 0) : "ATLASLOG";
    const controlNumber = unb ? this.getElem(unb, 4, 0) : `CTRL-${Date.now()}`;

    let currentBookingRef = "";
    let currentBl = "";
    let currentStatus = "";
    let currentLocationName = "";
    let currentLocationCode = "";
    let currentEventTimestamp = new Date().toISOString();
    let currentContainer = "";
    let currentVessel = "";
    let currentVoyage = "";

    for (const seg of ast.segments) {
      if (seg.tag === "BGM") {
        currentBookingRef = this.getElem(seg, 1, 0) || this.getElem(seg, 1);
      } else if (seg.tag === "RFF") {
        const qualifier = this.getElem(seg, 0, 0);
        const refVal = this.getElem(seg, 0, 1) || this.getElem(seg, 0);
        if (qualifier === "BM" || qualifier === "BL") {
          currentBl = refVal;
        } else if (qualifier === "BN" || qualifier === "BK") {
          currentBookingRef = refVal;
        }
      } else if (seg.tag === "DTM") {
        // e.g. DTM+137:202610041200:203'
        const val = this.getElem(seg, 0, 1) || this.getElem(seg, 0);
        if (val) {
          currentEventTimestamp = this.formatEdifactDate(val);
        }
      } else if (seg.tag === "LOC") {
        const locCode = this.getElem(seg, 1, 0);
        const locName = this.getElem(seg, 2) || this.getElem(seg, 1, 3);
        if (locCode) currentLocationCode = locCode;
        if (locName) currentLocationName = locName;
      } else if (seg.tag === "EQD") {
        currentContainer = this.getElem(seg, 1, 0) || this.getElem(seg, 1);
      } else if (seg.tag === "TDT") {
        currentVoyage = this.getElem(seg, 1, 0);
        currentVessel = this.getElem(seg, 7, 3) || this.getElem(seg, 7, 0);
      } else if (seg.tag === "STS") {
        // e.g. STS+1+VD'
        currentStatus = this.getElem(seg, 1, 0) || this.getElem(seg, 1);
      }
    }

    const { milestone, isException, reason } = this.mapStatusCode(currentStatus);

    events.push({
      senderId,
      receiverId,
      controlNumber,
      bookingReference: currentBookingRef || undefined,
      billOfLading: currentBl || undefined,
      statusCode: currentStatus || "STATUS_REPORT",
      milestone,
      locationName: currentLocationName || undefined,
      locationCode: currentLocationCode || undefined,
      eventTimestamp: currentEventTimestamp,
      containerNumber: currentContainer || undefined,
      vesselName: currentVessel || undefined,
      voyageNumber: currentVoyage || undefined,
      isException,
      exceptionReason: reason,
    });

    return events;
  }

  /**
   * Generate an official UN/EDIFACT IFTMIN (Instruction Message)
   */
  public static generateIFTMIN(
    instruction: EdifactIftminInstruction,
    senderId: string = "ATLASLOG",
    receiverId: string = "MAERSKLINE",
  ): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(2, 10).replace(/-/g, ""); // YYMMDD
    const timeStr = now.toTimeString().slice(0, 5).replace(/:/g, ""); // HHMM
    const fullDate = now.toISOString().slice(0, 10).replace(/-/g, "") + timeStr; // YYYYMMDDHHMM
    const controlNum = Math.floor(100000 + Math.random() * 900000).toString();

    const segments: string[] = [];

    // Service String Advice UNA
    segments.push("UNA:+.? '");

    // UNB: Interchange Header
    segments.push(
      `UNB+UNOA:2+${senderId}:ZZ+${receiverId}:ZZ+${dateStr}:${timeStr}+${controlNum}'`,
    );

    // UNH: Message Header
    segments.push(`UNH+1+IFTMIN:D:96B:UN'`);

    // BGM: Beginning of Message (Code 340 = Shipping Instruction)
    segments.push(`BGM+340+${instruction.bookingReference}+9'`);

    // DTM: Date/Time (137 = Document Date)
    segments.push(`DTM+137:${fullDate}:203'`);

    // NAD: Consignor (CZ)
    segments.push(
      `NAD+CZ+++${instruction.consignor.name}+${instruction.consignor.address || "LOGISTICS HUB"}+${instruction.consignor.city || "MADRID"}++${instruction.consignor.country || "ES"}'`,
    );

    // NAD: Consignee (CN)
    segments.push(
      `NAD+CN+++${instruction.consignee.name}+${instruction.consignee.address || "IMPORT DOCK"}+${instruction.consignee.city || "NEW YORK"}++${instruction.consignee.country || "US"}'`,
    );

    // LOC: Port of Loading (Code 9)
    segments.push(
      `LOC+9+${instruction.portOfLoading.code}:139:6+${instruction.portOfLoading.name}'`,
    );

    // LOC: Port of Discharge (Code 11)
    segments.push(
      `LOC+11+${instruction.portOfDischarge.code}:139:6+${instruction.portOfDischarge.name}'`,
    );

    // GID: Goods Item Details
    segments.push(`GID+1+1:PK'`);

    // FTX: Free text goods description
    segments.push(`FTX+AAA+++${instruction.cargoDescription.slice(0, 70)}'`);

    // MEA: Weights (WT = Weight, G = Gross Weight, KGM = Kilograms)
    segments.push(`MEA+WT+G+KGM:${instruction.grossWeightKg}'`);

    // EQD: Equipment details (Container)
    if (instruction.containerNumber) {
      segments.push(
        `EQD+CN+${instruction.containerNumber}+${instruction.containerType || "40HC"}:102:5'`,
      );
    }

    // DGS: Dangerous goods classification if applicable
    if (instruction.dangerousGoods) {
      segments.push(
        `DGS+IMD+${instruction.dangerousGoods.imdgClass}+${instruction.dangerousGoods.unNumber}'`,
      );
    }

    // Count message segments (from UNH to UNT inclusive)
    // UNH (1) + ... + UNT (1)
    const segmentCount = segments.length - 1; // exclude UNA & UNB, +1 for UNT itself
    segments.push(`UNT+${segmentCount}+1'`);

    // UNZ: Interchange Trailer
    segments.push(`UNZ+1+${controlNum}'`);

    return segments.join("\n");
  }

  /**
   * Generate an official UN/EDIFACT CONTRL Acknowledgment message
   */
  public static generateCONTRL(
    inboundControlNum: string,
    inboundSenderId: string,
    ourReceiverId: string = "ATLASLOG",
    accepted: boolean = true,
  ): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(2, 10).replace(/-/g, "");
    const timeStr = now.toTimeString().slice(0, 5).replace(/:/g, "");
    const ackCtrl = `ACK${Math.floor(1000 + Math.random() * 9000)}`;
    const statusCode = accepted ? "7" : "4"; // 7 = Accepted, 4 = Rejected

    const segments: string[] = [
      `UNB+UNOA:2+${ourReceiverId}:ZZ+${inboundSenderId}:ZZ+${dateStr}:${timeStr}+${ackCtrl}'`,
      `UNH+1+CONTRL:D:96B:UN'`,
      `UCI+${inboundControlNum}+${inboundSenderId}:ZZ+${ourReceiverId}:ZZ+${statusCode}'`,
      `UCM+1+IFTSTA:D:96B:UN+${statusCode}'`,
      `UNT+4+1'`,
      `UNZ+1+${ackCtrl}'`,
    ];

    return segments.join("\n");
  }

  private static formatEdifactDate(raw: string): string {
    // 202610041200 or 20261004
    if (raw.length === 12) {
      const year = raw.slice(0, 4);
      const month = raw.slice(4, 6);
      const day = raw.slice(6, 8);
      const hour = raw.slice(8, 10);
      const min = raw.slice(10, 12);
      return `${year}-${month}-${day}T${hour}:${min}:00Z`;
    }
    if (raw.length === 8) {
      const year = raw.slice(0, 4);
      const month = raw.slice(4, 6);
      const day = raw.slice(6, 8);
      return `${year}-${month}-${day}T00:00:00Z`;
    }
    return new Date().toISOString();
  }
}
