import { db } from "../index.js";
import * as schema from "../schema/index.js";
import { faker } from "@faker-js/faker";
import { sql } from "drizzle-orm";
import {
  SEED_ONE_RECORD_WAYBILLS,
  SEED_CARGO_IQ_TIMELINE,
} from "@atlas/shared";

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
    {
      code: "MEX",
      name: "Aeropuerto Internacional Benito Juárez",
      city: "Ciudad de México",
      countryCode: "MX",
      timezone: "America/Mexico_City",
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

  // MAWB 4 (Emirates SkyCargo BCN -> DXB)
  const mawb4Id = "mawb_ek_17629104";
  await db
    .insert(schema.airwayBills)
    .values({
      id: mawb4Id,
      type: "MAWB",
      awbNumber: "176-17629104",
      airlinePrefix: "176",
      airlineName: "Emirates SkyCargo",
      originAirport: "BCN",
      destinationAirport: "DXB",
      flightNumber: "EK0186",
      flightDate: new Date(Date.now() + 86400000 * 3),
      shipperData: {
        name: "Atlas Air Cargo Barcelona Forwarding",
        address: "ZAL Puerto de Barcelona, 08820 El Prat de Llobregat",
        country: "ES",
        contact: "+34 93 478 9900",
        accountNo: "ATLAS-BCN-02",
      },
      consigneeData: {
        name: "Emirates Logistics Hub LLC",
        address: "Dubai Cargo Village, Terminal 2, Dubai",
        country: "AE",
        contact: "+971 4 216 1111",
        accountNo: "EMIRATES-DXB-88",
      },
      issuingAgentData: {
        name: "ATLAS AIR CARGO SPAIN SL",
        city: "BARCELONA",
        iataCode: "78-4-8812/0019",
        cassAddress: "ES-CASS-8819",
      },
      pieces: 18,
      grossWeightKg: 1450,
      volumeCbm: 9.6,
      volumetricWeightKg: 1600,
      chargeableWeightKg: 1600,
      rateClass: "Q",
      ratePerKg: 3.15,
      freightCharge: 5040.0,
      otherCharges: [
        { code: "MYC", name: "Fuel Surcharge", amount: 1520.0 },
        { code: "SCC", name: "Security Surcharge", amount: 240.0 },
        { code: "AWC", name: "AWB Fee", amount: 25.0 },
        { code: "CGC", name: "Terminal Handling Charge", amount: 240.0 },
      ],
      totalPrepaid: 7065.0,
      totalCollect: 0,
      currency: "EUR",
      natureOfGoods:
        "CONSOLIDATION AS PER MANIFEST: HIGH-END TEXTILES & AVIONICS SENSORS",
      specialHandlingCodes: ["VAL", "SPX"],
      handlingInfo:
        "SECURE AIR CARGO. DO NOT TOP LOAD. VALUABLE CARGO PROTOCOL.",
      status: "RCS",
      eAwbCertified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  // HAWB 3 (under MAWB 4)
  await db
    .insert(schema.airwayBills)
    .values({
      id: "hawb_bcn_001",
      type: "HAWB",
      awbNumber: "HAWB-BCN-1762-01",
      airlinePrefix: "176",
      airlineName: "Emirates SkyCargo",
      parentMawbId: mawb4Id,
      originAirport: "BCN",
      destinationAirport: "DXB",
      flightNumber: "EK0186",
      flightDate: new Date(Date.now() + 86400000 * 3),
      shipperData: {
        name: "Catalana Fashion Couture SL",
        address: "Passeig de Gràcia 92, 08008 Barcelona",
        country: "ES",
        contact: "+34 93 215 4400",
      },
      consigneeData: {
        name: "Dubai Luxury Retail Group PJSC",
        address: "Dubai Mall Fashion Avenue, Downtown Dubai",
        country: "AE",
        contact: "+971 4 362 7500",
      },
      pieces: 10,
      grossWeightKg: 850,
      volumeCbm: 6.0,
      volumetricWeightKg: 1000,
      chargeableWeightKg: 1000,
      rateClass: "Q",
      ratePerKg: 3.4,
      freightCharge: 3400.0,
      otherCharges: [
        { code: "MYC", name: "Fuel Surcharge", amount: 950.0 },
        { code: "SCC", name: "Security Surcharge", amount: 150.0 },
        { code: "AWC", name: "AWB Fee", amount: 25.0 },
      ],
      totalPrepaid: 4525.0,
      totalCollect: 0,
      currency: "EUR",
      natureOfGoods: "LUXURY APPAREL & LEATHER ACCESSORIES",
      specialHandlingCodes: ["VAL"],
      status: "RCS",
      eAwbCertified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  // HAWB 4 (under MAWB 4)
  await db
    .insert(schema.airwayBills)
    .values({
      id: "hawb_bcn_002",
      type: "HAWB",
      awbNumber: "HAWB-BCN-1762-02",
      airlinePrefix: "176",
      airlineName: "Emirates SkyCargo",
      parentMawbId: mawb4Id,
      originAirport: "BCN",
      destinationAirport: "DXB",
      flightNumber: "EK0186",
      flightDate: new Date(Date.now() + 86400000 * 3),
      shipperData: {
        name: "Barna Avionics Solutions SL",
        address: "Parc Tecnològic del Vallès, Cerdanyola del Vallès",
        country: "ES",
        contact: "+34 93 582 0100",
      },
      consigneeData: {
        name: "Gulf Aerospace MRO Technologies",
        address: "Dubai South Aviation District, DWC",
        country: "AE",
        contact: "+971 4 814 3000",
      },
      pieces: 8,
      grossWeightKg: 600,
      volumeCbm: 3.6,
      volumetricWeightKg: 600,
      chargeableWeightKg: 600,
      rateClass: "Q",
      ratePerKg: 3.8,
      freightCharge: 2280.0,
      otherCharges: [
        { code: "MYC", name: "Fuel Surcharge", amount: 570.0 },
        { code: "SCC", name: "Security Surcharge", amount: 90.0 },
        { code: "AWC", name: "AWB Fee", amount: 25.0 },
      ],
      totalPrepaid: 2965.0,
      totalCollect: 0,
      currency: "EUR",
      natureOfGoods: "AIRCRAFT NAVIGATION SENSORS & ACCELEROMETERS",
      specialHandlingCodes: ["SPX"],
      status: "RCS",
      eAwbCertified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  // Direct MAWB 5 (Qatar Airways Cargo MAD -> DOH)
  await db
    .insert(schema.airwayBills)
    .values({
      id: "mawb_qr_15738291",
      type: "DIRECT",
      awbNumber: "157-15738291",
      airlinePrefix: "157",
      airlineName: "Qatar Airways Cargo",
      originAirport: "MAD",
      destinationAirport: "DOH",
      flightNumber: "QR8162",
      flightDate: new Date(Date.now() + 86400000 * 2),
      shipperData: {
        name: "Galicia Seafood Export Corp",
        address: "Muelle de Reparaciones, Puerto de Vigo, 36208 Vigo",
        country: "ES",
        contact: "+34 986 211 400",
      },
      consigneeData: {
        name: "Doha Fresh Foods Logistics WLL",
        address: "Hamad International Airport Cargo Complex, Doha",
        country: "QA",
        contact: "+974 4499 6600",
      },
      pieces: 12,
      grossWeightKg: 4200,
      volumeCbm: 18.0,
      volumetricWeightKg: 3000,
      chargeableWeightKg: 4200,
      rateClass: "Q",
      ratePerKg: 2.85,
      freightCharge: 11970.0,
      otherCharges: [
        { code: "MYC", name: "Fuel Surcharge", amount: 3990.0 },
        { code: "SCC", name: "Security Surcharge", amount: 630.0 },
        { code: "AWC", name: "AWB Fee", amount: 25.0 },
      ],
      totalPrepaid: 16615.0,
      totalCollect: 0,
      currency: "EUR",
      natureOfGoods: "LIVE SEAFOOD / CRUSTACEANS IN OXYGENATED BINS",
      specialHandlingCodes: ["AVI", "PER", "COL"],
      handlingInfo: "MAINTAIN +4C. LIVE CRUSTACEANS. PRIORITY APRON TRANSFER.",
      status: "DEP",
      eAwbCertified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  // MAWB 6 (Air France Cargo MAD -> ORD via CDG)
  const mawb6Id = "mawb_af_05749281";
  await db
    .insert(schema.airwayBills)
    .values({
      id: mawb6Id,
      type: "MAWB",
      awbNumber: "057-05749281",
      airlinePrefix: "057",
      airlineName: "Air France Cargo",
      originAirport: "MAD",
      destinationAirport: "ORD",
      flightNumber: "AF6730",
      flightDate: new Date(Date.now() + 86400000 * 4),
      shipperData: {
        name: "Atlas Freight Solutions Madrid",
        address: "Centro de Carga Aérea Barajas, 28042 Madrid",
        country: "ES",
        contact: "+34 91 748 0000",
      },
      consigneeData: {
        name: "Atlas Global Air Hub Midwest",
        address: "O'Hare International Airport Cargo Area, Chicago, IL 60666",
        country: "US",
        contact: "+1 773 686 2200",
      },
      pieces: 28,
      grossWeightKg: 2850,
      volumeCbm: 16.5,
      volumetricWeightKg: 2750,
      chargeableWeightKg: 2850,
      rateClass: "Q",
      ratePerKg: 3.2,
      freightCharge: 9120.0,
      otherCharges: [
        { code: "MYC", name: "Fuel Surcharge", amount: 2707.5 },
        { code: "SCC", name: "Security Surcharge", amount: 427.5 },
        { code: "AWC", name: "AWB Fee", amount: 25.0 },
      ],
      totalPrepaid: 12280.0,
      totalCollect: 0,
      currency: "EUR",
      natureOfGoods: "CONSOLIDATION: ROBOTIC DRIVE UNITS & PRECISION GEARBOXES",
      specialHandlingCodes: ["GEN", "SPX"],
      handlingInfo:
        "HIGH DENSITY CARGO. FORK POCKETS PROVIDED. TIE DOWN SECURE.",
      status: "BOOKED",
      eAwbCertified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  // Direct MAWB 7 (Atlas Air 747 Freighter JFK -> FRA)
  await db
    .insert(schema.airwayBills)
    .values({
      id: "mawb_5y_40391820",
      type: "DIRECT",
      awbNumber: "369-40391820",
      airlinePrefix: "369",
      airlineName: "Atlas Air Worldwide",
      originAirport: "JFK",
      destinationAirport: "FRA",
      flightNumber: "5Y8821",
      flightDate: new Date(Date.now() + 86400000 * 5),
      shipperData: {
        name: "GE Aerospace Propulsion Systems",
        address: "1 Neumann Way, Evendale, OH 45215",
        country: "US",
        contact: "+1 513 243 2000",
      },
      consigneeData: {
        name: "Lufthansa Technik Engine Overhaul Hub",
        address: "Frankfurt Airport MRO Base, 60549 Frankfurt",
        country: "DE",
        contact: "+49 69 6960",
      },
      pieces: 2,
      grossWeightKg: 14200,
      volumeCbm: 42.0,
      volumetricWeightKg: 7000,
      chargeableWeightKg: 14200,
      rateClass: "Q",
      ratePerKg: 4.1,
      freightCharge: 58220.0,
      otherCharges: [
        { code: "MYC", name: "Fuel Surcharge", amount: 13490.0 },
        { code: "SCC", name: "Security Surcharge", amount: 2130.0 },
        { code: "AWC", name: "AWB Fee", amount: 50.0 },
        { code: "CGC", name: "Heavy Lift Apron Crane Fee", amount: 1850.0 },
      ],
      totalPrepaid: 75740.0,
      totalCollect: 0,
      currency: "EUR",
      natureOfGoods:
        "CFM LEAP-1B TURBOFAN COMMERCIAL AIRCRAFT ENGINES ON STANDS",
      specialHandlingCodes: ["BIG", "CAO", "HEAVY"],
      handlingInfo:
        "MAIN DECK ONLY. HEAVY LIFT SPREADER BEAM REQUIRED FOR CRANE TRANSFER.",
      status: "MANIFESTED",
      eAwbCertified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  // Direct MAWB 8 (Cathay Cargo HKG -> BCN)
  await db
    .insert(schema.airwayBills)
    .values({
      id: "mawb_cx_16049281",
      type: "DIRECT",
      awbNumber: "160-16049281",
      airlinePrefix: "160",
      airlineName: "Cathay Cargo",
      originAirport: "HKG",
      destinationAirport: "BCN",
      flightNumber: "CX0315",
      flightDate: new Date(Date.now() + 86400000 * 2),
      shipperData: {
        name: "Kowloon Precision Microelectronics Ltd",
        address: "Science & Technology Park, Sha Tin, Hong Kong",
        country: "HK",
        contact: "+852 2607 8888",
      },
      consigneeData: {
        name: "Barcelona Semiconductor Distribution SL",
        address: "Carrer de la Marina 16, 08005 Barcelona",
        country: "ES",
        contact: "+34 93 309 8811",
      },
      pieces: 45,
      grossWeightKg: 3100,
      volumeCbm: 14.2,
      volumetricWeightKg: 2366,
      chargeableWeightKg: 3100,
      rateClass: "Q",
      ratePerKg: 4.5,
      freightCharge: 13950.0,
      otherCharges: [
        { code: "MYC", name: "Fuel Surcharge", amount: 2945.0 },
        { code: "SCC", name: "Security Surcharge", amount: 465.0 },
        { code: "AWC", name: "AWB Fee", amount: 25.0 },
      ],
      totalPrepaid: 17385.0,
      totalCollect: 0,
      currency: "EUR",
      natureOfGoods:
        "SILICON WAFERS & INTEGRATED CIRCUITS (CLASS 9 LITHIUM COIN CELLS UN 3091)",
      specialHandlingCodes: ["ELM", "VAL"],
      handlingInfo:
        "ESD SENSITIVE. TEMPERATURE MONITORED +15C TO +25C. DO NOT DROP.",
      status: "ARR",
      eAwbCertified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  // CANONICAL IATA ONE RECORD WAYBILLS & CARGO IQ MILESTONES (Phase 1)
  const oneRecordWaybill1 = SEED_ONE_RECORD_WAYBILLS[0];
  const oneRecordWaybill2 = SEED_ONE_RECORD_WAYBILLS[1];

  await db
    .insert(schema.airwayBills)
    .values({
      id: "mawb_ib_82910482",
      type: "MAWB",
      awbNumber: oneRecordWaybill1.fullAwbNumber, // "075-82910482"
      airlinePrefix: oneRecordWaybill1.waybillPrefix,
      airlineName: oneRecordWaybill1.carrier?.name || "Iberia Líneas Aéreas",
      originAirport: oneRecordWaybill1.originAirport,
      destinationAirport: oneRecordWaybill1.destinationAirport,
      flightNumber:
        oneRecordWaybill1.transportMovement?.flightNumber || "IB6251",
      flightDate: new Date(
        oneRecordWaybill1.transportMovement?.scheduledDeparture ||
          Date.now() + 6 * 3600 * 1000,
      ),
      shipperData: oneRecordWaybill1.shipper,
      consigneeData: oneRecordWaybill1.consignee,
      issuingAgentData: oneRecordWaybill1.issuingAgent,
      pieces: oneRecordWaybill1.piecesCount,
      grossWeightKg: oneRecordWaybill1.totalGrossWeightKg,
      volumeCbm: oneRecordWaybill1.totalVolumeCbm,
      chargeableWeightKg: oneRecordWaybill1.chargeableWeightKg,
      rateClass: "Q",
      ratePerKg: 4.8,
      freightCharge: 4080.0,
      otherCharges: [
        { code: "MYC", name: "Fuel Surcharge", amount: 980.0 },
        { code: "SCC", name: "Security Surcharge", amount: 150.0 },
        { code: "AWC", name: "AWB Fee", amount: 25.0 },
        { code: "COL", name: "Cold Storage Fee", amount: 200.0 },
      ],
      totalPrepaid: 5435.0,
      totalCollect: 0,
      currency: "EUR",
      natureOfGoods: oneRecordWaybill1.natureAndQuantityOfGoods,
      specialHandlingCodes: oneRecordWaybill1.specialHandlingCodes,
      handlingInfo: "TEMP MONITORED +2C TO +8C. CONTAINS DRY ICE UN 1845.",
      status: "IN_TRANSIT",
      eAwbCertified: true,
      oneRecordJsonLd: oneRecordWaybill1,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.airwayBills.awbNumber,
      set: {
        oneRecordJsonLd: oneRecordWaybill1,
        status: "IN_TRANSIT",
        updatedAt: new Date(),
      },
    });

  if (oneRecordWaybill2) {
    await db
      .insert(schema.airwayBills)
      .values({
        id: "mawb_am_44109283",
        type: "MAWB",
        awbNumber: oneRecordWaybill2.fullAwbNumber, // "139-44109283"
        airlinePrefix: oneRecordWaybill2.waybillPrefix,
        airlineName: oneRecordWaybill2.carrier?.name || "Aeroméxico Cargo",
        originAirport: oneRecordWaybill2.originAirport,
        destinationAirport: oneRecordWaybill2.destinationAirport,
        flightNumber:
          oneRecordWaybill2.transportMovement?.flightNumber || "AM002",
        flightDate: new Date(
          oneRecordWaybill2.transportMovement?.scheduledDeparture ||
            Date.now() + 10 * 3600 * 1000,
        ),
        shipperData: oneRecordWaybill2.shipper,
        consigneeData: oneRecordWaybill2.consignee,
        issuingAgentData: oneRecordWaybill2.issuingAgent,
        pieces: oneRecordWaybill2.piecesCount,
        grossWeightKg: oneRecordWaybill2.totalGrossWeightKg,
        volumeCbm: oneRecordWaybill2.totalVolumeCbm,
        chargeableWeightKg: oneRecordWaybill2.chargeableWeightKg,
        rateClass: "Q",
        ratePerKg: 3.9,
        freightCharge: 1248.0,
        otherCharges: [
          { code: "MYC", name: "Fuel Surcharge", amount: 310.0 },
          { code: "SCC", name: "Security Surcharge", amount: 65.0 },
          { code: "AWC", name: "AWB Fee", amount: 25.0 },
        ],
        totalPrepaid: 1648.0,
        totalCollect: 0,
        currency: "EUR",
        natureOfGoods: oneRecordWaybill2.natureAndQuantityOfGoods,
        specialHandlingCodes: oneRecordWaybill2.specialHandlingCodes,
        handlingInfo: "HANDLE WITH CARE. LITHIUM ION BATTERIES PI967.",
        status: "BOOKED",
        eAwbCertified: true,
        oneRecordJsonLd: oneRecordWaybill2,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: schema.airwayBills.awbNumber,
        set: {
          oneRecordJsonLd: oneRecordWaybill2,
          status: "BOOKED",
          updatedAt: new Date(),
        },
      });
  }

  // Seed Cargo iQ Milestones for 075-82910482
  for (const m of SEED_CARGO_IQ_TIMELINE) {
    const milestoneId = `ciq_075_${m.milestoneCode.toLowerCase()}`;
    await db
      .insert(schema.cargoIqMilestones)
      .values({
        id: milestoneId,
        awbNumber: oneRecordWaybill1.fullAwbNumber,
        milestoneCode: m.milestoneCode,
        milestoneName: m.name,
        scheduledTime: new Date(m.plannedTimestamp),
        actualTime: m.actualTimestamp ? new Date(m.actualTimestamp) : null,
        slaDeadline: new Date(m.slaLimitTimestamp),
        slaStatus:
          m.status === "COMPLETED"
            ? "ON_TIME"
            : m.deltaMinutes && m.deltaMinutes > 0
              ? "WARNING"
              : "ON_TIME",
        locationAirportCode: m.locationAirport,
        flightNumber: "IB6251",
        carrierCode: "IB",
        eventRemarks: m.eventRemarks || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: schema.cargoIqMilestones.id,
        set: {
          scheduledTime: new Date(m.plannedTimestamp),
          actualTime: m.actualTimestamp ? new Date(m.actualTimestamp) : null,
          slaDeadline: new Date(m.slaLimitTimestamp),
          slaStatus:
            m.status === "COMPLETED"
              ? "ON_TIME"
              : m.deltaMinutes && m.deltaMinutes > 0
                ? "WARNING"
                : "ON_TIME",
          eventRemarks: m.eventRemarks || null,
          updatedAt: new Date(),
        },
      });
  }
  console.log("✅ Creados hitos Cargo iQ e-AWB para IATA ONE Record.");

  console.log(
    "✅ Creados Airway Bills maestros, consolidaciones HAWB y vuelos de carga.",
  );
}
