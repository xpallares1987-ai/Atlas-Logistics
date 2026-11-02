import { describe, it, expect } from "vitest";
import {
  formatBlShipperBox,
  formatBlConsigneeBox,
  formatBlNotifyBox,
  formatBlAgentBox,
  formatAllBlBoxes,
  wrapBlTextLine,
} from "./bl-party-formatter.js";

describe("Maritime B/L Party Formatter Utility (BIMCO / FIATA / DCSA Standards)", () => {
  const sampleShipper = {
    companyName: "Atlas Global Logistics S.A.",
    taxId: "ESA00000000",
    street1: "Moll de Barcelona s/n, Edifici Est",
    zipCode: "08039",
    city: "Barcelona",
    country: "ES",
    unLocode: "ESBCN",
  };

  const sampleContact = {
    fullName: "Carlos Mendoza",
    email: "carlos.mendoza@atlaslog.com",
    phone: "+34 932 100 200",
    roleCategory: "OPERATIONS",
  };

  it("wraps long lines cleanly under 35-40 character limits", () => {
    const text =
      "Mediterranean Shipping Agency and International Freight Terminal";
    const wrapped = wrapBlTextLine(text, 35);
    expect(wrapped.length).toBeGreaterThanOrEqual(2);
    wrapped.forEach((line) => {
      expect(line.length).toBeLessThanOrEqual(35);
    });
  });

  it("formats standard Shipper Box with company, address, tax ID, and contact attention", () => {
    const box = formatBlShipperBox(sampleShipper, sampleContact);
    expect(box.title).toBe("SHIPPER / EXPORTER");
    expect(box.lines[0]).toBe("ATLAS GLOBAL LOGISTICS S.A.");
    expect(box.rawBlock).toContain("08039 BARCELONA, ES");
    expect(box.rawBlock).toContain("TAX ID: ESA00000000");
    expect(box.rawBlock).toContain("ATTN: CARLOS MENDOZA");
    expect(box.lines.length).toBeLessThanOrEqual(5);
  });

  it("formats straight nominative Consignee Box", () => {
    const sampleConsignee = {
      companyName: "Continental Distribution Hub Ltd",
      taxId: "NL88219001B01",
      street1: "Waalhaven Z.z. 42",
      zipCode: "3088 HJ",
      city: "Rotterdam",
      country: "NL",
      unLocode: "NLRTM",
    };

    const box = formatBlConsigneeBox(sampleConsignee);
    expect(box.title).toBe("CONSIGNEE");
    expect(box.lines[0]).toBe("CONTINENTAL DISTRIBUTION HUB LTD");
    expect(box.rawBlock).toContain("3088 HJ ROTTERDAM, NL");
    expect(box.rawBlock).toContain("VAT/EORI: NL88219001B01");
  });

  it("formats negotiable 'TO ORDER' Consignee Box under maritime UCP 600 rules", () => {
    const box = formatBlConsigneeBox(sampleShipper, undefined, {
      isToOrder: true,
      orderOf: "SANTANDER TRADE BANK",
    });

    expect(box.title).toBe("CONSIGNEE");
    expect(box.lines[0]).toBe("TO ORDER OF SANTANDER TRADE BANK");
    expect(box.rawBlock).toContain("ENDORSEMENT REQUIRED");
  });

  it("formats Notify Party with 'SAME AS CONSIGNEE' option", () => {
    const box = formatBlNotifyBox(undefined, undefined, {
      sameAsConsignee: true,
    });
    expect(box.title).toBe("NOTIFY PARTY");
    expect(box.lines[0]).toBe("SAME AS CONSIGNEE");
  });

  it("formats direct Notify Party with phone and email for mandatory arrival notice", () => {
    const notifyParty = {
      companyName: "Rotterdam Customs Logistics Agency B.V.",
      taxId: "NL11223344B01",
      street1: "Haven 1024, Gate 4",
      zipCode: "3198 LK",
      city: "Rotterdam",
      country: "NL",
      unLocode: "NLRTM",
    };
    const notifyContact = {
      fullName: "Anke van Dijk",
      email: "anke.customs@rdamlog.nl",
      phone: "+31 10 555 1234",
    };

    const box = formatBlNotifyBox(notifyParty, notifyContact);
    expect(box.title).toBe("NOTIFY PARTY");
    expect(box.lines[0]).toBe("ROTTERDAM CUSTOMS LOGISTICS AGENCY B.V.");
    expect(box.rawBlock).toContain("TEL: +31 10 555 1234");
    expect(box.rawBlock).toContain("EMAIL: ANKE.CUSTOMS@RDAMLOG.NL");
  });

  it("formats Carrier / Discharge Port Delivery Agent Box", () => {
    const agent = {
      companyName: "Maersk Line Agency Netherlands",
      street1: "Boompjes 40",
      zipCode: "3011 XB",
      city: "Rotterdam",
      country: "NL",
      unLocode: "NLRTM",
    };
    const box = formatBlAgentBox(agent);
    expect(box.title).toBe("DELIVERY / DISCHARGE AGENT");
    expect(box.lines[0]).toBe("MAERSK LINE AGENCY NETHERLANDS");
    expect(box.rawBlock).toContain("FOR DELIVERY APPLY TO:");
  });

  it("formats complete 4-box shipping instruction set via formatAllBlBoxes", () => {
    const all = formatAllBlBoxes({
      shipper: sampleShipper,
      shipperContact: sampleContact,
      consignee: sampleShipper,
      isToOrder: false,
      notifySameAsConsignee: true,
    });

    expect(all.shipper).toBeDefined();
    expect(all.consignee).toBeDefined();
    expect(all.notify).toBeDefined();
    expect(all.agent).toBeDefined();
  });
});
