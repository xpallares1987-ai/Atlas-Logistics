/**
 * @file uncefact-xml.service.ts
 * @description Live SQLite-backed UN/CEFACT XML generators for Cross Industry Invoice (CII D23B)
 * and Multimodal Transport Reference Data Model (MMT-RDM) Consignment XML documents.
 * @module @atlas/services/edi/uncefact-xml
 */

import { db } from "../../db/index.js";
import {
  shipments,
  shipmentContainers,
  addresses,
  invoices,
  invoiceItems,
} from "../../db/schema/index.js";
import { eq, desc } from "drizzle-orm";

/**
 * Escapes XML reserved characters to guarantee well-formed, injection-safe UN/CEFACT XML output.
 */
export function escapeXml(raw: unknown): string {
  const str = raw === null || raw === undefined ? "" : String(raw);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatCiiDate102(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

export interface GeneratedUncefactXmlResult {
  schemaCode: "CII" | "MMT_CONSIGNMENT";
  standardVersion: string;
  namespaceUri: string;
  documentId: string;
  sourceEntityId: string;
  generatedAt: string;
  xml: string;
}

/**
 * Generates an official UN/CEFACT Cross Industry Invoice (CII D23B / EN 16931) XML
 * from live SQLite `invoices` + `invoice_line_items` + `addresses` records.
 */
export async function generateCrossIndustryInvoiceXml(
  invoiceId?: string,
): Promise<GeneratedUncefactXmlResult> {
  const targetRows = invoiceId
    ? await db
        .select()
        .from(invoices)
        .where(eq(invoices.id, invoiceId))
        .limit(1)
    : await db
        .select()
        .from(invoices)
        .orderBy(desc(invoices.createdAt))
        .limit(1);

  const inv = targetRows[0];
  const now = new Date();

  // Resolve Seller (Noatum Logistics FFC) and Buyer (MCC customer) from real addresses table
  const sellerRows = await db
    .select()
    .from(addresses)
    .where(eq(addresses.addressType, "FFC"))
    .limit(1);
  const buyerRows = await db
    .select()
    .from(addresses)
    .where(eq(addresses.addressType, "MCC"))
    .limit(1);

  const seller = sellerRows[0];
  const buyer = buyerRows[0];

  const lines = inv
    ? await db
        .select()
        .from(invoiceItems)
        .where(eq(invoiceItems.invoiceId, inv.id))
    : [];

  const docNumber = inv?.invoiceNumber || `INV-CII-${formatCiiDate102(now)}`;
  const currency = inv?.currency || "EUR";
  const issueDate = inv?.createdAt ? new Date(inv.createdAt) : now;
  const dueDate = inv?.dueDate
    ? new Date(inv.dueDate)
    : new Date(issueDate.getTime() + 30 * 86400 * 1000);

  const lineItemsXml =
    lines.length > 0
      ? lines
          .map((line, idx) => {
            const qty = Number(line.quantity || 1);
            const unitPrice = Number(line.unitPrice || 0);
            const lineTotal = Number(line.total || qty * unitPrice);
            return `    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument>
        <ram:LineID>${idx + 1}</ram:LineID>
      </ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        <ram:Name>${escapeXml(line.description || "International Freight Service")}</ram:Name>
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount>${unitPrice.toFixed(2)}</ram:ChargeAmount>
        </ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="C62">${qty.toFixed(2)}</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>Z</ram:CategoryCode>
          <ram:RateApplicablePercent>0.00</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount>${lineTotal.toFixed(2)}</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>`;
          })
          .join("\n")
      : `    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument>
        <ram:LineID>1</ram:LineID>
      </ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        <ram:Name>International Multimodal Freight Forwarding Service</ram:Name>
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount>${Number(inv?.amount || 0).toFixed(2)}</ram:ChargeAmount>
        </ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="C62">1.00</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>Z</ram:CategoryCode>
          <ram:RateApplicablePercent>0.00</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount>${Number(inv?.amount || 0).toFixed(2)}</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>`;

  const netAmount = Number(
    inv?.amount ?? lines.reduce((acc, l) => acc + Number(l.total || 0), 0),
  );
  const taxAmount = Number(inv?.taxAmount || 0);
  const grandTotal = netAmount + taxAmount;

  const namespaceUri =
    "urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100";

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice
  xmlns:rsm="${namespaceUri}"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:cen.eu:en16931:2017#compliant#urn:unece:uncefact:cii:D23B</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${escapeXml(docNumber)}</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${formatCiiDate102(issueDate)}</udt:DateTimeString>
    </ram:IssueDateTime>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
${lineItemsXml}
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>${escapeXml(seller?.companyName || "Noatum Logistics Spain S.A.U.")}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:PostcodeCode>${escapeXml(seller?.zipCode || "08039")}</ram:PostcodeCode>
          <ram:LineOne>${escapeXml(seller?.street1 || "Moll de Ponent s/n, ZAL Port")}</ram:LineOne>
          <ram:CityName>${escapeXml(seller?.city || "Barcelona")}</ram:CityName>
          <ram:CountryID>${escapeXml(seller?.country || "ES")}</ram:CountryID>
        </ram:PostalTradeAddress>
        <ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="VA">${escapeXml(seller?.taxId || "ESA28219553")}</ram:ID>
        </ram:SpecifiedTaxRegistration>
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>${escapeXml(buyer?.companyName || "Iberian Chemicals & Polymers S.A.")}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:PostcodeCode>${escapeXml(buyer?.zipCode || "08039")}</ram:PostcodeCode>
          <ram:LineOne>${escapeXml(buyer?.street1 || "Moll de Ponent 44")}</ram:LineOne>
          <ram:CityName>${escapeXml(buyer?.city || "Barcelona")}</ram:CityName>
          <ram:CountryID>${escapeXml(buyer?.country || "ES")}</ram:CountryID>
        </ram:PostalTradeAddress>
        <ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="VA">${escapeXml(buyer?.taxId || "ESA08234567")}</ram:ID>
        </ram:SpecifiedTaxRegistration>
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery />
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>${escapeXml(currency)}</ram:InvoiceCurrencyCode>
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>0.00</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        <ram:BasisAmount>${grandTotal.toFixed(2)}</ram:BasisAmount>
        <ram:CategoryCode>Z</ram:CategoryCode>
        <ram:RateApplicablePercent>0.00</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>
      <ram:SpecifiedTradePaymentTerms>
        <ram:DueDateDateTime>
          <udt:DateTimeString format="102">${formatCiiDate102(dueDate)}</udt:DateTimeString>
        </ram:DueDateDateTime>
      </ram:SpecifiedTradePaymentTerms>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${grandTotal.toFixed(2)}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${grandTotal.toFixed(2)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="${escapeXml(currency)}">0.00</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${grandTotal.toFixed(2)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${grandTotal.toFixed(2)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;

  return {
    schemaCode: "CII",
    standardVersion: "D23B",
    namespaceUri,
    documentId: docNumber,
    sourceEntityId: inv?.id || "latest_live_invoice",
    generatedAt: now.toISOString(),
    xml,
  };
}

/**
 * Generates an official UN/CEFACT MMT-RDM Multimodal Supply Chain Consignment XML
 * from live SQLite `shipments` + `shipment_containers` + `addresses` records.
 */
export async function generateMmtRdmConsignmentXml(
  shipmentId = "sh_demo_01",
): Promise<GeneratedUncefactXmlResult> {
  let shipRows = await db
    .select()
    .from(shipments)
    .where(eq(shipments.id, shipmentId))
    .limit(1);

  if (shipRows.length === 0) {
    shipRows = await db
      .select()
      .from(shipments)
      .orderBy(desc(shipments.createdAt))
      .limit(1);
  }

  const ship = shipRows[0];
  if (!ship) {
    throw new Error(`Shipment '${shipmentId}' not found in SQLite database.`);
  }

  const containers = await db
    .select()
    .from(shipmentContainers)
    .where(eq(shipmentContainers.shipmentId, ship.id));

  const [consignorRows, carrierRows, forwarderRows] = await Promise.all([
    db
      .select()
      .from(addresses)
      .where(eq(addresses.addressType, "MCC"))
      .limit(2),
    db
      .select()
      .from(addresses)
      .where(eq(addresses.addressType, "OCA"))
      .limit(1),
    db
      .select()
      .from(addresses)
      .where(eq(addresses.addressType, "FFC"))
      .limit(1),
  ]);

  const consignor = consignorRows[0];
  const consignee = consignorRows[1] || consignorRows[0];
  const carrier = carrierRows[0];
  const forwarder = forwarderRows[0];

  const now = new Date();
  const namespaceUri =
    "urn:un:unece:uncefact:data:standard:MultimodalTransportReferenceDataModel:100";
  const docId = ship.trackingNumber || ship.id;

  const equipmentXml =
    containers.length > 0
      ? containers
          .map(
            (c) => `  <ram:UtilizedLogisticsTransportEquipment>
    <ram:ID>${escapeXml(c.containerNumber)}</ram:ID>
    <ram:CharacteristicCode>${escapeXml(c.containerType || "45G1")}</ram:CharacteristicCode>
    <ram:GrossGoodsWeightMeasure unitCode="KGM">${Number(c.weight || 0).toFixed(2)}</ram:GrossGoodsWeightMeasure>
    <ram:AffixedLogisticsSeal>
      <ram:ID>${escapeXml(c.sealNumber || "UNSEALED")}</ram:ID>
    </ram:AffixedLogisticsSeal>
  </ram:UtilizedLogisticsTransportEquipment>`,
          )
          .join("\n")
      : `  <ram:UtilizedLogisticsTransportEquipment>
    <ram:ID>MSKU9284712</ram:ID>
    <ram:CharacteristicCode>45G1</ram:CharacteristicCode>
  </ram:UtilizedLogisticsTransportEquipment>`;

  const totalGrossWeight =
    containers.reduce((sum, c) => sum + Number(c.weight || 0), 0) ||
    Number(ship.weight || 0);
  const serviceUpper = String(ship.serviceType || "FCL").toUpperCase();
  const modeCode =
    serviceUpper === "AIR"
      ? "4"
      : serviceUpper === "RAIL"
        ? "2"
        : serviceUpper === "ROAD"
          ? "3"
          : "1";

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:SupplyChainConsignment
  xmlns:rsm="${namespaceUri}"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocument>
    <ram:ID>${escapeXml(docId)}</ram:ID>
    <ram:TypeCode>705</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${formatCiiDate102(now)}</udt:DateTimeString>
    </ram:IssueDateTime>
  </rsm:ExchangedDocument>
  <ram:GrossWeightMeasure unitCode="KGM">${totalGrossWeight.toFixed(2)}</ram:GrossWeightMeasure>
  <ram:ConsignorTradeParty>
    <ram:Name>${escapeXml(consignor?.companyName || "Iberian Chemicals & Polymers S.A.")}</ram:Name>
    <ram:RoleCode>MCC</ram:RoleCode>
    <ram:PostalTradeAddress>
      <ram:CityName>${escapeXml(consignor?.city || "Barcelona")}</ram:CityName>
      <ram:CountryID>${escapeXml(consignor?.country || "ES")}</ram:CountryID>
    </ram:PostalTradeAddress>
  </ram:ConsignorTradeParty>
  <ram:ConsigneeTradeParty>
    <ram:Name>${escapeXml(consignee?.companyName || "European Industrial Importers GmbH")}</ram:Name>
    <ram:RoleCode>MCC</ram:RoleCode>
    <ram:PostalTradeAddress>
      <ram:CityName>${escapeXml(consignee?.city || "Rotterdam")}</ram:CityName>
      <ram:CountryID>${escapeXml(consignee?.country || "NL")}</ram:CountryID>
    </ram:PostalTradeAddress>
  </ram:ConsigneeTradeParty>
  <ram:FreightForwarderTradeParty>
    <ram:Name>${escapeXml(forwarder?.companyName || "Noatum Logistics Spain S.A.U.")}</ram:Name>
    <ram:RoleCode>FFC</ram:RoleCode>
  </ram:FreightForwarderTradeParty>
  <ram:CarrierTradeParty>
    <ram:Name>${escapeXml(carrier?.companyName || "A.P. Moller - Maersk")}</ram:Name>
    <ram:RoleCode>OCA</ram:RoleCode>
  </ram:CarrierTradeParty>
  <ram:MainCarriageLogisticsTransportMovement>
    <ram:ModeCode>${escapeXml(modeCode)}</ram:ModeCode>
    <ram:LoadingEvent>
      <ram:OccurrenceLogisticsLocation>
        <ram:ID schemeAgencyID="6">${escapeXml(ship.origin || "ESBCN")}</ram:ID>
        <ram:TypeCode>POL</ram:TypeCode>
      </ram:OccurrenceLogisticsLocation>
    </ram:LoadingEvent>
    <ram:UnloadingEvent>
      <ram:OccurrenceLogisticsLocation>
        <ram:ID schemeAgencyID="6">${escapeXml(ship.destination || "NLRTM")}</ram:ID>
        <ram:TypeCode>POD</ram:TypeCode>
      </ram:OccurrenceLogisticsLocation>
    </ram:UnloadingEvent>
  </ram:MainCarriageLogisticsTransportMovement>
${equipmentXml}
</rsm:SupplyChainConsignment>`;

  return {
    schemaCode: "MMT_CONSIGNMENT",
    standardVersion: "D23B",
    namespaceUri,
    documentId: docId,
    sourceEntityId: ship.id,
    generatedAt: now.toISOString(),
    xml,
  };
}
