export interface AirwayBillXmlData {
  awbNumber: string;
  type: "MAWB" | "HAWB" | "DIRECT";
  airlinePrefix?: string;
  airlineName?: string;
  originAirport: string;
  destinationAirport: string;
  flightNumber?: string;
  flightDate?: Date | string;
  shipperData: {
    name: string;
    address: string;
    city?: string;
    country: string;
    contact?: string;
    accountNo?: string;
  };
  consigneeData: {
    name: string;
    address: string;
    city?: string;
    country: string;
    contact?: string;
    accountNo?: string;
  };
  issuingAgentData?: {
    name: string;
    city: string;
    iataCode: string;
    cassAddress?: string;
  };
  pieces: number;
  grossWeightKg: number;
  volumeCbm?: number;
  chargeableWeightKg: number;
  rateClass: string;
  ratePerKg: number;
  freightCharge: number;
  otherCharges?: Array<{ code: string; name: string; amount: number }>;
  totalPrepaid: number;
  totalCollect: number;
  currency: string;
  natureOfGoods: string;
  specialHandlingCodes?: string[];
  handlingInfo?: string;
  consolidatedHawbs?: any[];
}

export class AirwayBillXmlService {
  /**
   * Generates an official IATA Cargo-XML electronic Air Waybill message (XFWB or XFHL).
   */
  static generateCargoXml(data: AirwayBillXmlData): string {
    const isHouse = data.type === "HAWB";
    const rootTag = isHouse ? "iata:XFHL" : "iata:XFWB";
    const cleanAwb = data.awbNumber.replace(/-/g, "");
    const dateStr = data.flightDate
      ? new Date(data.flightDate).toISOString()
      : new Date().toISOString();

    const otherChargesXml = (data.otherCharges || [])
      .map(
        (c) => `      <iata:OtherCharge>
        <iata:ChargeCode>${c.code}</iata:ChargeCode>
        <iata:ChargeAmount currency="${data.currency}">${c.amount.toFixed(2)}</iata:ChargeAmount>
        <iata:Entitlement>DueCarrier</iata:Entitlement>
      </iata:OtherCharge>`,
      )
      .join("\n");

    const specialHandlingXml = (data.specialHandlingCodes || [])
      .map((shc) => `      <iata:HandlingCode>${shc}</iata:HandlingCode>`)
      .join("\n");

    const houseListXml = (data.consolidatedHawbs || [])
      .map(
        (h) => `    <iata:HouseConsignment>
      <iata:HouseWaybillNumber>${h.awbNumber}</iata:HouseWaybillNumber>
      <iata:TotalPieceQuantity>${h.pieces}</iata:TotalPieceQuantity>
      <iata:GrossWeight unit="KGM">${h.grossWeightKg.toFixed(2)}</iata:GrossWeight>
      <iata:ChargeableWeight unit="KGM">${h.chargeableWeightKg.toFixed(2)}</iata:ChargeableWeight>
      <iata:NatureOfGoods>${h.natureOfGoods}</iata:NatureOfGoods>
    </iata:HouseConsignment>`,
      )
      .join("\n");

    const shipper = data.shipperData ?? {
      name: "SHIPPER ON RECORD",
      address: data.originAirport,
      country: "ES",
      contact: "",
    };
    const consignee = data.consigneeData ?? {
      name: "CONSIGNEE ON RECORD",
      address: data.destinationAirport,
      country: "US",
      contact: "",
    };
    const grossWeightKg = Number(data.grossWeightKg ?? 0);
    const chargeableWeightKg = Number(data.chargeableWeightKg ?? 0);
    const ratePerKg = Number(data.ratePerKg ?? 0);
    const freightCharge = Number(data.freightCharge ?? 0);
    const totalPrepaid = Number(data.totalPrepaid ?? 0);
    const totalCollect = Number(data.totalCollect ?? 0);

    return `<?xml version="1.0" encoding="UTF-8"?>
<${rootTag} xmlns:iata="http://www.iata.org/cargo/xml/iata-cargo-standard"
           xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
           version="3.00">
  <iata:BusinessHeader>
    <iata:MessageIdentifier>${isHouse ? "XFHL" : "XFWB"}</iata:MessageIdentifier>
    <iata:MessageVersionNumber>3.00</iata:MessageVersionNumber>
    <iata:SenderIdentification>ATLAS-LOGISTICS-ERP</iata:SenderIdentification>
    <iata:CreationDateTime>${dateStr}</iata:CreationDateTime>
  </iata:BusinessHeader>

  <iata:MasterConsignment>
    <iata:WaybillNumber>${cleanAwb}</iata:WaybillNumber>
    <iata:AirlinePrefix>${data.airlinePrefix || data.awbNumber.slice(0, 3)}</iata:AirlinePrefix>
    <iata:OriginLocation>
      <iata:AirportCode>${data.originAirport}</iata:AirportCode>
    </iata:OriginLocation>
    <iata:DestinationLocation>
      <iata:AirportCode>${data.destinationAirport}</iata:AirportCode>
    </iata:DestinationLocation>
    <iata:TotalPieceQuantity>${data.pieces ?? 0}</iata:TotalPieceQuantity>
    <iata:GrossWeight unit="KGM">${grossWeightKg.toFixed(2)}</iata:GrossWeight>
    <iata:ChargeableWeight unit="KGM">${chargeableWeightKg.toFixed(2)}</iata:ChargeableWeight>
    <iata:TotalVolume unit="MTQ">${Number(data.volumeCbm || 0).toFixed(4)}</iata:TotalVolume>
    <iata:NatureOfGoods>${data.natureOfGoods || "CONSOLIDATED CARGO"}</iata:NatureOfGoods>
    <iata:HandlingInformation>${data.handlingInfo || "GENERAL CARGO"}</iata:HandlingInformation>

    <iata:TransportParty type="Shipper">
      <iata:Name>${shipper.name}</iata:Name>
      <iata:Address>${shipper.address}</iata:Address>
      <iata:CountryCode>${shipper.country}</iata:CountryCode>
      <iata:Contact>${shipper.contact || ""}</iata:Contact>
    </iata:TransportParty>

    <iata:TransportParty type="Consignee">
      <iata:Name>${consignee.name}</iata:Name>
      <iata:Address>${consignee.address}</iata:Address>
      <iata:CountryCode>${consignee.country}</iata:CountryCode>
      <iata:Contact>${consignee.contact || ""}</iata:Contact>
    </iata:TransportParty>

    <iata:TransportParty type="IssuingCarrierAgent">
      <iata:Name>${data.issuingAgentData?.name || "ATLAS AIR CARGO SOLUTIONS"}</iata:Name>
      <iata:City>${data.issuingAgentData?.city || data.originAirport}</iata:City>
      <iata:IATACode>${data.issuingAgentData?.iataCode || "78-4-0000/0001"}</iata:IATACode>
    </iata:TransportParty>

    <iata:FlightDetails>
      <iata:FlightNumber>${data.flightNumber || "CARGO"}</iata:FlightNumber>
      <iata:ScheduledDepartureDateTime>${dateStr}</iata:ScheduledDepartureDateTime>
    </iata:FlightDetails>

    <iata:RateChargeDetails>
      <iata:RateClass>${data.rateClass || "Q"}</iata:RateClass>
      <iata:RatePerUnit currency="${data.currency || "EUR"}">${ratePerKg.toFixed(2)}</iata:RatePerUnit>
      <iata:FreightCharge currency="${data.currency || "EUR"}">${freightCharge.toFixed(2)}</iata:FreightCharge>
      <iata:TotalPrepaidCharge currency="${data.currency || "EUR"}">${totalPrepaid.toFixed(2)}</iata:TotalPrepaidCharge>
      <iata:TotalCollectCharge currency="${data.currency || "EUR"}">${totalCollect.toFixed(2)}</iata:TotalCollectCharge>
    </iata:RateChargeDetails>

    <iata:OtherCharges>
${otherChargesXml}
    </iata:OtherCharges>

    <iata:SpecialHandlingCodes>
${specialHandlingXml}
    </iata:SpecialHandlingCodes>
  </iata:MasterConsignment>
${data.consolidatedHawbs && data.consolidatedHawbs.length > 0 ? `\n  <iata:ConsolidatedHouseWaybills>\n${houseListXml}\n  </iata:ConsolidatedHouseWaybills>` : ""}
</${rootTag}>`;
  }

  /**
   * Generates a standard IATA Cargo-IMP telex message (FWB/17 for Master, FHL/4 for House).
   */
  static generateCargoImp(data: AirwayBillXmlData): string {
    const isHouse = data.type === "HAWB";
    const cleanAwb = data.awbNumber.replace(/[\s-]/g, "");
    const dateFormatted = new Date()
      .toISOString()
      .substring(2, 10)
      .replace(/-/g, "");
    const shipper = data.shipperData ?? {
      name: "SHIPPER ON RECORD",
      address: data.originAirport,
      country: "ES",
    };
    const consignee = data.consigneeData ?? {
      name: "CONSIGNEE ON RECORD",
      address: data.destinationAirport,
      country: "US",
    };
    const grossWeightKg = Number(data.grossWeightKg ?? 0);
    const totalPrepaid = Number(data.totalPrepaid ?? 0);

    if (isHouse) {
      return `FHL/4
${cleanAwb}${data.originAirport}${data.destinationAirport}/T${data.pieces ?? 0}K${grossWeightKg.toFixed(1)}
HWB/${data.awbNumber}/${data.originAirport}${data.destinationAirport}/${data.pieces ?? 0}/K${grossWeightKg.toFixed(1)}/${data.natureOfGoods || "CONSOLIDATED CARGO"}
SHP
/${shipper.name}
/${shipper.address}
CNE
/${consignee.name}
/${consignee.address}
LAST`;
    }

    return `FWB/17
${cleanAwb}${data.originAirport}${data.destinationAirport}/T${data.pieces ?? 0}K${grossWeightKg.toFixed(1)}
FLT/${data.flightNumber || "IB6251"}/${dateFormatted}
RTG/${data.originAirport}/${data.destinationAirport}
SHP
/${shipper.name}
/${shipper.address}
/${shipper.country}
CNE
/${consignee.name}
/${consignee.address}
/${consignee.country}
AGT//${data.issuingAgentData?.iataCode || "7840000"}/${data.originAirport}
SSR/${data.handlingInfo || "NO SPECIAL HANDLING"}
SPH/${(data.specialHandlingCodes || ["GEN"]).join("/")}
CBI/PPD/${data.currency || "EUR"}/${totalPrepaid.toFixed(2)}
ISU/${dateFormatted}/${data.originAirport}
LAST`;
  }
}
