import { db } from "../index.js";
import * as schema from "../schema/index.js";
import { faker } from "@faker-js/faker";
import { CoreSeedContext } from "./core.seed.js";

export async function seedOperations(ctx: CoreSeedContext): Promise<string[]> {
  const {
    companyIds,
    userIds,
    locationIds,
    laneIds,
    carrierIds,
    brokerIds,
    hsCodeIds,
    standardHsCodes,
  } = ctx;

  // 6. RATES & SCHEDULES
  const rateIds = [];
  const scheduleIds = [];
  for (const laneId of laneIds) {
    const carrierId = faker.helpers.arrayElement(carrierIds);

    // Rate
    const rateId = faker.string.uuid();
    rateIds.push(rateId);
    await db.insert(schema.rates).values({
      id: rateId,
      carrierId,
      laneId,
      containerType: faker.helpers.arrayElement(["20DC", "40HC", "40NOR"]),
      baseRate: faker.number.int({ min: 800, max: 4500 }),
      transitDays: faker.number.int({ min: 10, max: 45 }),
    });

    // Schedule
    for (let i = 0; i < 3; i++) {
      const schedId = faker.string.uuid();
      scheduleIds.push(schedId);
      const departure = faker.date.future();
      const arrival = new Date(departure);
      arrival.setDate(
        arrival.getDate() + faker.number.int({ min: 10, max: 45 }),
      );

      await db.insert(schema.schedules).values({
        id: schedId,
        laneId,
        carrierId,
        vesselName: "MV " + faker.person.lastName().toUpperCase(),
        voyageNumber: faker.string.alphanumeric(6).toUpperCase(),
        departureDate: departure,
        arrivalDate: arrival,
      });
    }
  }
  console.log(
    `✅ Creadas tarifas y ${scheduleIds.length} itinerarios de barcos.`,
  );

  // 7. REALISTIC MARITIME TRADE CORRIDORS
  const realisticCorridors = [
    {
      origin: "Shanghai (CNSHA)",
      destination: "Valencia (ESVLC)",
      distanceKm: 18450,
      vessels: ["MV MSC GÜLSÜN", "MV MSC MAYA", "MV MSC OSCAR"],
      carrierPrefix: "MEDU",
      inTransitCoords: [
        { lat: 30.602, lng: 32.351, label: "Suez Canal Transit" },
        { lat: 21.45, lng: 38.2, label: "Red Sea Southbound" },
        { lat: 35.801, lng: 16.502, label: "Central Med South of Sicily" },
        { lat: 39.21, lng: 0.812, label: "Gulf of Valencia Approach" },
      ],
      customsCoord: { lat: 39.4446, lng: -0.3167 },
      deliveredCoord: { lat: 39.4699, lng: -0.3763 },
    },
    {
      origin: "Ningbo (CNNGB)",
      destination: "Barcelona (ESBCN)",
      distanceKm: 17900,
      vessels: ["MV CMA CGM JACQUES SAADÉ", "MV CMA CGM PALAIS ROYAL"],
      carrierPrefix: "CMAU",
      inTransitCoords: [
        { lat: 5.42, lng: 98.21, label: "Strait of Malacca" },
        { lat: 31.265, lng: 32.302, label: "Port Said Convoy" },
        { lat: 37.95, lng: 4.8, label: "Balearic Sea North of Algiers" },
        {
          lat: 41.314,
          lng: 2.148,
          label: "Barcelona BEST Terminal Approaching",
        },
      ],
      customsCoord: { lat: 41.3412, lng: 2.1645 },
      deliveredCoord: { lat: 41.3851, lng: 2.1734 },
    },
    {
      origin: "New York (USNYC)",
      destination: "Algeciras (ESALG)",
      distanceKm: 5920,
      vessels: ["MV MADRID MAERSK", "MV EDITH MAERSK", "MV ELEONORA MAERSK"],
      carrierPrefix: "MAEU",
      inTransitCoords: [
        { lat: 39.5, lng: -45.2, label: "Mid-Atlantic Ocean" },
        { lat: 36.8, lng: -18.4, label: "Azores Shipping Corridor" },
        { lat: 35.952, lng: -5.451, label: "Strait of Gibraltar Inbound" },
      ],
      customsCoord: { lat: 36.1422, lng: -5.4389 },
      deliveredCoord: { lat: 36.1285, lng: -5.4495 },
    },
    {
      origin: "Rotterdam (NLRTM)",
      destination: "Bilbao (ESBIO)",
      distanceKm: 1420,
      vessels: ["MV BG DIAMOND", "MV ELBFEEDER", "MV CONMAR GULF"],
      carrierPrefix: "HLCU",
      inTransitCoords: [
        { lat: 50.8, lng: 0.2, label: "English Channel Dover TSS" },
        { lat: 47.812, lng: -5.421, label: "Ushant TSS / Brittany" },
        { lat: 44.8, lng: -4.5, label: "Bay of Biscay Short Sea" },
      ],
      customsCoord: { lat: 43.3541, lng: -3.0512 },
      deliveredCoord: { lat: 43.263, lng: -2.935 },
    },
    {
      origin: "Monterrey (MXMTY)",
      destination: "Houston (USHOU)",
      distanceKm: 780,
      vessels: ["LANDBRIDGE TRUCK T-MEC", "KCSM INTERMODAL SHUTTLE"],
      carrierPrefix: "TGHU",
      inTransitCoords: [
        {
          lat: 27.506,
          lng: -99.507,
          label: "Puente Comercio Mundial Nuevo Laredo",
        },
        { lat: 27.53, lng: -99.48, label: "Laredo World Trade Port of Entry" },
        { lat: 29.424, lng: -98.493, label: "San Antonio I-35 Logistics Hub" },
      ],
      customsCoord: { lat: 27.53, lng: -99.48 },
      deliveredCoord: { lat: 29.7604, lng: -95.3698 },
    },
    {
      origin: "Hamburg (DEHAM)",
      destination: "Valencia (ESVLC)",
      distanceKm: 2890,
      vessels: ["MV ONE APUS", "MV ONE TRUST", "MV ONE HAMMERSMITH"],
      carrierPrefix: "ONEU",
      inTransitCoords: [
        { lat: 54.0, lng: 7.5, label: "German Bight TSS" },
        { lat: 49.5, lng: -3.5, label: "Channel Islands Sea Lane" },
        { lat: 36.5, lng: -8.5, label: "Cabo de San Vicente / Gulf of Cadiz" },
      ],
      customsCoord: { lat: 39.4446, lng: -0.3167 },
      deliveredCoord: { lat: 39.4699, lng: -0.3763 },
    },
    {
      origin: "Singapore (SGSIN)",
      destination: "Algeciras (ESALG)",
      distanceKm: 14100,
      vessels: ["MV EVER GIVEN", "MV EVER ACE", "MV EVER GOLDEN"],
      carrierPrefix: "EGLU",
      inTransitCoords: [
        { lat: 1.25, lng: 103.8, label: "Singapore Pasir Panjang Anchorage" },
        { lat: 12.5, lng: 43.5, label: "Bab-el-Mandeb Red Sea Approach" },
        { lat: 32.8, lng: 28.5, label: "Eastern Mediterranean Sea" },
      ],
      customsCoord: { lat: 36.1422, lng: -5.4389 },
      deliveredCoord: { lat: 36.1285, lng: -5.4495 },
    },
  ];

  // 8. SHIPMENTS (75 REALISTIC GLOBAL SHIPMENTS)
  const shipmentIds = [];
  const incoterms = ["FOB", "CIF", "EXW", "DDP", "FAS", "CFR", "DAP"];
  const totalShipments = 75;

  for (let i = 0; i < totalShipments; i++) {
    const isDemoShipment = i === 0;
    const id = isDemoShipment ? "sh_demo_01" : faker.string.uuid();
    shipmentIds.push(id);
    const companyId = faker.helpers.arrayElement(companyIds);
    const corridor = realisticCorridors[i % realisticCorridors.length];

    // Status distribution: 50% IN_TRANSIT, 25% CUSTOMS, 25% DELIVERED
    let status = "IN_TRANSIT";
    let clearanceStatus = "CLEARED";
    let currentLat = corridor.inTransitCoords[0].lat;
    let currentLng = corridor.inTransitCoords[0].lng;

    if (i % 4 === 0) {
      status = "CUSTOMS";
      clearanceStatus = faker.helpers.arrayElement([
        "PENDING_INSPECTION",
        "HOLD",
        "DOCS_REQUIRED",
      ]);
      currentLat = corridor.customsCoord.lat;
      currentLng = corridor.customsCoord.lng;
    } else if (i % 4 === 1) {
      status = "DELIVERED";
      clearanceStatus = "CLEARED";
      currentLat = corridor.deliveredCoord.lat;
      currentLng = corridor.deliveredCoord.lng;
    } else {
      status = "IN_TRANSIT";
      clearanceStatus = "CLEARED";
      const coord = faker.helpers.arrayElement(corridor.inTransitCoords);
      currentLat = coord.lat + (Math.random() - 0.5) * 0.1;
      currentLng = coord.lng + (Math.random() - 0.5) * 0.1;
    }

    const trackingNumber = isDemoShipment
      ? "BK-2026-67116"
      : `${corridor.carrierPrefix}${faker.string.numeric(7)}`;
    const vesselName = isDemoShipment
      ? "MSC ISABELLA"
      : faker.helpers.arrayElement(corridor.vessels);
    const voyageNumber = isDemoShipment
      ? "VOY-2026-88"
      : `${faker.number.int({ min: 2601, max: 2612 })}${faker.helpers.arrayElement(["E", "W", "N", "S"])}`;
    const weight = isDemoShipment
      ? 28450
      : faker.number.int({ min: 14000, max: 28500 });
    const co2eTonnes = Number(
      ((corridor.distanceKm * weight * 0.015) / 1000000).toFixed(2),
    );

    await db.insert(schema.shipments).values({
      id,
      trackingNumber,
      status,
      incoterm: faker.helpers.arrayElement(incoterms),
      serviceType: faker.helpers.arrayElement(["FCL", "LCL"]),
      laneId: faker.helpers.arrayElement(laneIds),
      scheduleId: faker.helpers.arrayElement(scheduleIds),
      vesselName,
      voyageNumber,
      origin: corridor.origin,
      destination: corridor.destination,
      distanceKm: corridor.distanceKm,
      weight,
      co2eTonnes,
      carbonFootprint: co2eTonnes,
      currentLat,
      currentLng,
      clearanceStatus,
      companyId,
      createdBy: faker.helpers.arrayElement(userIds),
    });

    // Route Segments (Legs)
    const departureNow = new Date();
    departureNow.setDate(
      departureNow.getDate() - faker.number.int({ min: 3, max: 20 }),
    );

    const seaArrival = new Date(departureNow);
    seaArrival.setDate(
      seaArrival.getDate() + faker.number.int({ min: 12, max: 25 }),
    );

    const finalArrival = new Date(seaArrival);
    finalArrival.setDate(finalArrival.getDate() + 2);

    // Leg 1: Origin Drayage (ROAD)
    await db.insert(schema.routeSegments).values({
      id: faker.string.uuid(),
      shipmentId: id,
      sequenceOrder: 1,
      transportMode: "ROAD",
      departureTime: departureNow,
      arrivalTime: new Date(departureNow.getTime() + 12 * 3600 * 1000),
      status: "COMPLETED",
    });

    // Leg 2: Ocean Linehaul (SEA)
    await db.insert(schema.routeSegments).values({
      id: faker.string.uuid(),
      shipmentId: id,
      sequenceOrder: 2,
      transportMode: "SEA",
      departureTime: new Date(departureNow.getTime() + 24 * 3600 * 1000),
      arrivalTime: seaArrival,
      status: status === "IN_TRANSIT" ? "IN_TRANSIT" : "COMPLETED",
    });

    // Leg 3: Destination Inland Delivery (ROAD / RAIL)
    await db.insert(schema.routeSegments).values({
      id: faker.string.uuid(),
      shipmentId: id,
      sequenceOrder: 3,
      transportMode: corridor.origin.includes("MXMTY") ? "RAIL" : "ROAD",
      departureTime: seaArrival,
      arrivalTime: finalArrival,
      status: status === "DELIVERED" ? "COMPLETED" : "PENDING",
    });

    // Containers (1 to 3 containers per shipment)
    const numContainers = faker.number.int({ min: 1, max: 3 });
    for (let j = 0; j < numContainers; j++) {
      const containerId =
        isDemoShipment && j === 0 ? "cnt_msku_9284712" : faker.string.uuid();
      const containerType =
        isDemoShipment && j === 0
          ? "40HC"
          : faker.helpers.arrayElement(["20DC", "40HC", "40RH"]);
      const containerNumber =
        isDemoShipment && j === 0
          ? "MSKU9284712"
          : `${corridor.carrierPrefix}${faker.string.numeric(7)}`;
      const sealNumber =
        isDemoShipment && j === 0
          ? "ISO-17712-H-881920"
          : `SL-${faker.string.numeric(6)}`;

      await db.insert(schema.shipmentContainers).values({
        id: containerId,
        shipmentId: id,
        containerNumber,
        containerType,
        sealNumber,
        weight: Math.round(weight / numContainers),
      });

      // Cargo Items (LCL Loadout) for the first container
      if (j === 0 && Math.random() > 0.4) {
        for (let k = 0; k < faker.number.int({ min: 3, max: 6 }); k++) {
          await db.insert(schema.cargoItems).values({
            id: faker.string.uuid(),
            shipmentId: id,
            containerId,
            label: `ORD-${faker.string.numeric(4)}`,
            color: faker.helpers.arrayElement([
              "#4ade80",
              "#f43f5e",
              "#60a5fa",
              "#fbbf24",
              "#a78bfa",
              "#06b6d4",
            ]),
            width: faker.number.float({
              min: 0.8,
              max: 1.6,
              fractionDigits: 1,
            }),
            height: faker.number.float({
              min: 0.8,
              max: 1.6,
              fractionDigits: 1,
            }),
            depth: faker.number.float({
              min: 0.8,
              max: 1.6,
              fractionDigits: 1,
            }),
            weight: faker.number.int({ min: 250, max: 1800 }),
            x: faker.number.float({ min: -1, max: 1, fractionDigits: 2 }),
            y: faker.number.float({ min: 0, max: 2, fractionDigits: 2 }),
            z: faker.number.float({ min: -5, max: 5, fractionDigits: 2 }),
          });
        }
      }
    }

    // Customs Declarations (DUA / VUCEM)
    if (Math.random() > 0.3) {
      const hsId = faker.helpers.arrayElement(hsCodeIds);
      const hsItem = standardHsCodes.find((h) => h.id === hsId)!;
      const customsValue = faker.number.float({
        min: 12000,
        max: 125000,
        fractionDigits: 2,
      });
      const duty = Math.round(customsValue * hsItem.adValoremDuty * 100) / 100;
      const vat =
        Math.round((customsValue + duty) * hsItem.vatRate * 100) / 100;
      const totalPayable = Math.round((duty + vat) * 100) / 100;

      const origin: string = corridor.origin.includes("CN")
        ? "CN"
        : corridor.origin.includes("US")
          ? "US"
          : corridor.origin.includes("MX")
            ? "MX"
            : corridor.origin.includes("DE")
              ? "DE"
              : corridor.origin.includes("RU")
                ? "RU"
                : "SG";

      const isSanctionedOrigin = origin === "RU";
      const isDualUse = hsItem.isDualUse === 1;

      let channelStatus = "Green Channel";
      let riskScore = faker.number.int({ min: 5, max: 18 });
      const triggeredRules: string[] = [
        "EORI validation: Valid registered trader (ESB88492019)",
        `HS Code classification: ${hsItem.code} verified against TARIC 2026`,
      ];

      if (isSanctionedOrigin || isDualUse) {
        channelStatus = "Red Channel";
        riskScore = faker.number.int({ min: 75, max: 95 });
        if (isSanctionedOrigin) {
          triggeredRules.push(
            "Trade Sanctions Alert: Origin under restricted trade regime (RU)",
          );
        }
        if (isDualUse) {
          triggeredRules.push(
            "Dual-Use Commodity Alert: Dual-use optical/machinery requires authorization",
          );
        }
      } else if (customsValue > 60000 || status === "CUSTOMS") {
        channelStatus = "Orange Channel";
        riskScore = faker.number.int({ min: 35, max: 55 });
        triggeredRules.push(
          "Valuation & Documentary Audit: Commercial invoice inspection required",
        );
      }

      const blNumber = trackingNumber;
      const duaNumber = `26ES000811${faker.string.numeric(8)}`;

      const sampleDuaData = JSON.stringify({
        box1_declarationType: "IM4 - Importacion definitiva a libre practica",
        box2_exporter: `Global Export Logistics (${corridor.origin})`,
        box8_consignee: "Iberica Import Logistics SL (Barcelona, ES)",
        box14_declarant:
          "Atlas Logistics Customs Brokerage SL (EORI: ESB88492019)",
        box20_deliveryTerms: "CIF - Puerto de Destino",
        box22_currency: "EUR",
        box22_totalAmount: customsValue,
        box31_packages: `40 Pallets - ${hsItem.description}`,
        box33_hsCode: hsItem.code,
        box34_originCountry: origin,
        box36_preference: "100 - Arancel aduanero de terceros paises",
        box44_documents: [
          "N935 - Factura comercial definitiva",
          "N705 - Conocimiento de embarque (Bill of Lading)",
          "N714 - Lista de empaque (Packing List)",
        ],
        box46_customsValue: customsValue,
        box47_taxes: [
          {
            code: "A00",
            name: "Derechos de Aduana (Duty)",
            base: customsValue,
            rate: `${(hsItem.adValoremDuty * 100).toFixed(1)}%`,
            amount: duty,
          },
          {
            code: "B00",
            name: "IVA a la Importacion (VAT)",
            base: customsValue + duty,
            rate: `${(hsItem.vatRate * 100).toFixed(1)}%`,
            amount: vat,
          },
        ],
        box47_total: totalPayable,
        box54_placeDate: `Aduanas, ${new Date().toLocaleDateString("es-ES")}`,
      });

      await db.insert(schema.customsDeclarations).values({
        id: faker.string.uuid(),
        shipmentId: id,
        brokerId: faker.helpers.arrayElement(brokerIds),
        hsCodeId: hsId,
        blNumber,
        duaNumber,
        type: "Import",
        customsValue,
        dutiesAmount: duty,
        taxesAmount: vat,
        totalPayable,
        status: channelStatus,
        riskScore,
        riskFlags: JSON.stringify(triggeredRules),
        eoriNumber: "ESB" + faker.string.numeric(8),
        originCountry: origin,
        destinationCountry: "ES",
        duaData: sampleDuaData,
        aiRiskScore: riskScore,
        aiRiskFlag: triggeredRules.join(" | "),
      });
    }
  }

  console.log(
    `✅ Creados ${shipmentIds.length} envíos globales con contenedores, ruta geolocalizada AIS y aduanas.`,
  );

  return shipmentIds;
}
