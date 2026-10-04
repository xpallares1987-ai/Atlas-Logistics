import {
  EdiDocumentAST,
  EdiSegment,
  EdiCompositeElement,
} from "./edi-tokenizer.js";

export interface X12StatusEvent {
  senderId: string;
  receiverId: string;
  controlNumber: string;
  referenceNumber?: string;
  bookingReference?: string;
  carrierCode?: string;
  statusCode: string;
  milestone: string;
  locationCity?: string;
  locationState?: string;
  locationCountry?: string;
  eventTimestamp: string;
  isException: boolean;
  exceptionReason?: string;
}

export interface X12LoadTenderInstruction {
  bookingReference: string;
  proNumber?: string;
  carrierScac: string;
  shipper: { name: string; address: string; city: string; state: string; postalCode: string };
  consignee: { name: string; address: string; city: string; state: string; postalCode: string };
  pickupDate: string; // YYYYMMDD
  deliveryDate: string; // YYYYMMDD
  cargoDescription: string;
  totalWeightLbs: number;
  totalQuantity: number;
}

export class X12Service {
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
   * Map standard ANSI X12 AT7 status codes to canonical milestones
   */
  public static mapX12StatusCode(code: string): {
    milestone: string;
    isException: boolean;
    reason?: string;
  } {
    const upper = (code || "").toUpperCase().trim();
    switch (upper) {
      case "AF": // Carrier Departed Terminal
      case "AA": // Picked Up
        return { milestone: "PICKED_UP", isException: false };
      case "X6": // En Route to Delivery Location
      case "P1": // In Transit
        return { milestone: "IN_TRANSIT", isException: false };
      case "AG": // Delivered
      case "D1":
        return { milestone: "DELIVERED", isException: false };
      case "X4": // Carrier Delay / Exception
      case "SD":
        return {
          milestone: "CARRIER_DELAY",
          isException: true,
          reason: "Demora operativa notificada en ruta terrestre.",
        };
      case "H1": // Hold at Terminal
      case "CH":
        return {
          milestone: "CUSTOMS_HOLD",
          isException: true,
          reason: "Retención aduanera o inspección en frontera.",
        };
      case "OA": // Outgate Loaded
        return { milestone: "OUT_GATE", isException: false };
      default:
        return { milestone: upper || "IN_TRANSIT", isException: false };
    }
  }

  /**
   * Parse ANSI X12 214 (Transportation Carrier Shipment Status)
   */
  public static parse214(ast: EdiDocumentAST): X12StatusEvent[] {
    const events: X12StatusEvent[] = [];

    // Extract ISA interchange header
    const isa = ast.segments.find((s) => s.tag === "ISA");
    const senderId = isa ? this.getElem(isa, 5).trim() : "UNKNOWN_SENDER";
    const receiverId = isa ? this.getElem(isa, 7).trim() : "ATLASLOG";
    const controlNumber = isa ? this.getElem(isa, 12).trim() : "000000001";

    let currentRef = "";
    let currentBooking = "";
    let currentCarrier = "";
    let currentStatusCode = "";
    let currentCity = "";
    let currentState = "";
    let currentCountry = "";
    let currentTimestamp = new Date().toISOString();

    for (const seg of ast.segments) {
      if (seg.tag === "B10") {
        // B10*ReferenceIdentification*ShipmentId*CarrierCode
        currentRef = this.getElem(seg, 0);
        currentBooking = this.getElem(seg, 1);
        currentCarrier = this.getElem(seg, 2);
      } else if (seg.tag === "AT7") {
        // AT7*StatusCode*ReasonCode***Date*Time
        currentStatusCode = this.getElem(seg, 0);
        const dateVal = this.getElem(seg, 4);
        const timeVal = this.getElem(seg, 5);
        if (dateVal) {
          currentTimestamp = this.formatX12Date(dateVal, timeVal);
        }
      } else if (seg.tag === "MS1" || seg.tag === "MS2") {
        // MS1*CityName*StateCode*CountryCode
        currentCity = this.getElem(seg, 0);
        currentState = this.getElem(seg, 1);
        currentCountry = this.getElem(seg, 2);
      }
    }

    const { milestone, isException, reason } =
      this.mapX12StatusCode(currentStatusCode);

    events.push({
      senderId,
      receiverId,
      controlNumber,
      referenceNumber: currentRef || undefined,
      bookingReference: currentBooking || undefined,
      carrierCode: currentCarrier || undefined,
      statusCode: currentStatusCode || "214_STATUS",
      milestone,
      locationCity: currentCity || undefined,
      locationState: currentState || undefined,
      locationCountry: currentCountry || undefined,
      eventTimestamp: currentTimestamp,
      isException,
      exceptionReason: reason,
    });

    return events;
  }

  /**
   * Generate an official ANSI X12 204 (Motor Carrier Load Tender)
   */
  public static generate204(
    tender: X12LoadTenderInstruction,
    senderId: string = "ATLASLOG",
    receiverId: string = "KNIGHTSWIFT",
  ): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(2, 10).replace(/-/g, ""); // YYMMDD
    const fullDate = now.toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
    const timeStr = now.toTimeString().slice(0, 4).replace(/:/g, ""); // HHMM
    const controlNum = Math.floor(100000000 + Math.random() * 900000000).toString();
    const grpCtrl = Math.floor(1000 + Math.random() * 9000).toString();

    const paddedSender = senderId.padEnd(15, " ");
    const paddedReceiver = receiverId.padEnd(15, " ");

    const segments: string[] = [];

    // ISA: Interchange Control Header
    segments.push(
      `ISA*00*          *00*          *ZZ*${paddedSender}*ZZ*${paddedReceiver}*${dateStr}*${timeStr}*U*00401*${controlNum}*0*P*>~`,
    );

    // GS: Functional Group Header (SM = Motor Load Tender)
    segments.push(
      `GS*SM*${senderId}*${receiverId}*${fullDate}*${timeStr}*${grpCtrl}*X*004010~`,
    );

    // ST: Transaction Set Header (204)
    segments.push(`ST*204*0001~`);

    // B2: Beginning Segment for Shipment Information
    segments.push(`B2*${tender.carrierScac}*${tender.bookingReference}***L~`);

    // B2A: Set Purpose (00 = Original)
    segments.push(`B2A*00~`);

    // N1: Shipper
    segments.push(`N1*SH*${tender.shipper.name}~`);
    segments.push(`N3*${tender.shipper.address}~`);
    segments.push(
      `N4*${tender.shipper.city}*${tender.shipper.state}*${tender.shipper.postalCode}~`,
    );

    // G62: Date/Time (Pickup)
    segments.push(`G62*68*${tender.pickupDate}~`);

    // N1: Consignee
    segments.push(`N1*CN*${tender.consignee.name}~`);
    segments.push(`N3*${tender.consignee.address}~`);
    segments.push(
      `N4*${tender.consignee.city}*${tender.consignee.state}*${tender.consignee.postalCode}~`,
    );

    // G62: Date/Time (Delivery)
    segments.push(`G62*70*${tender.deliveryDate}~`);

    // S5: Stop-Off Details
    segments.push(`S5*1*LD*${tender.totalWeightLbs}*L*${tender.totalQuantity}~`);

    // L5: Description of Marks and Numbers
    segments.push(`L5*1*${tender.cargoDescription.slice(0, 50)}~`);

    // SE: Transaction Set Trailer
    // ST (1) + B2 (2) + B2A (3) + N1(4) + N3(5) + N4(6) + G62(7) + N1(8) + N3(9) + N4(10) + G62(11) + S5(12) + L5(13) + SE(14)
    const seCount = segments.length - 2 + 1; // from ST to SE
    segments.push(`SE*${seCount}*0001~`);

    // GE: Functional Group Trailer
    segments.push(`GE*1*${grpCtrl}~`);

    // IEA: Interchange Control Trailer
    segments.push(`IEA*1*${controlNum}~`);

    return segments.join("\n");
  }

  /**
   * Generate an official ANSI X12 997 Functional Acknowledgment
   */
  public static generate997(
    inboundControlNum: string,
    inboundSenderId: string,
    ourReceiverId: string = "ATLASLOG",
    accepted: boolean = true,
  ): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(2, 10).replace(/-/g, "");
    const fullDate = now.toISOString().slice(0, 10).replace(/-/g, "");
    const timeStr = now.toTimeString().slice(0, 4).replace(/:/g, "");
    const controlNum = Math.floor(100000000 + Math.random() * 900000000).toString();
    const grpCtrl = Math.floor(1000 + Math.random() * 9000).toString();

    const paddedSender = ourReceiverId.padEnd(15, " ");
    const paddedReceiver = inboundSenderId.padEnd(15, " ");
    const ackCode = accepted ? "A" : "R"; // A = Accepted, R = Rejected

    const segments: string[] = [
      `ISA*00*          *00*          *ZZ*${paddedSender}*ZZ*${paddedReceiver}*${dateStr}*${timeStr}*U*00401*${controlNum}*0*P*>~`,
      `GS*FA*${ourReceiverId}*${inboundSenderId}*${fullDate}*${timeStr}*${grpCtrl}*X*004010~`,
      `ST*997*0001~`,
      `AK1*QM*${grpCtrl}~`,
      `AK2*214*0001~`,
      `AK5*${ackCode}~`,
      `AK9*${ackCode}*1*1*1~`,
      `SE*6*0001~`,
      `GE*1*${grpCtrl}~`,
      `IEA*1*${controlNum}~`,
    ];

    return segments.join("\n");
  }

  private static formatX12Date(dateStr: string, timeStr?: string): string {
    // dateStr: YYYYMMDD, timeStr: HHMM
    if (dateStr.length === 8) {
      const year = dateStr.slice(0, 4);
      const month = dateStr.slice(4, 6);
      const day = dateStr.slice(6, 8);
      const hour = timeStr && timeStr.length >= 2 ? timeStr.slice(0, 2) : "00";
      const min = timeStr && timeStr.length >= 4 ? timeStr.slice(2, 4) : "00";
      return `${year}-${month}-${day}T${hour}:${min}:00Z`;
    }
    return new Date().toISOString();
  }
}
