export interface DuaXmlPayload {
  duaNumber: string;
  declarationType: string; // IM4, CO, EX
  regime: string;
  exporter: {
    name: string;
    address: string;
    country: string;
  };
  consignee: {
    name: string;
    address: string;
    country: string;
    eori: string;
  };
  declarant: {
    name: string;
    eori: string;
    representationType: string;
  };
  customsOffice: string;
  deliveryTerms: string; // CIF, FOB
  transportMode: string; // Maritime, Air, Road
  packagesCount: number;
  grossWeightKg: number;
  netWeightKg: number;
  currency: string;
  customsValue: number;
  items: {
    itemNumber: number;
    description: string;
    hsCode: string;
    countryOfOrigin: string;
    statisticalValue: number;
    dutyRate: number;
    dutyAmount: number;
    vatRate: number;
    vatAmount: number;
    totalAmount: number;
  }[];
  documentsAttached: {
    code: string; // N935, N705, N714, N954
    description: string;
    reference: string;
  }[];
  totalPayable: number;
  issueDate?: string;
}

export class DuaXmlService {
  /**
   * Generates a standard AEAT / EU Single Administrative Document (DUA) XML representation.
   */
  static generateDuaXml(data: DuaXmlPayload): string {
    const issueDate = data.issueDate || new Date().toISOString().split("T")[0];
    const escapeXml = (unsafe: string = "") =>
      unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");

    const itemsXml = data.items
      .map(
        (it) => `
    <Partida itemNumber="${it.itemNumber}">
      <Casilla31_BultosDescripcion>${escapeXml(it.description)}</Casilla31_BultosDescripcion>
      <Casilla33_CodigoTARIC>${escapeXml(it.hsCode)}</Casilla33_CodigoTARIC>
      <Casilla34_PaisOrigen>${escapeXml(it.countryOfOrigin)}</Casilla34_PaisOrigen>
      <Casilla46_ValorEstadistico>${it.statisticalValue.toFixed(2)}</Casilla46_ValorEstadistico>
      <TributosLiquidacion>
        <Tributo code="A00" name="Arancel">
          <Base>${it.statisticalValue.toFixed(2)}</Base>
          <TipoPorcentaje>${(it.dutyRate * 100).toFixed(2)}%</TipoPorcentaje>
          <Importe>${it.dutyAmount.toFixed(2)}</Importe>
        </Tributo>
        <Tributo code="B00" name="IVA">
          <Base>${(it.statisticalValue + it.dutyAmount).toFixed(2)}</Base>
          <TipoPorcentaje>${(it.vatRate * 100).toFixed(2)}%</TipoPorcentaje>
          <Importe>${it.vatAmount.toFixed(2)}</Importe>
        </Tributo>
        <TotalPartida>${it.totalAmount.toFixed(2)}</TotalPartida>
      </TributosLiquidacion>
    </Partida>`,
      )
      .join("\n");

    const docsXml = data.documentsAttached
      .map(
        (doc) => `
      <DocumentoPresentado>
        <Codigo>${escapeXml(doc.code)}</Codigo>
        <Descripcion>${escapeXml(doc.description)}</Descripcion>
        <NumeroReferencia>${escapeXml(doc.reference)}</NumeroReferencia>
      </DocumentoPresentado>`,
      )
      .join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>
<DeclaracionAduaneraDUA xmlns="urn:aeat:aduanas:dua:v2026" version="2.0">
  <CabeceraDUA>
    <NumeroDUA>${escapeXml(data.duaNumber)}</NumeroDUA>
    <FechaRegistro>${issueDate}</FechaRegistro>
    <Casilla01_TipoDeclaracion>${escapeXml(data.declarationType)}</Casilla01_TipoDeclaracion>
    <Casilla01_Regimen>${escapeXml(data.regime)}</Casilla01_Regimen>
    <AduanaDespacho>${escapeXml(data.customsOffice)}</AduanaDespacho>
  </CabeceraDUA>

  <Intervinientes>
    <Casilla02_Exportador>
      <NombreRazonSocial>${escapeXml(data.exporter.name)}</NombreRazonSocial>
      <Direccion>${escapeXml(data.exporter.address)}</Direccion>
      <Pais>${escapeXml(data.exporter.country)}</Pais>
    </Casilla02_Exportador>

    <Casilla08_Destinatario>
      <NombreRazonSocial>${escapeXml(data.consignee.name)}</NombreRazonSocial>
      <Direccion>${escapeXml(data.consignee.address)}</Direccion>
      <Pais>${escapeXml(data.consignee.country)}</Pais>
      <EORI>${escapeXml(data.consignee.eori)}</EORI>
    </Casilla08_Destinatario>

    <Casilla14_DeclaranteRepresentante>
      <NombreRazonSocial>${escapeXml(data.declarant.name)}</NombreRazonSocial>
      <EORI>${escapeXml(data.declarant.eori)}</EORI>
      <TipoRepresentacion>${escapeXml(data.declarant.representationType)}</TipoRepresentacion>
    </Casilla14_DeclaranteRepresentante>
  </Intervinientes>

  <DatosTransporteCondiciones>
    <Casilla20_CondicionesEntrega>${escapeXml(data.deliveryTerms)}</Casilla20_CondicionesEntrega>
    <Casilla22_Divisa>${escapeXml(data.currency)}</Casilla22_Divisa>
    <Casilla22_ImporteFactura>${data.customsValue.toFixed(2)}</Casilla22_ImporteFactura>
    <Casilla25_ModoTransporteFrontera>${escapeXml(data.transportMode)}</Casilla25_ModoTransporteFrontera>
    <Casilla06_TotalBultos>${data.packagesCount}</Casilla06_TotalBultos>
    <Casilla35_MasaBrutaKg>${data.grossWeightKg.toFixed(2)}</Casilla35_MasaBrutaKg>
    <Casilla38_MasaNetaKg>${data.netWeightKg.toFixed(2)}</Casilla38_MasaNetaKg>
  </DatosTransporteCondiciones>

  <DocumentosCasilla44>
${docsXml}
  </DocumentosCasilla44>

  <PartidasMercancia>
${itemsXml}
  </PartidasMercancia>

  <LiquidacionTotalAduanas>
    <TotalExigible>${data.totalPayable.toFixed(2)}</TotalExigible>
    <MonedaLiquidacion>${escapeXml(data.currency)}</MonedaLiquidacion>
    <Casilla54_CertificacionDeclarante>
      <LugarFecha>Barcelona, ${issueDate}</LugarFecha>
      <FirmaElectronica>CERTIFICADO-ATLAS-LOGISTICS-EORI-${escapeXml(data.declarant.eori)}</FirmaElectronica>
    </Casilla54_CertificacionDeclarante>
  </LiquidacionTotalAduanas>
</DeclaracionAduaneraDUA>`;
  }
}
