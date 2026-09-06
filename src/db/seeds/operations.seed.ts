import { db } from "../index.js";
import * as schema from "../schema/index.js";
import { faker } from "@faker-js/faker";
import { sql } from "drizzle-orm";

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

  // 7. SHIPMENTS & CUSTOMS & CONTAINERS
  const shipmentIds = [];
  const incoterms = ["FOB", "CIF", "EXW", "DDP", "FAS"];
  for (let i = 0; i < 50; i++) {
    const id = faker.string.uuid();
    shipmentIds.push(id);
    const companyId = faker.helpers.arrayElement(companyIds);

    await db.insert(schema.shipments).values({
      id,
      status: faker.helpers.arrayElement([
        "PENDING",
        "IN_TRANSIT",
        "CUSTOMS",
        "DELIVERED",
      ]),
      incoterm: faker.helpers.arrayElement(incoterms),
      serviceType: faker.helpers.arrayElement(["FCL", "LCL"]),
      laneId: faker.helpers.arrayElement(laneIds),
      scheduleId: faker.helpers.arrayElement(scheduleIds),
      vesselName: "MV " + faker.person.lastName().toUpperCase(),
      voyageNumber: faker.string.alphanumeric(6).toUpperCase(),
      companyId,
      createdBy: faker.helpers.arrayElement(userIds),
    });

    // Containers
    for (let j = 0; j < faker.number.int({ min: 1, max: 5 }); j++) {
      const containerId = faker.string.uuid();
      await db.insert(schema.shipmentContainers).values({
        id: containerId,
        shipmentId: id,
        containerNumber: faker.string.alphanumeric(11).toUpperCase(),
        containerType: faker.helpers.arrayElement(["20DC", "40HC"]),
        sealNumber: faker.string.numeric(6),
        weight: faker.number.int({ min: 5000, max: 28000 }),
      });

      // Cargo Items (LCL Loadout) for the first container
      if (j === 0 && Math.random() > 0.5) {
        for (let k = 0; k < faker.number.int({ min: 3, max: 8 }); k++) {
          await db.insert(schema.cargoItems).values({
            id: faker.string.uuid(),
            shipmentId: id,
            containerId,
            label: `ORD-${faker.string.numeric(3)}`,
            color: faker.helpers.arrayElement([
              "#4ade80",
              "#f43f5e",
              "#60a5fa",
              "#fbbf24",
              "#a78bfa",
            ]),
            width: faker.number.float({
              min: 0.5,
              max: 1.5,
              fractionDigits: 1,
            }),
            height: faker.number.float({
              min: 0.5,
              max: 1.5,
              fractionDigits: 1,
            }),
            depth: faker.number.float({
              min: 0.5,
              max: 1.5,
              fractionDigits: 1,
            }),
            weight: faker.number.int({ min: 100, max: 2000 }),
            // Initial chaotic positions
            x: faker.number.float({ min: -1, max: 1, fractionDigits: 2 }),
            y: faker.number.float({ min: 0, max: 2, fractionDigits: 2 }),
            z: faker.number.float({ min: -5, max: 5, fractionDigits: 2 }),
          });
        }
      }
    }

    // Customs
    if (Math.random() > 0.4) {
      const hsId = faker.helpers.arrayElement(hsCodeIds);
      const hsItem = standardHsCodes.find((h) => h.id === hsId)!;
      const customsValue = faker.number.float({
        min: 5000,
        max: 85000,
        fractionDigits: 2,
      });
      const duty = Math.round(customsValue * hsItem.adValoremDuty * 100) / 100;
      const vat =
        Math.round((customsValue + duty) * hsItem.vatRate * 100) / 100;
      const totalPayable = Math.round((duty + vat) * 100) / 100;

      const origin = faker.helpers.arrayElement([
        "CN",
        "US",
        "VN",
        "TR",
        "IN",
        "RU",
      ]);
      const isSanctionedOrigin = origin === "RU";
      const isDualUse = hsItem.isDualUse === 1;

      let status = "Green Channel";
      let riskScore = faker.number.int({ min: 5, max: 18 });
      const triggeredRules: string[] = [
        "EORI validation: Valid registered trader (ESB88492019)",
        `HS Code classification: ${hsItem.code} verified against TARIC 2026`,
      ];

      if (isSanctionedOrigin || isDualUse) {
        status = "Red Channel";
        riskScore = faker.number.int({ min: 75, max: 95 });
        if (isSanctionedOrigin) {
          triggeredRules.push(
            "Trade Sanctions Alert: Origin under restricted trade regime (RU)",
          );
        }
        if (isDualUse) {
          triggeredRules.push(
            "Dual-Use Commodity Alert: Dual-use optical/machinery requires export/import authorization",
          );
        }
      } else if (customsValue > 50000) {
        status = "Orange Channel";
        riskScore = faker.number.int({ min: 35, max: 55 });
        triggeredRules.push(
          "Valuation Audit: High-value consignment requires physical commercial invoice verification",
        );
      }

      const blNumber = `BL-${faker.string.alphanumeric(8).toUpperCase()}`;
      const duaNumber = `26ES000811${faker.string.numeric(8)}`;

      const sampleDuaData = JSON.stringify({
        box1_declarationType: "IM4 - Importacion definitiva a libre practica",
        box2_exporter: "Global Freight Logistics Ltd (Shanghai, CN)",
        box8_consignee: "Iberica Import Logistics SL (Barcelona, ES)",
        box14_declarant:
          "Atlas Logistics Customs Brokerage SL (EORI: ESB88492019)",
        box20_deliveryTerms: "CIF - Puerto de Barcelona",
        box22_currency: "EUR",
        box22_totalAmount: customsValue,
        box31_packages: "40 Pallets - " + hsItem.description,
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
        box54_placeDate: `Barcelona, ${new Date().toLocaleDateString("es-ES")}`,
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
        status,
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
    `✅ Creados ${shipmentIds.length} envíos con sus contenedores y aduanas.`,
  );

  return shipmentIds;
}
