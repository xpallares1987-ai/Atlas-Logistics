/**
 * THETIS-MRV & FuelEU Maritime XML Generator Service
 *
 * Implements telematics reporting message generation for the European Maritime
 * Safety Agency (EMSA) THETIS-MRV & FuelEU database schema.
 */

export interface ThetisVoyageReportData {
  voyageReferenceNumber: string;
  vesselImoNumber: string;
  vesselName: string;
  flagState: string;
  grossTonnageGt: number;
  departurePortLocode: string;
  departurePortName: string;
  arrivalPortLocode: string;
  arrivalPortName: string;
  geographicScope: string;
  distanceNauticalMiles: number;
  departureDate: string;
  arrivalDate: string;
  navigationHours: number;
  berthHours: number;
  fuelCode: string;
  fuelName: string;
  fuelConsumedTonnes: number;
  opsElectricityConsumedKwh: number;
  totalEnergyConsumedMj: number;
  calculatedGhgIntensityGco2eqPerMj: number;
  co2EmissionsTonnes: number;
  ch4EmissionsTonnes: number;
  n2oEmissionsTonnes: number;
  totalGhgEmissionsScopeTco2eq: number;
  etsApplicableScopeEmissionsTco2eq: number;
  carriedTeuCount: number;
  leadAuditorVerifier: string;
}

export class ThetisMrvXmlService {
  /**
   * Generates a valid XML document following the EMSA THETIS-MRV / FuelEU format.
   */
  public static generateThetisVoyageXml(data: ThetisVoyageReportData): string {
    const timestamp = new Date().toISOString();

    return `<?xml version="1.0" encoding="UTF-8"?>
<ThetisMaritimeReport xmlns="http://emsa.europa.eu/thetis-mrv/fueleu/v1" version="1.0">
  <Header>
    <MessageId>THETIS-MSG-${data.voyageReferenceNumber}-${Date.now()}</MessageId>
    <MessageType>VOYAGE_EMISSIONS_AND_FUELEU_DECLARATION</MessageType>
    <GeneratedAt>${timestamp}</GeneratedAt>
    <RegulatoryFramework>REGULATION_EU_2023_1805_AND_DIRECTIVE_EU_2023_959</RegulatoryFramework>
    <Verifier>${escapeXml(data.leadAuditorVerifier)}</Verifier>
  </Header>
  <VesselIdentity>
    <ImoNumber>${escapeXml(data.vesselImoNumber)}</ImoNumber>
    <VesselName>${escapeXml(data.vesselName)}</VesselName>
    <FlagState>${escapeXml(data.flagState)}</FlagState>
    <GrossTonnageGT>${data.grossTonnageGt}</GrossTonnageGT>
  </VesselIdentity>
  <VoyageDetails>
    <VoyageReference>${escapeXml(data.voyageReferenceNumber)}</VoyageReference>
    <GeographicScope>${escapeXml(data.geographicScope)}</GeographicScope>
    <Departure>
      <PortLocode>${escapeXml(data.departurePortLocode)}</PortLocode>
      <PortName>${escapeXml(data.departurePortName)}</PortName>
      <Timestamp>${escapeXml(data.departureDate)}</Timestamp>
    </Departure>
    <Arrival>
      <PortLocode>${escapeXml(data.arrivalPortLocode)}</PortLocode>
      <PortName>${escapeXml(data.arrivalPortName)}</PortName>
      <Timestamp>${escapeXml(data.arrivalDate)}</Timestamp>
    </Arrival>
    <NavigationMetrics>
      <DistanceNauticalMiles>${data.distanceNauticalMiles.toFixed(1)}</DistanceNauticalMiles>
      <NavigationHours>${data.navigationHours.toFixed(1)}</NavigationHours>
      <BerthHours>${data.berthHours.toFixed(1)}</BerthHours>
      <CarriedTeuCount>${data.carriedTeuCount}</CarriedTeuCount>
    </NavigationMetrics>
  </VoyageDetails>
  <FuelAndEnergyConsumption>
    <BunkerLine>
      <FuelCode>${escapeXml(data.fuelCode)}</FuelCode>
      <FuelDescription>${escapeXml(data.fuelName)}</FuelDescription>
      <FuelMassTonnes>${data.fuelConsumedTonnes.toFixed(3)}</FuelMassTonnes>
    </BunkerLine>
    <OnshorePowerSupply>
      <OpsElectricityKwh>${data.opsElectricityConsumedKwh.toFixed(2)}</OpsElectricityKwh>
    </OnshorePowerSupply>
    <TotalEnergyConsumedMJ>${data.totalEnergyConsumedMj.toFixed(2)}</TotalEnergyConsumedMJ>
    <AttainedGhgIntensityGco2eqPerMJ>${data.calculatedGhgIntensityGco2eqPerMj.toFixed(4)}</AttainedGhgIntensityGco2eqPerMJ>
  </FuelAndEnergyConsumption>
  <EmissionsAccounting>
    <GrossGases>
      <Co2Tonnes>${data.co2EmissionsTonnes.toFixed(3)}</Co2Tonnes>
      <Ch4Tonnes>${data.ch4EmissionsTonnes.toFixed(4)}</Ch4Tonnes>
      <N2oTonnes>${data.n2oEmissionsTonnes.toFixed(4)}</N2oTonnes>
    </GrossGases>
    <TotalGhgEmissionsScopeTco2eq>${data.totalGhgEmissionsScopeTco2eq.toFixed(3)}</TotalGhgEmissionsScopeTco2eq>
    <EtsApplicableScopeEmissionsTco2eq>${data.etsApplicableScopeEmissionsTco2eq.toFixed(3)}</EtsApplicableScopeEmissionsTco2eq>
  </EmissionsAccounting>
</ThetisMaritimeReport>`;
  }
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
