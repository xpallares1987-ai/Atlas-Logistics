import { db } from "../index.js";
import * as schema from "../schema/index.js";
import { faker } from "@faker-js/faker";
import { sql } from "drizzle-orm";

export async function seedAirCargo(): Promise<void> {
  // 14. IATA AIRPORTS, DGR REGISTRY & AIRWAY BILLS (e-AWB)
  const airportsData = [
    {
      code: "MAD",
      name: "Adolfo Suárez Madrid-Barajas",
      city: "Madrid",
      countryCode: "ES",
      timezone: "Europe/Madrid",
    },
    {
      code: "BCN",
      name: "Josep Tarradellas Barcelona-El Prat",
      city: "Barcelona",
      countryCode: "ES",
      timezone: "Europe/Madrid",
    },
    {
      code: "FRA",
      name: "Frankfurt am Main Airport",
      city: "Frankfurt",
      countryCode: "DE",
      timezone: "Europe/Berlin",
    },
    {
      code: "LHR",
      name: "London Heathrow Airport",
      city: "London",
      countryCode: "GB",
      timezone: "Europe/London",
    },
    {
      code: "JFK",
      name: "John F. Kennedy International Airport",
      city: "New York",
      countryCode: "US",
      timezone: "America/New_York",
    },
    {
      code: "MIA",
      name: "Miami International Airport",
      city: "Miami",
      countryCode: "US",
      timezone: "America/New_York",
    },
    {
      code: "ORD",
      name: "O'Hare International Airport",
      city: "Chicago",
      countryCode: "US",
      timezone: "America/Chicago",
    },
    {
      code: "PVG",
      name: "Shanghai Pudong International Airport",
      city: "Shanghai",
      countryCode: "CN",
      timezone: "Asia/Shanghai",
    },
    {
      code: "HKG",
      name: "Hong Kong International Airport",
      city: "Hong Kong",
      countryCode: "HK",
      timezone: "Asia/Hong_Kong",
    },
    {
      code: "NRT",
      name: "Narita International Airport",
      city: "Tokyo",
      countryCode: "JP",
      timezone: "Asia/Tokyo",
    },
    {
      code: "EZE",
      name: "Ministro Pistarini International Airport",
      city: "Buenos Aires",
      countryCode: "AR",
      timezone: "America/Argentina/Buenos_Aires",
    },
  ];

  for (const ap of airportsData) {
    await db.insert(schema.iataAirports).values(ap).onConflictDoNothing();
  }
  console.log(`✅ Creados ${airportsData.length} aeropuertos IATA.`);

  const dgrData = [
    {
      unNumber: "UN3480",
      properShippingName:
        "LITHIUM ION BATTERIES (including lithium ion polymer batteries)",
      dgrClass: "Class 9",
      subRisks: null,
      packingGroup: "II",
      passengerLimitKg: "FORBIDDEN",
      cargoAircraftLimitKg: "35 kg",
      packingInstructionPax: null,
      packingInstructionCao: "965",
      defaultShc: "ELI",
    },
    {
      unNumber: "UN3481",
      properShippingName: "LITHIUM ION BATTERIES CONTAINED IN EQUIPMENT",
      dgrClass: "Class 9",
      subRisks: null,
      packingGroup: "II",
      passengerLimitKg: "5 kg",
      cargoAircraftLimitKg: "35 kg",
      packingInstructionPax: "967",
      packingInstructionCao: "967",
      defaultShc: "ELI",
    },
    {
      unNumber: "UN3090",
      properShippingName:
        "LITHIUM METAL BATTERIES (including lithium alloy batteries)",
      dgrClass: "Class 9",
      subRisks: null,
      packingGroup: "II",
      passengerLimitKg: "FORBIDDEN",
      cargoAircraftLimitKg: "35 kg",
      packingInstructionPax: null,
      packingInstructionCao: "968",
      defaultShc: "ELM",
    },
    {
      unNumber: "UN1845",
      properShippingName: "CARBON DIOXIDE, SOLID (DRY ICE)",
      dgrClass: "Class 9",
      subRisks: null,
      packingGroup: "III",
      passengerLimitKg: "200 kg",
      cargoAircraftLimitKg: "200 kg",
      packingInstructionPax: "954",
      packingInstructionCao: "954",
      defaultShc: "ICE",
    },
    {
      unNumber: "UN1263",
      properShippingName:
        "PAINT (including paint, lacquer, enamel, stain, shellac)",
      dgrClass: "Class 3",
      subRisks: null,
      packingGroup: "II",
      passengerLimitKg: "5 L",
      cargoAircraftLimitKg: "60 L",
      packingInstructionPax: "353",
      packingInstructionCao: "364",
      defaultShc: "DGR",
    },
    {
      unNumber: "UN1993",
      properShippingName: "FLAMMABLE LIQUID, N.O.S.",
      dgrClass: "Class 3",
      subRisks: null,
      packingGroup: "I",
      passengerLimitKg: "1 L",
      cargoAircraftLimitKg: "30 L",
      packingInstructionPax: "351",
      packingInstructionCao: "361",
      defaultShc: "DGR",
    },
  ];

  for (const dgr of dgrData) {
    await db.insert(schema.dgrRegistry).values(dgr).onConflictDoNothing();
  }
  console.log(`✅ Creados ${dgrData.length} registros DGR/IATA.`);

  // Seed MAWBs and HAWBs
  const mawb1Id = "mawb_ib_84920153";
  await db
    .insert(schema.airwayBills)
    .values({
      id: mawb1Id,
      type: "MAWB",
      awbNumber: "075-84920153",
      airlinePrefix: "075",
      airlineName: "Iberia Cargo",
      originAirport: "MAD",
      destinationAirport: "JFK",
      flightNumber: "IB6251",
      flightDate: new Date(Date.now() + 86400000 * 2),
      shipperData: {
        name: "Atlas Freight Solutions SL",
        address: "Centro de Carga Aérea, Edificio de Servicios, 28042 Madrid",
        country: "ES",
        contact: "+34 91 748 0000",
        accountNo: "ATLAS-MAD-01",
      },
      consigneeData: {
        name: "Atlas Global Logistics USA Inc",
        address: "Bldg 77, JFK International Airport, Jamaica, NY 11430",
        country: "US",
        contact: "+1 718 553 0000",
        accountNo: "ATLAS-JFK-99",
      },
      issuingAgentData: {
        name: "ATLAS AIR CARGO FORWARDING",
        city: "MADRID",
        iataCode: "78-4-7291/0014",
        cassAddress: "ES-CASS-8819",
      },
      pieces: 35,
      grossWeightKg: 730,
      volumeCbm: 5.0,
      volumetricWeightKg: 833.5,
      chargeableWeightKg: 833.5,
      rateClass: "Q",
      ratePerKg: 3.45,
      freightCharge: 2875.58,
      otherCharges: [
        { code: "MYC", name: "Fuel Surcharge", amount: 791.83 },
        { code: "SCC", name: "Security Surcharge", amount: 125.03 },
        { code: "AWC", name: "AWB Fee", amount: 25.0 },
        { code: "CGC", name: "Terminal Handling Charge", amount: 125.03 },
      ],
      totalPrepaid: 3942.47,
      totalCollect: 0,
      currency: "EUR",
      natureOfGoods:
        "CONSOLIDATION AS PER ATTACHED MANIFEST (PHARMA / ELECTRONICS)",
      specialHandlingCodes: ["COL", "ELI"],
      handlingInfo:
        "TEMP CONTROLLED SHIPMENT (+2C TO +8C). CONTAINS LITHIUM ION BATTERIES IN COMPLIANCE WITH SECTION II PI967.",
      status: "BOOKED",
      eAwbCertified: true,
      awbData: {
        accountingInfo: "FREIGHT PREPAID / CASS SETTLEMENT",
        handlingCodes: ["COL", "ELI"],
        routing: "MAD IB JFK",
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  // HAWB 1
  await db
    .insert(schema.airwayBills)
    .values({
      id: "hawb_mad_001",
      type: "HAWB",
      awbNumber: "HAWB-MAD-8492-01",
      airlinePrefix: "075",
      airlineName: "Iberia Cargo",
      parentMawbId: mawb1Id,
      originAirport: "MAD",
      destinationAirport: "JFK",
      flightNumber: "IB6251",
      flightDate: new Date(Date.now() + 86400000 * 2),
      shipperData: {
        name: "BioPharma Laboratories Europe SA",
        address: "Parque Tecnológico de Madrid, Tres Cantos, 28760 Madrid",
        country: "ES",
        contact: "+34 91 804 5500",
      },
      consigneeData: {
        name: "NorthEast Health Distribution LLC",
        address: "450 Lexington Ave, New York, NY 10017",
        country: "US",
        contact: "+1 212 555 0199",
      },
      pieces: 10,
      grossWeightKg: 420,
      volumeCbm: 3.2,
      volumetricWeightKg: 533.5,
      chargeableWeightKg: 533.5,
      rateClass: "Q",
      ratePerKg: 3.8,
      freightCharge: 2027.3,
      otherCharges: [
        { code: "MYC", name: "Fuel Surcharge", amount: 506.83 },
        { code: "SCC", name: "Security Surcharge", amount: 80.03 },
        { code: "AWC", name: "AWB Fee", amount: 25.0 },
      ],
      totalPrepaid: 2639.16,
      totalCollect: 0,
      currency: "EUR",
      natureOfGoods: "PHARMACEUTICAL VACCINES IN TEMP-CONTROLLED SHIPPERS",
      specialHandlingCodes: ["COL", "PER"],
      handlingInfo:
        "DO NOT FREEZE. MAINTAIN +2C TO +8C. RE-ICE IF TRANSIT DELAY > 24H.",
      status: "BOOKED",
      eAwbCertified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  // HAWB 2
  await db
    .insert(schema.airwayBills)
    .values({
      id: "hawb_mad_002",
      type: "HAWB",
      awbNumber: "HAWB-MAD-8492-02",
      airlinePrefix: "075",
      airlineName: "Iberia Cargo",
      parentMawbId: mawb1Id,
      originAirport: "MAD",
      destinationAirport: "JFK",
      flightNumber: "IB6251",
      flightDate: new Date(Date.now() + 86400000 * 2),
      shipperData: {
        name: "Iberica Smart Devices SL",
        address: "Calle Alcalá 450, 28027 Madrid",
        country: "ES",
        contact: "+34 91 320 8800",
      },
      consigneeData: {
        name: "TechWorld Retail US Corp",
        address: "100 5th Avenue, New York, NY 10011",
        country: "US",
        contact: "+1 212 900 4400",
      },
      pieces: 25,
      grossWeightKg: 310,
      volumeCbm: 1.8,
      volumetricWeightKg: 300,
      chargeableWeightKg: 310,
      rateClass: "Q",
      ratePerKg: 3.65,
      freightCharge: 1131.5,
      otherCharges: [
        { code: "MYC", name: "Fuel Surcharge", amount: 294.5 },
        { code: "SCC", name: "Security Surcharge", amount: 46.5 },
        { code: "AWC", name: "AWB Fee", amount: 25.0 },
      ],
      totalPrepaid: 1497.5,
      totalCollect: 0,
      currency: "EUR",
      natureOfGoods:
        "TABLETS & SMARTPHONES (UN 3481 LITHIUM ION BATTERIES PI967)",
      specialHandlingCodes: ["ELI"],
      handlingInfo:
        "HANDLE WITH CARE. LITHIUM ION BATTERIES IN COMPLIANCE WITH SECTION II OF PI967.",
      status: "BOOKED",
      eAwbCertified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  // Direct MAWB 2 (Lufthansa)
  await db
    .insert(schema.airwayBills)
    .values({
      id: "mawb_lh_49281722",
      type: "DIRECT",
      awbNumber: "020-49281722",
      airlinePrefix: "020",
      airlineName: "Lufthansa Cargo",
      originAirport: "FRA",
      destinationAirport: "PVG",
      flightNumber: "LH8220",
      flightDate: new Date(Date.now() + 86400000 * 3),
      shipperData: {
        name: "Precision Optronics GmbH",
        address: "Carl-Zeiss-Promenade 10, 07745 Jena",
        country: "DE",
        contact: "+49 3641 6400",
      },
      consigneeData: {
        name: "Shanghai Advanced Semiconductor Manufacturing Co",
        address: "No. 885 Guoshoujing Rd, Pudong, Shanghai 201203",
        country: "CN",
        contact: "+86 21 5080 0000",
      },
      issuingAgentData: {
        name: "ATLAS AIR CARGO GERMANY GMBH",
        city: "FRANKFURT",
        iataCode: "08-4-8821/0022",
        cassAddress: "DE-CASS-5510",
      },
      pieces: 4,
      grossWeightKg: 650,
      volumeCbm: 4.8,
      volumetricWeightKg: 800,
      chargeableWeightKg: 800,
      rateClass: "Q",
      ratePerKg: 4.2,
      freightCharge: 3360.0,
      otherCharges: [
        { code: "MYC", name: "Fuel Surcharge", amount: 760.0 },
        { code: "SCC", name: "Security Surcharge", amount: 120.0 },
        { code: "AWC", name: "AWB Fee", amount: 25.0 },
        { code: "CGC", name: "Terminal Handling Charge", amount: 120.0 },
      ],
      totalPrepaid: 4385.0,
      totalCollect: 0,
      currency: "EUR",
      natureOfGoods:
        "HIGH-PRECISION LASER OPTICS MODULES (DUAL USE EU 2021/821 6A005)",
      specialHandlingCodes: ["VAL", "CAO"],
      handlingInfo: "DO NOT TILT. SHOCK WATCH MONITORED. CARGO AIRCRAFT ONLY.",
      status: "RCS",
      eAwbCertified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  // Direct MAWB 3 (British Airways with Dry Ice)
  await db
    .insert(schema.airwayBills)
    .values({
      id: "mawb_ba_91827361",
      type: "DIRECT",
      awbNumber: "125-91827361",
      airlinePrefix: "125",
      airlineName: "British Airways Cargo",
      originAirport: "LHR",
      destinationAirport: "MIA",
      flightNumber: "BA0207",
      flightDate: new Date(Date.now() + 86400000 * 4),
      shipperData: {
        name: "Oxford Diagnostic Technologies Ltd",
        address: "Science Park, Oxford OX4 4GA",
        country: "GB",
        contact: "+44 1865 777000",
      },
      consigneeData: {
        name: "Florida Clinical Research Institute",
        address: "1600 NW 10th Ave, Miami, FL 33136",
        country: "US",
        contact: "+1 305 243 1000",
      },
      issuingAgentData: {
        name: "ATLAS AIR CARGO UK LTD",
        city: "LONDON",
        iataCode: "91-4-1100/0033",
        cassAddress: "GB-CASS-1192",
      },
      pieces: 8,
      grossWeightKg: 180,
      volumeCbm: 1.2,
      volumetricWeightKg: 200,
      chargeableWeightKg: 200,
      rateClass: "Q",
      ratePerKg: 4.85,
      freightCharge: 970.0,
      otherCharges: [
        { code: "MYC", name: "Fuel Surcharge", amount: 190.0 },
        { code: "SCC", name: "Security Surcharge", amount: 30.0 },
        { code: "AWC", name: "AWB Fee", amount: 25.0 },
      ],
      totalPrepaid: 1215.0,
      totalCollect: 0,
      currency: "EUR",
      natureOfGoods:
        "DIAGNOSTIC KITS PACKED WITH DRY ICE (UN 1845 CLASS 9 PG III 45 KG)",
      specialHandlingCodes: ["ICE", "COL"],
      dgrDetails: {
        unNumber: "UN1845",
        properShippingName: "CARBON DIOXIDE, SOLID (DRY ICE)",
        class: "9",
        packingGroup: "III",
        netQtyPerPkg: "5.6 kg",
      },
      handlingInfo:
        "DRY ICE UN 1845 8 PACKAGES X 5.6 KG NET QTY. MAINTAIN UPRIGHT.",
      status: "BOOKED",
      eAwbCertified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  console.log(
    "✅ Creados Airway Bills maestros, consolidaciones HAWB y vuelos de carga.",
  );
}
