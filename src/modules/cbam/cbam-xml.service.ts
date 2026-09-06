/**
 * CbamXmlService
 *
 * Generates official XML format for the European Commission CBAM Transitional Registry (DG TAXUD)
 * pursuant to Article 35 of Regulation (EU) 2023/956 and Implementing Regulation (EU) 2023/1773.
 */

export class CbamXmlService {
  public static generateTransitionalRegistryXml(
    declaration: any,
    lines: any[] = [],
  ): string {
    const period = declaration.reportingPeriod || "2026-Q3";
    const declarantVat = declaration.declarantVat || "ESA88992211";
    const declarantName =
      declaration.declarantName || "Atlas Logistics Forwarding SL";
    const importerVat = declaration.importerVat || "ESA11223344";
    const importerName =
      declaration.importerName || "Iberian Industrial Metals SL";

    const xmlLines = lines
      .map(
        (line, idx) => `
    <ImportedGoodItem id="${idx + 1}">
      <CommodityCode>${line.duaBox33HsCode || "72083800"}</CommodityCode>
      <Description><![CDATA[${line.goodDescription || "CBAM Good"}]]></Description>
      <CountryOfOrigin>${line.originCountry || "TR"}</CountryOfOrigin>
      <NetMassTonnes>${line.netWeightTonnes || 0}</NetMassTonnes>
      <CustomsDeclarationReference>${line.duaNumber || "N/A"}</CustomsDeclarationReference>
      <EmissionsData>
        <DirectEmissionsSpecific>${(
          (line.directEmissionsTco2e || 0) / (line.netWeightTonnes || 1)
        ).toFixed(4)}</DirectEmissionsSpecific>
        <DirectEmissionsTotal>${(line.directEmissionsTco2e || 0).toFixed(2)}</DirectEmissionsTotal>
        <IndirectEmissionsSpecific>${(
          (line.indirectEmissionsTco2e || 0) / (line.netWeightTonnes || 1)
        ).toFixed(4)}</IndirectEmissionsSpecific>
        <IndirectEmissionsTotal>${(line.indirectEmissionsTco2e || 0).toFixed(2)}</IndirectEmissionsTotal>
        <PrecursorEmissionsTotal>${(line.precursorEmissionsTco2e || 0).toFixed(2)}</PrecursorEmissionsTotal>
        <TotalEmbeddedEmissionsTco2e>${(line.totalLineEmissionsTco2e || 0).toFixed(2)}</TotalEmbeddedEmissionsTco2e>
        <DefaultValuesApplied>${line.useDefaultFactors ? "true" : "false"}</DefaultValuesApplied>
      </EmissionsData>
      <CarbonPricePaidInOrigin>
        <PricePerTco2e>${(line.foreignCarbonPricePerTco2e || 0).toFixed(2)}</PricePerTco2e>
        <TotalAmountPaidEur>${(line.effectiveForeignPricePaidEur || 0).toFixed(2)}</TotalAmountPaidEur>
        <LegalSchemeName>${line.originCountry === "GB" ? "UK ETS" : line.originCountry === "CN" ? "China National ETS" : "NONE"}</LegalSchemeName>
      </CarbonPricePaidInOrigin>
    </ImportedGoodItem>`,
      )
      .join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>
<CBAMQuarterlyReport xmlns="urn:eu:taxud:cbam:v1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="urn:eu:taxud:cbam:v1 CBAM_Report_v1.0.xsd">
  <Header>
    <DeclarationId>${declaration.declarationNumber}</DeclarationId>
    <ReportingPeriod>${period}</ReportingPeriod>
    <SubmissionTimestamp>${new Date().toISOString()}</SubmissionTimestamp>
    <StandardReference>EU_REG_2023_956_ARTICLE_35</StandardReference>
  </Header>
  <Declarant>
    <EORINumber>${declarantVat}</EORINumber>
    <Name><![CDATA[${declarantName}]]></Name>
    <Role>AUTHORIZED_REPRESENTATIVE</Role>
  </Declarant>
  <Importer>
    <EORINumber>${importerVat}</EORINumber>
    <Name><![CDATA[${importerName}]]></Name>
  </Importer>
  <SummaryEmissions>
    <TotalNetMassTonnes>${declaration.totalNetMassTonnes}</TotalNetMassTonnes>
    <TotalDirectEmissionsTco2e>${declaration.totalDirectEmissionsTco2e}</TotalDirectEmissionsTco2e>
    <TotalIndirectEmissionsTco2e>${declaration.totalIndirectEmissionsTco2e}</TotalIndirectEmissionsTco2e>
    <TotalEmbeddedEmissionsTco2e>${declaration.totalEmbeddedEmissionsTco2e}</TotalEmbeddedEmissionsTco2e>
    <EuEtsBenchmarkPriceEur>${declaration.euEtsBenchmarkPriceEur}</EuEtsBenchmarkPriceEur>
    <GrossCarbonLiabilityEur>${declaration.grossCarbonLiabilityEur}</GrossCarbonLiabilityEur>
    <CarbonPricePaidForeignEur>${declaration.carbonPricePaidForeignEur}</CarbonPricePaidForeignEur>
    <NetCarbonLiabilityEur>${declaration.netCarbonLiabilityEur}</NetCarbonLiabilityEur>
  </SummaryEmissions>
  <ImportedGoodsList>${xmlLines}
  </ImportedGoodsList>
</CBAMQuarterlyReport>`;
  }
}
