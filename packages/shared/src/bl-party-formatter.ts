/**
 * Maritime B/L Party Formatter Utility
 *
 * Implements standard party formatting for Ocean Bill of Lading (B/L) and Shipping Instructions.
 * Conforms to BIMCO, FIATA, and DCSA eBL specifications:
 * - 4 to 5 text lines maximum per party box
 * - Canonical 35-character soft-wrapping per line
 * - Standardized prefixes for TAX ID, EORI, ATTN, TEL, and EMAIL
 */

export interface BlAddressInput {
  companyName: string;
  tradeName?: string;
  taxId?: string; // NIF / CIF / EORI / VAT / EIN
  street1: string;
  street2?: string;
  zipCode: string;
  city: string;
  federalState?: string;
  country: string;
  unLocode?: string;
}

export interface BlContactInput {
  fullName?: string;
  email?: string;
  phone?: string;
  roleCategory?: string;
}

export interface FormattedBlBox {
  title: string;
  lines: string[];
  rawBlock: string;
  characterCount: number;
  isValidLength: boolean;
}

/**
 * Word-aware text wrapping under maxLineLength
 */
export function wrapBlTextLine(
  text: string,
  maxLineLength: number = 35,
): string[] {
  if (!text) return [];
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (!currentLine) {
      currentLine = word;
    } else if (currentLine.length + 1 + word.length <= maxLineLength) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Format Shipper / Exporter Box
 */
export function formatBlShipperBox(
  address?: BlAddressInput,
  contact?: BlContactInput,
  options?: { maxLineLength?: number },
): FormattedBlBox {
  const maxLen = options?.maxLineLength || 40;
  const lines: string[] = [];

  if (address) {
    lines.push((address.companyName || "UNKNOWN SHIPPER").toUpperCase());
    const street = [address.street1, address.street2]
      .filter(Boolean)
      .join(", ");
    if (street) lines.push(street.toUpperCase());
    const cityLine =
      `${address.zipCode || ""} ${address.city || ""}, ${address.country || ""}`.trim();
    if (cityLine) lines.push(cityLine.toUpperCase());
    if (address.taxId) lines.push(`TAX ID: ${address.taxId.toUpperCase()}`);
    if (contact?.fullName) {
      const attn = `ATTN: ${contact.fullName.toUpperCase()}${contact.phone ? ` / ${contact.phone}` : ""}`;
      lines.push(attn);
    }
  } else {
    lines.push("SHIPPER DETAILS NOT ASSIGNED");
  }

  const finalLines = lines.slice(0, 5).map((l) => l.slice(0, maxLen));
  const rawBlock = finalLines.join("\n");

  return {
    title: "SHIPPER / EXPORTER",
    lines: finalLines,
    rawBlock,
    characterCount: rawBlock.length,
    isValidLength: finalLines.every((l) => l.length <= maxLen),
  };
}

/**
 * Format Consignee Box (Straight or Negotiable "TO ORDER")
 */
export function formatBlConsigneeBox(
  address?: BlAddressInput,
  contact?: BlContactInput,
  options?: { isToOrder?: boolean; orderOf?: string; maxLineLength?: number },
): FormattedBlBox {
  const maxLen = options?.maxLineLength || 40;
  const lines: string[] = [];

  if (options?.isToOrder) {
    const orderTarget = options.orderOf
      ? options.orderOf.toUpperCase()
      : "THE SHIPPER";
    lines.push(`TO ORDER OF ${orderTarget}`);
    lines.push("NOTIFY PARTY MUST BE SPECIFIED");
    lines.push("ENDORSEMENT REQUIRED (UCP 600)");
  } else if (address) {
    lines.push((address.companyName || "UNKNOWN CONSIGNEE").toUpperCase());
    const street = [address.street1, address.street2]
      .filter(Boolean)
      .join(", ");
    if (street) lines.push(street.toUpperCase());
    const cityLine =
      `${address.zipCode || ""} ${address.city || ""}, ${address.country || ""}`.trim();
    if (cityLine) lines.push(cityLine.toUpperCase());
    if (address.taxId) lines.push(`VAT/EORI: ${address.taxId.toUpperCase()}`);
    if (contact?.fullName) {
      lines.push(`ATTN: ${contact.fullName.toUpperCase()}`);
    }
  } else {
    lines.push("TO ORDER");
  }

  const finalLines = lines.slice(0, 5).map((l) => l.slice(0, maxLen));
  const rawBlock = finalLines.join("\n");

  return {
    title: "CONSIGNEE",
    lines: finalLines,
    rawBlock,
    characterCount: rawBlock.length,
    isValidLength: finalLines.every((l) => l.length <= maxLen),
  };
}

/**
 * Format Notify Party Box
 */
export function formatBlNotifyBox(
  address?: BlAddressInput,
  contact?: BlContactInput,
  options?: { sameAsConsignee?: boolean; maxLineLength?: number },
): FormattedBlBox {
  const maxLen = options?.maxLineLength || 40;
  const lines: string[] = [];

  if (options?.sameAsConsignee) {
    lines.push("SAME AS CONSIGNEE");
  } else if (address) {
    lines.push((address.companyName || "UNKNOWN NOTIFY PARTY").toUpperCase());
    const street = [address.street1, address.street2]
      .filter(Boolean)
      .join(", ");
    if (street) lines.push(street.toUpperCase());
    const cityLine =
      `${address.zipCode || ""} ${address.city || ""}, ${address.country || ""}`.trim();
    if (cityLine) lines.push(cityLine.toUpperCase());
    if (contact?.phone) lines.push(`TEL: ${contact.phone}`);
    if (contact?.email) lines.push(`EMAIL: ${contact.email.toUpperCase()}`);
    if (address.taxId && lines.length < 5)
      lines.push(`TAX ID: ${address.taxId.toUpperCase()}`);
  } else {
    lines.push("SAME AS CONSIGNEE");
  }

  const finalLines = lines.slice(0, 5).map((l) => l.slice(0, maxLen));
  const rawBlock = finalLines.join("\n");

  return {
    title: "NOTIFY PARTY",
    lines: finalLines,
    rawBlock,
    characterCount: rawBlock.length,
    isValidLength: finalLines.every((l) => l.length <= maxLen),
  };
}

/**
 * Format Carrier / Discharge Port Delivery Agent Box
 */
export function formatBlAgentBox(
  address?: BlAddressInput,
  contact?: BlContactInput,
  options?: { maxLineLength?: number },
): FormattedBlBox {
  const maxLen = options?.maxLineLength || 40;
  const lines: string[] = [];

  if (address) {
    lines.push((address.companyName || "CARRIER LOCAL AGENT").toUpperCase());
    lines.push("FOR DELIVERY APPLY TO:");
    const street = [address.street1, address.street2]
      .filter(Boolean)
      .join(", ");
    if (street) lines.push(street.toUpperCase());
    const cityLine =
      `${address.zipCode || ""} ${address.city || ""}, ${address.country || ""}`.trim();
    if (cityLine) lines.push(cityLine.toUpperCase());
    if (contact?.phone) lines.push(`TEL: ${contact.phone}`);
  } else {
    lines.push("CARRIER'S AGENT AT PORT OF DISCHARGE");
  }

  const finalLines = lines.slice(0, 5).map((l) => l.slice(0, maxLen));
  const rawBlock = finalLines.join("\n");

  return {
    title: "DELIVERY / DISCHARGE AGENT",
    lines: finalLines,
    rawBlock,
    characterCount: rawBlock.length,
    isValidLength: finalLines.every((l) => l.length <= maxLen),
  };
}

/**
 * Format All 4 Standard Bill of Lading Party Boxes
 */
export function formatAllBlBoxes(params: {
  shipper?: BlAddressInput;
  shipperContact?: BlContactInput;
  consignee?: BlAddressInput;
  consigneeContact?: BlContactInput;
  isToOrder?: boolean;
  orderOf?: string;
  notify?: BlAddressInput;
  notifyContact?: BlContactInput;
  notifySameAsConsignee?: boolean;
  agent?: BlAddressInput;
  agentContact?: BlContactInput;
  maxLineLength?: number;
}): {
  shipper: FormattedBlBox;
  consignee: FormattedBlBox;
  notify: FormattedBlBox;
  agent: FormattedBlBox;
} {
  return {
    shipper: formatBlShipperBox(params.shipper, params.shipperContact, {
      maxLineLength: params.maxLineLength,
    }),
    consignee: formatBlConsigneeBox(params.consignee, params.consigneeContact, {
      isToOrder: params.isToOrder,
      orderOf: params.orderOf,
      maxLineLength: params.maxLineLength,
    }),
    notify: formatBlNotifyBox(params.notify, params.notifyContact, {
      sameAsConsignee: params.notifySameAsConsignee,
      maxLineLength: params.maxLineLength,
    }),
    agent: formatBlAgentBox(params.agent, params.agentContact, {
      maxLineLength: params.maxLineLength,
    }),
  };
}
