/**
 * @file edifact-iftsta.service.ts
 * @description UN/EDIFACT D96A IFTSTA (Multimodal Status Report) Generator & Technical ACK CONTRL Handler.
 */

import { EdifactIftstaEvent, EdifactService } from "./edifact.service.js";
import { EdiTokenizer } from "./edi-tokenizer.js";

export class EdifactIftstaService {
  /**
   * Generate an official UN/EDIFACT D96A IFTSTA status message string
   */
  public static generateIFTSTA(
    event: EdifactIftstaEvent,
    senderId: string = "ATLASLOG",
    receiverId: string = "PARTNER",
  ): string {
    const now = new Date();
    const dateYYMMDD = now.toISOString().slice(2, 10).replace(/-/g, "");
    const timeHHMM = now.toTimeString().slice(0, 5).replace(/:/g, "");
    const controlNum =
      event.controlNumber ||
      Math.floor(100000 + Math.random() * 900000).toString();

    const eventDateIso = event.eventTimestamp
      ? new Date(event.eventTimestamp)
      : now;
    const eventDt =
      eventDateIso.toISOString().slice(0, 10).replace(/-/g, "") +
      eventDateIso.toTimeString().slice(0, 5).replace(/:/g, "");

    const segments: string[] = [];

    // Interchange Header
    segments.push(
      `UNB+UNOA:2+${senderId}+${receiverId}+${dateYYMMDD}:${timeHHMM}+${controlNum}'`,
    );
    // Message Header
    segments.push(`UNH+1+IFTSTA:D:96A:UN'`);
    // Beginning of Message (44 = Status Report)
    segments.push(`BGM+44+${event.controlNumber || controlNum}+9'`);
    // Status Event Date
    segments.push(`DTM+137:${eventDt}:203'`);

    // References
    if (event.bookingReference) {
      segments.push(`RFF+BN:${event.bookingReference}'`);
    }
    if (event.billOfLading) {
      segments.push(`RFF+BM:${event.billOfLading}'`);
    }

    // Equipment / Container
    if (event.containerNumber) {
      segments.push(`EQD+CN+${event.containerNumber}'`);
    }

    // Transport Details
    if (event.vesselName || event.voyageNumber) {
      segments.push(
        `TDT+20+${event.voyageNumber || "V001"}++++:::${event.vesselName || "VESSEL"}'`,
      );
    }

    // Location
    if (event.locationCode || event.locationName) {
      segments.push(
        `LOC+11+${event.locationCode || "UNLOC"}:::${event.locationName || ""}'`,
      );
    }

    // Status Report Segment
    segments.push(`STS+1+${event.statusCode}'`);

    // Free text if exception or remarks
    if (event.exceptionReason) {
      segments.push(`FTX+AAI+++${event.exceptionReason}'`);
    }

    // Message Trailer
    const segmentCount = segments.length; // UNH to UNT
    segments.push(`UNT+${segmentCount}+1'`);
    // Interchange Trailer
    segments.push(`UNZ+1+${controlNum}'`);

    return segments.join("\n");
  }

  /**
   * Generate technical acknowledgment CONTRL (EDIFACT syntax ACK or rejection)
   */
  public static generateCONTRL(
    interchangeSender: string,
    interchangeReceiver: string,
    referenceControlNum: string,
    status: "ACCEPTED" | "REJECTED" = "ACCEPTED",
    errorMessage?: string,
  ): string {
    const now = new Date();
    const dateYYMMDD = now.toISOString().slice(2, 10).replace(/-/g, "");
    const timeHHMM = now.toTimeString().slice(0, 5).replace(/:/g, "");
    const controlNum = Math.floor(100000 + Math.random() * 900000).toString();

    const segments: string[] = [];

    // Interchange Header
    segments.push(
      `UNB+UNOA:2+${interchangeReceiver}+${interchangeSender}+${dateYYMMDD}:${timeHHMM}+${controlNum}'`,
    );
    // Message Header
    segments.push(`UNH+1+CONTRL:D:96A:UN'`);
    // UCI: Interchange Response (7 = Acknowledgement / Accepted, 4 = Rejected)
    const uciActionCode = status === "ACCEPTED" ? "7" : "4";
    segments.push(
      `UCI+${referenceControlNum}+${interchangeSender}+${interchangeReceiver}+${uciActionCode}'`,
    );

    // UCM: Message Response
    const ucmActionCode = status === "ACCEPTED" ? "7" : "4";
    segments.push(`UCM+1+DESADV:D:96A:UN+${ucmActionCode}'`);

    if (status === "REJECTED" && errorMessage) {
      segments.push(`FTX+AAI+++SYNTAX ERROR: ${errorMessage.slice(0, 70)}'`);
    }

    // Message Trailer
    const segmentCount = segments.length;
    segments.push(`UNT+${segmentCount}+1'`);
    // Interchange Trailer
    segments.push(`UNZ+1+${controlNum}'`);

    return segments.join("\n");
  }
}
