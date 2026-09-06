/**
 * TafTsiXmlService
 *
 * Generates official TAF-TSI (Telematics Applications for Freight - Technical Specification for Interoperability)
 * XML messages for European Railway Agency (ERA) and Infrastructure Managers (Adif, SNCF Réseau, DB Netze).
 */

export class TafTsiXmlService {
  public static generateTrainCompositionMessage(
    train: any,
    allocations: any[] = [],
  ): string {
    const messageId = `TAF-TSI-${train.trainRunNumber}-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const wagonItems = allocations
      .map(
        (alloc, idx) => `
    <WagonData position="${alloc.positionInTrain || idx + 1}">
      <WagonNumberReference>${alloc.wagonNumber || "33 80 4956 101-2"}</WagonNumberReference>
      <WagonSeries>${alloc.wagonSeries || "Sggmrss"}</WagonSeries>
      <GrossWeightTonnes>${alloc.grossWagonMassTonnes || 55.0}</GrossWeightTonnes>
      <CalculatedAxleLoadTonnes>${alloc.calculatedAxleLoadTonnes || 9.17}</CalculatedAxleLoadTonnes>
      <IntermodalUnit>
        <UTIType>${alloc.utiType || "CONTAINER_40"}</UTIType>
        <UTIIdentifier>${alloc.utiIdentification || "N/A"}</UTIIdentifier>
        <PayloadMassTonnes>${alloc.payloadMassTonnes || 0}</PayloadMassTonnes>
        <SealNumber>${alloc.sealNumber || "NONE"}</SealNumber>
      </IntermodalUnit>
    </WagonData>`,
      )
      .join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>
<TAFTSI_TrainCompositionMessage xmlns="urn:era:taf-tsi:v2.3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="urn:era:taf-tsi:v2.3 TAF_TSI_TrainComposition_v2.3.xsd">
  <MessageHeader>
    <MessageIdentifier>${messageId}</MessageIdentifier>
    <MessageType>TRAIN_COMPOSITION_AND_BRAKE_DATA</MessageType>
    <SenderReference>${train.tractionOperator || "Atlas Logistics Railway SL"}</SenderReference>
    <CreationDateTime>${timestamp}</CreationDateTime>
  </MessageHeader>
  <TrainData>
    <TrainRunNumber>${train.trainRunNumber}</TrainRunNumber>
    <TractionLocomotive>
      <Series>${train.locomotiveSeries}</Series>
      <LengthOverBuffersMeters>${train.locomotiveLengthMeters || 23.0}</LengthOverBuffersMeters>
      <LocomotiveWeightTonnes>${train.locomotiveWeightTonnes || 123.0}</LocomotiveWeightTonnes>
      <LocomotiveBrakedWeightTonnes>${train.locomotiveBrakedWeightTonnes || 110.0}</LocomotiveBrakedWeightTonnes>
    </TractionLocomotive>
    <TrainSummary>
      <TotalLengthMeters>${train.totalTrainLengthMeters}</TotalLengthMeters>
      <TotalGrossWeightTonnes>${train.totalGrossMassTonnes}</TotalGrossWeightTonnes>
      <TotalBrakedWeightTonnes>${train.totalBrakedMassTonnes}</TotalBrakedWeightTonnes>
      <CalculatedBrakePercentage>${train.calculatedBrakePercentage}%</CalculatedBrakePercentage>
      <RequiredBrakePercentage>${train.requiredBrakePercentage}%</RequiredBrakePercentage>
      <IsCompliantWithTenT750m>${train.isLengthCompliant ? "true" : "false"}</IsCompliantWithTenT750m>
      <BrakeComplianceStatus>${train.isBrakeCompliant ? "COMPLIANT" : "NON_COMPLIANT"}</BrakeComplianceStatus>
    </TrainSummary>
    <WagonsList>${wagonItems}
    </WagonsList>
  </TrainData>
</TAFTSI_TrainCompositionMessage>`;
  }
}
