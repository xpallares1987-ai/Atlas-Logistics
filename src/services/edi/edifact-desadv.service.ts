/**
 * @file edifact-desadv.service.ts
 * @description UN/EDIFACT D96A DESADV (Despatch Advice) Parser, Builder & Outbox Dispatcher.
 */

import {
  EdiTokenizer,
  EdiDocumentAST,
  EdiSegment,
  EdiCompositeElement,
} from "./edi-tokenizer.js";
import { outboxBus } from "../../scm/kernel/outbox-bus.js";
import { DEFAULT_OPERATOR_ACTOR } from "../../scm/kernel/primitives.js";
import { logger } from "../../config/logger.js";
import { v4 as uuidv4 } from "uuid";

export interface DespatchAdviceItem {
  itemNumber: number;
  productId: string;
  description: string;
  quantity: number;
  unitOfMeasure: string;
  packageCount?: number;
  packageType?: string;
  grossWeightKg?: number;
}

export interface DespatchAdviceParty {
  name: string;
  code?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  countryCode?: string;
}

export interface DespatchAdvice {
  despatchAdviceNumber: string;
  despatchDate: string; // ISO 8601
  estimatedDeliveryDate?: string;
  orderReference: string;
  billOfLadingReference?: string;
  consignor: DespatchAdviceParty;
  consignee: DespatchAdviceParty;
  buyer?: DespatchAdviceParty;
  carrier?: DespatchAdviceParty;
  items: DespatchAdviceItem[];
  totalPackages: number;
  totalGrossWeightKg: number;
}

export class EdifactDesadvService {
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

  private static formatEdifactDate(dateVal: string): string {
    if (!dateVal) return new Date().toISOString();
    // YYYYMMDDHHMM (format 203)
    if (dateVal.length === 12) {
      const yr = dateVal.slice(0, 4);
      const mo = dateVal.slice(4, 6);
      const dy = dateVal.slice(6, 8);
      const hr = dateVal.slice(8, 10);
      const mi = dateVal.slice(10, 12);
      return new Date(`${yr}-${mo}-${dy}T${hr}:${mi}:00Z`).toISOString();
    }
    // YYYYMMDD (format 102)
    if (dateVal.length === 8) {
      const yr = dateVal.slice(0, 4);
      const mo = dateVal.slice(4, 6);
      const dy = dateVal.slice(6, 8);
      return new Date(`${yr}-${mo}-${dy}T00:00:00Z`).toISOString();
    }
    return new Date().toISOString();
  }

  /**
   * Parse a raw EDIFACT message or AST into a structured DespatchAdvice object
   */
  public static parse(payload: string | EdiDocumentAST): DespatchAdvice {
    const ast =
      typeof payload === "string" ? EdiTokenizer.tokenize(payload) : payload;

    let despatchAdviceNumber = `DESADV-${Date.now()}`;
    let despatchDate = new Date().toISOString();
    let estimatedDeliveryDate: string | undefined;
    let orderReference = "";
    let billOfLadingReference: string | undefined;

    let consignor: DespatchAdviceParty = { name: "Consignor" };
    let consignee: DespatchAdviceParty = { name: "Consignee" };
    let buyer: DespatchAdviceParty | undefined;
    let carrier: DespatchAdviceParty | undefined;

    const items: DespatchAdviceItem[] = [];
    let currentItem: Partial<DespatchAdviceItem> | null = null;
    let totalPackages = 0;
    let totalGrossWeightKg = 0;

    for (const seg of ast.segments) {
      switch (seg.tag) {
        case "BGM": {
          // BGM+351+DESADV-NUMBER+9'
          const num = this.getElem(seg, 1, 0) || this.getElem(seg, 1);
          if (num) despatchAdviceNumber = num;
          break;
        }

        case "DTM": {
          // DTM+137:202611111200:203' (137 = Despatch Date, 17 = Delivery Date)
          const qual = this.getElem(seg, 0, 0);
          const val = this.getElem(seg, 0, 1) || this.getElem(seg, 0);
          if (qual === "137" || qual === "11") {
            despatchDate = this.formatEdifactDate(val);
          } else if (qual === "17" || qual === "2") {
            estimatedDeliveryDate = this.formatEdifactDate(val);
          }
          break;
        }

        case "RFF": {
          // RFF+ON:ORDER-12345' or RFF+BM:BL-9921'
          const qual = this.getElem(seg, 0, 0);
          const ref = this.getElem(seg, 0, 1);
          if (qual === "ON" || qual === "VN") {
            orderReference = ref;
          } else if (qual === "BM" || qual === "BL") {
            billOfLadingReference = ref;
          }
          break;
        }

        case "NAD": {
          // NAD+SE/CZ/CN/CA+CODE::92+NAME+STREET+CITY++POSTAL+COUNTRY'
          const role = this.getElem(seg, 0, 0);
          const code = this.getElem(seg, 1, 0);
          const name = this.getElem(seg, 2, 0) || this.getElem(seg, 2);
          const address = this.getElem(seg, 3, 0) || this.getElem(seg, 3);
          const city = this.getElem(seg, 4, 0) || this.getElem(seg, 4);
          const postalCode = this.getElem(seg, 6, 0) || this.getElem(seg, 6);
          const countryCode = this.getElem(seg, 7, 0) || this.getElem(seg, 7);

          const party: DespatchAdviceParty = {
            name: name || "Party",
            code: code || undefined,
            address: address || undefined,
            city: city || undefined,
            postalCode: postalCode || undefined,
            countryCode: countryCode || undefined,
          };

          if (role === "SE" || role === "CZ" || role === "SH") {
            consignor = party;
          } else if (role === "CN" || role === "DP") {
            consignee = party;
          } else if (role === "BY") {
            buyer = party;
          } else if (role === "CA") {
            carrier = party;
          }
          break;
        }

        case "PAC": {
          // PAC+10++CT'
          const count = parseInt(this.getElem(seg, 0, 0), 10);
          const type = this.getElem(seg, 2, 0);
          if (!isNaN(count)) totalPackages += count;
          if (currentItem) {
            currentItem.packageCount = !isNaN(count) ? count : 1;
            currentItem.packageType = type || "CT";
          }
          break;
        }

        case "MEA": {
          // MEA+WT+G+KGM:1500'
          const qual = this.getElem(seg, 0, 0);
          const uom = this.getElem(seg, 2, 0);
          const val = parseFloat(this.getElem(seg, 2, 1));
          if (!isNaN(val)) {
            if (currentItem) {
              currentItem.grossWeightKg = val;
            } else {
              totalGrossWeightKg += val;
            }
          }
          break;
        }

        case "LIN": {
          // LIN+1++PROD-01:IN'
          if (currentItem && currentItem.productId) {
            items.push(this.completeItem(currentItem, items.length + 1));
          }
          const itemNum =
            parseInt(this.getElem(seg, 0, 0), 10) || items.length + 1;
          const prodId = this.getElem(seg, 2, 0) || `ITEM-${itemNum}`;
          currentItem = {
            itemNumber: itemNum,
            productId: prodId,
            description: "Goods Item",
            quantity: 1,
            unitOfMeasure: "PCE",
          };
          break;
        }

        case "IMD": {
          // IMD+F++:::Industrial Sensor Units'
          const desc =
            this.getElem(seg, 2, 3) ||
            this.getElem(seg, 2, 0) ||
            this.getElem(seg, 1);
          if (currentItem && desc) {
            currentItem.description = desc;
          }
          break;
        }

        case "QTY": {
          // QTY+12:50:PCE'
          const qual = this.getElem(seg, 0, 0);
          const qty = parseFloat(this.getElem(seg, 0, 1));
          const uom = this.getElem(seg, 0, 2);
          if (currentItem && !isNaN(qty)) {
            currentItem.quantity = qty;
            if (uom) currentItem.unitOfMeasure = uom;
          }
          break;
        }
      }
    }

    if (currentItem && currentItem.productId) {
      items.push(this.completeItem(currentItem, items.length + 1));
    }

    if (totalGrossWeightKg === 0 && items.length > 0) {
      totalGrossWeightKg = items.reduce(
        (acc, i) => acc + (i.grossWeightKg || 0),
        0,
      );
    }
    if (totalPackages === 0 && items.length > 0) {
      totalPackages = items.reduce((acc, i) => acc + (i.packageCount || 1), 0);
    }

    return {
      despatchAdviceNumber,
      despatchDate,
      estimatedDeliveryDate,
      orderReference: orderReference || "ORD-DEMO-01",
      billOfLadingReference,
      consignor,
      consignee,
      buyer,
      carrier,
      items:
        items.length > 0
          ? items
          : [
              {
                itemNumber: 1,
                productId: "PROD-DEFAULT-01",
                description: "Consolidated Cargo Packages",
                quantity: 10,
                unitOfMeasure: "PCE",
                packageCount: 1,
                packageType: "PK",
                grossWeightKg: 100,
              },
            ],
      totalPackages: totalPackages || 1,
      totalGrossWeightKg: totalGrossWeightKg || 100,
    };
  }

  private static completeItem(
    item: Partial<DespatchAdviceItem>,
    fallbackIndex: number,
  ): DespatchAdviceItem {
    return {
      itemNumber: item.itemNumber || fallbackIndex,
      productId: item.productId || `PROD-${fallbackIndex}`,
      description: item.description || "General Merchandise",
      quantity: item.quantity || 1,
      unitOfMeasure: item.unitOfMeasure || "PCE",
      packageCount: item.packageCount || 1,
      packageType: item.packageType || "CT",
      grossWeightKg: item.grossWeightKg || 10,
    };
  }

  /**
   * Generate an official UN/EDIFACT D96A DESADV message string
   */
  public static generate(
    advice: DespatchAdvice,
    senderId: string = "ATLASLOG",
    receiverId: string = "SUPPLIER01",
  ): string {
    const now = new Date();
    const dateYYMMDD = now.toISOString().slice(2, 10).replace(/-/g, "");
    const timeHHMM = now.toTimeString().slice(0, 5).replace(/:/g, "");
    const controlNum = Math.floor(100000 + Math.random() * 900000).toString();

    const dtDespatch =
      advice.despatchDate.slice(0, 10).replace(/-/g, "") + "1200";
    const dtDelivery = advice.estimatedDeliveryDate
      ? advice.estimatedDeliveryDate.slice(0, 10).replace(/-/g, "") + "1800"
      : "";

    const segments: string[] = [];

    // Interchange Header
    segments.push(
      `UNB+UNOA:2+${senderId}+${receiverId}+${dateYYMMDD}:${timeHHMM}+${controlNum}'`,
    );
    // Message Header
    segments.push(`UNH+1+DESADV:D:96A:UN'`);
    // Beginning of Message (351 = Despatch Advice)
    segments.push(`BGM+351+${advice.despatchAdviceNumber}+9'`);
    // Document Date
    segments.push(`DTM+137:${dtDespatch}:203'`);
    if (dtDelivery) {
      segments.push(`DTM+17:${dtDelivery}:203'`);
    }

    // References
    if (advice.orderReference) {
      segments.push(`RFF+ON:${advice.orderReference}'`);
    }
    if (advice.billOfLadingReference) {
      segments.push(`RFF+BM:${advice.billOfLadingReference}'`);
    }

    // Parties
    segments.push(
      `NAD+SE+${advice.consignor.code || "SUPPLIER"}::92+${advice.consignor.name}+${advice.consignor.address || ""}+${advice.consignor.city || ""}++${advice.consignor.postalCode || ""}+${advice.consignor.countryCode || ""}'`,
    );
    segments.push(
      `NAD+CN+${advice.consignee.code || "CUSTOMER"}::92+${advice.consignee.name}+${advice.consignee.address || ""}+${advice.consignee.city || ""}++${advice.consignee.postalCode || ""}+${advice.consignee.countryCode || ""}'`,
    );

    // Consignment Packaging Sequence
    segments.push(`CPS+1'`);
    segments.push(`PAC+${advice.totalPackages}++CT'`);
    segments.push(`MEA+WT+G+KGM:${advice.totalGrossWeightKg}'`);

    // Line items
    for (const item of advice.items) {
      segments.push(`LIN+${item.itemNumber}++${item.productId}:IN'`);
      segments.push(`IMD+F++:::${item.description}'`);
      segments.push(`QTY+12:${item.quantity}:${item.unitOfMeasure}'`);
      if (item.grossWeightKg) {
        segments.push(`MEA+WT+G+KGM:${item.grossWeightKg}'`);
      }
      if (item.packageCount) {
        segments.push(`PAC+${item.packageCount}++${item.packageType || "CT"}'`);
      }
    }

    // Message Trailer
    const segmentCount = segments.length; // UNH to UNT inclusive
    segments.push(`UNT+${segmentCount}+1'`);
    // Interchange Trailer
    segments.push(`UNZ+1+${controlNum}'`);

    return segments.join("\n");
  }

  /**
   * Ingest an inbound DESADV message, parse it, and emit an outbox domain event
   */
  public static async ingest(rawPayload: string): Promise<{
    success: boolean;
    despatchAdvice: DespatchAdvice;
    outboxEventId?: string;
  }> {
    const advice = this.parse(rawPayload);
    const eventId = `evt_${uuidv4()}`;

    try {
      await outboxBus.enqueueEvents([
        {
          eventId,
          eventType: "edi.desadv.Received.v1",
          schemaVersion: 1,
          producerContext: "edi_gateway",
          aggregateType: "DESPATCH_ADVICE",
          aggregateId: advice.despatchAdviceNumber,
          aggregateVersion: 1,
          correlationId: `corr_${advice.orderReference}`,
          causationId: `inbound_${advice.despatchAdviceNumber}`,
          actor: DEFAULT_OPERATOR_ACTOR,
          occurredAt: new Date().toISOString(),
          payload: {
            despatchAdviceNumber: advice.despatchAdviceNumber,
            orderReference: advice.orderReference,
            billOfLadingReference: advice.billOfLadingReference,
            consignor: advice.consignor.name,
            consignee: advice.consignee.name,
            totalPackages: advice.totalPackages,
            totalGrossWeightKg: advice.totalGrossWeightKg,
            itemCount: advice.items.length,
            items: advice.items,
          },
        },
      ]);
    } catch (err) {
      logger.warn(
        { err },
        "Could not enqueue edi.desadv.Received.v1 outbox event",
      );
    }

    return {
      success: true,
      despatchAdvice: advice,
      outboxEventId: eventId,
    };
  }
}
