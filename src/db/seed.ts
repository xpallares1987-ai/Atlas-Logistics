import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { faker } from "@faker-js/faker";
import { sql } from "drizzle-orm";
import * as schema from "./schema/index.js";
import "dotenv/config";

import { client, db, databaseUrl } from "./index.js";

async function main() {
  console.log(
    `🌱 Comenzando la inyección masiva de datos realistas (Seed) en: ${databaseUrl}...`,
  );

  console.log(
    "⚙️ Creando Triggers e inyectando lógica avanzada (Sequences)...",
  );

  // Create Sequence generator Trigger
  await db.run(sql`DROP TRIGGER IF EXISTS trg_auto_invoice_sequence`);
  await db.run(sql`
    CREATE TRIGGER trg_auto_invoice_sequence
    AFTER INSERT ON invoices
    WHEN NEW.invoiceNumber IS NULL OR NEW.invoiceNumber = ''
    BEGIN
      INSERT INTO system_sequences (name, current_value, prefix)
      VALUES ('invoice_seq', 1, 'INV-')
      ON CONFLICT(name) DO UPDATE SET current_value = current_value + 1;
      
      UPDATE invoices
      SET invoiceNumber = (SELECT prefix || printf('%06d', current_value) FROM system_sequences WHERE name = 'invoice_seq')
      WHERE id = NEW.id;
    END;
  `);

  // Create Audit Trigger for Shipments
  await db.run(sql`DROP TRIGGER IF EXISTS trg_audit_shipment_status`);
  await db.run(sql`
    CREATE TRIGGER trg_audit_shipment_status
    AFTER UPDATE OF status ON shipments
    WHEN OLD.status != NEW.status
    BEGIN
      INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data)
      VALUES (
        'shipments',
        NEW.id,
        'STATUS_CHANGE',
        OLD.status,
        NEW.status
      );
    END;
  `);

  // 1. COMPANIES
  const companyIds = [];
  for (let i = 0; i < 5; i++) {
    const id = faker.string.uuid();
    companyIds.push(id);
    await db.insert(schema.companies).values({
      id,
      name: faker.company.name(),
      taxId: faker.finance.accountNumber(9),
      creditLimit: faker.number.int({ min: 10000, max: 1000000 }),
    });
  }
  console.log(`✅ Creadas ${companyIds.length} compañías.`);

  // 2. USERS & CONTACTS
  const userIds = ["admin_user_id"];
  await db
    .insert(schema.users)
    .values({
      id: "admin_user_id",
      companyId: companyIds[0],
      email: "admin@atlas.com",
      role: "ADMIN",
    })
    .onConflictDoNothing();

  for (const companyId of companyIds) {
    // Users
    for (let i = 0; i < 3; i++) {
      const id = faker.string.uuid();
      userIds.push(id);
      await db.insert(schema.users).values({
        id,
        companyId,
        email: faker.internet.email(),
        role: i === 0 ? "ADMIN" : "OPERATOR",
      });
    }

    // Contacts
    for (let i = 0; i < 2; i++) {
      await db.insert(schema.contacts).values({
        id: faker.string.uuid(),
        companyId,
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        email: faker.internet.email(),
        phone: faker.phone.number(),
      });
    }
  }
  console.log(`✅ Creados ${userIds.length} usuarios y contactos.`);

  // 3. LOCATIONS (Ports, Warehouses)
  const locationIds = [];
  const ports = [
    "Port of Shanghai",
    "Port of Singapore",
    "Port of Ningbo-Zhoushan",
    "Port of Shenzhen",
    "Port of Guangzhou",
    "Port of Busan",
    "Port of Qingdao",
    "Port of Hong Kong",
    "Port of Tianjin",
    "Port of Rotterdam",
    "Port of Jebel Ali",
    "Port of Antwerp",
    "Port of Klang",
    "Port of Xiamen",
    "Port of Kaohsiung",
    "Port of Los Angeles",
    "Port of Hamburg",
    "Port of Long Beach",
    "Port of New York/New Jersey",
    "Port of Valencia",
  ];
  for (const port of ports) {
    const id = faker.string.uuid();
    locationIds.push(id);
    await db.insert(schema.locations).values({
      id,
      name: port,
      type: "PORT",
      address: faker.location.streetAddress(),
      lat: faker.location.latitude(),
      lng: faker.location.longitude(),
    });
  }
  console.log(
    `✅ Creadas ${locationIds.length} ubicaciones (puertos principales).`,
  );

  // 4. LANES (Rutas)
  const laneIds = [];
  for (let i = 0; i < 20; i++) {
    const origin = faker.helpers.arrayElement(locationIds);
    let dest = faker.helpers.arrayElement(locationIds);
    while (dest === origin) dest = faker.helpers.arrayElement(locationIds);

    const id = faker.string.uuid();
    laneIds.push(id);
    await db.insert(schema.lanes).values({
      id,
      originLocationId: origin,
      destinationLocationId: dest,
      distance: faker.number.int({ min: 1000, max: 15000 }),
    });
  }
  console.log(`✅ Creadas ${laneIds.length} rutas (lanes).`);

  // 5. CARRIERS & OTHER AGENTS
  const carrierIds = [];
  const oceanCarriers = [
    "Maersk",
    "MSC",
    "CMA CGM",
    "COSCO",
    "Hapag-Lloyd",
    "ONE",
    "Evergreen",
    "HMM",
    "Yang Ming",
    "ZIM",
  ];
  for (const name of oceanCarriers) {
    const id = faker.string.uuid();
    carrierIds.push(id);
    await db.insert(schema.carriers).values({
      id,
      name,
      scac: name.substring(0, 4).toUpperCase(),
      type: "OCEAN",
    });
  }

  const brokerIds = [];
  for (let i = 0; i < 5; i++) {
    const id = faker.string.uuid();
    brokerIds.push(id);
    await db.insert(schema.customsBrokers).values({
      id,
      name: faker.company.name() + " Customs",
      licenseNumber: faker.string.alphanumeric(8).toUpperCase(),
    });
  }

  // 5.1 HS CODES & TRADE SANCTIONS
  const standardHsCodes = [
    {
      id: "hs_85044090",
      code: "8504.40.90.90",
      description: "Static converters and switching power supply units",
      chapter: "85 - Electrical Machinery",
      adValoremDuty: 0.033,
      specificDutyPerKg: 0,
      vatRate: 0.21,
      isDualUse: 0,
    },
    {
      id: "hs_84713000",
      code: "8471.30.00.00",
      description:
        "Portable automatic data processing machines (laptops, tablets)",
      chapter: "84 - Nuclear Reactors, Boilers, Machinery",
      adValoremDuty: 0.0,
      specificDutyPerKg: 0,
      vatRate: 0.21,
      isDualUse: 0,
    },
    {
      id: "hs_61091000",
      code: "6109.10.00.10",
      description:
        "T-shirts, singlets and other vests, knitted or crocheted, of cotton",
      chapter: "61 - Articles of Apparel and Clothing, Knitted",
      adValoremDuty: 0.12,
      specificDutyPerKg: 0,
      vatRate: 0.21,
      isDualUse: 0,
    },
    {
      id: "hs_87082990",
      code: "8708.29.90.00",
      description:
        "Parts and accessories of the motor vehicles bodies (bumpers, trims)",
      chapter: "87 - Vehicles Other than Railway or Tramway",
      adValoremDuty: 0.045,
      specificDutyPerKg: 0,
      vatRate: 0.21,
      isDualUse: 0,
    },
    {
      id: "hs_22042106",
      code: "2204.21.06.00",
      description:
        "Wine of fresh grapes in containers holding 2L or less (Rioja/DOCa)",
      chapter: "22 - Beverages, Spirits and Vinegar",
      adValoremDuty: 0.0,
      specificDutyPerKg: 0.131,
      vatRate: 0.21,
      isDualUse: 0,
    },
    {
      id: "hs_90138000",
      code: "9013.80.00.00",
      description:
        "Liquid crystal devices, lasers and other optical appliances (Dual-Use)",
      chapter: "90 - Optical, Photographic, Measuring, Precision Instruments",
      adValoremDuty: 0.04,
      specificDutyPerKg: 0,
      vatRate: 0.21,
      isDualUse: 1,
    },
    {
      id: "hs_30049000",
      code: "3004.90.00.00",
      description:
        "Medicaments consisting of mixed or unmixed products for retail sale",
      chapter: "30 - Pharmaceutical Products",
      adValoremDuty: 0.0,
      specificDutyPerKg: 0,
      vatRate: 0.04,
      isDualUse: 0,
    },
    {
      id: "hs_04069001",
      code: "0406.90.01.00",
      description:
        "Cheese and curd, aged specialty varieties (Manchego, Gouda)",
      chapter: "04 - Dairy Produce, Birds Eggs, Natural Honey",
      adValoremDuty: 0.0,
      specificDutyPerKg: 0.188,
      vatRate: 0.1,
      isDualUse: 0,
    },
  ];

  const hsCodeIds: string[] = [];
  for (const hs of standardHsCodes) {
    hsCodeIds.push(hs.id);
    await db.insert(schema.hsCodes).values(hs).onConflictDoNothing();
  }

  const sanctions = [
    {
      id: "sanc_kp",
      countryCode: "KP",
      countryName: "North Korea",
      sanctionType: "EMBARGO",
      description: "Comprehensive trade embargo under UN and EU sanctions",
    },
    {
      id: "sanc_ir",
      countryCode: "IR",
      countryName: "Iran",
      sanctionType: "RESTRICTED",
      description:
        "Targeted sanctions on proliferation-sensitive nuclear activities",
    },
    {
      id: "sanc_sy",
      countryCode: "SY",
      countryName: "Syria",
      sanctionType: "EMBARGO",
      description: "EU restrictive measures in view of the situation in Syria",
    },
    {
      id: "sanc_ru",
      countryCode: "RU",
      countryName: "Russian Federation",
      sanctionType: "RESTRICTED",
      description:
        "Sectoral sanctions on dual-use technology, advanced electronics, and maritime goods",
    },
    {
      id: "sanc_cu",
      countryCode: "CU",
      countryName: "Cuba",
      sanctionType: "RESTRICTED",
      description: "Financial and commercial transaction scrutiny",
    },
  ];
  for (const s of sanctions) {
    await db.insert(schema.tradeSanctions).values(s).onConflictDoNothing();
  }
  console.log(
    `✅ Creados ${hsCodeIds.length} códigos arancelarios TARIC y ${sanctions.length} sanciones comerciales.`,
  );

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

  // 8. INVOICES
  for (const shipmentId of shipmentIds) {
    if (Math.random() > 0.2) {
      const invoiceId = faker.string.uuid();
      const amount = faker.number.int({ min: 1000, max: 15000 });
      await db.insert(schema.invoices).values({
        id: invoiceId,
        invoiceNumber: "INV-" + faker.string.numeric(6),
        shipmentId,
        companyId: faker.helpers.arrayElement(companyIds),
        amount,
        currency: "USD",
        status: faker.helpers.arrayElement([
          "ISSUED",
          "PARTIAL",
          "PAID",
          "OVERDUE",
        ]),
        dueDate: faker.date.future(),
      });

      // Invoice Items
      await db.insert(schema.invoiceItems).values({
        id: faker.string.uuid(),
        invoiceId,
        description: "Ocean Freight",
        quantity: 1,
        unitPrice: amount * 0.8,
        total: amount * 0.8,
      });
      await db.insert(schema.invoiceItems).values({
        id: faker.string.uuid(),
        invoiceId,
        description: "Bunker Adjustment Factor (BAF)",
        quantity: 1,
        unitPrice: amount * 0.2,
        total: amount * 0.2,
      });
    }
  }
  console.log(`✅ Creadas facturas financieras y conceptos.`);

  // 9. BPMN DIAGRAMS
  const diagramIds = [];
  for (let i = 0; i < 3; i++) {
    const id = faker.string.uuid();
    diagramIds.push(id);
    await db.insert(schema.bpmnDiagrams).values({
      id,
      name: `Proceso ${faker.commerce.department()} - ${faker.string.alphanumeric(4).toUpperCase()}`,
      description: faker.lorem.sentence(),
    });

    for (let j = 1; j <= 3; j++) {
      await db.insert(schema.bpmnVersions).values({
        id: faker.string.uuid(),
        diagramId: id,
        versionNumber: j,
        xmlContent: `<?xml version="1.0" encoding="UTF-8"?><bpmn:definitions id="Definitions_${faker.string.alphanumeric(4)}"></bpmn:definitions>`,
        authorId: faker.helpers.arrayElement(userIds),
      });
    }
  }
  console.log(
    `✅ Creados ${diagramIds.length} diagramas BPMN con historial de versiones.`,
  );

  // 10. TASKS (Human Tasklist)
  const taskIds = [];
  const taskNames = [
    "Aprobar Despacho Aduanero",
    "Revisión de BAF Anómalo",
    "Liberar BL Marítimo",
    "Confirmar VGM",
    "Verificar Inspección de Sanidad",
    "Conciliar Factura de Naviera",
    "Autorizar Crédito Adicional",
  ];
  for (let i = 0; i < 15; i++) {
    const id = `tsk-${faker.string.numeric(5)}`;
    taskIds.push(id);
    await db
      .insert(schema.tasks)
      .values({
        id,
        title: faker.helpers.arrayElement(taskNames),
        description: faker.lorem.sentence(),
        assignedTo: faker.helpers.arrayElement(userIds),
        status: faker.helpers.arrayElement(["TODO", "IN_PROGRESS", "DONE"]),
        dueDate: faker.date.soon({ days: 10 }),
        shipmentId: faker.helpers.arrayElement(shipmentIds),
      })
      .onConflictDoNothing();
  }
  console.log(`✅ Creadas ${taskIds.length} tareas manuales (Human Tasklist).`);

  // 11. AGENT SETTLEMENTS
  const { agentSettlements } = schema;
  for (let i = 0; i < companyIds.length; i++) {
    await db
      .insert(agentSettlements)
      .values({
        id: faker.string.uuid(),
        statementNumber:
          "STMT-" +
          faker.string.alphanumeric(6).toUpperCase() +
          "-" +
          i.toString().padStart(3, "0"),
        agentId: companyIds[i],
        periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        periodEnd: new Date(),
        netBalance: (i + 1) * 15000,
        currency: "USD",
        status: i === 0 ? "Pending" : "Paid",
      })
      .onConflictDoNothing();
  }
  console.log(
    `✅ Creados ${companyIds.length} settlements de agentes (Agent Settlements).`,
  );

  // 12. BOOKINGS
  const bookingIds = [];
  for (let i = 0; i < 25; i++) {
    const id = faker.string.uuid();
    bookingIds.push(id);
    await db.insert(schema.bookings).values({
      id,
      customerId: faker.helpers.arrayElement(companyIds),
      status: faker.helpers.arrayElement([
        "Pending",
        "Confirmed",
        "Rejected",
        "Cancelled",
      ]),
      origin: faker.helpers.arrayElement([
        "Shanghai",
        "Ningbo",
        "Shenzhen",
        "Rotterdam",
        "Los Angeles",
      ]),
      destination: faker.helpers.arrayElement([
        "Rotterdam",
        "Los Angeles",
        "New York",
        "Hamburg",
        "Valencia",
      ]),
      serviceType: faker.helpers.arrayElement(["FCL", "LCL", "AIR"]),
      cargoDetails: JSON.stringify({
        description: faker.commerce.productDescription(),
        weight: faker.number.int({ min: 100, max: 20000 }),
      }),
      estimatedDeparture: faker.date.future(),
    });
  }
  console.log(`✅ Creadas ${bookingIds.length} bookings de clientes.`);

  // 13. WAREHOUSE ORDERS & FULFILLMENT TASKS
  const taskStatuses = ["PICK", "PACK", "DISPATCH", "COMPLETED"];
  const priorities = ["LOW", "NORMAL", "HIGH", "URGENT"];
  for (let i = 0; i < 12; i++) {
    const orderId = `ord_${faker.string.uuid().substring(0, 8)}`;
    const customerName = faker.company.name();
    await db.insert(schema.orders).values({
      id: orderId,
      customerName,
      status: i < 4 ? "PENDING" : i < 8 ? "PROCESSING" : "COMPLETED",
      totalAmount: faker.number.float({
        min: 500,
        max: 15000,
        fractionDigits: 2,
      }),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.insert(schema.fulfillmentTasks).values({
      id: `task_${faker.string.uuid().substring(0, 8)}`,
      orderId,
      status: taskStatuses[i % taskStatuses.length],
      priority: priorities[i % priorities.length],
      assignedTo:
        userIds.length > 0 ? faker.helpers.arrayElement(userIds) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  console.log("✅ Creadas órdenes y tareas de fulfillment para almacén.");

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

  // 15. INCOTERMS® 2020 RULES & COMMERCIAL FREIGHT CONTRACTS
  const incotermData = [
    {
      code: "EXW",
      name: "Ex Works / En Fábrica",
      transportCategory: "ANY_MODE",
      riskTransferPoint:
        "En las instalaciones del vendedor (fábrica/almacén) antes de la carga.",
      costTransferPoint: "En las instalaciones del vendedor antes de la carga.",
      insuranceRequirement: "NONE",
      sellerResponsibilities: ["PACKAGING"],
      buyerResponsibilities: [
        "LOADING_ORIGIN",
        "PRE_CARRIAGE",
        "EXPORT_CUSTOMS",
        "ORIGIN_TERMINAL",
        "MAIN_CARRIAGE",
        "INSURANCE",
        "DEST_TERMINAL",
        "IMPORT_CUSTOMS",
        "ON_CARRIAGE",
        "UNLOADING_DEST",
      ],
      customsExportBy: "BUYER",
      customsImportBy: "BUYER",
      description:
        "Obligación mínima del vendedor. El comprador asume todos los costes, riesgos de carga, trámites de exportación, flete e importación.",
    },
    {
      code: "FCA",
      name: "Free Carrier / Franco Porteador",
      transportCategory: "ANY_MODE",
      riskTransferPoint:
        "Al entregar la mercancía al transportista designado por el comprador.",
      costTransferPoint:
        "Al entregar la mercancía al transportista designado (despachada de exportación).",
      insuranceRequirement: "NONE",
      sellerResponsibilities: ["PACKAGING", "LOADING_ORIGIN", "EXPORT_CUSTOMS"],
      buyerResponsibilities: [
        "PRE_CARRIAGE",
        "ORIGIN_TERMINAL",
        "MAIN_CARRIAGE",
        "INSURANCE",
        "DEST_TERMINAL",
        "IMPORT_CUSTOMS",
        "ON_CARRIAGE",
        "UNLOADING_DEST",
      ],
      customsExportBy: "SELLER",
      customsImportBy: "BUYER",
      description:
        "El vendedor carga la mercancía en el transporte del comprador o la entrega en terminal despachada de exportación. Regla predilecta para contenedores multimodal.",
    },
    {
      code: "CPT",
      name: "Carriage Paid To / Transporte Pagado Hasta",
      transportCategory: "ANY_MODE",
      riskTransferPoint:
        "Al entregar la mercancía al primer porteador en origen.",
      costTransferPoint:
        "En el lugar de destino convenido (flete principal pagado por el vendedor).",
      insuranceRequirement: "NONE",
      sellerResponsibilities: [
        "PACKAGING",
        "LOADING_ORIGIN",
        "PRE_CARRIAGE",
        "EXPORT_CUSTOMS",
        "ORIGIN_TERMINAL",
        "MAIN_CARRIAGE",
      ],
      buyerResponsibilities: [
        "INSURANCE",
        "DEST_TERMINAL",
        "IMPORT_CUSTOMS",
        "ON_CARRIAGE",
        "UNLOADING_DEST",
      ],
      customsExportBy: "SELLER",
      customsImportBy: "BUYER",
      description:
        "El vendedor contrata y paga el flete hasta destino, pero el riesgo se transfiere al comprador en el momento de entrega al primer transportista.",
    },
    {
      code: "CIP",
      name: "Carriage and Insurance Paid to / Transporte y Seguro Pagados Hasta",
      transportCategory: "ANY_MODE",
      riskTransferPoint:
        "Al entregar la mercancía al primer porteador en origen.",
      costTransferPoint:
        "En el lugar de destino convenido (flete + seguro All Risks pagados por el vendedor).",
      insuranceRequirement: "MANDATORY_CLAUSE_A",
      sellerResponsibilities: [
        "PACKAGING",
        "LOADING_ORIGIN",
        "PRE_CARRIAGE",
        "EXPORT_CUSTOMS",
        "ORIGIN_TERMINAL",
        "MAIN_CARRIAGE",
        "INSURANCE",
      ],
      buyerResponsibilities: [
        "DEST_TERMINAL",
        "IMPORT_CUSTOMS",
        "ON_CARRIAGE",
        "UNLOADING_DEST",
      ],
      customsExportBy: "SELLER",
      customsImportBy: "BUYER",
      description:
        "Similar a CPT pero el vendedor está obligado a contratar cobertura de seguro máxima Institute Cargo Clauses (A) por un mínimo del 110% del valor contractual.",
    },
    {
      code: "DAP",
      name: "Delivered at Place / Entregado en Lugar",
      transportCategory: "ANY_MODE",
      riskTransferPoint:
        "En el lugar de destino convenido, sobre el medio de transporte listo para ser descargado.",
      costTransferPoint: "En el lugar de destino convenido (sin descargar).",
      insuranceRequirement: "NONE",
      sellerResponsibilities: [
        "PACKAGING",
        "LOADING_ORIGIN",
        "PRE_CARRIAGE",
        "EXPORT_CUSTOMS",
        "ORIGIN_TERMINAL",
        "MAIN_CARRIAGE",
        "DEST_TERMINAL",
        "ON_CARRIAGE",
      ],
      buyerResponsibilities: ["IMPORT_CUSTOMS", "UNLOADING_DEST"],
      customsExportBy: "SELLER",
      customsImportBy: "BUYER",
      description:
        "El vendedor asume todos los costes y riesgos hasta poner la mercancía a disposición del comprador en destino, sin descargar. El comprador realiza el despacho de importación.",
    },
    {
      code: "DPU",
      name: "Delivered at Place Unloaded / Entregado en Lugar Descargado",
      transportCategory: "ANY_MODE",
      riskTransferPoint:
        "En el lugar/terminal de destino convenido, una vez descargada la mercancía.",
      costTransferPoint:
        "En el lugar/terminal de destino convenido, tras la descarga.",
      insuranceRequirement: "NONE",
      sellerResponsibilities: [
        "PACKAGING",
        "LOADING_ORIGIN",
        "PRE_CARRIAGE",
        "EXPORT_CUSTOMS",
        "ORIGIN_TERMINAL",
        "MAIN_CARRIAGE",
        "DEST_TERMINAL",
        "ON_CARRIAGE",
        "UNLOADING_DEST",
      ],
      buyerResponsibilities: ["IMPORT_CUSTOMS"],
      customsExportBy: "SELLER",
      customsImportBy: "BUYER",
      description:
        "Única regla Incoterms donde el vendedor asume la obligación y el riesgo de descargar la mercancía en destino.",
    },
    {
      code: "DDP",
      name: "Delivered Duty Paid / Entregado Derechos Pagados",
      transportCategory: "ANY_MODE",
      riskTransferPoint:
        "En las instalaciones del comprador despachada para la importación y lista para descargar.",
      costTransferPoint:
        "En las instalaciones del comprador con aranceles e impuestos pagados.",
      insuranceRequirement: "NONE",
      sellerResponsibilities: [
        "PACKAGING",
        "LOADING_ORIGIN",
        "PRE_CARRIAGE",
        "EXPORT_CUSTOMS",
        "ORIGIN_TERMINAL",
        "MAIN_CARRIAGE",
        "DEST_TERMINAL",
        "IMPORT_CUSTOMS",
        "ON_CARRIAGE",
      ],
      buyerResponsibilities: ["UNLOADING_DEST"],
      customsExportBy: "SELLER",
      customsImportBy: "SELLER",
      description:
        "Máxima obligación del vendedor. Asume todos los fletes, seguro, despacho de importación, pago de aranceles (TARIC) e IVA de importación.",
    },
    {
      code: "FAS",
      name: "Free Alongside Ship / Franco al Costado del Buque",
      transportCategory: "MARITIME_ONLY",
      riskTransferPoint:
        "Al costado del buque (ej. en el muelle o en barcaza) en el puerto de embarque designado.",
      costTransferPoint:
        "Al costado del buque en el puerto de embarque designado.",
      insuranceRequirement: "NONE",
      sellerResponsibilities: [
        "PACKAGING",
        "LOADING_ORIGIN",
        "PRE_CARRIAGE",
        "EXPORT_CUSTOMS",
      ],
      buyerResponsibilities: [
        "ORIGIN_TERMINAL",
        "MAIN_CARRIAGE",
        "INSURANCE",
        "DEST_TERMINAL",
        "IMPORT_CUSTOMS",
        "ON_CARRIAGE",
        "UNLOADING_DEST",
      ],
      customsExportBy: "SELLER",
      customsImportBy: "BUYER",
      description:
        "Uso exclusivo marítimo para carga a granel o no contenedorizada. La entrega se realiza al situar la carga junto al buque.",
    },
    {
      code: "FOB",
      name: "Free on Board / Franco a Bordo",
      transportCategory: "MARITIME_ONLY",
      riskTransferPoint:
        "A bordo del buque en el puerto de embarque designado.",
      costTransferPoint:
        "A bordo del buque en el puerto de embarque designado.",
      insuranceRequirement: "NONE",
      sellerResponsibilities: [
        "PACKAGING",
        "LOADING_ORIGIN",
        "PRE_CARRIAGE",
        "EXPORT_CUSTOMS",
        "ORIGIN_TERMINAL",
      ],
      buyerResponsibilities: [
        "MAIN_CARRIAGE",
        "INSURANCE",
        "DEST_TERMINAL",
        "IMPORT_CUSTOMS",
        "ON_CARRIAGE",
        "UNLOADING_DEST",
      ],
      customsExportBy: "SELLER",
      customsImportBy: "BUYER",
      description:
        "Clásica regla marítima. El vendedor entrega cuando la mercancía está estibada a bordo del buque. Para contenedores la ICC recomienda FCA.",
    },
    {
      code: "CFR",
      name: "Cost and Freight / Coste y Flete",
      transportCategory: "MARITIME_ONLY",
      riskTransferPoint:
        "A bordo del buque en el puerto de embarque en origen.",
      costTransferPoint:
        "En el puerto de destino convenido (flete marítimo pagado por el vendedor).",
      insuranceRequirement: "NONE",
      sellerResponsibilities: [
        "PACKAGING",
        "LOADING_ORIGIN",
        "PRE_CARRIAGE",
        "EXPORT_CUSTOMS",
        "ORIGIN_TERMINAL",
        "MAIN_CARRIAGE",
      ],
      buyerResponsibilities: [
        "INSURANCE",
        "DEST_TERMINAL",
        "IMPORT_CUSTOMS",
        "ON_CARRIAGE",
        "UNLOADING_DEST",
      ],
      customsExportBy: "SELLER",
      customsImportBy: "BUYER",
      description:
        "El vendedor asume el coste del flete marítimo hasta destino, pero el riesgo se transfiere al comprador en cuanto la carga cruza la borda en origen.",
    },
    {
      code: "CIF",
      name: "Cost, Insurance and Freight / Coste, Seguro y Flete",
      transportCategory: "MARITIME_ONLY",
      riskTransferPoint:
        "A bordo del buque en el puerto de embarque en origen.",
      costTransferPoint:
        "En el puerto de destino convenido (flete + seguro marítimo básico pagados por el vendedor).",
      insuranceRequirement: "MANDATORY_CLAUSE_C",
      sellerResponsibilities: [
        "PACKAGING",
        "LOADING_ORIGIN",
        "PRE_CARRIAGE",
        "EXPORT_CUSTOMS",
        "ORIGIN_TERMINAL",
        "MAIN_CARRIAGE",
        "INSURANCE",
      ],
      buyerResponsibilities: [
        "DEST_TERMINAL",
        "IMPORT_CUSTOMS",
        "ON_CARRIAGE",
        "UNLOADING_DEST",
      ],
      customsExportBy: "SELLER",
      customsImportBy: "BUYER",
      description:
        "El vendedor paga el flete marítimo y un seguro con cobertura mínima Institute Cargo Clauses (C). Riesgo transferido a bordo en origen.",
    },
  ];

  for (const rule of incotermData) {
    await db.insert(schema.incotermRules).values(rule).onConflictDoNothing();
  }
  console.log(
    `✅ Creadas ${incotermData.length} reglas oficiales ICC Incoterms® 2020.`,
  );

  // Sample Commercial Freight Contracts
  const contract1Id = "ctr_2026_cip_8819";
  await db
    .insert(schema.commercialContracts)
    .values({
      id: contract1Id,
      contractNumber: "CTR-2026-CIP-8819",
      title: "Suministro Internacional de Vacunas y Reactivos Clínicos",
      sellerCompanyId: "comp_biopharma_madrid",
      buyerCompanyId: "comp_medtech_germany",
      sellerData: {
        name: "BioPharma Laboratories Europe SA",
        taxId: "ESA88291039",
        address: "Parque Tecnológico de Madrid, 28760 Tres Cantos, Madrid",
        country: "ES",
        contact: "Dr. Elena Ramos (+34 91 804 5500)",
      },
      buyerData: {
        name: "MedTech Deutschland GmbH",
        taxId: "DE814920192",
        address: "Westhafen Tower, Speicherstraße 55, 60327 Frankfurt am Main",
        country: "DE",
        contact: "Klaus Weber (+49 69 900 1200)",
      },
      forwarderData: {
        name: "Atlas Logistics Global Forwarding SL",
        eori: "ESB88492019",
        iataCode: "78-4-7291/0014",
      },
      incotermCode: "CIP",
      namedPlace:
        "Frankfurt am Main Airport Cargo City South, Germany Incoterms® 2020",
      transportMode: "AIR",
      currency: "EUR",
      goodsValue: 185000.0,
      freightEstimatedCost: 4200.0,
      insuranceEstimatedCost: 407.0,
      customsEstimatedDuty: 0.0, // Intracommunity EUR.1
      effectiveDate: new Date(),
      expiryDate: new Date(Date.now() + 86400000 * 365),
      status: "ACTIVE",
      governingLaw: "ICC Model Commercial Contract / Spanish Commercial Code",
      disputeJurisdiction: "Cámara Oficial de Comercio e Industria de Madrid",
      milestonesData: [
        {
          id: "M1",
          stage: "PACKAGING",
          name: "Embalaje y Validación Térmica TCR",
          status: "COMPLETED",
          date: new Date(Date.now() - 86400000 * 2),
        },
        {
          id: "M2",
          stage: "CARRIER_HANDOVER",
          name: "Entrega al Primer Porteador (Transferencia de Riesgo)",
          status: "COMPLETED",
          date: new Date(Date.now() - 86400000 * 1),
        },
        {
          id: "M3",
          stage: "MAIN_FREIGHT",
          name: "Tránsito Aéreo MAD ✈ FRA",
          status: "IN_PROGRESS",
          date: new Date(),
        },
        {
          id: "M4",
          stage: "DEST_DELIVERY",
          name: "Puesta a Disposición en Frankfurt Airport",
          status: "PENDING",
          date: new Date(Date.now() + 86400000 * 1),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  const contract2Id = "ctr_2026_fob_9921";
  await db
    .insert(schema.commercialContracts)
    .values({
      id: contract2Id,
      contractNumber: "CTR-2026-FOB-9921",
      title: "Exportación Marítima de Porcelánico y Cerámica Arquitectónica",
      sellerCompanyId: "comp_ceramica_valencia",
      buyerCompanyId: "comp_florida_deco",
      sellerData: {
        name: "Cerámica Levantina Export SL",
        taxId: "ESB12894012",
        address: "Polígono Industrial Mijares, 12550 Almassora, Castellón",
        country: "ES",
        contact: "Vicente Beltrán (+34 964 50 1100)",
      },
      buyerData: {
        name: "Florida Deco Architectural Supply LLC",
        taxId: "US593820199",
        address: "2400 NW 110th Ave, Doral, FL 33172",
        country: "US",
        contact: "Michael Vance (+1 305 440 2200)",
      },
      forwarderData: {
        name: "Atlas Logistics Global Forwarding SL",
        eori: "ESB88492019",
      },
      incotermCode: "FOB",
      namedPlace: "Port of Valencia, Spain Incoterms® 2020",
      transportMode: "OCEAN",
      currency: "EUR",
      goodsValue: 64500.0,
      freightEstimatedCost: 2850.0,
      insuranceEstimatedCost: 145.0,
      customsEstimatedDuty: 2128.5,
      effectiveDate: new Date(),
      expiryDate: new Date(Date.now() + 86400000 * 180),
      status: "ACTIVE",
      governingLaw: "ICC Incoterms® 2020 / Maritime Arbitration Tribunal",
      disputeJurisdiction: "Valencia International Maritime Arbitration",
      milestonesData: [
        {
          id: "M1",
          stage: "PRE_CARRIAGE",
          name: "Transporte Terrestre Almassora ➔ Valencia",
          status: "COMPLETED",
          date: new Date(Date.now() - 86400000 * 3),
        },
        {
          id: "M2",
          stage: "EXPORT_CUSTOMS",
          name: "Despacho Aduanero Exportación (Canal Verde)",
          status: "COMPLETED",
          date: new Date(Date.now() - 86400000 * 2),
        },
        {
          id: "M3",
          stage: "ON_BOARD",
          name: "Estiba a Bordo del Buque (Transferencia de Riesgo)",
          status: "COMPLETED",
          date: new Date(Date.now() - 86400000 * 1),
        },
        {
          id: "M4",
          stage: "OCEAN_TRANSIT",
          name: "Travesía Transatlántica VLC ➔ MIA",
          status: "IN_PROGRESS",
          date: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  const contract3Id = "ctr_2026_ddp_1042";
  await db
    .insert(schema.commercialContracts)
    .values({
      id: contract3Id,
      contractNumber: "CTR-2026-DDP-1042",
      title: "Distribución DDP Dispositivos Electrónicos y Sensores IoT",
      sellerCompanyId: "comp_iberica_smart",
      buyerCompanyId: "comp_techworld_us",
      sellerData: {
        name: "Iberica Smart Devices SL",
        taxId: "ESB87219044",
        address: "Calle Alcalá 450, 28027 Madrid",
        country: "ES",
        contact: "Marcos Soria (+34 91 320 8800)",
      },
      buyerData: {
        name: "TechWorld Retail US Corp",
        taxId: "US138920114",
        address: "100 5th Avenue, New York, NY 10011",
        country: "US",
        contact: "Sarah Jenkins (+1 212 900 4400)",
      },
      forwarderData: {
        name: "Atlas Logistics Global Forwarding SL",
        eori: "ESB88492019",
      },
      incotermCode: "DDP",
      namedPlace: "100 5th Avenue, New York, NY 10011, US Incoterms® 2020",
      transportMode: "MULTIMODAL",
      currency: "EUR",
      goodsValue: 120000.0,
      freightEstimatedCost: 3800.0,
      insuranceEstimatedCost: 264.0,
      customsEstimatedDuty: 3960.0,
      effectiveDate: new Date(),
      expiryDate: new Date(Date.now() + 86400000 * 90),
      status: "ACTIVE",
      governingLaw: "ICC Commercial Model / New York State Commercial Code",
      disputeJurisdiction: "American Arbitration Association (AAA) New York",
      milestonesData: [
        {
          id: "M1",
          stage: "AIR_FREIGHT",
          name: "Vuelo de Carga MAD ✈ JFK",
          status: "COMPLETED",
          date: new Date(Date.now() - 86400000 * 1),
        },
        {
          id: "M2",
          stage: "IMPORT_CUSTOMS",
          name: "Despacho de Importación US Customs y Pago Arancelario DDP",
          status: "IN_PROGRESS",
          date: new Date(),
        },
        {
          id: "M3",
          stage: "FINAL_DELIVERY",
          name: "Entrega Final y Descarga en Almacén NYC (Transferencia de Riesgo)",
          status: "PENDING",
          date: new Date(Date.now() + 86400000 * 1),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  console.log(
    "✅ Creados Contratos Comerciales y matrices de riesgo Incoterms® 2020.",
  );

  // 16. FREIGHT CARGO CLAIMS & INSURANCE SUBROGATION LEDGER
  const claim1Id = "clm_2026_hv_0041";
  await db
    .insert(schema.cargoClaims)
    .values({
      id: claim1Id,
      claimNumber: "CLM-2026-HV-0041",
      shipmentId: "shipment_valencia_miami_01",
      transportDocNumber: "MSCU-VLC-982104",
      transportMode: "OCEAN",
      governingConvention: "HAGUE_VISBY",
      incidentType: "WATER_DAMAGE",
      incidentDate: new Date(Date.now() - 86400000 * 14),
      noticeDate: new Date(Date.now() - 86400000 * 12),
      deliveryDate: new Date(Date.now() - 86400000 * 13),
      claimantName: "Florida Deco Architectural Supply LLC",
      carrierName: "Mediterranean Shipping Company (MSC)",
      packagesDamaged: 4,
      damagedWeightKg: 3200.0,
      claimedAmount: 24500.0,
      claimedCurrency: "EUR",
      statutorySdrRate: 2.0,
      statutoryLimitEur: 7968.0, // 3,200 kg * 2.00 SDR * 1.245 EUR/SDR = 7,968.00 €
      insuranceInsuredValue: 27000.0,
      insurancePolicyDeductible: 500.0,
      insurancePayoutAmount: 24000.0, // 24,500 claimed - 500 deductible
      subrogationRecoveredAmount: 7968.0, // Full statutory carrier cap recovered
      status: "RECOVERED",
      protestIssued: true,
      subrogationSigned: true,
      incidentDescription:
        "Entrada de agua de mar en contenedor 40' HC por fallo en la junta de estanqueidad de las puertas. Daño por humedad y salinidad en 4 pallets de porcelánico esmaltado.",
      surveyorData: {
        surveyorName: "Bureau Veritas Marine Cargo Surveys",
        reportNumber: "BV-MIA-2026-8819",
        inspectionDate: new Date(Date.now() - 86400000 * 11),
        assessedDepreciationPct: 100,
        causeOfLoss:
          "Fallo en junta de goma de la puerta del contenedor durante temporal marítimo.",
      },
      recoveryNotes:
        "Indemnización de seguro abonada al asegurado por 24.000 €. Recobro subrogatorio de 7.968,00 € liquidado por la naviera MSC conforme al límite estatutario de 2 DEG/kg Reglas de La Haya-Visby.",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  const claim2Id = "clm_2026_mc_0082";
  await db
    .insert(schema.cargoClaims)
    .values({
      id: claim2Id,
      claimNumber: "CLM-2026-MC-0082",
      shipmentId: "shipment_air_pharma_02",
      transportDocNumber: "075-84920153",
      transportMode: "AIR",
      governingConvention: "MONTREAL_1999",
      incidentType: "TEMPERATURE_EXCURSION",
      incidentDate: new Date(Date.now() - 86400000 * 5),
      noticeDate: new Date(Date.now() - 86400000 * 4),
      deliveryDate: new Date(Date.now() - 86400000 * 4),
      claimantName: "BioPharma Laboratories Europe SA",
      carrierName: "Iberia Líneas Aéreas de España SA",
      packagesDamaged: 2,
      damagedWeightKg: 120.0,
      claimedAmount: 45000.0,
      claimedCurrency: "EUR",
      statutorySdrRate: 22.0,
      statutoryLimitEur: 3286.8, // 120 kg * 22.00 SDR * 1.245 EUR/SDR = 3,286.80 €
      insuranceInsuredValue: 50000.0,
      insurancePolicyDeductible: 1000.0,
      insurancePayoutAmount: 44000.0,
      subrogationRecoveredAmount: 0.0,
      status: "PROTEST_ISSUED",
      protestIssued: true,
      subrogationSigned: false,
      incidentDescription:
        "Ruptura de la cadena de frío en bodega de carga aérea durante el tránsito MAD-FRA. Registrador térmico TempTale registró +18°C durante 6 horas continuas (límite contractualmente fijado +2°C a +8°C).",
      surveyorData: {
        surveyorName: "SGS Life Science Cold Chain Inspectors",
        reportNumber: "SGS-FRA-44021",
        inspectionDate: new Date(Date.now() - 86400000 * 3),
        assessedDepreciationPct: 100,
        causeOfLoss:
          "Fallo de conexión eléctrica en el contenedor Envirotainer activo en plataforma aeroportuaria.",
      },
      recoveryNotes:
        "Carta de protesta formal emitida a Iberia Cargo dentro del plazo legal de 14 días (Art. 31 Convenio de Montreal). Expediente remitido a peritación de seguro para autorización de pago.",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  const claim3Id = "clm_2026_cmr_0119";
  await db
    .insert(schema.cargoClaims)
    .values({
      id: claim3Id,
      claimNumber: "CLM-2026-CMR-0119",
      shipmentId: "shipment_road_ftl_03",
      transportDocNumber: "CMR-ES-2026-99120",
      transportMode: "ROAD",
      governingConvention: "CMR",
      incidentType: "CRUSH_COLLAPSE",
      incidentDate: new Date(Date.now() - 86400000 * 8),
      noticeDate: new Date(Date.now() - 86400000 * 7),
      deliveryDate: new Date(Date.now() - 86400000 * 7),
      claimantName: "Iberica Smart Devices SL",
      carrierName: "Trans-Iberia International Roadways SL",
      packagesDamaged: 6,
      damagedWeightKg: 4200.0,
      claimedAmount: 38000.0,
      claimedCurrency: "EUR",
      statutorySdrRate: 8.33,
      statutoryLimitEur: 43557.57, // 4,200 kg * 8.33 SDR * 1.245 EUR/SDR = 43,557.57 € (Límite legal superior al valor reclamado)
      insuranceInsuredValue: 40000.0,
      insurancePolicyDeductible: 600.0,
      insurancePayoutAmount: 37400.0,
      subrogationRecoveredAmount: 37400.0,
      status: "SUBROGATED",
      protestIssued: true,
      subrogationSigned: true,
      incidentDescription:
        "Frenazo brusco y vuelco parcial de carga por amarre deficiente del semirremolque en ruta AP-7. Colapso estructural y aplastamiento de 6 pallets de componentes electrónicos.",
      surveyorData: {
        surveyorName: "DEKRA Transport & Cargo Claims",
        reportNumber: "DEKRA-BCN-9912",
        inspectionDate: new Date(Date.now() - 86400000 * 6),
        assessedDepreciationPct: 90,
        causeOfLoss:
          "Falta de cinchas de trincaje reglamentarias conforme a norma EN 12195-1.",
      },
      recoveryNotes:
        "Reclamación totalmente recuperable contra el transportista bajo el Convenio CMR (Límite 8,33 DEG/kg = 43.557,57 € > Daño 38.000 €). Finiquito y subrogación firmados.",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  console.log("✅ Creados Expedientes de Siniestros y Recobros Subrogatorios.");

  // 17. ROAD FREIGHT CONSIGNMENTS (e-CMR & CARTA DE PORTE)
  const consignment1Id = "road_cmr_mad_lyon_01";
  await db
    .insert(schema.roadConsignments)
    .values({
      id: consignment1Id,
      consignmentNumber: "CMR-2026-99210",
      shipmentId: "shipment_road_ftl_03",
      consignmentType: "INTERNATIONAL_CMR",
      status: "IN_TRANSIT",
      senderName: "Iberia Logistics Hub Coslada SA",
      senderAddress: "Avda. Central del Transporte 14, 28821 Coslada (Madrid)",
      senderCountry: "España (ES)",
      consigneeName: "Rhône-Alpes Distribution Centre SARL",
      consigneeAddress: "Rue de l'Aviation 44, 69125 Lyon-Saint Exupéry",
      consigneeCountry: "France (FR)",
      carrierName: "Trans-Iberia International Roadways SL",
      carrierVat: "ESA88192044",
      tractorPlate: "4829-LTM",
      trailerPlate: "R-9102-BCN",
      driverName: "Carlos Santana Ruiz",
      driverLicense: "ES-91028374-B",
      driverPhone: "+34 655 492 104",
      originCity: "Madrid (Coslada Hub)",
      destinationCity: "Lyon (Saint Exupéry)",
      totalDistanceKm: 1180.0,
      estimatedDrivingHours: 15.7,
      requiredRestBreaksCount: 3,
      pickupDate: new Date(Date.now() - 86400000 * 1),
      deliveryDate: new Date(Date.now() + 86400000 * 1),
      totalPallets: 30,
      palletCapacityMax: 33,
      totalGrossWeightKg: 19500.0,
      payloadCapacityMaxKg: 24000.0,
      trailerFloorUtilizationPct: 90.91,
      isAdrHazardous: false,
      adrTotalPoints: 0.0,
      adrExemption1136Applied: false,
      orangePlatesRequired: false,
      tunnelRestrictionCode: null,
      goodsDescription:
        "Dispositivos electrónicos de consumo y accesorios en 30 Euro-pallets flejados con film retráctil.",
      specialInstructions:
        "Tránsito internacional vía Jonquera. Control de precinto aduanero en destino. Respetar tacógrafo CE 561/2006.",
      cargoItemsData: [
        {
          itemNumber: 1,
          description: "Smart TVs & Monitores LED",
          packages: 12,
          grossWeightKg: 7800.0,
          isAdr: false,
        },
        {
          itemNumber: 2,
          description: "Equipos de Telecomunicaciones",
          packages: 18,
          grossWeightKg: 11700.0,
          isAdr: false,
        },
      ],
      routeStopsData: [
        {
          stopOrder: 1,
          type: "PICKUP",
          city: "Madrid Coslada",
          arrival: new Date(Date.now() - 86400000 * 1),
          status: "COMPLETED",
        },
        {
          stopOrder: 2,
          type: "REST_BREAK",
          city: "Zaragoza (AP-2)",
          arrival: new Date(Date.now() - 86400000 * 0.8),
          status: "COMPLETED",
        },
        {
          stopOrder: 3,
          type: "REST_BREAK",
          city: "Girona La Jonquera (AP-7)",
          arrival: new Date(Date.now() - 86400000 * 0.4),
          status: "COMPLETED",
        },
        {
          stopOrder: 4,
          type: "DELIVERY",
          city: "Lyon Saint-Exupéry",
          arrival: new Date(Date.now() + 86400000 * 1),
          status: "PENDING",
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  const consignment2Id = "road_cmr_adr_frankfurt_02";
  await db
    .insert(schema.roadConsignments)
    .values({
      id: consignment2Id,
      consignmentNumber: "CMR-2026-ADR-0418",
      shipmentId: null,
      consignmentType: "INTERNATIONAL_CMR",
      status: "DISPATCHED",
      senderName: "Química Industrial Catalana SA",
      senderAddress: "Polígono Químico Sur, Parcela 12, 43006 Tarragona",
      senderCountry: "España (ES)",
      consigneeName: "BASF Coatings & Polyurethane GmbH",
      consigneeAddress:
        "Carl-Bosch-Straße 38, 67056 Ludwigshafen (Frankfurt Area)",
      consigneeCountry: "Deutschland (DE)",
      carrierName: "EcoTankers Trans-European Logistics",
      carrierVat: "ESB99482012",
      tractorPlate: "3310-MWP",
      trailerPlate: "R-7741-TRG",
      driverName: "Alejandro Gómez Soler",
      driverLicense: "ES-ADR-992144",
      driverPhone: "+34 677 819 302",
      originCity: "Tarragona (Zona Química)",
      destinationCity: "Frankfurt / Ludwigshafen",
      totalDistanceKm: 1420.0,
      estimatedDrivingHours: 18.9,
      requiredRestBreaksCount: 4,
      pickupDate: new Date(),
      deliveryDate: new Date(Date.now() + 86400000 * 2),
      totalPallets: 18,
      palletCapacityMax: 33,
      totalGrossWeightKg: 9600.0,
      payloadCapacityMaxKg: 24000.0,
      trailerFloorUtilizationPct: 54.55,
      isAdrHazardous: true,
      adrTotalPoints: 9600.0, // 9,600 kg Cat 3 * 1 = 9,600 pts (> 1,000 pts)
      adrExemption1136Applied: false,
      orangePlatesRequired: true,
      tunnelRestrictionCode: "(D/E)",
      goodsDescription:
        "UN 1263 PINTURAS (inflamables, punto de inflamación 24°C), 3, GE III, (D/E). Mercancía Peligrosa ADR.",
      specialInstructions:
        "PLACAS NARANJA REGLAMENTARIAS OBLIGATORIAS. Prohibido paso por túneles categoría D y E. Conductor con carné ADR básico y cisternas.",
      cargoItemsData: [
        {
          itemNumber: 1,
          description: "Pinturas Epoxi Industriales UN 1263",
          unCode: "UN 1263",
          adrClass: "3",
          packingGroup: "III",
          adrCategory: 3,
          multiplier: 1,
          points: 9600,
          packages: 18,
          grossWeightKg: 9600.0,
          isAdr: true,
        },
      ],
      routeStopsData: [
        {
          stopOrder: 1,
          type: "PICKUP",
          city: "Tarragona",
          arrival: new Date(),
          status: "COMPLETED",
        },
        {
          stopOrder: 2,
          type: "DELIVERY",
          city: "Ludwigshafen / Frankfurt",
          arrival: new Date(Date.now() + 86400000 * 2),
          status: "PENDING",
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  const consignment3Id = "road_cdp_val_mad_03";
  await db
    .insert(schema.roadConsignments)
    .values({
      id: consignment3Id,
      consignmentNumber: "CDP-2026-MAD-VAL-11",
      shipmentId: "shipment_valencia_miami_01",
      consignmentType: "NATIONAL_CARTA_PORTE",
      status: "DELIVERED",
      senderName: "Cerámicas del Mediterráneo SL",
      senderAddress: "Camí Vell de Castelló s/n, 12540 Vila-real (Castellón)",
      senderCountry: "España (ES)",
      consigneeName: "Atlas Logistics Intermodal Terminal Valencia",
      consigneeAddress: "Muelle de Levante s/n, 46024 Puerto de Valencia",
      consigneeCountry: "España (ES)",
      carrierName: "Transportes Terrestres Levante SL",
      carrierVat: "ESB46192837",
      tractorPlate: "1102-KRT",
      trailerPlate: "R-4412-VLC",
      driverName: "Vicente Navarro Calvo",
      driverLicense: "ES-12948192-C",
      driverPhone: "+34 611 204 955",
      originCity: "Vila-real (Castellón)",
      destinationCity: "Valencia (Puerto)",
      totalDistanceKm: 75.0,
      estimatedDrivingHours: 1.1,
      requiredRestBreaksCount: 0,
      pickupDate: new Date(Date.now() - 86400000 * 3),
      deliveryDate: new Date(Date.now() - 86400000 * 3),
      totalPallets: 33,
      palletCapacityMax: 33,
      totalGrossWeightKg: 23400.0,
      payloadCapacityMaxKg: 24000.0,
      trailerFloorUtilizationPct: 100.0,
      isAdrHazardous: false,
      adrTotalPoints: 0.0,
      adrExemption1136Applied: false,
      orangePlatesRequired: false,
      tunnelRestrictionCode: null,
      goodsDescription:
        "Carga completa FTL: 33 Euro-pallets de baldosas cerámicas y gres porcelánico para exportación marítima.",
      specialInstructions:
        "Carta de Porte Nacional sujeta a la Ley 15/2009 y RDL 3/2022 (Prohibición expresa de carga y descarga por el conductor). Cláusula de paralizaciones aplicable a partir de 1 hora de espera.",
      cargoItemsData: [
        {
          itemNumber: 1,
          description: "Pallets Cerámica Esmaltada 60x60",
          packages: 33,
          grossWeightKg: 23400.0,
          isAdr: false,
        },
      ],
      routeStopsData: [
        {
          stopOrder: 1,
          type: "PICKUP",
          city: "Vila-real",
          arrival: new Date(Date.now() - 86400000 * 3),
          status: "COMPLETED",
        },
        {
          stopOrder: 2,
          type: "DELIVERY",
          city: "Valencia Puerto",
          arrival: new Date(Date.now() - 86400000 * 3),
          status: "COMPLETED",
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  console.log(
    "✅ Creadas Expediciones de Transporte Terrestre (e-CMR y Cartas de Porte).",
  );

  // ==========================================
  // 13. TESORERÍA MULTIDIVISA & FACTURAS DE PORTEADORES (3-WAY MATCH & CASS)
  // ==========================================
  console.log(
    "⚙️ Inyectando Tipos de Cambio FX, Posiciones de Tesorería y Facturas CASS / Navieras...",
  );

  // Seed FX Rates
  await db
    .insert(schema.fxRates)
    .values([
      {
        id: "fx_eur_usd",
        fromCurrency: "EUR",
        toCurrency: "USD",
        spotRate: 1.085,
        effectiveDate: "2026-08-27",
        source: "ECB",
        forward30Rate: 1.0865,
        forward60Rate: 1.088,
        forward90Rate: 1.0895,
      },
      {
        id: "fx_eur_gbp",
        fromCurrency: "EUR",
        toCurrency: "GBP",
        spotRate: 0.855,
        effectiveDate: "2026-08-27",
        source: "ECB",
        forward30Rate: 0.856,
        forward60Rate: 0.857,
        forward90Rate: 0.858,
      },
      {
        id: "fx_eur_cny",
        fromCurrency: "EUR",
        toCurrency: "CNY",
        spotRate: 7.82,
        effectiveDate: "2026-08-27",
        source: "PBOC",
        forward30Rate: 7.835,
        forward60Rate: 7.85,
        forward90Rate: 7.865,
      },
      {
        id: "fx_eur_jpy",
        fromCurrency: "EUR",
        toCurrency: "JPY",
        spotRate: 162.4,
        effectiveDate: "2026-08-27",
        source: "BoJ",
        forward30Rate: 162.8,
        forward60Rate: 163.2,
        forward90Rate: 163.6,
      },
      {
        id: "fx_eur_chf",
        fromCurrency: "EUR",
        toCurrency: "CHF",
        spotRate: 0.955,
        effectiveDate: "2026-08-27",
        source: "SNB",
        forward30Rate: 0.956,
        forward60Rate: 0.957,
        forward90Rate: 0.958,
      },
    ])
    .onConflictDoNothing();

  // Seed Treasury FX Positions
  await db
    .insert(schema.treasuryFxPositions)
    .values([
      {
        id: "pos_usd",
        currency: "USD",
        receivablesAmount: 185000.0,
        payablesAmount: 142000.0,
        netExposure: 43000.0,
        averageExchangeRate: 1.078,
        currentSpotRate: 1.085,
        unrealizedGainLossEur: 1180.5,
        hedgedAmount: 25000.0,
        unhedgedAmount: 18000.0,
        riskLevel: "LOW",
      },
      {
        id: "pos_gbp",
        currency: "GBP",
        receivablesAmount: 32000.0,
        payablesAmount: 48500.0,
        netExposure: -16500.0,
        averageExchangeRate: 0.852,
        currentSpotRate: 0.855,
        unrealizedGainLossEur: -340.2,
        hedgedAmount: 10000.0,
        unhedgedAmount: 6500.0,
        riskLevel: "MODERATE",
      },
      {
        id: "pos_cny",
        currency: "CNY",
        receivablesAmount: 0.0,
        payablesAmount: 350000.0,
        netExposure: -350000.0,
        averageExchangeRate: 7.8,
        currentSpotRate: 7.82,
        unrealizedGainLossEur: -520.0,
        hedgedAmount: 200000.0,
        unhedgedAmount: 150000.0,
        riskLevel: "HIGH",
      },
    ])
    .onConflictDoNothing();

  // Seed Carrier Invoices (Maersk Ocean, Iberia CASS, Trans-Iberian Road)
  await db
    .insert(schema.carrierInvoices)
    .values([
      {
        id: "inv_maersk_88910",
        invoiceNumber: "MSK-INV-2026-88910",
        carrierName: "Maersk Line A/S",
        carrierVat: "DK-13579246",
        mode: "OCEAN_FCL",
        invoiceDate: "2026-08-15",
        dueDate: "2026-09-14",
        billingPeriod: "2026-08",
        currency: "USD",
        totalAmount: 5450.0,
        matchedAmount: 4200.0,
        disputedAmount: 1250.0,
        reconciliationStatus: "DISCREPANCY_FLAGGED",
        paymentTerms: "30_DAYS",
        notes:
          "Sobrecargo de demurrage de 5 días en terminal de Valencia en disputa por huelga portuaria.",
      },
      {
        id: "inv_cass_ib_0826",
        invoiceNumber: "CASS-ES-2026-08-IB01",
        carrierName: "Iberia Líneas Aéreas de España (IATA CASS)",
        carrierVat: "ESA28014523",
        mode: "AIR_CARGO",
        invoiceDate: "2026-08-20",
        dueDate: "2026-09-05",
        billingPeriod: "2026-08-W3",
        currency: "EUR",
        totalAmount: 4120.0,
        matchedAmount: 4120.0,
        disputedAmount: 0.0,
        reconciliationStatus: "AUTO_MATCHED",
        cassStatementNumber: "CASS-IB-99201",
        paymentTerms: "15_DAYS",
        notes:
          "Liquidación quincenal CASS España. Todas las cartas de porte aéreo coinciden al 100%.",
      },
      {
        id: "inv_tie_4412",
        invoiceNumber: "TIE-INV-2026-4412",
        carrierName: "Trans-Iberian Express S.L.",
        carrierVat: "ESB88442211",
        mode: "ROAD_FREIGHT",
        invoiceDate: "2026-08-22",
        dueDate: "2026-09-21",
        billingPeriod: "2026-08",
        currency: "EUR",
        totalAmount: 1850.0,
        matchedAmount: 1850.0,
        disputedAmount: 0.0,
        reconciliationStatus: "APPROVED_FOR_PAYMENT",
        paymentTerms: "30_DAYS",
        notes:
          "Transporte FTL Madrid -> Lyon completado según e-CMR CMR-2026-99210.",
      },
    ])
    .onConflictDoNothing();

  // Seed Carrier Invoice Lines
  await db
    .insert(schema.carrierInvoiceLines)
    .values([
      // Maersk Invoice Lines
      {
        id: "line_msk_01",
        carrierInvoiceId: "inv_maersk_88910",
        bookingNumber: "BKG-2026-0849",
        documentNumber: "MSK99482015",
        chargeCode: "BASIC_FREIGHT",
        description: "Flete Marítimo FCL 1x40HC Shanghai -> Valencia",
        billedQuantity: 1,
        billedRate: 3200.0,
        billedAmount: 3200.0,
        expectedQuantity: 1,
        expectedRate: 3200.0,
        expectedAmount: 3200.0,
        varianceAmount: 0.0,
        variancePercentage: 0.0,
        isWithinTolerance: true,
        disputeStatus: "NONE",
      },
      {
        id: "line_msk_02",
        carrierInvoiceId: "inv_maersk_88910",
        bookingNumber: "BKG-2026-0849",
        documentNumber: "MSK99482015",
        chargeCode: "BAF_FUEL",
        description: "Bunker Adjustment Factor (BAF)",
        billedQuantity: 1,
        billedRate: 650.0,
        billedAmount: 650.0,
        expectedQuantity: 1,
        expectedRate: 650.0,
        expectedAmount: 650.0,
        varianceAmount: 0.0,
        variancePercentage: 0.0,
        isWithinTolerance: true,
        disputeStatus: "NONE",
      },
      {
        id: "line_msk_03",
        carrierInvoiceId: "inv_maersk_88910",
        bookingNumber: "BKG-2026-0849",
        documentNumber: "MSK99482015",
        chargeCode: "THC_ORIGIN",
        description: "Terminal Handling Charge Shanghai",
        billedQuantity: 1,
        billedRate: 350.0,
        billedAmount: 350.0,
        expectedQuantity: 1,
        expectedRate: 350.0,
        expectedAmount: 350.0,
        varianceAmount: 0.0,
        variancePercentage: 0.0,
        isWithinTolerance: true,
        disputeStatus: "NONE",
      },
      {
        id: "line_msk_04",
        carrierInvoiceId: "inv_maersk_88910",
        bookingNumber: "BKG-2026-0849",
        documentNumber: "MSK99482015",
        chargeCode: "DEMURRAGE",
        description: "Demurrage & Detention Puerto de Valencia (5 días extra)",
        billedQuantity: 5,
        billedRate: 250.0,
        billedAmount: 1250.0,
        expectedQuantity: 3,
        expectedRate: 250.0,
        expectedAmount: 750.0,
        varianceAmount: 500.0,
        variancePercentage: 66.67,
        isWithinTolerance: false,
        disputeReason:
          "Discrepancia en demoras: 2 de los 5 días facturados corresponden al cierre de terminal por huelga de estiba (fuerza mayor). Solicitada anulación de 500 USD.",
        disputeStatus: "DISPUTED",
      },
      // CASS Invoice Lines
      {
        id: "line_cass_01",
        carrierInvoiceId: "inv_cass_ib_0826",
        bookingNumber: "AIR-BKG-84920",
        documentNumber: "075-84920153",
        chargeCode: "BASIC_FREIGHT",
        description: "Flete Aéreo MAD -> JFK (480 kg chargeable)",
        billedQuantity: 480,
        billedRate: 4.5,
        billedAmount: 2160.0,
        expectedQuantity: 480,
        expectedRate: 4.5,
        expectedAmount: 2160.0,
        varianceAmount: 0.0,
        variancePercentage: 0.0,
        isWithinTolerance: true,
        disputeStatus: "NONE",
      },
      {
        id: "line_cass_02",
        carrierInvoiceId: "inv_cass_ib_0826",
        bookingNumber: "AIR-BKG-84920",
        documentNumber: "075-84920153",
        chargeCode: "SECURITY_FEE",
        description: "Recargo de Seguridad y Combustible Aéreo",
        billedQuantity: 480,
        billedRate: 1.0,
        billedAmount: 480.0,
        expectedQuantity: 480,
        expectedRate: 1.0,
        expectedAmount: 480.0,
        varianceAmount: 0.0,
        variancePercentage: 0.0,
        isWithinTolerance: true,
        disputeStatus: "NONE",
      },
      {
        id: "line_cass_03",
        carrierInvoiceId: "inv_cass_ib_0826",
        bookingNumber: "AIR-BKG-84920",
        documentNumber: "075-84920153",
        chargeCode: "IATA_COMMISSION",
        description: "Comisión Transitario IATA CASS (5%)",
        billedQuantity: 1,
        billedRate: -108.0,
        billedAmount: -108.0,
        expectedQuantity: 1,
        expectedRate: -108.0,
        expectedAmount: -108.0,
        varianceAmount: 0.0,
        variancePercentage: 0.0,
        isWithinTolerance: true,
        disputeStatus: "NONE",
      },
      {
        id: "line_cass_04",
        carrierInvoiceId: "inv_cass_ib_0826",
        bookingNumber: "AIR-BKG-99381",
        documentNumber: "075-99381204",
        chargeCode: "BASIC_FREIGHT",
        description: "Flete Aéreo MAD -> MEX (320 kg)",
        billedQuantity: 320,
        billedRate: 4.9625,
        billedAmount: 1588.0,
        expectedQuantity: 320,
        expectedRate: 4.9625,
        expectedAmount: 1588.0,
        varianceAmount: 0.0,
        variancePercentage: 0.0,
        isWithinTolerance: true,
        disputeStatus: "NONE",
      },
      // Road Invoice Line
      {
        id: "line_tie_01",
        carrierInvoiceId: "inv_tie_4412",
        bookingNumber: "ROAD-BKG-99210",
        documentNumber: "CMR-2026-99210",
        chargeCode: "BASIC_FREIGHT",
        description: "Transporte Terrestre FTL Madrid -> Lyon (33 Pallets)",
        billedQuantity: 1,
        billedRate: 1850.0,
        billedAmount: 1850.0,
        expectedQuantity: 1,
        expectedRate: 1850.0,
        expectedAmount: 1850.0,
        varianceAmount: 0.0,
        variancePercentage: 0.0,
        isWithinTolerance: true,
        disputeStatus: "NONE",
      },
    ])
    .onConflictDoNothing();

  console.log(
    "✅ Creados Tipos de Cambio FX, Posiciones de Tesorería y Facturas CASS / Navieras.",
  );

  // ==========================================
  // 14. CADENA DE FRÍO, FARMA GDP & MONITORIZACIÓN DE REEFERS (EN 12830)
  // ==========================================
  console.log(
    "❄️ Inyectando Perfiles Térmicos, Expediciones Farmacéuticas GDP y Telemetría de Dataloggers...",
  );

  // Seed Cold Chain Profiles
  await db
    .insert(schema.coldChainProfiles)
    .values([
      {
        id: "prof_ultra_cold",
        code: "ULTRA_COLD_MINUS_80",
        name: "Ultra-Cold (-80°C a -60°C Hielo Seco UN 1845)",
        minTempCelsius: -80.0,
        maxTempCelsius: -60.0,
        targetTempCelsius: -75.0,
        humidityMinPct: 0.0,
        humidityMaxPct: 100.0,
        standard: "WHO_TRS_961 / IATA_TCR",
        description:
          "Vacunas de ARN mensajero, terapia génica y material biológico ultra-congelado con hielo seco.",
      },
      {
        id: "prof_frozen",
        code: "FROZEN_MINUS_20",
        name: "Frozen / Congelado (-25°C a -15°C)",
        minTempCelsius: -25.0,
        maxTempCelsius: -15.0,
        targetTempCelsius: -20.0,
        humidityMinPct: 0.0,
        humidityMaxPct: 100.0,
        standard: "EU_GDP_2013_C_343",
        description:
          "Plasma sanguíneo, reactivos diagnósticos y productos biológicos congelados.",
      },
      {
        id: "prof_pharma_cold",
        code: "PHARMA_COLD_2_8",
        name: "Refrigerado Pharma (+2°C a +8°C)",
        minTempCelsius: 2.0,
        maxTempCelsius: 8.0,
        targetTempCelsius: 5.0,
        humidityMinPct: 30.0,
        humidityMaxPct: 65.0,
        standard: "EU_GDP_2013_C_343 / EN_12830",
        description:
          "Insulina, vacunas estándar, anticuerpos monoclonales y biológicos termosensibles.",
      },
      {
        id: "prof_crt",
        code: "CONTROLLED_ROOM_15_25",
        name: "Temperatura Ambiente Controlada CRT (+15°C a +25°C)",
        minTempCelsius: 15.0,
        maxTempCelsius: 25.0,
        targetTempCelsius: 20.0,
        humidityMinPct: 30.0,
        humidityMaxPct: 70.0,
        standard: "EU_GDP_2013_C_343",
        description:
          "Comprimidos, cápsulas, jarabes y especialidades farmacéuticas terminadas.",
      },
      {
        id: "prof_perishable",
        code: "FRESH_PERISHABLE_0_4",
        name: "Perecederos Frescos (+0°C a +4°C)",
        minTempCelsius: 0.0,
        maxTempCelsius: 4.0,
        targetTempCelsius: 2.0,
        humidityMinPct: 85.0,
        humidityMaxPct: 95.0,
        standard: "EN_12830",
        description:
          "Alimentos perecederos, frutas de exportación y productos frescos con atmósfera controlada.",
      },
    ])
    .onConflictDoNothing();

  // Seed Cold Chain Shipments
  await db
    .insert(schema.coldChainShipments)
    .values([
      {
        id: "cc_vax_9901",
        trackingNumber: "CC-2026-9901",
        batchNumber: "BATCH-VAX-2026-08A",
        productDescription:
          "Vacuna Biológica Bivalente (480 viales multidosis)",
        pharmaClassification: "BIOLOGICS_VACCINES",
        profileId: "prof_pharma_cold",
        packagingType: "INSULATED_EPS_GEL_PACKS",
        setpointTempCelsius: 5.0,
        loggerSerialNumber: "TT-GEO-884102",
        loggerModel: "TempTale GEO Ultra 4G",
        mktCalculatedCelsius: 4.85,
        excursionDurationMinutes: 15,
        excursionStatus: "MINOR_EXCURSION",
        gdpReleaseVerdict: "RELEASED_FOR_DISTRIBUTION",
        responsiblePersonName:
          "Dra. Elena Ruiz (Directora Técnica Farmacéutica QP/RP)",
        qualityAuditNotes:
          "Excursión térmica menor de 15 min a 8.2°C en muelle de transferencia. MKT final de 4.85°C dentro de la tolerancia de estabilidad biológica.",
        originLocation: "Madrid Pharma Logistics Hub (MAD)",
        destinationLocation: "New York JFK Cargo Terminal",
        departureTime: "2026-08-25T08:00:00Z",
        estimatedArrivalTime: "2026-08-26T18:00:00Z",
      },
      {
        id: "cc_dryice_9902",
        trackingNumber: "CC-2026-9902",
        batchNumber: "BATCH-CLIN-8891",
        productDescription:
          "Muestras de Ensayo Clínico Fase III (ARN Mensajero)",
        pharmaClassification: "BIOLOGICS_VACCINES",
        profileId: "prof_ultra_cold",
        packagingType: "PASSIVE_VIP_DRY_ICE",
        setpointTempCelsius: -75.0,
        initialDryIceWeightKg: 45.0,
        currentDryIceWeightKg: 32.0,
        dryIceSublimationRateKgHr: 0.45,
        loggerSerialNumber: "TT-ULTRA-552190",
        loggerModel: "TempTale Ultra Dry Ice Probe",
        mktCalculatedCelsius: -73.2,
        excursionDurationMinutes: 0,
        excursionStatus: "COMPLIANT",
        gdpReleaseVerdict: "RELEASED_FOR_DISTRIBUTION",
        responsiblePersonName: "Dr. Marc Torres (Persona Responsable GDP)",
        qualityAuditNotes:
          "Cero excursiones térmicas. Autonomía de hielo seco restante: 71.1 horas calculadas.",
        originLocation: "Barcelona BioPharma Park (BCN)",
        destinationLocation: "Frankfurt Airport Pharma Hub (FRA)",
        departureTime: "2026-08-26T06:30:00Z",
        estimatedArrivalTime: "2026-08-27T14:00:00Z",
      },
      {
        id: "cc_reefer_9903",
        trackingNumber: "CC-2026-9903",
        batchNumber: "BATCH-CRT-4410",
        productDescription:
          "Medicamentos Esenciales Vía Oral (1x40' High Cube Reefer)",
        pharmaClassification: "FINISHED_DRUGS",
        profileId: "prof_crt",
        packagingType: "ACTIVE_REEFER_CONTAINER",
        setpointTempCelsius: 20.0,
        loggerSerialNumber: "TT-REEF-992144",
        loggerModel: "Sensitech ColdWatch Satellite Reefer",
        mktCalculatedCelsius: 23.8,
        excursionDurationMinutes: 180,
        excursionStatus: "CRITICAL_EXCURSION",
        gdpReleaseVerdict: "QUARANTINE_INVESTIGATION",
        responsiblePersonName:
          "Dra. Elena Ruiz (Directora Técnica Farmacéutica QP/RP)",
        qualityAuditNotes:
          "Excursión crítica de 3 horas a 28.4°C en transbordo por desconexión de reef-plug. Lote retenido en Cuarentena para ensayo de degradación de principio activo.",
        originLocation: "Valencia Puerto Terminal Marítima",
        destinationLocation: "Puerto de Veracruz (México)",
        departureTime: "2026-08-20T12:00:00Z",
        estimatedArrivalTime: "2026-09-02T16:00:00Z",
      },
    ])
    .onConflictDoNothing();

  // Seed Temperature Readings
  await db
    .insert(schema.temperatureReadings)
    .values([
      // Readings for cc_vax_9901 (+2°C to +8°C)
      {
        id: "rd_vax_01",
        coldChainShipmentId: "cc_vax_9901",
        recordedAt: "2026-08-25T08:00:00Z",
        probeTemperatureCelsius: 4.8,
        ambientTemperatureCelsius: 22.0,
        relativeHumidityPct: 48.0,
        isExcursion: false,
        powerSupplyMode: "BATTERY_PASSIVE",
      },
      {
        id: "rd_vax_02",
        coldChainShipmentId: "cc_vax_9901",
        recordedAt: "2026-08-25T12:00:00Z",
        probeTemperatureCelsius: 5.1,
        ambientTemperatureCelsius: 24.5,
        relativeHumidityPct: 50.0,
        isExcursion: false,
        powerSupplyMode: "BATTERY_PASSIVE",
      },
      {
        id: "rd_vax_03",
        coldChainShipmentId: "cc_vax_9901",
        recordedAt: "2026-08-25T16:30:00Z",
        probeTemperatureCelsius: 8.2, // Minor excursion
        ambientTemperatureCelsius: 31.0,
        relativeHumidityPct: 58.0,
        isExcursion: true,
        powerSupplyMode: "BATTERY_PASSIVE",
      },
      {
        id: "rd_vax_04",
        coldChainShipmentId: "cc_vax_9901",
        recordedAt: "2026-08-25T17:00:00Z",
        probeTemperatureCelsius: 4.9,
        ambientTemperatureCelsius: 18.0,
        relativeHumidityPct: 45.0,
        isExcursion: false,
        powerSupplyMode: "BATTERY_PASSIVE",
      },
      {
        id: "rd_vax_05",
        coldChainShipmentId: "cc_vax_9901",
        recordedAt: "2026-08-26T18:00:00Z",
        probeTemperatureCelsius: 4.6,
        ambientTemperatureCelsius: 19.5,
        relativeHumidityPct: 44.0,
        isExcursion: false,
        powerSupplyMode: "BATTERY_PASSIVE",
      },

      // Readings for cc_dryice_9902 (-80°C to -60°C)
      {
        id: "rd_dry_01",
        coldChainShipmentId: "cc_dryice_9902",
        recordedAt: "2026-08-26T06:30:00Z",
        probeTemperatureCelsius: -78.4,
        ambientTemperatureCelsius: 21.0,
        relativeHumidityPct: 40.0,
        isExcursion: false,
        powerSupplyMode: "BATTERY_PASSIVE",
      },
      {
        id: "rd_dry_02",
        coldChainShipmentId: "cc_dryice_9902",
        recordedAt: "2026-08-26T12:00:00Z",
        probeTemperatureCelsius: -74.1,
        ambientTemperatureCelsius: 23.0,
        relativeHumidityPct: 42.0,
        isExcursion: false,
        powerSupplyMode: "BATTERY_PASSIVE",
      },
      {
        id: "rd_dry_03",
        coldChainShipmentId: "cc_dryice_9902",
        recordedAt: "2026-08-27T14:00:00Z",
        probeTemperatureCelsius: -71.8,
        ambientTemperatureCelsius: 20.0,
        relativeHumidityPct: 39.0,
        isExcursion: false,
        powerSupplyMode: "BATTERY_PASSIVE",
      },

      // Readings for cc_reefer_9903 (+15°C to +25°C)
      {
        id: "rd_reef_01",
        coldChainShipmentId: "cc_reefer_9903",
        recordedAt: "2026-08-20T12:00:00Z",
        probeTemperatureCelsius: 19.8,
        ambientTemperatureCelsius: 28.0,
        relativeHumidityPct: 55.0,
        isExcursion: false,
        powerSupplyMode: "GENSET_DIESEL",
      },
      {
        id: "rd_reef_02",
        coldChainShipmentId: "cc_reefer_9903",
        recordedAt: "2026-08-22T15:00:00Z",
        probeTemperatureCelsius: 28.4, // Critical excursion (power unplugged)
        ambientTemperatureCelsius: 34.0,
        relativeHumidityPct: 68.0,
        isExcursion: true,
        powerSupplyMode: "BATTERY_PASSIVE",
      },
      {
        id: "rd_reef_03",
        coldChainShipmentId: "cc_reefer_9903",
        recordedAt: "2026-08-22T18:00:00Z",
        probeTemperatureCelsius: 20.2, // Recovered after plug-in
        ambientTemperatureCelsius: 32.0,
        relativeHumidityPct: 52.0,
        isExcursion: false,
        powerSupplyMode: "MAINS_ELECTRIC",
      },
    ])
    .onConflictDoNothing();

  console.log(
    "✅ Creados Perfiles Térmicos, Expediciones Farmacéuticas GDP y Telemetría de Dataloggers.",
  );

  // ==========================================
  // 15. MECANISMO DE AJUSTE EN FRONTERA POR CARBONO (CBAM) - REGLAMENTO (UE) 2023/956
  // ==========================================
  console.log(
    "🌿 Inyectando Catálogo de Bienes CBAM, Instalaciones Productoras Verificadas y Declaraciones Trimestrales...",
  );

  // Seed CBAM Goods Catalog
  await db
    .insert(schema.cbamGoodsCatalog)
    .values([
      {
        id: "cbam_good_steel_coil",
        cnCode: "7208 38 00",
        sector: "IRON_STEEL",
        description:
          "Productos laminados planos de hierro o acero sin alear, de anchura >= 600 mm, enrollados (bobinas en caliente), espesor 3 mm a 4.75 mm.",
        isComplexGood: false,
        defaultDirectEmissionFactor: 1.85,
        defaultIndirectEmissionFactor: 0.42,
        standard: "EU_REG_2023_956",
      },
      {
        id: "cbam_good_alum_ingot",
        cnCode: "7601 10 00",
        sector: "ALUMINIUM",
        description:
          "Aluminio en bruto sin alear, en lingotes o placas para refusión electrolítica.",
        isComplexGood: false,
        defaultDirectEmissionFactor: 1.98,
        defaultIndirectEmissionFactor: 6.8,
        standard: "EU_REG_2023_956",
      },
      {
        id: "cbam_good_cement_portland",
        cnCode: "2523 29 00",
        sector: "CEMENT",
        description:
          "Cemento Portland gris estándar (clinker de cemento molido con adiciones).",
        isComplexGood: false,
        defaultDirectEmissionFactor: 0.72,
        defaultIndirectEmissionFactor: 0.09,
        standard: "EU_REG_2023_956",
      },
      {
        id: "cbam_good_fertilizer_urea",
        cnCode: "3102 10 00",
        sector: "FERTILIZERS",
        description:
          "Urea con contenido de nitrógeno superior al 45% en peso, incluso en disolución acuosa.",
        isComplexGood: true,
        defaultDirectEmissionFactor: 1.45,
        defaultIndirectEmissionFactor: 0.35,
        standard: "EU_REG_2023_956",
      },
      {
        id: "cbam_good_hydrogen",
        cnCode: "2804 10 00",
        sector: "HYDROGEN",
        description:
          "Hidrógeno comprimido / gas licuado para uso industrial o energético.",
        isComplexGood: false,
        defaultDirectEmissionFactor: 9.1,
        defaultIndirectEmissionFactor: 1.2,
        standard: "EU_REG_2023_956",
      },
      {
        id: "cbam_good_steel_structures",
        cnCode: "7308 90 00",
        sector: "IRON_STEEL",
        description:
          "Construcciones y sus partes (puentes, torres, pilares, vigas) de fundición, hierro o acero.",
        isComplexGood: true,
        defaultDirectEmissionFactor: 2.15,
        defaultIndirectEmissionFactor: 0.55,
        standard: "EU_REG_2023_956",
      },
    ])
    .onConflictDoNothing();

  // Seed CBAM Installations
  await db
    .insert(schema.cbamInstallations)
    .values([
      {
        id: "inst_erdemir_tr",
        installationName: "Erdemir Steel Works KDZ",
        operatorName: "Eregli Demir ve Celik Fabrikalari TAS",
        countryCode: "TR",
        unLocode: "TRERE",
        latitude: 41.285,
        longitude: 31.428,
        verifiedDirectEmissionFactor: 1.72,
        verifiedIndirectEmissionFactor: 0.38,
        gridEmissionFactorCountry: 0.44,
        verifierName: "Bureau Veritas Certification Türkiye",
        verificationCertificateId: "BV-CBAM-TR-2026-9021",
      },
      {
        id: "inst_chalco_cn",
        installationName: "Chalco Zhengzhou Primary Smelter",
        operatorName: "Aluminum Corporation of China Ltd",
        countryCode: "CN",
        unLocode: "CNZZU",
        latitude: 34.757,
        longitude: 113.665,
        verifiedDirectEmissionFactor: 1.85,
        verifiedIndirectEmissionFactor: 6.15,
        gridEmissionFactorCountry: 0.58,
        verifierName: "TÜV Rheinland Greater China",
        verificationCertificateId: "TUV-CBAM-CN-2026-1184",
      },
      {
        id: "inst_ocp_ma",
        installationName: "OCP Jorf Lasfar Fertilizer Complex",
        operatorName: "OCP Group Morocco",
        countryCode: "MA",
        unLocode: "MAJFL",
        latitude: 33.125,
        longitude: -8.625,
        verifiedDirectEmissionFactor: 1.32,
        verifiedIndirectEmissionFactor: 0.28,
        gridEmissionFactorCountry: 0.62,
        verifierName: "SGS Maroc Surveillance SA",
        verificationCertificateId: "SGS-CBAM-MA-2026-5502",
      },
      {
        id: "inst_british_steel_gb",
        installationName: "Scunthorpe Integrated Steelworks",
        operatorName: "British Steel Ltd",
        countryCode: "GB",
        unLocode: "GBSCU",
        latitude: 53.585,
        longitude: -0.652,
        verifiedDirectEmissionFactor: 1.9,
        verifiedIndirectEmissionFactor: 0.4,
        gridEmissionFactorCountry: 0.21,
        verifierName: "DNV GL Business Assurance UK",
        verificationCertificateId: "DNV-CBAM-GB-2026-3390",
      },
    ])
    .onConflictDoNothing();

  // Seed CBAM Declarations
  await db
    .insert(schema.cbamDeclarations)
    .values([
      {
        id: "cbam_dec_2026_q3_01",
        declarationNumber: "CBAM-2026-Q3-001",
        reportingPeriod: "2026-Q3",
        declarantVat: "ESA88992211",
        declarantName:
          "Atlas Logistics Forwarding SL (Declarante Autorizado CBAM)",
        importerVat: "ESA11223344",
        importerName: "Iberian Industrial Metals SL",
        totalGrossMassTonnes: 4850.0,
        totalNetMassTonnes: 4800.0,
        totalDirectEmissionsTco2e: 8566.0,
        totalIndirectEmissionsTco2e: 7614.0,
        totalEmbeddedEmissionsTco2e: 16430.0,
        euEtsBenchmarkPriceEur: 85.5,
        grossCarbonLiabilityEur: 1404765.0,
        carbonPricePaidForeignEur: 180000.0, // Deducción UK ETS
        netCarbonLiabilityEur: 1224765.0,
        status: "VALIDATED",
        responsibleDeclarant:
          "Carlos Vega (Responsable Técnico de Aduanas & CBAM)",
        remarks:
          "Declaración trimestral auditada con certificados de instalación acreditados en Turquía, China y Reino Unido.",
      },
      {
        id: "cbam_dec_2026_q2_02",
        declarationNumber: "CBAM-2026-Q2-002",
        reportingPeriod: "2026-Q2",
        declarantVat: "ESA88992211",
        declarantName:
          "Atlas Logistics Forwarding SL (Declarante Autorizado CBAM)",
        importerVat: "ESB99887766",
        importerName: "Construcciones & Cemento del Mediterráneo SA",
        totalGrossMassTonnes: 12200.0,
        totalNetMassTonnes: 12000.0,
        totalDirectEmissionsTco2e: 8640.0,
        totalIndirectEmissionsTco2e: 1080.0,
        totalEmbeddedEmissionsTco2e: 9720.0,
        euEtsBenchmarkPriceEur: 82.0,
        grossCarbonLiabilityEur: 797040.0,
        carbonPricePaidForeignEur: 0.0,
        netCarbonLiabilityEur: 797040.0,
        status: "SUBMITTED_REGISTRY",
        responsibleDeclarant:
          "Carlos Vega (Responsable Técnico de Aduanas & CBAM)",
        remarks:
          "Presentada telemáticamente ante el Registro Transitorio CBAM de la Comisión Europea.",
      },
    ])
    .onConflictDoNothing();

  // Seed CBAM Declaration Lines
  await db
    .insert(schema.cbamDeclarationLines)
    .values([
      {
        id: "cbam_line_01",
        declarationId: "cbam_dec_2026_q3_01",
        shipmentId: "shp_001",
        duaNumber: "26ES00461110084920",
        duaBox33HsCode: "7208 38 00",
        goodDescription: "Bobinas de acero laminadas en caliente (2.800 t)",
        originCountry: "TR",
        installationId: "inst_erdemir_tr",
        netWeightTonnes: 2800.0,
        useDefaultFactors: false,
        directEmissionsTco2e: 4816.0, // 2800 * 1.72
        indirectEmissionsTco2e: 1064.0, // 2800 * 0.38
        precursorEmissionsTco2e: 0.0,
        totalLineEmissionsTco2e: 5880.0,
        foreignCarbonPricePerTco2e: 0.0,
        effectiveForeignPricePaidEur: 0.0,
        lineGrossLiabilityEur: 502740.0, // 5880 * 85.50
        lineNetLiabilityEur: 502740.0,
      },
      {
        id: "cbam_line_02",
        declarationId: "cbam_dec_2026_q3_01",
        shipmentId: "shp_002",
        duaNumber: "26ES00461110091044",
        duaBox33HsCode: "7601 10 00",
        goodDescription: "Lingotes de aluminio primario sin alear (1.000 t)",
        originCountry: "CN",
        installationId: "inst_chalco_cn",
        netWeightTonnes: 1000.0,
        useDefaultFactors: false,
        directEmissionsTco2e: 1850.0, // 1000 * 1.85
        indirectEmissionsTco2e: 6150.0, // 1000 * 6.15
        precursorEmissionsTco2e: 0.0,
        totalLineEmissionsTco2e: 8000.0,
        foreignCarbonPricePerTco2e: 0.0,
        effectiveForeignPricePaidEur: 0.0,
        lineGrossLiabilityEur: 684000.0, // 8000 * 85.50
        lineNetLiabilityEur: 684000.0,
      },
      {
        id: "cbam_line_03",
        declarationId: "cbam_dec_2026_q3_01",
        shipmentId: "shp_003",
        duaNumber: "26ES00461110095501",
        duaBox33HsCode: "7308 90 00",
        goodDescription: "Estructuras de acero fabricadas (1.000 t)",
        originCountry: "GB",
        installationId: "inst_british_steel_gb",
        netWeightTonnes: 1000.0,
        useDefaultFactors: false,
        directEmissionsTco2e: 1900.0, // 1000 * 1.90
        indirectEmissionsTco2e: 400.0, // 1000 * 0.40
        precursorEmissionsTco2e: 250.0, // 1000 * 0.25 (palanquilla)
        totalLineEmissionsTco2e: 2550.0,
        foreignCarbonPricePerTco2e: 70.59,
        effectiveForeignPricePaidEur: 180000.0, // Compensación acreditada UK ETS
        lineGrossLiabilityEur: 218025.0, // 2550 * 85.50
        lineNetLiabilityEur: 38025.0, // 218025 - 180000
      },
    ])
    .onConflictDoNothing();

  console.log(
    "✅ Creados Catálogo CBAM, Instalaciones Verificadas, Declaraciones Trimestrales y Líneas de Importación.",
  );

  console.log(
    "🚆 Inyectando Corredores Ferroviarios TEN-T, Terminales Intermodales, Vagones y Expedientes CIM...",
  );

  // 1. Rail Corridors
  await db
    .insert(schema.railCorridors)
    .values([
      {
        id: "corridor_rfc6_med",
        code: "RFC6_MEDITERRANEAN",
        name: "Corredor Mediterráneo Ferroviario (RFC 6)",
        description:
          "Eje transeuropeo Algeciras - Valencia - Barcelona - Portbou - Lyon - Amberes / Rotterdam.",
        originNode: "Puerto de Algeciras / Valencia FSL",
        destinationNode: "Terminal de Amberes / Duisburg DIT",
        maxTrainLengthMeters: 750,
        maxAxleLoadCategory: "D",
        gaugeProfile: "P400_GA",
        electrificationKv: 25.0,
        createdAt: new Date().toISOString(),
      },
      {
        id: "corridor_rfc4_atl",
        code: "RFC4_ATLANTIC",
        name: "Corredor Atlántico Ferroviario (RFC 4)",
        description:
          "Eje Sines / Lisboa - Madrid - Vitoria - Hendaya - Burdeos - París - Mannheim.",
        originNode: "Madrid Abroñigal / Vitoria Jundiz",
        destinationNode: "Terminal Bettembourg / París Valenton",
        maxTrainLengthMeters: 750,
        maxAxleLoadCategory: "D",
        gaugeProfile: "P400_GA",
        electrificationKv: 25.0,
        createdAt: new Date().toISOString(),
      },
      {
        id: "corridor_iberian_core",
        code: "IBERIAN_CORE_AXIS",
        name: "Eje Central Ibérico (Zaragoza - Madrid - Algeciras)",
        description:
          "Autopista ferroviaria interior para tráfico de semirremolques P400 y contenedores marítimos.",
        originNode: "Zaragoza Plaza",
        destinationNode: "Puerto Bahía de Algeciras",
        maxTrainLengthMeters: 750,
        maxAxleLoadCategory: "D",
        gaugeProfile: "P400_GA",
        electrificationKv: 3.0,
        createdAt: new Date().toISOString(),
      },
    ])
    .onConflictDoNothing();

  // 2. Rail Terminals
  await db
    .insert(schema.railTerminals)
    .values([
      {
        id: "term_can_tunis",
        uicStationCode: "71004",
        name: "Terminal Intermodal Barcelona Can Tunis",
        city: "Barcelona",
        countryCode: "ES",
        trackGauge: "DUAL_GAUGE",
        isGaugeTransferNode: false,
        hasElectrification: true,
        maxTrackCapacityMeters: 750,
        storageTeuCapacity: 6500,
        createdAt: new Date().toISOString(),
      },
      {
        id: "term_zaragoza_plaza",
        uicStationCode: "71002",
        name: "Terminal Intermodal Zaragoza Plaza (PLAZA)",
        city: "Zaragoza",
        countryCode: "ES",
        trackGauge: "IBERIAN_1668",
        isGaugeTransferNode: false,
        hasElectrification: true,
        maxTrackCapacityMeters: 750,
        storageTeuCapacity: 12000,
        createdAt: new Date().toISOString(),
      },
      {
        id: "term_madrid_abronigal",
        uicStationCode: "71001",
        name: "Terminal Intermodal Madrid Abroñigal / Vicálvaro",
        city: "Madrid",
        countryCode: "ES",
        trackGauge: "IBERIAN_1668",
        isGaugeTransferNode: false,
        hasElectrification: true,
        maxTrackCapacityMeters: 750,
        storageTeuCapacity: 8000,
        createdAt: new Date().toISOString(),
      },
      {
        id: "term_valencia_fsl",
        uicStationCode: "71003",
        name: "Terminal Intermodal Valencia Fuente de San Luis",
        city: "Valencia",
        countryCode: "ES",
        trackGauge: "DUAL_GAUGE",
        isGaugeTransferNode: false,
        hasElectrification: true,
        maxTrackCapacityMeters: 750,
        storageTeuCapacity: 5000,
        createdAt: new Date().toISOString(),
      },
      {
        id: "term_hendaye",
        uicStationCode: "87001",
        name: "Terminal Transfronteriza Hendaye / Irún",
        city: "Hendaye",
        countryCode: "FR",
        trackGauge: "DUAL_GAUGE",
        isGaugeTransferNode: true,
        hasElectrification: true,
        maxTrackCapacityMeters: 750,
        storageTeuCapacity: 3500,
        createdAt: new Date().toISOString(),
      },
      {
        id: "term_portbou",
        uicStationCode: "71009",
        name: "Terminal Transfronteriza Portbou / Cerbère",
        city: "Portbou",
        countryCode: "ES",
        trackGauge: "DUAL_GAUGE",
        isGaugeTransferNode: true,
        hasElectrification: true,
        maxTrackCapacityMeters: 750,
        storageTeuCapacity: 2000,
        createdAt: new Date().toISOString(),
      },
      {
        id: "term_bettembourg",
        uicStationCode: "82001",
        name: "Hub Intermodal & Autopista Ferroviaria Bettembourg",
        city: "Bettembourg",
        countryCode: "LU",
        trackGauge: "UIC_1435",
        isGaugeTransferNode: false,
        hasElectrification: true,
        maxTrackCapacityMeters: 750,
        storageTeuCapacity: 7000,
        createdAt: new Date().toISOString(),
      },
      {
        id: "term_duisburg_dit",
        uicStationCode: "80001",
        name: "Duisburg Intermodal Terminal (DIT)",
        city: "Duisburg",
        countryCode: "DE",
        trackGauge: "UIC_1435",
        isGaugeTransferNode: false,
        hasElectrification: true,
        maxTrackCapacityMeters: 750,
        storageTeuCapacity: 15000,
        createdAt: new Date().toISOString(),
      },
    ])
    .onConflictDoNothing();

  // 3. Rail Wagons
  await db
    .insert(schema.railWagons)
    .values([
      {
        id: "wgn_sggmrss_01",
        uicWagonNumber: "33 80 4956 101-2",
        wagonSeries: "Sggmrss 90' Doble Plataforma",
        wagonType: "CONTAINER_FLATBED",
        numberOfAxles: 6,
        tareWeightTonnes: 28.5,
        lengthOverBuffersMeters: 29.59,
        maxBrakedWeightTonnes: 80.0,
        maxPayloadCategoryA: 67.5,
        maxPayloadCategoryB: 79.5,
        maxPayloadCategoryC: 91.5,
        maxPayloadCategoryD: 106.5,
        isP400Certified: false,
        status: "AVAILABLE",
        createdAt: new Date().toISOString(),
      },
      {
        id: "wgn_sggmrss_02",
        uicWagonNumber: "33 80 4956 102-0",
        wagonSeries: "Sggmrss 90' Doble Plataforma",
        wagonType: "CONTAINER_FLATBED",
        numberOfAxles: 6,
        tareWeightTonnes: 28.5,
        lengthOverBuffersMeters: 29.59,
        maxBrakedWeightTonnes: 80.0,
        maxPayloadCategoryA: 67.5,
        maxPayloadCategoryB: 79.5,
        maxPayloadCategoryC: 91.5,
        maxPayloadCategoryD: 106.5,
        isP400Certified: false,
        status: "AVAILABLE",
        createdAt: new Date().toISOString(),
      },
      {
        id: "wgn_t3000e_01",
        uicWagonNumber: "33 84 4961 201-8",
        wagonSeries: "Sdggmrss T3000e Doble Canguro P400",
        wagonType: "POCKET_WAGON_P400",
        numberOfAxles: 6,
        tareWeightTonnes: 34.0,
        lengthOverBuffersMeters: 34.03,
        maxBrakedWeightTonnes: 92.0,
        maxPayloadCategoryA: 62.0,
        maxPayloadCategoryB: 74.0,
        maxPayloadCategoryC: 86.0,
        maxPayloadCategoryD: 101.0,
        isP400Certified: true,
        status: "AVAILABLE",
        createdAt: new Date().toISOString(),
      },
      {
        id: "wgn_t3000e_02",
        uicWagonNumber: "33 84 4961 202-6",
        wagonSeries: "Sdggmrss T3000e Doble Canguro P400",
        wagonType: "POCKET_WAGON_P400",
        numberOfAxles: 6,
        tareWeightTonnes: 34.0,
        lengthOverBuffersMeters: 34.03,
        maxBrakedWeightTonnes: 92.0,
        maxPayloadCategoryA: 62.0,
        maxPayloadCategoryB: 74.0,
        maxPayloadCategoryC: 86.0,
        maxPayloadCategoryD: 101.0,
        isP400Certified: true,
        status: "AVAILABLE",
        createdAt: new Date().toISOString(),
      },
      {
        id: "wgn_sgnss_01",
        uicWagonNumber: "33 80 4552 301-4",
        wagonSeries: "Sgnss 60' Plataforma Simple",
        wagonType: "CONTAINER_FLATBED",
        numberOfAxles: 4,
        tareWeightTonnes: 20.0,
        lengthOverBuffersMeters: 19.74,
        maxBrakedWeightTonnes: 56.0,
        maxPayloadCategoryA: 44.0,
        maxPayloadCategoryB: 52.0,
        maxPayloadCategoryC: 60.0,
        maxPayloadCategoryD: 70.0,
        isP400Certified: false,
        status: "AVAILABLE",
        createdAt: new Date().toISOString(),
      },
    ])
    .onConflictDoNothing();

  // 4. Rail Consignments (CIM Notes)
  await db
    .insert(schema.railConsignments)
    .values([
      {
        id: "cim_2026_8801",
        cimNumber: "CIM-2026-8801",
        senderName: "Cerámicas del Mediterráneo SA",
        senderAddress: "Av. del Puerto 120, 46024 Valencia",
        senderVat: "ESA46892019",
        consigneeName: "Rheinland Baustoffe GmbH",
        consigneeAddress: "Kruppstraße 45, 47051 Duisburg, Alemania",
        consigneeVat: "DE812390184",
        originTerminalId: "term_valencia_fsl",
        destinationTerminalId: "term_duisburg_dit",
        gaugeTransferTerminalId: "term_portbou",
        corridorId: "corridor_rfc6_med",
        railwayUndertakingRu: "Captrain España / DB Cargo AG",
        declaredGoodsDescription:
          "Pavimentos y baldosas cerámicas esmaltadas en contenedores 40' HC",
        nhmCommodityCode: "690721",
        totalGrossMassTonnes: 114.5,
        totalTeu: 8,
        commercialContractRef: "CTR-2026-CERAM-01",
        customsStatus: "UNION_GOODS",
        status: "IN_TRANSIT",
        departureDate: "2026-08-27T20:00:00Z",
        estimatedArrivalDate: "2026-08-30T06:00:00Z",
        responsibleRailwayOfficer: "Marc Vidal (Inspector de Tracción CIM)",
        remarks:
          "Tráfico regular en tren bloque refrigerado y seco por Corredor Mediterráneo vía Portbou.",
        createdAt: new Date().toISOString(),
      },
      {
        id: "cim_2026_8802",
        cimNumber: "CIM-2026-8802",
        senderName: "Iberian Automotive Logistics SL",
        senderAddress: "Polígono PLAZA Calle Turiaso 14, 50197 Zaragoza",
        senderVat: "ESA50981244",
        consigneeName: "Luxembourg Assembly Works SARL",
        consigneeAddress:
          "Zone Industrielle Schéleck, 3225 Bettembourg, Luxemburgo",
        consigneeVat: "LU19827364",
        originTerminalId: "term_zaragoza_plaza",
        destinationTerminalId: "term_bettembourg",
        gaugeTransferTerminalId: "term_hendaye",
        corridorId: "corridor_rfc4_atl",
        railwayUndertakingRu: "Renfe Mercancías / VIIA Lorry-Rail",
        declaredGoodsDescription:
          "Semirremolques P400 cargados con componentes automotrices",
        nhmCommodityCode: "870829",
        totalGrossMassTonnes: 68.0,
        totalTeu: 4,
        commercialContractRef: "CTR-2026-AUTO-LUX",
        customsStatus: "UNION_GOODS",
        status: "GAUGE_TRANSFERRED",
        departureDate: "2026-08-26T18:00:00Z",
        estimatedArrivalDate: "2026-08-29T12:00:00Z",
        responsibleRailwayOfficer:
          "Elena Montero (Coordinadora Autopista Ferroviaria)",
        remarks:
          "Servicio de autopista ferroviaria P400 sobre vagones canguro T3000e vía Hendaya.",
        createdAt: new Date().toISOString(),
      },
      {
        id: "cim_2026_8803",
        cimNumber: "CIM-2026-8803",
        senderName: "Laboratorios Farma Ibérica SL",
        senderAddress: "Carrer del Foc 88, 08038 Barcelona",
        senderVat: "ESA08992176",
        consigneeName: "BioPharma Rhône-Alpes SAS",
        consigneeAddress: "Rue de la Villette 12, 69003 Lyon, Francia",
        consigneeVat: "FR449182736",
        originTerminalId: "term_can_tunis",
        destinationTerminalId: "term_bettembourg",
        corridorId: "corridor_rfc6_med",
        railwayUndertakingRu: "Renfe Mercancías / SNCF Fret",
        declaredGoodsDescription:
          "Contenedores 45' PW refrigerados (+2°C a +8°C) con especialidades farmacéuticas",
        nhmCommodityCode: "300490",
        totalGrossMassTonnes: 42.0,
        totalTeu: 4,
        commercialContractRef: "CTR-2026-PHARMA-LYON",
        customsStatus: "UNION_GOODS",
        status: "PLANNED",
        departureDate: "2026-08-29T22:00:00Z",
        estimatedArrivalDate: "2026-08-31T08:00:00Z",
        responsibleRailwayOfficer:
          "Dra. Elena Ruiz (Directora Técnica GDP / Ferrocarril)",
        remarks:
          "Tracción directa en ancho estándar UIC (1.435 mm) desde Barcelona Can Tunis sin cambio de ancho.",
        createdAt: new Date().toISOString(),
      },
    ])
    .onConflictDoNothing();

  // 5. Rail Train Consists (Trenes Bloque)
  await db
    .insert(schema.railTrainConsists)
    .values([
      {
        id: "train_tr_89201",
        trainRunNumber: "TR-89201",
        locomotiveSeries: "Stadler Eurodual 6000 (Bitensión 25kV / 3kV)",
        locomotiveLengthMeters: 23.0,
        locomotiveWeightTonnes: 123.0,
        locomotiveBrakedWeightTonnes: 110.0,
        corridorId: "corridor_rfc6_med",
        originTerminalId: "term_can_tunis",
        destinationTerminalId: "term_duisburg_dit",
        maxAllowedLengthMeters: 750,
        totalTrainLengthMeters: 554.7,
        totalGrossMassTonnes: 1180.0,
        totalBrakedMassTonnes: 890.0,
        calculatedBrakePercentage: 75.42, // (890 / 1180) * 100
        requiredBrakePercentage: 65.0,
        isLengthCompliant: true,
        isBrakeCompliant: true,
        status: "FORMED",
        driverName: "Alejandro Gómez (Maquinista Habilitado ERTMS N2)",
        tractionOperator: "Captrain España SA",
        departureTimestamp: "2026-08-28T23:30:00Z",
        arrivalTimestamp: "2026-08-30T14:00:00Z",
        createdAt: new Date().toISOString(),
      },
      {
        id: "train_tr_94102",
        trainRunNumber: "TR-94102",
        locomotiveSeries: "Bombardier Traxx MS3 (Cuadritensión Interoperable)",
        locomotiveLengthMeters: 19.5,
        locomotiveWeightTonnes: 86.0,
        locomotiveBrakedWeightTonnes: 78.0,
        corridorId: "corridor_rfc4_atl",
        originTerminalId: "term_hendaye",
        destinationTerminalId: "term_bettembourg",
        maxAllowedLengthMeters: 750,
        totalTrainLengthMeters: 564.0,
        totalGrossMassTonnes: 1240.0,
        totalBrakedMassTonnes: 946.0,
        calculatedBrakePercentage: 76.29,
        requiredBrakePercentage: 68.0,
        isLengthCompliant: true,
        isBrakeCompliant: true,
        status: "DISPATCHED",
        driverName: "Jean-Luc Dubois (Conducteur Principal SNCF)",
        tractionOperator: "VIIA / SNCF Réseau",
        departureTimestamp: "2026-08-28T19:00:00Z",
        arrivalTimestamp: "2026-08-29T11:00:00Z",
        createdAt: new Date().toISOString(),
      },
    ])
    .onConflictDoNothing();

  // 6. Rail Train Wagon Allocations
  await db
    .insert(schema.railTrainWagonAllocations)
    .values([
      {
        id: "alloc_01",
        trainConsistId: "train_tr_89201",
        consignmentId: "cim_2026_8801",
        wagonId: "wgn_sggmrss_01",
        positionInTrain: 1,
        utiType: "CONTAINER_40",
        utiIdentification: "MSCU9928192",
        payloadMassTonnes: 26.5,
        grossWagonMassTonnes: 55.0, // 28.5 + 26.5
        calculatedAxleLoadTonnes: 9.17, // 55 / 6
        maxAllowedAxleLoadTonnes: 22.5,
        isAxleLoadCompliant: true,
        sealNumber: "ES-VAL-991823",
        createdAt: new Date().toISOString(),
      },
      {
        id: "alloc_02",
        trainConsistId: "train_tr_89201",
        consignmentId: "cim_2026_8801",
        wagonId: "wgn_sggmrss_02",
        positionInTrain: 2,
        utiType: "CONTAINER_40",
        utiIdentification: "CMAU8817201",
        payloadMassTonnes: 28.0,
        grossWagonMassTonnes: 56.5, // 28.5 + 28.0
        calculatedAxleLoadTonnes: 9.42, // 56.5 / 6
        maxAllowedAxleLoadTonnes: 22.5,
        isAxleLoadCompliant: true,
        sealNumber: "ES-VAL-991824",
        createdAt: new Date().toISOString(),
      },
      {
        id: "alloc_03",
        trainConsistId: "train_tr_94102",
        consignmentId: "cim_2026_8802",
        wagonId: "wgn_t3000e_01",
        positionInTrain: 1,
        utiType: "SEMITRAILER_P400",
        utiIdentification: "E-4819-KLP",
        payloadMassTonnes: 34.0,
        grossWagonMassTonnes: 68.0, // 34.0 + 34.0
        calculatedAxleLoadTonnes: 11.33, // 68 / 6
        maxAllowedAxleLoadTonnes: 22.5,
        isAxleLoadCompliant: true,
        sealNumber: "VIIA-P400-8812",
        createdAt: new Date().toISOString(),
      },
    ])
    .onConflictDoNothing();

  console.log(
    "✅ Creados Corredores TEN-T, Terminales Intermodales, Vagones y Expedientes CIM.",
  );

  // 17. CUSTOMS WAREHOUSE, FREE ZONE & SPECIAL REGIMES
  await db
    .insert(schema.customsFacilities)
    .values([
      {
        id: "fac_da_bcn_zal",
        facilityCode: "ES-DA-08001-ZAL",
        name: "Depósito Aduanero ZAL Port Barcelona",
        facilityType: "CUSTOMS_WAREHOUSE_DA",
        customsAuthorityAuthorizationRef: "ES-AET-2024-DA-4910",
        managingOperatorName: "Atlas Logistics Port Services S.A.",
        locationAddress: "Av. Ports d'Europa 100, Sector ZAL Prat",
        city: "Barcelona",
        countryCode: "ES",
        totalPalletCapacity: 15000,
        occupiedPallets: 8420,
        totalVolumeM3: 35000.0,
        maxStayDaysLimit: null, // Ilimitado en DA
        isReeferCertified: true,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "fac_dda_mad_cos",
        facilityCode: "ES-DDA-28002-COS",
        name: "Depósito Distinto del Aduanero Coslada Hub",
        facilityType: "NON_CUSTOMS_WAREHOUSE_DDA",
        customsAuthorityAuthorizationRef: "ES-AET-2023-DDA-1822",
        managingOperatorName: "Atlas Logistics Central Hub S.L.",
        locationAddress: "Centro de Carga Aérea & Intermodal Coslada, Nave 4",
        city: "Madrid",
        countryCode: "ES",
        totalPalletCapacity: 12000,
        occupiedPallets: 5100,
        totalVolumeM3: 28000.0,
        maxStayDaysLimit: null,
        isReeferCertified: false,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "fac_adt_vlc_port",
        facilityCode: "ES-ADT-46003-VLC",
        name: "Almacén de Depósito Temporal Valencia Muelle Sur",
        facilityType: "TEMPORARY_STORAGE_ADT",
        customsAuthorityAuthorizationRef: "ES-AET-2025-ADT-7701",
        managingOperatorName: "Atlas Intermodal Valencia S.L.",
        locationAddress: "Muelle de la Xitxarra s/n, Recinto Portuario",
        city: "Valencia",
        countryCode: "ES",
        totalPalletCapacity: 8500,
        occupiedPallets: 3200,
        totalVolumeM3: 20000.0,
        maxStayDaysLimit: 90, // Límite legal 90 días Art. 149 CAU
        isReeferCertified: true,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "fac_zf_cadiz",
        facilityCode: "ES-ZF-11004-CAD",
        name: "Consorcio Zona Franca de Cádiz - Recinto Fiscal",
        facilityType: "FREE_ZONE_ZF",
        customsAuthorityAuthorizationRef: "ES-AET-2022-ZF-0012",
        managingOperatorName: "Consorcio de la Zona Franca de Cádiz",
        locationAddress: "Calle Ronda de Vigilancia s/n",
        city: "Cádiz",
        countryCode: "ES",
        totalPalletCapacity: 25000,
        occupiedPallets: 14200,
        totalVolumeM3: 60000.0,
        maxStayDaysLimit: null,
        isReeferCertified: true,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.customsGuarantees)
    .values([
      {
        id: "guar_santander_bcn",
        guaranteeReferenceNumber: "GRN-2026-AEAT-00918",
        customsOfficeCode: "ES000801",
        guarantorFinancialInstitution: "Banco Santander S.A.",
        totalGuaranteeAmountEur: 1500000.0,
        committedSuspendedDebtEur: 127635.0, // 73500 + 54135
        availableCreditEur: 1372365.0,
        validFromDate: "2026-01-01T00:00:00Z",
        expiryDate: "2026-12-31T23:59:59Z",
        status: "ACTIVE",
        remarks:
          "Aval global bancario permanente para operaciones de Depósito Aduanero ante la Dependencia Regional de Aduanas e IIEE de Cataluña.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "guar_bbva_mad",
        guaranteeReferenceNumber: "GRN-2026-AEAT-00445",
        customsOfficeCode: "ES002801",
        guarantorFinancialInstitution: "Banco Bilbao Vizcaya Argentaria (BBVA)",
        totalGuaranteeAmountEur: 800000.0,
        committedSuspendedDebtEur: 89080.8, // 55336.8 + 33744
        availableCreditEur: 710919.2,
        validFromDate: "2026-01-01T00:00:00Z",
        expiryDate: "2026-12-31T23:59:59Z",
        status: "ACTIVE",
        remarks:
          "Garantía global aduanera para Almacén de Depósito Temporal y DDA en Madrid Barajas / Coslada.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.customsInventoryLots)
    .values([
      {
        id: "lot_elec_semi_01",
        lotNumber: "LOT-2026-DA-08101",
        facilityId: "fac_da_bcn_zal",
        guaranteeId: "guar_santander_bcn",
        inclusionDvdNumber: "DVD-2026-7100-00412",
        inclusionDuaMrn: "26ES00080100412891",
        customsRegimeCode: "7100",
        ownerCompanyName: "IberMicro Electronics S.L.",
        ownerTaxIdEori: "ESB88491029",
        taricCommodityCode: "8542319000",
        goodsDescription:
          "Microprocesadores y circuitos integrados monolíticos para automoción",
        originCountryCode: "TW",
        initialPackageCount: 120,
        currentPackageCount: 100, // 20 descargados
        initialGrossMassKg: 2400.0,
        currentGrossMassKg: 2000.0,
        initialNetMassKg: 2100.0,
        currentNetMassKg: 1750.0,
        customsValueEur: 350000.0,
        dutyTariffRatePercent: 0.0,
        importVatRatePercent: 21.0,
        suspendedDutyAmountEur: 0.0,
        suspendedVatAmountEur: 73500.0,
        totalSuspendedDebtEur: 73500.0,
        inclusionDate: "2026-07-15T10:30:00Z",
        maxStayDeadlineDate: null,
        status: "PARTIALLY_DISCHARGED",
        warehouseLocationRack: "RACK-E-14-02",
        responsibleCustomsAgent: "Carles Puigvert (Agente Colegiado 881)",
        remarks:
          "Mercancía tecnológica de alto valor en custodia aduanera con control de humedad.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "lot_alum_coils_02",
        lotNumber: "LOT-2026-DA-08102",
        facilityId: "fac_da_bcn_zal",
        guaranteeId: "guar_santander_bcn",
        inclusionDvdNumber: "DVD-2026-7100-00413",
        inclusionDuaMrn: "26ES00080100412892",
        customsRegimeCode: "7100",
        ownerCompanyName: "Aluminios Ibéricos Industriales S.A.",
        ownerTaxIdEori: "ESA28941038",
        taricCommodityCode: "7606129200",
        goodsDescription:
          "Chapas y bandas laminadas de aleación de aluminio de espesor > 0,2 mm",
        originCountryCode: "IN",
        initialPackageCount: 24,
        currentPackageCount: 18, // 6 reexportadas
        initialGrossMassKg: 48000.0,
        currentGrossMassKg: 36000.0,
        initialNetMassKg: 47500.0,
        currentNetMassKg: 35625.0,
        customsValueEur: 180000.0,
        dutyTariffRatePercent: 7.5,
        importVatRatePercent: 21.0,
        suspendedDutyAmountEur: 13500.0,
        suspendedVatAmountEur: 40635.0,
        totalSuspendedDebtEur: 54135.0,
        inclusionDate: "2026-08-01T08:00:00Z",
        maxStayDeadlineDate: null,
        status: "PARTIALLY_DISCHARGED",
        warehouseLocationRack: "ZONA-PESADA-P04",
        responsibleCustomsAgent: "Carles Puigvert (Agente Colegiado 881)",
        remarks: "Bobinas con certificado CBAM verificado por instalación.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "lot_mach_robot_03",
        lotNumber: "LOT-2026-ADT-46101",
        facilityId: "fac_adt_vlc_port",
        guaranteeId: "guar_bbva_mad",
        inclusionDvdNumber: "ADT-2026-VLC-00891",
        inclusionDuaMrn: "26ES00460100781290",
        customsRegimeCode: "ADT_STAY",
        ownerCompanyName: "Robótica Avanzada del Mediterráneo S.L.",
        ownerTaxIdEori: "ESB96102834",
        taricCommodityCode: "8479899790",
        goodsDescription:
          "Brazos robóticos multieje para líneas de montaje automatizado",
        originCountryCode: "JP",
        initialPackageCount: 8,
        currentPackageCount: 8,
        initialGrossMassKg: 16000.0,
        currentGrossMassKg: 16000.0,
        initialNetMassKg: 15200.0,
        currentNetMassKg: 15200.0,
        customsValueEur: 240000.0,
        dutyTariffRatePercent: 1.7,
        importVatRatePercent: 21.0,
        suspendedDutyAmountEur: 4080.0,
        suspendedVatAmountEur: 51256.8,
        totalSuspendedDebtEur: 55336.8,
        inclusionDate: "2026-08-10T14:20:00Z",
        maxStayDeadlineDate: "2026-11-08T23:59:59Z", // 90 días
        status: "ACTIVE",
        warehouseLocationRack: "ADT-BAY-02",
        responsibleCustomsAgent: "Vicente Blasco (Agente Colegiado 412)",
        remarks:
          "En espera de decisión de destino aduanero definitivo antes de 90 días.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "lot_textile_garments_04",
        lotNumber: "LOT-2026-DDA-28101",
        facilityId: "fac_dda_mad_cos",
        guaranteeId: "guar_bbva_mad",
        inclusionDvdNumber: "DVD-2026-7600-00105",
        inclusionDuaMrn: "26ES00280100105821",
        customsRegimeCode: "7600",
        ownerCompanyName: "Moda & Logística Internacional S.A.",
        ownerTaxIdEori: "ESA28019284",
        taricCommodityCode: "6109100010",
        goodsDescription:
          "Camisetas de punto de algodón orgánico para distribución comunitaria",
        originCountryCode: "TR",
        initialPackageCount: 500,
        currentPackageCount: 500,
        initialGrossMassKg: 7500.0,
        currentGrossMassKg: 7500.0,
        initialNetMassKg: 7100.0,
        currentNetMassKg: 7100.0,
        customsValueEur: 95000.0,
        dutyTariffRatePercent: 12.0,
        importVatRatePercent: 21.0,
        suspendedDutyAmountEur: 11400.0,
        suspendedVatAmountEur: 22344.0,
        totalSuspendedDebtEur: 33744.0,
        inclusionDate: "2026-08-18T11:00:00Z",
        maxStayDeadlineDate: null,
        status: "ACTIVE",
        warehouseLocationRack: "TEXTIL-RACK-08",
        responsibleCustomsAgent: "Elena Morales (Agente Colegiado 620)",
        remarks:
          "Régimen DDA con exención de IVA en entregas sucesivas intracomunitarias.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.customsStockLedgerEntries)
    .values([
      {
        id: "led_entry_001",
        entrySequentialNumber: 1001,
        lotId: "lot_elec_semi_01",
        facilityId: "fac_da_bcn_zal",
        movementType: "INCLUSION_BONDING",
        documentReference: "DVD-2026-7100-00412 (DUA 26ES00080100412891)",
        packagesDelta: 120,
        packagesBalanceAfter: 120,
        grossMassDeltaKg: 2400.0,
        grossMassBalanceAfterKg: 2400.0,
        releasedSuspendedDebtEur: 0.0,
        movementTimestamp: "2026-07-15T10:35:00Z",
        authorizedOfficerOrAgent: "Carles Puigvert",
        notes:
          "Inclusión y vinculación reglamentaria en Depósito Aduanero público bajo régimen 7100.",
        createdAt: new Date().toISOString(),
      },
      {
        id: "led_entry_002",
        entrySequentialNumber: 1002,
        lotId: "lot_elec_semi_01",
        facilityId: "fac_da_bcn_zal",
        movementType: "USUAL_HANDLING_ART220",
        documentReference: "AUT-MANIP-2026-08101",
        packagesDelta: 0,
        packagesBalanceAfter: 120,
        grossMassDeltaKg: 0.0,
        grossMassBalanceAfterKg: 2400.0,
        releasedSuspendedDebtEur: 0.0,
        movementTimestamp: "2026-07-22T09:15:00Z",
        authorizedOfficerOrAgent: "Carles Puigvert",
        notes:
          "Manipulación usual autorizada Art. 220 CAU: Etiquetado de trazabilidad CE y sobreembalaje protector.",
        createdAt: new Date().toISOString(),
      },
      {
        id: "led_entry_003",
        entrySequentialNumber: 1003,
        lotId: "lot_elec_semi_01",
        facilityId: "fac_da_bcn_zal",
        movementType: "PARTIAL_DISCHARGE",
        documentReference: "DVD-OUT-2026-00301 (DUA 26ES00080100910011)",
        packagesDelta: -20,
        packagesBalanceAfter: 100,
        grossMassDeltaKg: -400.0,
        grossMassBalanceAfterKg: 2000.0,
        releasedSuspendedDebtEur: 12250.0, // (20/120) * 73500
        movementTimestamp: "2026-08-12T16:00:00Z",
        authorizedOfficerOrAgent: "Carles Puigvert",
        notes:
          "Desvinculación parcial para Despacho a Libre Práctica (Régimen 4071) con pago de IVA.",
        createdAt: new Date().toISOString(),
      },
      {
        id: "led_entry_004",
        entrySequentialNumber: 1004,
        lotId: "lot_alum_coils_02",
        facilityId: "fac_da_bcn_zal",
        movementType: "INCLUSION_BONDING",
        documentReference: "DVD-2026-7100-00413 (DUA 26ES00080100412892)",
        packagesDelta: 24,
        packagesBalanceAfter: 24,
        grossMassDeltaKg: 48000.0,
        grossMassBalanceAfterKg: 48000.0,
        releasedSuspendedDebtEur: 0.0,
        movementTimestamp: "2026-08-01T08:10:00Z",
        authorizedOfficerOrAgent: "Carles Puigvert",
        notes:
          "Inclusión de bobinas de aluminio bajo régimen 7100 con aval Santander.",
        createdAt: new Date().toISOString(),
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.customsDischargeDeclarations)
    .values([
      {
        id: "dvd_out_2026_01",
        dischargeDeclarationNumber: "DVD-OUT-2026-00301",
        lotId: "lot_elec_semi_01",
        dischargeRegimeCode: "4071",
        dischargeDuaMrn: "26ES00080100910011",
        dischargedPackagesCount: 20,
        dischargedGrossMassKg: 400.0,
        dischargedCustomsValueEur: 58333.33,
        settledDutyAmountEur: 0.0,
        settledVatAmountEur: 12250.0,
        totalSettledTaxesEur: 12250.0,
        releasedGuaranteeCreditEur: 12250.0,
        destinationConsigneeName: "Automotive Chips Europa S.A.",
        destinationCountryCode: "ES",
        dischargeDate: "2026-08-12T16:00:00Z",
        status: "AUTHORIZED_RELEASE",
        customsClearanceOfficer: "Elena Morales (Inspectora de Aduanas)",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "dvd_out_2026_02",
        dischargeDeclarationNumber: "DVD-OUT-2026-00302",
        lotId: "lot_alum_coils_02",
        dischargeRegimeCode: "3171",
        dischargeDuaMrn: "26ES00080100910012",
        dischargedPackagesCount: 6,
        dischargedGrossMassKg: 12000.0,
        dischargedCustomsValueEur: 45000.0,
        settledDutyAmountEur: 0.0,
        settledVatAmountEur: 0.0,
        totalSettledTaxesEur: 0.0, // Exención por reexportación a tercer país
        releasedGuaranteeCreditEur: 13533.75, // (6/24) * 54135
        destinationConsigneeName: "Maghreb Aluminium Extrusion SARL",
        destinationCountryCode: "MA",
        dischargeDate: "2026-08-20T11:30:00Z",
        status: "AUTHORIZED_RELEASE",
        customsClearanceOfficer: "Elena Morales (Inspectora de Aduanas)",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ])
    .onConflictDoNothing();

  console.log(
    "✅ Creadas Instalaciones Aduaneras (DA/DDA/ADT/ZF), Avales Globales, Lotes y Libro de Existencias.",
  );

  // 17. Seed FuelEU Maritime & Descarbonización Marítima (Reg. UE 2023/1805 & Dir. UE 2023/959)
  await db
    .insert(schema.marineFuels)
    .values([
      {
        id: "fuel_vlsfo",
        fuelCode: "FOSSIL_VLSFO",
        fuelName: "Very Low Sulphur Fuel Oil (VLSFO 0.5% S)",
        fuelCategory: "FOSSIL_LIQUID",
        lowerCalorificValueMjPerGram: 0.041,
        wttFactorGco2eqPerMj: 13.5,
        ttwFactorGco2eqPerMj: 77.66,
        totalWtwFactorGco2eqPerMj: 91.16, // Línea base de referencia reglamentaria
        methaneSlipPercent: 0.0,
        averageMarketPriceUsdPerTonne: 620.0,
        isRfnboCompliant: false,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "fuel_mgo",
        fuelCode: "FOSSIL_MGO",
        fuelName: "Marine Gas Oil (MGO DMA 0.1% S)",
        fuelCategory: "FOSSIL_LIQUID",
        lowerCalorificValueMjPerGram: 0.0427,
        wttFactorGco2eqPerMj: 14.4,
        ttwFactorGco2eqPerMj: 76.2,
        totalWtwFactorGco2eqPerMj: 90.6,
        methaneSlipPercent: 0.0,
        averageMarketPriceUsdPerTonne: 780.0,
        isRfnboCompliant: false,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "fuel_hfo",
        fuelCode: "FOSSIL_HFO_SCRUBBER",
        fuelName: "Heavy Fuel Oil con Scrubber (HFO 3.5% S + EGCS)",
        fuelCategory: "FOSSIL_LIQUID",
        lowerCalorificValueMjPerGram: 0.0405,
        wttFactorGco2eqPerMj: 13.5,
        ttwFactorGco2eqPerMj: 78.8,
        totalWtwFactorGco2eqPerMj: 92.3,
        methaneSlipPercent: 0.0,
        averageMarketPriceUsdPerTonne: 490.0,
        isRfnboCompliant: false,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "fuel_lng_otto",
        fuelCode: "FOSSIL_LNG_OTTO",
        fuelName: "Gas Natural Licuado (LNG Dual-Fuel Motor Otto)",
        fuelCategory: "FOSSIL_GAS_LNG",
        lowerCalorificValueMjPerGram: 0.0491,
        wttFactorGco2eqPerMj: 18.5,
        ttwFactorGco2eqPerMj: 56.4,
        totalWtwFactorGco2eqPerMj: 74.9, // Incluye deslizamiento de metano CH4
        methaneSlipPercent: 3.1,
        averageMarketPriceUsdPerTonne: 710.0,
        isRfnboCompliant: false,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "fuel_bio_mgo_hvo",
        fuelCode: "BIO_MGO_HVO",
        fuelName: "Bio-MGO / Hidrobiodiésel (HVO 100% Biogénico)",
        fuelCategory: "BIOFUEL",
        lowerCalorificValueMjPerGram: 0.044,
        wttFactorGco2eqPerMj: 15.0,
        ttwFactorGco2eqPerMj: 0.0, // Cero emisiones netas Tank-to-Wake
        totalWtwFactorGco2eqPerMj: 15.0,
        methaneSlipPercent: 0.0,
        averageMarketPriceUsdPerTonne: 1250.0,
        isRfnboCompliant: false,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "fuel_bio_lng",
        fuelCode: "BIO_LNG",
        fuelName: "Bio-LNG (Biometano Licuado de Residuos)",
        fuelCategory: "BIOFUEL",
        lowerCalorificValueMjPerGram: 0.0491,
        wttFactorGco2eqPerMj: 12.0,
        ttwFactorGco2eqPerMj: 0.0,
        totalWtwFactorGco2eqPerMj: 12.0,
        methaneSlipPercent: 1.5,
        averageMarketPriceUsdPerTonne: 1100.0,
        isRfnboCompliant: false,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "fuel_e_methanol",
        fuelCode: "E_METHANOL_RFNBO",
        fuelName: "E-Metanol Verde Sintético (RFNBO Certificado)",
        fuelCategory: "RFNBO_E_FUEL",
        lowerCalorificValueMjPerGram: 0.0199,
        wttFactorGco2eqPerMj: 5.2,
        ttwFactorGco2eqPerMj: 0.0,
        totalWtwFactorGco2eqPerMj: 5.2, // Reducción > 94% respecto a base
        methaneSlipPercent: 0.0,
        averageMarketPriceUsdPerTonne: 1450.0,
        isRfnboCompliant: true,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "fuel_electricity_ops",
        fuelCode: "ELECTRICITY_OPS",
        fuelName: "Electricidad en Muelle (OPS - Onshore Power Supply)",
        fuelCategory: "ELECTRICITY_OPS",
        lowerCalorificValueMjPerGram: 0.0036, // 1 kWh = 3.6 MJ
        wttFactorGco2eqPerMj: 28.0, // Mix eléctrico red europea
        ttwFactorGco2eqPerMj: 0.0,
        totalWtwFactorGco2eqPerMj: 28.0,
        methaneSlipPercent: 0.0,
        averageMarketPriceUsdPerTonne: 180.0,
        isRfnboCompliant: false,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.marineVessels)
    .values([
      {
        id: "ves_atlas_med",
        imoNumber: "9811012",
        vesselName: "Atlas Mediterranean",
        vesselType: "CONTAINER_SHIP",
        flagState: "ES", // España
        grossTonnageGt: 148500,
        deadweightTonnageDwt: 165000.0,
        teuCapacity: 15200,
        mainEngineType: "TWO_STROKE_SLOW_SPEED_DIESEL",
        hasOpsConnectionInstalled: true,
        operatingShippingLine: "Atlas Mediterranean Line S.A.",
        docHolderCompany: "Atlas Maritime Shipmanagement Ltd.",
        classificationSociety: "DNV",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "ves_iberian_voyager",
        imoNumber: "9923410",
        vesselName: "Iberian Voyager",
        vesselType: "CONTAINER_SHIP",
        flagState: "PT", // Madeira (Portugal)
        grossTonnageGt: 96000,
        deadweightTonnageDwt: 110000.0,
        teuCapacity: 9200,
        mainEngineType: "DUAL_FUEL_METHANOL",
        hasOpsConnectionInstalled: true,
        operatingShippingLine: "Atlas Green Shipping Lines",
        docHolderCompany: "Atlas Maritime Shipmanagement Ltd.",
        classificationSociety: "Bureau Veritas",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "ves_valencia_express",
        imoNumber: "9789123",
        vesselName: "Valencia Express Feeder",
        vesselType: "CONTAINER_SHIP",
        flagState: "CY", // Chipre
        grossTonnageGt: 28400,
        deadweightTonnageDwt: 34000.0,
        teuCapacity: 2600,
        mainEngineType: "DUAL_FUEL_LNG_OTTO",
        hasOpsConnectionInstalled: true,
        operatingShippingLine: "Marítima Valenciana Feeder Hub",
        docHolderCompany: "Valenciana Marine Ops S.L.",
        classificationSociety: "Lloyd's Register",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "ves_cadiz_bulk",
        imoNumber: "9654321",
        vesselName: "Cádiz Bulk Trader",
        vesselType: "BULK_CARRIER",
        flagState: "ES",
        grossTonnageGt: 43200,
        deadweightTonnageDwt: 82000.0,
        teuCapacity: 0,
        mainEngineType: "TWO_STROKE_SLOW_SPEED_DIESEL",
        hasOpsConnectionInstalled: false,
        operatingShippingLine: "Transmed Bulk Transport S.A.",
        docHolderCompany: "Transmed Maritime Corp.",
        classificationSociety: "RINA",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.marineVoyages)
    .values([
      {
        id: "voy_2026_01",
        voyageReferenceNumber: "VOY-2026-MED-0101",
        vesselId: "ves_atlas_med",
        departurePortLocode: "ESVLC",
        departurePortName: "Puerto de Valencia (España)",
        arrivalPortLocode: "ITGOA",
        arrivalPortName: "Porto di Genova (Italia)",
        geographicScope: "INTRA_EU_100", // 100% de cobertura EU ETS & FuelEU
        distanceNauticalMiles: 480.0,
        departureDate: "2026-08-01T08:00:00Z",
        arrivalDate: "2026-08-03T12:00:00Z",
        navigationHours: 52.0,
        berthHours: 24.0,
        fuelId: "fuel_vlsfo",
        fuelConsumedTonnes: 85.0,
        opsElectricityConsumedKwh: 12500.0,
        totalEnergyConsumedMj: 85.0 * 1000 * 41.0 + 12500.0 * 3.6, // 3,485,000 MJ + 45,000 MJ = 3,530,000 MJ
        calculatedGhgIntensityGco2eqPerMj: 90.35, // Ligeramente por encima de 89.34 g/MJ (genera leve déficit)
        co2EmissionsTonnes: 264.77,
        ch4EmissionsTonnes: 0.005,
        n2oEmissionsTonnes: 0.012,
        totalGhgEmissionsScopeTco2eq: 268.09,
        etsApplicableScopeEmissionsTco2eq: 268.09, // 100%
        carriedTeuCount: 4200,
        status: "COMPLETED_VERIFIED",
        leadAuditorVerifier: "Jean-Paul Sartre (DNV Lead Auditor)",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "voy_2026_02",
        voyageReferenceNumber: "VOY-2026-ATL-0202",
        vesselId: "ves_iberian_voyager",
        departurePortLocode: "ESBCN",
        departurePortName: "Port de Barcelona (España)",
        arrivalPortLocode: "NLRTM",
        arrivalPortName: "Port of Rotterdam (Países Bajos)",
        geographicScope: "INTRA_EU_100",
        distanceNauticalMiles: 1850.0,
        departureDate: "2026-08-05T10:00:00Z",
        arrivalDate: "2026-08-10T18:00:00Z",
        navigationHours: 128.0,
        berthHours: 32.0,
        fuelId: "fuel_e_methanol",
        fuelConsumedTonnes: 140.0,
        opsElectricityConsumedKwh: 18000.0,
        totalEnergyConsumedMj: 140.0 * 1000 * 19.9 + 18000.0 * 3.6,
        calculatedGhgIntensityGco2eqPerMj: 5.72, // Masivo superávit verde (E-Metanol RFNBO)
        co2EmissionsTonnes: 0.0, // Cero fósil neto
        ch4EmissionsTonnes: 0.0,
        n2oEmissionsTonnes: 0.002,
        totalGhgEmissionsScopeTco2eq: 0.53,
        etsApplicableScopeEmissionsTco2eq: 0.53,
        carriedTeuCount: 3800,
        status: "COMPLETED_VERIFIED",
        leadAuditorVerifier: "Marc Van Houten (Bureau Veritas Marine)",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "voy_2026_03",
        voyageReferenceNumber: "VOY-2026-TRS-0303",
        vesselId: "ves_atlas_med",
        departurePortLocode: "ESALG",
        departurePortName: "Puerto de Algeciras (España)",
        arrivalPortLocode: "USNYC",
        arrivalPortName: "Port of New York & New Jersey (EE.UU.)",
        geographicScope: "EXTRA_EU_50", // 50% de cobertura bajo EU ETS & FuelEU
        distanceNauticalMiles: 3150.0,
        departureDate: "2026-08-12T06:00:00Z",
        arrivalDate: "2026-08-20T14:00:00Z",
        navigationHours: 200.0,
        berthHours: 40.0,
        fuelId: "fuel_vlsfo",
        fuelConsumedTonnes: 420.0,
        opsElectricityConsumedKwh: 0.0,
        totalEnergyConsumedMj: 420.0 * 1000 * 41.0, // 17,220,000 MJ
        calculatedGhgIntensityGco2eqPerMj: 91.16,
        co2EmissionsTonnes: 1308.3,
        ch4EmissionsTonnes: 0.02,
        n2oEmissionsTonnes: 0.06,
        totalGhgEmissionsScopeTco2eq: 1324.76,
        etsApplicableScopeEmissionsTco2eq: 662.38, // 50% extra-EU
        carriedTeuCount: 6500,
        status: "COMPLETED_VERIFIED",
        leadAuditorVerifier: "Jean-Paul Sartre (DNV Lead Auditor)",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "voy_2026_04",
        voyageReferenceNumber: "VOY-2026-VLC-0404",
        vesselId: "ves_valencia_express",
        departurePortLocode: "ESVLC",
        departurePortName: "Puerto de Valencia (Muelle MTO)",
        arrivalPortLocode: "ESVLC",
        arrivalPortName: "Puerto de Valencia (Muelle MTO)",
        geographicScope: "BERTH_PORT_EU_100", // Estancia en puerto 100% OPS
        distanceNauticalMiles: 0.0,
        departureDate: "2026-08-18T00:00:00Z",
        arrivalDate: "2026-08-19T12:00:00Z",
        navigationHours: 0.0,
        berthHours: 36.0,
        fuelId: "fuel_electricity_ops",
        fuelConsumedTonnes: 0.0,
        opsElectricityConsumedKwh: 22000.0,
        totalEnergyConsumedMj: 22000.0 * 3.6, // 79,200 MJ
        calculatedGhgIntensityGco2eqPerMj: 28.0, // Cero emisiones directas en puerto
        co2EmissionsTonnes: 0.0,
        ch4EmissionsTonnes: 0.0,
        n2oEmissionsTonnes: 0.0,
        totalGhgEmissionsScopeTco2eq: 2.22,
        etsApplicableScopeEmissionsTco2eq: 0.0, // Cero derechos al usar conexión OPS
        carriedTeuCount: 0,
        status: "AUDITED_THETIS",
        leadAuditorVerifier:
          "Almudena Grandes (Inspectora Autoridad Portuaria)",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.fuelEuPools)
    .values([
      {
        id: "pool_atlas_green_2025",
        poolCode: "POOL-2025-ATLAS-GREEN",
        poolName: "Atlas Green Alliance Compliance Pool 2025",
        reportingYear: 2025,
        managingOperatorName: "Atlas Mediterranean Line S.A.",
        totalEnrolledVesselsCount: 3,
        consolidatedNetComplianceBalanceGco2eq: 245000.0 - 120000.0 + 60000.0, // +185,000 kg CO2eq
        isPoolCompliantZeroPenalty: true,
        status: "REGISTERED_EMSA",
        remarks:
          "Pool de cumplimiento regulatorio autorizado bajo el Art. 21 del Reg. (UE) 2023/1805. El excedente del Iberian Voyager (E-Metanol) compensa íntegramente el déficit del Atlas Mediterranean (VLSFO), resultando en 0€ de penalización para la flota.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.fuelEuComplianceAccounts)
    .values([
      {
        id: "acc_iberian_2025",
        vesselId: "ves_iberian_voyager",
        reportingYear: 2025,
        targetGhgIntensityGco2eqPerMj: 89.3368, // -2% de 91.16
        actualAttainedGhgIntensityGco2eqPerMj: 5.72,
        totalAnnualEnergyMj: 2848000.0,
        complianceBalanceGco2eq: 238120000.0, // +238.12 toneladas CO2eq de superávit
        complianceStatus: "SURPLUS",
        calculatedFuelEuPenaltyEur: 0.0,
        bankedSurplusTransferredNextYearGco2eq: 53120000.0,
        borrowedDeficitFromNextYearGco2eq: 0.0,
        poolId: "pool_atlas_green_2025",
        verifierAccreditationNumber: "BV-MAR-VERIF-2025-8891",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "acc_atlas_med_2025",
        vesselId: "ves_atlas_med",
        reportingYear: 2025,
        targetGhgIntensityGco2eqPerMj: 89.3368,
        actualAttainedGhgIntensityGco2eqPerMj: 90.95,
        totalAnnualEnergyMj: 20750000.0,
        complianceBalanceGco2eq: -33470000.0, // Déficit de ~33.47 t CO2eq
        complianceStatus: "BALANCED_BY_POOL",
        calculatedFuelEuPenaltyEur: 0.0, // Neutralizado por el pool con Iberian Voyager
        bankedSurplusTransferredNextYearGco2eq: 0.0,
        borrowedDeficitFromNextYearGco2eq: 0.0,
        poolId: "pool_atlas_green_2025",
        verifierAccreditationNumber: "DNV-MAR-VERIF-2025-4412",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "acc_valencia_2025",
        vesselId: "ves_valencia_express",
        reportingYear: 2025,
        targetGhgIntensityGco2eqPerMj: 89.3368,
        actualAttainedGhgIntensityGco2eqPerMj: 74.5,
        totalAnnualEnergyMj: 4120000.0,
        complianceBalanceGco2eq: 61120000.0, // Superávit LNG + OPS
        complianceStatus: "SURPLUS",
        calculatedFuelEuPenaltyEur: 0.0,
        bankedSurplusTransferredNextYearGco2eq: 61120000.0,
        borrowedDeficitFromNextYearGco2eq: 0.0,
        poolId: "pool_atlas_green_2025",
        verifierAccreditationNumber: "LR-MAR-VERIF-2025-1109",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "acc_cadiz_bulk_2025",
        vesselId: "ves_cadiz_bulk",
        reportingYear: 2025,
        targetGhgIntensityGco2eqPerMj: 89.3368,
        actualAttainedGhgIntensityGco2eqPerMj: 91.8,
        totalAnnualEnergyMj: 12500000.0,
        complianceBalanceGco2eq: -30790000.0, // Déficit
        complianceStatus: "DEFICIT",
        calculatedFuelEuPenaltyEur: 33020.15, // Penalización a abonar si no entra en pool
        bankedSurplusTransferredNextYearGco2eq: 0.0,
        borrowedDeficitFromNextYearGco2eq: 0.0,
        poolId: null,
        verifierAccreditationNumber: "RINA-MAR-VERIF-2025-3310",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ])
    .onConflictDoNothing();

  console.log(
    "✅ Creados Combustibles Marítimos WtW, Buques, Travesías, Cuentas FuelEU y Pools de Flota.",
  );

  // ----------------------------------------------------
  // TRADE FINANCE & LETTERS OF CREDIT (UCP 600 / URDG 758 / URC 522)
  // ----------------------------------------------------
  console.log(
    "💰 Inyectando Instrumentos de Financiación de Comercio Exterior & UCP 600...",
  );

  await db
    .insert(schema.tradeCreditInstruments)
    .values([
      {
        id: "lc_bcn_2026_01",
        instrumentReference: "LC-2026-BCN-0089",
        instrumentType: "COMMERCIAL_LC_CONFIRMED",
        applicableRules: "UCP600",
        applicantCompanyId: null,
        applicantName: "Singapore Food Imports Pte Ltd",
        beneficiaryName: "Mediterranean Olive Oil Exports SL",
        beneficiaryCountry: "ES",
        issuingBankBic: "DBSSSGSGXXX",
        issuingBankName: "DBS Bank Ltd Singapore",
        confirmingBankBic: "BSCHESMMXXX",
        confirmingBankName: "Banco Santander SA Madrid",
        currency: "EUR",
        creditAmount: 145000.0,
        tolerancePercentage: 5.0,
        issueDate: "2026-08-01",
        latestShipmentDate: "2026-09-15",
        expiryDate: "2026-10-06",
        expiryPlace: "Counters of Banco Santander SA, Barcelona",
        portOfLoading: "ESBCN - Port of Barcelona",
        portOfDischarge: "SGSIN - Port of Singapore",
        goodsDescriptionSummary:
          "5,000 BOXES EXTRA VIRGIN OLIVE OIL (50,000 LITRES) CIF SINGAPORE INCOTERMS 2020",
        partialShipmentsAllowed: false,
        transhipmentAllowed: false,
        presentationPeriodDays: 21,
        confirmationInstructions: "CONFIRM",
        paymentTerms: "SIGHT",
        tenorDays: 0,
        status: "DOCUMENTS_PRESENTED",
        remarks:
          "Crédito documentario plenamente conforme. Pendiente de pago a la vista por el banco confirmador.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "lc_val_2026_02",
        instrumentReference: "LC-2026-VAL-0145",
        instrumentType: "COMMERCIAL_LC_IRREVOCABLE",
        applicableRules: "UCP600",
        applicantCompanyId: null,
        applicantName: "Manhattan Tile & Stone Design LLC",
        beneficiaryName: "Cerámicas y Gres Levantino SA",
        beneficiaryCountry: "ES",
        issuingBankBic: "CHASUS33XXX",
        issuingBankName: "JPMorgan Chase Bank NA New York",
        confirmingBankBic: "BBVAESMMXXX",
        confirmingBankName: "BBVA SA Valencia",
        currency: "USD",
        creditAmount: 320000.0,
        tolerancePercentage: 5.0,
        issueDate: "2026-07-15",
        latestShipmentDate: "2026-08-10",
        expiryDate: "2026-09-05",
        expiryPlace: "Counters of Advising Bank, Valencia",
        portOfLoading: "ESVLC - Port of Valencia",
        portOfDischarge: "USNYC - Port of New York & New Jersey",
        goodsDescriptionSummary:
          "8 FCL CONTAINERS PORCELAIN FLOOR TILES GRADE A CIF NEW YORK INCOTERMS 2020",
        partialShipmentsAllowed: true,
        transhipmentAllowed: false,
        presentationPeriodDays: 21,
        confirmationInstructions: "WITHOUT",
        paymentTerms: "ACCEPTANCE_USANCE",
        tenorDays: 60,
        status: "DISCREPANCIES_FOUND",
        remarks:
          "Discrepancias detectadas: Presentación tardía de documentos (Art. 14c) y Póliza con infraseguro (Art. 28f).",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "sblc_mad_2026_03",
        instrumentReference: "SBLC-2026-MAD-0920",
        instrumentType: "DEMAND_GUARANTEE_URDG758",
        applicableRules: "URDG758",
        applicantCompanyId: null,
        applicantName: "Atlas Renewables Project Logistics SL",
        beneficiaryName: "TenneT Offshore Wind Grid TSO BV",
        beneficiaryCountry: "NL",
        issuingBankBic: "CAIXESBBXXX",
        issuingBankName: "CaixaBank SA Madrid",
        confirmingBankBic: "INGBNL2AXXX",
        confirmingBankName: "ING Bank NV Amsterdam",
        currency: "EUR",
        creditAmount: 500000.0,
        tolerancePercentage: 0.0,
        issueDate: "2026-06-01",
        latestShipmentDate: "2026-12-31",
        expiryDate: "2027-06-30",
        expiryPlace: "Amsterdam, Netherlands",
        portOfLoading: "ESBIO - Port of Bilbao",
        portOfDischarge: "NLRTM - Port of Rotterdam",
        goodsDescriptionSummary:
          "PERFORMANCE BOND GUARANTEE FOR MULTI-MODAL HEAVY LIFT OFFSHORE WIND TURBINE TRANSPORTATION CONTRACT",
        partialShipmentsAllowed: true,
        transhipmentAllowed: true,
        presentationPeriodDays: 30,
        confirmationInstructions: "CONFIRM",
        paymentTerms: "SIGHT",
        tenorDays: 0,
        status: "ISSUED",
        remarks:
          "Garantía a primera demanda emitida bajo URDG 758. Aval bancario activo y no ejecutado.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "rem_cad_2026_04",
        instrumentReference: "REM-2026-CAD-0033",
        instrumentType: "DOC_COLLECTION_DP",
        applicableRules: "URC522",
        applicantCompanyId: null,
        applicantName: "Distribuidora Mexicana de Alimentos SA de CV",
        beneficiaryName: "Bodegas y Viñedos de Jerez SL",
        beneficiaryCountry: "ES",
        issuingBankBic: "BSABESBBXXX",
        issuingBankName: "Banco Sabadell SA Cádiz",
        confirmingBankBic: "BNMXMXMMXXX",
        confirmingBankName: "Banco Nacional de México (Citibanamex)",
        currency: "EUR",
        creditAmount: 78500.0,
        tolerancePercentage: 0.0,
        issueDate: "2026-08-10",
        latestShipmentDate: "2026-08-25",
        expiryDate: "2026-10-31",
        expiryPlace: "Veracruz, Mexico",
        portOfLoading: "ESCAD - Port of Cádiz",
        portOfDischarge: "MXVER - Port of Veracruz",
        goodsDescriptionSummary:
          "1,200 CASES JEREZ-XÉRÈS-SHERRY D.O. WINE CIF VERACRUZ INCOTERMS 2020",
        partialShipmentsAllowed: false,
        transhipmentAllowed: false,
        presentationPeriodDays: 21,
        confirmationInstructions: "WITHOUT",
        paymentTerms: "SIGHT",
        tenorDays: 0,
        status: "DOCUMENTS_PRESENTED",
        remarks:
          "Remesa documentaria contra pago (D/P) tramitada conforme a las reglas URC 522 de la CCI.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.tradeCreditDocuments)
    .values([
      // Documents for LC-2026-BCN-0089 (Compliant)
      {
        id: "doc_bcn_inv_01",
        instrumentId: "lc_bcn_2026_01",
        documentType: "COMMERCIAL_INVOICE",
        originalCopiesRequired: 3,
        originalCopiesPresented: 3,
        documentReferenceNumber: "INV-2026-MED-098",
        documentDate: "2026-08-18",
        issuerName: "Mediterranean Olive Oil Exports SL",
        shippedOnBoardDate: null,
        cleanOnBoardStatus: true,
        freightPaymentClause: "PREPAID",
        invoiceAmount: 145000.0,
        invoiceCurrency: "EUR",
        goodsDescriptionExactMatch: true,
        insuredAmount: null,
        insuredPercentageOfCif: null,
        complianceStatus: "COMPLIANT",
        remarks:
          "Descripción exacta y valor coincidente al céntimo con el crédito.",
        createdAt: new Date().toISOString(),
      },
      {
        id: "doc_bcn_bl_02",
        instrumentId: "lc_bcn_2026_01",
        documentType: "OCEAN_BILL_OF_LADING",
        originalCopiesRequired: 3,
        originalCopiesPresented: 3,
        documentReferenceNumber: "MSK-BCN-SIN-88190",
        documentDate: "2026-08-20",
        issuerName: "Maersk Line Marine Agency",
        shippedOnBoardDate: "2026-08-20",
        cleanOnBoardStatus: true,
        freightPaymentClause: "PREPAID",
        invoiceAmount: null,
        invoiceCurrency: null,
        goodsDescriptionExactMatch: true,
        insuredAmount: null,
        insuredPercentageOfCif: null,
        complianceStatus: "COMPLIANT",
        remarks:
          "Conocimiento de embarque marítimo 'Clean on Board' con flete prepagado.",
        createdAt: new Date().toISOString(),
      },
      {
        id: "doc_bcn_ins_03",
        instrumentId: "lc_bcn_2026_01",
        documentType: "INSURANCE_CERTIFICATE",
        originalCopiesRequired: 2,
        originalCopiesPresented: 2,
        documentReferenceNumber: "POL-MAPFRE-MAR-771",
        documentDate: "2026-08-19",
        issuerName: "Mapfre Global Risks SA",
        shippedOnBoardDate: null,
        cleanOnBoardStatus: true,
        freightPaymentClause: "PREPAID",
        invoiceAmount: null,
        invoiceCurrency: "EUR",
        goodsDescriptionExactMatch: true,
        insuredAmount: 159500.0, // 110% de 145,000 EUR
        insuredPercentageOfCif: 110.0,
        complianceStatus: "COMPLIANT",
        remarks:
          "Cobertura ICC (A) Todo Riesgo emitida al 110% CIF con fecha anterior al embarque.",
        createdAt: new Date().toISOString(),
      },

      // Documents for LC-2026-VAL-0145 (Discrepant)
      {
        id: "doc_val_inv_01",
        instrumentId: "lc_val_2026_02",
        documentType: "COMMERCIAL_INVOICE",
        originalCopiesRequired: 3,
        originalCopiesPresented: 3,
        documentReferenceNumber: "INV-CER-2026-044",
        documentDate: "2026-08-05",
        issuerName: "Cerámicas y Gres Levantino SA",
        shippedOnBoardDate: null,
        cleanOnBoardStatus: true,
        freightPaymentClause: "PREPAID",
        invoiceAmount: 320000.0,
        invoiceCurrency: "USD",
        goodsDescriptionExactMatch: true,
        insuredAmount: null,
        insuredPercentageOfCif: null,
        complianceStatus: "COMPLIANT",
        remarks: "Factura comercial conforme.",
        createdAt: new Date().toISOString(),
      },
      {
        id: "doc_val_bl_02",
        instrumentId: "lc_val_2026_02",
        documentType: "OCEAN_BILL_OF_LADING",
        originalCopiesRequired: 3,
        originalCopiesPresented: 3,
        documentReferenceNumber: "MSC-VAL-NYC-9921",
        documentDate: "2026-08-08",
        issuerName: "MSC Mediterranean Shipping Co",
        shippedOnBoardDate: "2026-08-08",
        cleanOnBoardStatus: true,
        freightPaymentClause: "PREPAID",
        invoiceAmount: null,
        invoiceCurrency: null,
        goodsDescriptionExactMatch: true,
        insuredAmount: null,
        insuredPercentageOfCif: null,
        complianceStatus: "DISCREPANT",
        remarks:
          "Embarque el 08/08/2026; documentos presentados al banco el 02/09/2026 (25 días transcurridos > límite de 21 días Art. 14c UCP 600).",
        createdAt: new Date().toISOString(),
      },
      {
        id: "doc_val_ins_03",
        instrumentId: "lc_val_2026_02",
        documentType: "INSURANCE_CERTIFICATE",
        originalCopiesRequired: 2,
        originalCopiesPresented: 2,
        documentReferenceNumber: "INS-ALLIANZ-MAR-554",
        documentDate: "2026-08-07",
        issuerName: "Allianz Global Corporate & Specialty",
        shippedOnBoardDate: null,
        cleanOnBoardStatus: true,
        freightPaymentClause: "PREPAID",
        invoiceAmount: null,
        invoiceCurrency: "USD",
        goodsDescriptionExactMatch: true,
        insuredAmount: 320000.0, // 100% CIF en lugar del 110% exigido
        insuredPercentageOfCif: 100.0,
        complianceStatus: "DISCREPANT",
        remarks:
          "Infraseguro: póliza suscrita al 100% CIF ($320,000) en lugar del mínimo reglamentario del 110% CIF ($352,000) Art. 28f UCP 600.",
        createdAt: new Date().toISOString(),
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.tradeDiscrepancies)
    .values([
      {
        id: "disc_val_01",
        instrumentId: "lc_val_2026_02",
        documentId: "doc_val_bl_02",
        discrepancyRuleCode: "UCP600_ART_14_LATE_PRESENTATION",
        articleReference: "UCP 600 Art. 14(c) & ISBP 745 Para A19",
        severity: "CRITICAL_REFUSAL",
        description:
          "Presentación tardía de documentos: fecha de 'Shipped on Board' 08/08/2026 vs fecha de presentación bancaria 02/09/2026 (25 días transcurridos, superando el límite legal de 21 días naturales).",
        suggestedRemedy:
          "Solicitar waiver formal de discrepancia al Ordenante (Applicant) a través del Banco Emisor JPMorgan Chase.",
        status: "WAIVER_REQUESTED",
        createdAt: new Date().toISOString(),
      },
      {
        id: "disc_val_02",
        instrumentId: "lc_val_2026_02",
        documentId: "doc_val_ins_03",
        discrepancyRuleCode: "UCP600_ART_28_INSURANCE_UNDER_110_PCT",
        articleReference: "UCP 600 Art. 28(f)(ii) & ISBP 745 Para K7",
        severity: "MAJOR_DISCREPANCY",
        description:
          "Infraseguro de mercancías: la póliza cubre USD 320,000.00 (100% CIF) cuando el Artículo 28(f)(ii) de la UCP 600 exige una cobertura mínima del 110% del valor CIF (USD 352,000.00).",
        suggestedRemedy:
          "Aportar suplemento o certificado complementario de la aseguradora cubriendo el 10% adicional o solicitar waiver.",
        status: "OPEN",
        createdAt: new Date().toISOString(),
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.tradeFeeSchedules)
    .values([
      {
        id: "fee_bcn_01",
        instrumentId: "lc_bcn_2026_01",
        openingFeeRatePct: 0.25,
        confirmationFeeRatePct: 0.5,
        discrepancyFeeAmount: 75.0,
        amendmentFeeAmount: 50.0,
        paymentSettlementFeeAmount: 60.0,
        calculatedOpeningFeeEur: 362.5,
        calculatedConfirmationFeeEur: 181.25,
        calculatedDiscrepancyFeeEur: 0.0,
        totalBankFeesEur: 603.75,
        feePayerParty: "APPLICANT",
        createdAt: new Date().toISOString(),
      },
      {
        id: "fee_val_02",
        instrumentId: "lc_val_2026_02",
        openingFeeRatePct: 0.25,
        confirmationFeeRatePct: 0.65,
        discrepancyFeeAmount: 85.0,
        amendmentFeeAmount: 50.0,
        paymentSettlementFeeAmount: 75.0,
        calculatedOpeningFeeEur: 800.0,
        calculatedConfirmationFeeEur: 346.67,
        calculatedDiscrepancyFeeEur: 170.0, // 2 discrepancias detectadas @ $85 c/u
        totalBankFeesEur: 1391.67,
        feePayerParty: "BENEFICIARY",
        createdAt: new Date().toISOString(),
      },
      {
        id: "fee_sblc_03",
        instrumentId: "sblc_mad_2026_03",
        openingFeeRatePct: 0.35,
        confirmationFeeRatePct: 0.45,
        discrepancyFeeAmount: 100.0,
        amendmentFeeAmount: 50.0,
        paymentSettlementFeeAmount: 100.0,
        calculatedOpeningFeeEur: 7000.0, // 4 trimestres
        calculatedConfirmationFeeEur: 2250.0,
        calculatedDiscrepancyFeeEur: 0.0,
        totalBankFeesEur: 9350.0,
        feePayerParty: "APPLICANT",
        createdAt: new Date().toISOString(),
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.tradeSwiftMessages)
    .values([
      {
        id: "swift_bcn_mt700",
        instrumentId: "lc_bcn_2026_01",
        messageType: "MT700_ISSUE",
        senderBic: "DBSSSGSGXXX",
        receiverBic: "BSCHESMMXXX",
        rawSwiftMessage: `{1:F01DBSSSGSGAXXX0000000000}{2:I700BSCHESMMXXXXN}{4:
:27:1/1
:40A:IRREVOCABLE
:20:LC-2026-BCN-0089
:31C:260801
:40E:UCP LATEST VERSION
:31D:261006COUNTERS OF BEN BANK
:50:SINGAPORE FOOD IMPORTS PTE LTD
10 MARINA BOULEVARD, SINGAPORE
:59:MEDITERRANEAN OLIVE OIL EXPORTS SL
CALLE ARAGÓN 220, BARCELONA, SPAIN
:32B:EUR145000,00
:39A:05/05
:41A:BSCHESMMXXX BY PAYMENT
:42C:AT SIGHT
:43P:NOT ALLOWED
:43T:NOT ALLOWED
:44E:ESBCN
:44F:SGSIN
:44C:260915
:45A:5,000 BOXES EXTRA VIRGIN OLIVE OIL CIF SINGAPORE INCOTERMS 2020
:46A:1. SIGNED COMMERCIAL INVOICE IN 3 ORIGINALS
2. FULL SET CLEAN ON BOARD OCEAN BILLS OF LADING CONSIGNED TO ORDER OF DBS BANK
3. MARINE INSURANCE CERTIFICATE COVERING ALL RISKS FOR 110 PCT CIF INVOICE VALUE
:47A:+ ALL DOCUMENTS MUST BE IN ENGLISH
+ DOCUMENTS TO BE PRESENTED WITHIN 21 DAYS AFTER SHIPMENT DATE
:49:CONFIRM
-}`,
        transmissionStatus: "ACKNOWLEDGED",
        createdAt: new Date().toISOString(),
      },
      {
        id: "swift_val_mt734",
        instrumentId: "lc_val_2026_02",
        messageType: "MT734_REFUSAL",
        senderBic: "CHASUS33XXX",
        receiverBic: "BBVAESMMXXX",
        rawSwiftMessage: `{1:F01CHASUS33AXXX0000000000}{2:I734BBVAESMMXXXXN}{4:
:20:LC-2026-VAL-0145
:21:DISC-2026-VAL-01
:32A:260902USD320000,00
:77J:DISCREPANCIES FOUND AS FOLLOWS:
1. UCP 600 ART. 14(C) - DOCUMENTS PRESENTED 25 DAYS AFTER SHIPPED ON BOARD DATE (LATE PRESENTATION EXCEEDING 21 DAYS).
2. UCP 600 ART. 28(F)(II) - INSURANCE CERTIFICATE VALUE USD 320,000 (100% CIF) DOES NOT COVER THE MINIMUM 110% CIF VALUE (USD 352,000 REQUIRED).
:77B:HOLDING DOCUMENTS AT YOUR DISPOSAL PENDING WAIVER INSTRUCTIONS FROM APPLICANT.
-}`,
        transmissionStatus: "TRANSMITTED",
        createdAt: new Date().toISOString(),
      },
    ])
    .onConflictDoNothing();

  console.log(
    "✅ Creados Instrumentos de Crédito UCP 600, Documentos, Discrepancias, Liquidaciones de Comisiones y Mensajes SWIFT MT.",
  );

  // =========================================================================
  // SEED: OPERADOR ECONÓMICO AUTORIZADO (OEA / AEO) & SEGURIDAD ISO 28000 / C-TPAT
  // =========================================================================
  console.log(
    "🌱 Insertando Auditorías OEA, Cuestionario CAE, Inspecciones 7 Puntos, Precintos ISO 17712 y Socios...",
  );

  await db
    .insert(schema.aeoAudits)
    .values([
      {
        id: "audit_mad_oeaf_2026",
        auditReference: "OEA-2026-MAD-0088",
        aeoModality: "OEAF_FULL_COMBINED",
        targetStandard: "EU_UCC_AEO",
        leadAuditorName: "Inspectora Carmen Morales (AEAT / OEA Lead Auditor)",
        auditDate: "2026-06-15",
        nextReviewDate: "2029-06-15",
        overallReadinessScore: 94.5,
        customsComplianceScore: 98.0,
        financialSolvencyScore: 95.0,
        commercialRecordsScore: 92.0,
        competenceScore: 95.0,
        securitySafetyScore: 92.5,
        complianceStatus: "CERTIFIED_APPROVED",
        aeoOfficialCertificateNumber: "ES AEOF 2026000088",
        notes:
          "Auditoría periódica de reevaluación conforme a las Directrices TAXUD/B2/047/2011. Certificación completa renovada.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "audit_bcn_oeas_2026",
        auditReference: "OEA-2026-BCN-0042",
        aeoModality: "OEAS_SECURITY_SAFETY",
        targetStandard: "US_CTPAT_TIER2",
        leadAuditorName:
          "David Rovira (Auditor Senior Seguridad Cadena Suministro)",
        auditDate: "2026-08-01",
        nextReviewDate: "2027-08-01",
        overallReadinessScore: 91.0,
        customsComplianceScore: 90.0,
        financialSolvencyScore: 88.0,
        commercialRecordsScore: 90.0,
        competenceScore: 92.0,
        securitySafetyScore: 95.0,
        complianceStatus: "AUDIT_READY",
        aeoOfficialCertificateNumber: "ES AEOS 2026000042",
        notes:
          "Preparación para validación conjunta de Reconocimiento Mutuo US C-TPAT / MRA UE.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "audit_vlc_oeac_2026",
        auditReference: "OEA-2026-VLC-0019",
        aeoModality: "OEAC_CUSTOMS_SIMPLIFICATIONS",
        targetStandard: "EU_UCC_AEO",
        leadAuditorName:
          "Laura Benítez (Especialista en Procedimientos Aduaneros)",
        auditDate: "2026-08-20",
        nextReviewDate: "2026-11-20",
        overallReadinessScore: 78.5,
        customsComplianceScore: 75.0,
        financialSolvencyScore: 82.0,
        commercialRecordsScore: 78.0,
        competenceScore: 80.0,
        securitySafetyScore: 77.0,
        complianceStatus: "ACTION_PLAN_REQUIRED",
        aeoOfficialCertificateNumber: null,
        notes:
          "Requiere subsanar trazabilidad en el archivo de registros logísticos antes de remitir solicitud formal al Departamento de Aduanas de la AEAT.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.aeoCaeQuestionnaireSections)
    .values([
      {
        id: "cae_sec_mad_b1",
        auditId: "audit_mad_oeaf_2026",
        blockNumber: 1,
        blockCode: "BLOCK_1_GENERAL_INFO",
        blockTitle: "Bloque 1: Información General sobre el Solicitante",
        totalQuestions: 8,
        compliantCount: 8,
        nonCompliantCount: 0,
        waivedCount: 0,
        blockScorePercentage: 100.0,
        blockStatus: "COMPLIANT",
        findingsSummary:
          "Estructura societaria, centros operativos y organigrama plenamente documentados.",
      },
      {
        id: "cae_sec_mad_b2",
        auditId: "audit_mad_oeaf_2026",
        blockNumber: 2,
        blockCode: "BLOCK_2_CUSTOMS_COMPLIANCE",
        blockTitle:
          "Bloque 2: Historial de Cumplimiento Aduanero y Fiscal (Art. 39.a CAU)",
        totalQuestions: 10,
        compliantCount: 10,
        nonCompliantCount: 0,
        waivedCount: 0,
        blockScorePercentage: 100.0,
        blockStatus: "COMPLIANT",
        findingsSummary:
          "Cero sanciones graves o reiteradas en los últimos 3 años ante la AEAT y Seguridad Social.",
      },
      {
        id: "cae_sec_mad_b3",
        auditId: "audit_mad_oeaf_2026",
        blockNumber: 3,
        blockCode: "BLOCK_3_ACCOUNTING_LOGISTICS_RECORDS",
        blockTitle:
          "Bloque 3: Sistema Contable y Registros Comerciales (Art. 39.b CAU)",
        totalQuestions: 12,
        compliantCount: 11,
        nonCompliantCount: 1,
        waivedCount: 0,
        blockScorePercentage: 91.7,
        blockStatus: "COMPLIANT",
        findingsSummary:
          "Pista de auditoría completa integrada en Atlas ERP con backup diario inmutable.",
      },
      {
        id: "cae_sec_mad_b4",
        auditId: "audit_mad_oeaf_2026",
        blockNumber: 4,
        blockCode: "BLOCK_4_FINANCIAL_SOLVENCY",
        blockTitle: "Bloque 4: Solvencia Financiera Acreditada (Art. 39.c CAU)",
        totalQuestions: 6,
        compliantCount: 6,
        nonCompliantCount: 0,
        waivedCount: 0,
        blockScorePercentage: 100.0,
        blockStatus: "COMPLIANT",
        findingsSummary:
          "Patrimonio neto positivo y ratios de liquidez auditados sin contingencias concursales.",
      },
      {
        id: "cae_sec_mad_b5",
        auditId: "audit_mad_oeaf_2026",
        blockNumber: 5,
        blockCode: "BLOCK_5_PRACTICAL_COMPETENCE",
        blockTitle:
          "Bloque 5: Competencia o Cualificación Profesional (Art. 39.d CAU)",
        totalQuestions: 8,
        compliantCount: 8,
        nonCompliantCount: 0,
        waivedCount: 0,
        blockScorePercentage: 100.0,
        blockStatus: "COMPLIANT",
        findingsSummary:
          "Personal con título oficial de Representante Aduanero y formación continua de 35 horas anuales.",
      },
      {
        id: "cae_sec_mad_b6",
        auditId: "audit_mad_oeaf_2026",
        blockNumber: 6,
        blockCode: "BLOCK_6_SECURITY_SAFETY_STANDARDS",
        blockTitle:
          "Bloque 6: Normas de Seguridad y Protección (Art. 39.e CAU)",
        totalQuestions: 15,
        compliantCount: 14,
        nonCompliantCount: 1,
        waivedCount: 0,
        blockScorePercentage: 93.3,
        blockStatus: "COMPLIANT",
        findingsSummary:
          "CCTV perimetral con grabación 30 días, control de accesos biométrico y protocolo de 7 puntos.",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.aeoSevenPointInspections)
    .values([
      {
        id: "7pt_bcn_2026_01",
        inspectionReference: "7PT-2026-BCN-01",
        equipmentType: "OCEAN_CONTAINER",
        equipmentIdentifier: "MSKU-782910-3",
        inspectorName: "Marc Vilanova (Oficial de Seguridad Muelle)",
        inspectionDate: "2026-08-25",
        facilityLocation: "Terminal BEST Muelle Prat BCN",
        p1FrontWallPassed: true,
        p2LeftSidePassed: true,
        p3RightSidePassed: true,
        p4FloorPassed: true,
        p5RoofCeilingPassed: true,
        p6DoorsLocksPassed: true,
        p7UndercarriagePassed: true,
        hasAgriculturalContamination: false,
        physicalTamperingDetected: false,
        overallPassed: true,
        inspectionResult: "PASSED_CLEAN",
        actionTaken:
          "Aprobado para carga de exportación con destino a Charleston USA.",
        remarks:
          "Estructura estanca y limpia sin olores ni restos de infestación de madera (WDO free).",
      },
      {
        id: "7pt_val_2026_02",
        inspectionReference: "7PT-2026-VAL-02",
        equipmentType: "ROAD_TRAILER",
        equipmentIdentifier: "TR-8921-HBG",
        inspectorName: "Vicente Soler",
        inspectionDate: "2026-08-26",
        facilityLocation: "Hub Logístico Valencia Riba-roja",
        p1FrontWallPassed: true,
        p2LeftSidePassed: true,
        p3RightSidePassed: true,
        p4FloorPassed: true,
        p5RoofCeilingPassed: true,
        p6DoorsLocksPassed: true,
        p7UndercarriagePassed: true,
        hasAgriculturalContamination: false,
        physicalTamperingDetected: false,
        overallPassed: true,
        inspectionResult: "PASSED_CLEAN",
        actionTaken: "Aprobado para precintado ISO 17712 y precinto TIR.",
        remarks:
          "Semirremolque frigorífico verificado en los 7 puntos de control.",
      },
      {
        id: "7pt_mad_2026_03",
        inspectionReference: "7PT-2026-MAD-03",
        equipmentType: "OCEAN_CONTAINER",
        equipmentIdentifier: "CMAU-491028-1",
        inspectorName: "Elena Sánchez",
        inspectionDate: "2026-08-27",
        facilityLocation: "Depósito Puerto Seco Coslada MAD",
        p1FrontWallPassed: true,
        p2LeftSidePassed: true,
        p3RightSidePassed: true,
        p4FloorPassed: false,
        p5RoofCeilingPassed: true,
        p6DoorsLocksPassed: true,
        p7UndercarriagePassed: false,
        hasAgriculturalContamination: true,
        physicalTamperingDetected: false,
        overallPassed: false,
        inspectionResult: "FAILED_REJECTED",
        actionTaken:
          "Rechazado para carga. Retirado a zona de limpieza y cuarentena.",
        remarks:
          "Presencia de tierra y restos orgánicos vegetales en el suelo de madera y tren de rodaje.",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.aeoSecuritySeals)
    .values([
      {
        id: "seal_h_881901",
        sealNumber: "H-ES-2026-881901",
        sealType: "BOLT_SEAL_CLASS_H",
        iso17712Compliant: true,
        manufacturerName: "Mega Fortris Klicker",
        iso17712TestCertificateRef: "ISO17712-H-MF-2026-99",
        associatedEquipmentIdentifier: "MSKU-782910-3",
        associatedShipmentReference: "EXP-2026-BCN-USA-01",
        affixedDate: "2026-08-25 10:30:00",
        affixedBy: "Marc Vilanova",
        verifiedAtPortOfEntry: true,
        verifiedIntactDate: "2026-08-25 18:45:00",
        verifiedBy: "Aduana Marítima BCN",
        sealStatus: "AFFIXED_TRANSIT",
        tamperIncidentReport: null,
      },
      {
        id: "seal_h_881902",
        sealNumber: "H-ES-2026-881902",
        sealType: "CABLE_SEAL_CLASS_H",
        iso17712Compliant: true,
        manufacturerName: "TydenBrooks Flex-Cable",
        iso17712TestCertificateRef: "ISO17712-H-TB-2026-14",
        associatedEquipmentIdentifier: "TR-8921-HBG",
        associatedShipmentReference: "CMR-2026-VAL-FRA-08",
        affixedDate: "2026-08-26 14:00:00",
        affixedBy: "Vicente Soler",
        verifiedAtPortOfEntry: false,
        sealStatus: "AFFIXED_TRANSIT",
        tamperIncidentReport: null,
      },
      {
        id: "seal_h_881903",
        sealNumber: "H-ES-2026-881903",
        sealType: "BOLT_SEAL_CLASS_H",
        iso17712Compliant: true,
        manufacturerName: "Mega Fortris Klicker",
        associatedEquipmentIdentifier: "TCLU-190284-9",
        associatedShipmentReference: "IMP-2026-CN-VLC-99",
        affixedDate: "2026-08-10 09:00:00",
        affixedBy: "Ningbo Port Shipper",
        verifiedAtPortOfEntry: true,
        verifiedIntactDate: "2026-08-26 11:15:00",
        verifiedBy: "Guardia Civil Fiscal Valencia",
        sealStatus: "TAMPERED_BROKEN",
        tamperIncidentReport:
          "Alarma de rotura: Precinto sustituido por modelo no registrado. Apertura de inspección física en circuito rojo.",
      },
      {
        id: "seal_h_881904",
        sealNumber: "H-ES-2026-881904",
        sealType: "BOLT_SEAL_CLASS_H",
        iso17712Compliant: true,
        manufacturerName: "Mega Fortris Klicker",
        sealStatus: "IN_STOCK",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.aeoBusinessPartners)
    .values([
      {
        id: "partner_trans_iberia",
        partnerName: "Trans-Iberia Logistics Express SA",
        partnerVatNumber: "ESA28991204",
        partnerType: "HAULIER_CARRIER",
        countryCode: "ES",
        hasAeoCertification: true,
        aeoCertificateNumber: "ES AEOF 190000342",
        hasCtpatCertification: true,
        ctpatSviNumber: "SVI-99210-TI",
        iso28000Certified: true,
        securityQuestionnaireScore: 98.0,
        riskLevel: "LOW_RISK",
        lastAssessmentDate: "2026-01-15",
        reassessmentDueDate: "2027-01-15",
        status: "APPROVED_PARTNER",
        remarks:
          "Transportista homologado con flota GPS telemetrizada y conductores acreditados.",
      },
      {
        id: "partner_global_customs",
        partnerName: "Global Customs Brokerage SL",
        partnerVatNumber: "ESB61099238",
        partnerType: "CUSTOMS_BROKER",
        countryCode: "ES",
        hasAeoCertification: true,
        aeoCertificateNumber: "ES AEOC 210000881",
        hasCtpatCertification: false,
        iso28000Certified: true,
        securityQuestionnaireScore: 94.0,
        riskLevel: "LOW_RISK",
        lastAssessmentDate: "2026-03-10",
        reassessmentDueDate: "2027-03-10",
        status: "APPROVED_PARTNER",
        remarks:
          "Agencia de aduanas homologada para simplificaciones aduaneras.",
      },
      {
        id: "partner_med_warehousing",
        partnerName: "Mediterranean Bonded Warehousing SA",
        partnerVatNumber: "ESA46019284",
        partnerType: "WAREHOUSE_KEEPER",
        countryCode: "ES",
        hasAeoCertification: true,
        aeoCertificateNumber: "ES AEOF 220000109",
        hasCtpatCertification: false,
        iso28000Certified: true,
        securityQuestionnaireScore: 92.0,
        riskLevel: "LOW_RISK",
        lastAssessmentDate: "2026-04-20",
        reassessmentDueDate: "2027-04-20",
        status: "APPROVED_PARTNER",
        remarks:
          "Operador de depósito aduanero y ADT con control perimetral CCTV.",
      },
      {
        id: "partner_east_cargo",
        partnerName: "FastCargo Eastern Logistics SRO",
        partnerVatNumber: "CZ28910482",
        partnerType: "HAULIER_CARRIER",
        countryCode: "CZ",
        hasAeoCertification: false,
        aeoCertificateNumber: null,
        hasCtpatCertification: false,
        iso28000Certified: false,
        securityQuestionnaireScore: 72.0,
        riskLevel: "MEDIUM_RISK",
        lastAssessmentDate: "2026-07-05",
        reassessmentDueDate: "2026-10-05",
        status: "PROVISIONAL",
        remarks:
          "Transportista subcontractado en periodo provisional. Requiere doble precintado e inspección reforzada.",
      },
    ])
    .onConflictDoNothing();

  console.log(
    "✅ Creadas Auditorías OEA, Cuestionario CAE, Inspecciones 7 Puntos, Precintos ISO 17712 y Socios Comerciales.",
  );

  console.log(
    "⚓ Inyectando Pólizas de Fletamento, Estados de Hechos (SOF) y Liquidaciones de Planchas...",
  );
  await db
    .insert(schema.charterParties)
    .values([
      {
        id: "cp_gencon_wheat_01",
        fixtureReference: "CP-2026-SDR-0081",
        charterType: "VOYAGE_CHARTER",
        contractForm: "GENCON_2022",
        ownerName: "Naviera Cantábrica SA",
        chartererName: "AgroGrain International Traders Ltd",
        brokerName: "Braemar Shipbroking London",
        vesselName: "MV Northern Star",
        imoNumber: "9842109",
        flagState: "Malta",
        builtYear: 2021,
        summerDwtMt: 45000,
        grossTonnage: 28000,
        cargoDescription: "Trigo Duro a Granel (Durum Wheat in Bulk)",
        cargoQuantityMt: 35000,
        quantityMarginPercentage: 5.0,
        loadingPort: "Puerto de Santander (ESSDR)",
        dischargingPort: "Puerto de Alexandria (EGALY)",
        laycanStart: "2026-09-01",
        laycanEnd: "2026-09-10",
        freightRateUsdPerMt: 32.5,
        dailyHireRateUsd: 18500,
        demurrageRateUsdPerDay: 14000,
        despatchRateUsdPerDay: 7000,
        despatchCalculationBasis: "ATS_ALL_TIME_SAVED",
        laytimeTerms: "SHEX_EIU",
        laytimeAllowanceType: "LOADING_DISCHARGING_RATES",
        loadRateMtPerDay: 5000,
        dischargeRateMtPerDay: 3500,
        turnTimeHours: 12.0,
        norOfficeHoursOnly: true,
        norClausesJson: JSON.stringify(["WIPON", "WIBON", "WIFPON", "WCCON"]),
        laytimeReversibility: "NON_REVERSIBLE",
        status: "FIXED_ACTIVE",
        remarks:
          "Póliza Gencon 2022 para carga de cereal con cláusula de huelga BIMCO.",
      },
      {
        id: "cp_nype_container_02",
        fixtureReference: "CP-2026-TC-0042",
        charterType: "TIME_CHARTER",
        contractForm: "NYPE_2015",
        ownerName: "Iberian Ocean Carriers SL",
        chartererName: "Global Feeder Lines Singapore Pte",
        brokerName: "Clarksons Platou Madrid",
        vesselName: "MV Atlantic Trader",
        imoNumber: "9721085",
        flagState: "Cyprus",
        builtYear: 2019,
        summerDwtMt: 38000,
        grossTonnage: 24500,
        cargoDescription:
          "Contenedores y Carga General (Containers & Breakbulk)",
        cargoQuantityMt: 28000,
        quantityMarginPercentage: 0.0,
        loadingPort: "Puerto de Valencia (ESVLC)",
        dischargingPort: "Puerto de Santos (BRSSZ)",
        laycanStart: "2026-08-15",
        laycanEnd: "2026-11-15",
        freightRateUsdPerMt: 0,
        dailyHireRateUsd: 19800,
        demurrageRateUsdPerDay: 15000,
        despatchRateUsdPerDay: 7500,
        despatchCalculationBasis: "ATS_ALL_TIME_SAVED",
        laytimeTerms: "SHINC",
        laytimeAllowanceType: "TOTAL_DAYS_WWD",
        turnTimeHours: 6.0,
        norOfficeHoursOnly: false,
        norClausesJson: JSON.stringify(["WIPON", "WIBON"]),
        laytimeReversibility: "NON_REVERSIBLE",
        status: "FIXED_ACTIVE",
        remarks:
          "Fletamento por tiempo de 3 meses para servicio feeder transatlántico.",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.statementOfFacts)
    .values([
      {
        id: "sof_sdr_load_01",
        charterPartyId: "cp_gencon_wheat_01",
        sofReference: "SOF-2026-SDR-01",
        portOperation: "LOADING",
        portCode: "ESSDR",
        portName: "Puerto de Santander",
        terminalBerth: "Muelle de Raos 4 (Silo Cerealero)",
        vesselAgentName: "Bergé Marítima Santander",
        masterName: "Capt. Santiago Aranda",
        eospTimestamp: "2026-09-01T04:30:00Z",
        anchorageDropTimestamp: "2026-09-01T05:15:00Z",
        norTenderedTimestamp: "2026-09-01T08:00:00Z",
        norAcceptedTimestamp: "2026-09-01T08:15:00Z",
        turnTimeExpiryTimestamp: "2026-09-01T20:00:00Z",
        allFastBerthingTimestamp: "2026-09-01T18:30:00Z",
        gangwayDownTimestamp: "2026-09-01T19:00:00Z",
        customsHealthClearedTimestamp: "2026-09-01T19:45:00Z",
        commencedOperationsTimestamp: "2026-09-01T20:00:00Z",
        completedOperationsTimestamp: "2026-09-09T14:00:00Z",
        actualCargoHandledMt: 35000,
        isFinalized: true,
        agentNotes:
          "Carga completada con interrupción por lluvia y domingo SHEX.",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.sofEvents)
    .values([
      {
        id: "ev_sof_01",
        statementOfFactsId: "sof_sdr_load_01",
        eventStartTimestamp: "2026-09-01T20:00:00Z",
        eventEndTimestamp: "2026-09-03T18:00:00Z",
        durationMinutes: 2760, // 46h
        eventType: "WORKING_OPERATIONS",
        laytimeCountingPercentage: 100.0,
        isCountedAgainstLaytime: true,
        affectedHatchesOrCranes: "Bodegas 1 a 4 / Cinta Embarcadora Silo",
        interruptionReason: "Carga continua de trigo a granel a ritmo nominal.",
      },
      {
        id: "ev_sof_02",
        statementOfFactsId: "sof_sdr_load_01",
        eventStartTimestamp: "2026-09-03T18:00:00Z",
        eventEndTimestamp: "2026-09-04T06:00:00Z",
        durationMinutes: 720, // 12h
        eventType: "RAIN_STOPPAGE",
        laytimeCountingPercentage: 0.0,
        isCountedAgainstLaytime: false,
        affectedHatchesOrCranes: "Todas las bodegas cerradas",
        interruptionReason:
          "Fuerte aguacero y temporal costero. Escotillas cerradas para preservar mercancía.",
      },
      {
        id: "ev_sof_03",
        statementOfFactsId: "sof_sdr_load_01",
        eventStartTimestamp: "2026-09-04T06:00:00Z",
        eventEndTimestamp: "2026-09-06T00:00:00Z",
        durationMinutes: 2520, // 42h
        eventType: "WORKING_OPERATIONS",
        laytimeCountingPercentage: 100.0,
        isCountedAgainstLaytime: true,
        affectedHatchesOrCranes: "Bodegas 1 a 4",
        interruptionReason:
          "Reanudación de operaciones de carga tras paso del frente de lluvia.",
      },
      {
        id: "ev_sof_04",
        statementOfFactsId: "sof_sdr_load_01",
        eventStartTimestamp: "2026-09-06T00:00:00Z",
        eventEndTimestamp: "2026-09-07T00:00:00Z",
        durationMinutes: 1440, // 24h
        eventType: "SUNDAY_SHEX_EXCLUDED",
        laytimeCountingPercentage: 0.0,
        isCountedAgainstLaytime: false,
        affectedHatchesOrCranes: "Terminal inactiva",
        interruptionReason:
          "Domingo reglamentario excluido bajo cláusula SHEX Even If Used.",
      },
      {
        id: "ev_sof_05",
        statementOfFactsId: "sof_sdr_load_01",
        eventStartTimestamp: "2026-09-07T00:00:00Z",
        eventEndTimestamp: "2026-09-09T14:00:00Z",
        durationMinutes: 3720, // 62h
        eventType: "WORKING_OPERATIONS",
        laytimeCountingPercentage: 100.0,
        isCountedAgainstLaytime: true,
        affectedHatchesOrCranes: "Bodegas 1 a 4",
        interruptionReason:
          "Operaciones finales y trimado de bodegas hasta completar 35.000 MT.",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.laytimeCalculations)
    .values([
      {
        id: "lay_calc_sdr_01",
        charterPartyId: "cp_gencon_wheat_01",
        statementOfFactsId: "sof_sdr_load_01",
        calculationReference: "LAY-2026-SDR-001",
        portOperation: "LOADING",
        laytimeCommencedTimestamp: "2026-09-01T20:00:00Z",
        laytimeCeasedTimestamp: "2026-09-09T14:00:00Z",
        allowedLaytimeSeconds: 604800, // 7d 00h 00m (35,000 MT / 5,000 MT/d)
        allowedLaytimeFormatted: "7d 00h 00m",
        grossTimeUsedSeconds: 669600, // 7d 18h 00m
        deductionsSeconds: 129600, // 36h = 12h lluvia + 24h domingo
        netLaytimeUsedSeconds: 540000, // 6d 06h 00m
        netLaytimeUsedFormatted: "6d 06h 00m",
        timeDifferenceSeconds: -64800, // 18h saved (Despatch)
        isDemurrage: false,
        demurrageDaysDecimal: 0,
        despatchDaysDecimal: 0.75, // 18h / 24h = 0.75 días
        demurrageRatePerDayUsd: 14000,
        despatchRatePerDayUsd: 7000,
        totalDemurrageAmountUsd: 0,
        totalDespatchAmountUsd: 5250.0, // 0.75 * 7000
        netFinancialPayableUsd: 5250.0,
        calculationMethod: "ATS_ALL_TIME_SAVED",
        settlementStatus: "AGREED_OWNER_CHARTERER",
        auditorNotes:
          "Cálculo revisado y acordado: 18 horas de pronto despacho (Despatch) a favor del fletador.",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.timeCharterOffHires)
    .values([
      {
        id: "offhire_atlant_01",
        charterPartyId: "cp_nype_container_02",
        offHireReference: "OFF-2026-VLC-01",
        offHireReason: "MAIN_ENGINE_BREAKDOWN",
        offHireStartTimestamp: "2026-08-28T02:00:00Z",
        offHireEndTimestamp: "2026-08-29T14:00:00Z",
        durationHours: 36.0,
        durationDaysDecimal: 1.5,
        dailyHireRateUsd: 19800,
        hireDeductionUsd: 29700.0, // 1.5 * 19,800
        bunkerVlsfoConsumedMt: 4.2,
        bunkerMgoConsumedMt: 0.8,
        vlsfoPriceUsdPerMt: 580,
        mgoPriceUsdPerMt: 750,
        bunkerCompensationUsd: 3036.0, // 4.2*580 + 0.8*750 = 2436 + 600
        totalOffHireClaimUsd: 32736.0,
        offHireStatus: "AGREED_OWNER",
        incidentDescription:
          "Fallo en turbocompresor principal requiriendo fondeo de emergencia y reparación con repuestos de tierra.",
      },
    ])
    .onConflictDoNothing();

  console.log(
    "✅ Creadas Pólizas de Fletamento, Estados de Hechos (SOF), Cronología de Planchas y Off-Hires.",
  );

  console.log(
    "🚨 Inyectando Expedientes de Avería Gruesa, Masas Activas/Pasivas, Bonos LAB 77 y Ajustes...",
  );
  await db
    .insert(schema.gaCases)
    .values([
      {
        id: "ga_case_valencia_01",
        caseReference: "GA-2026-VAL-0012",
        vesselName: "MV Valencia Bridge",
        imoNumber: "9751024",
        flagState: "Liberia",
        builtYear: 2020,
        grossTonnage: 68000,
        summerDwtMt: 75000.0,
        shipownerName: "Mediterranean Shipping Carriers SA",
        disponentOwnerOrCharterer: "Atlantic Feeder Lines Ltd",
        masterName: "Capt. Rodrigo Alarcón",
        casualtyType: "FIRE_EXPLOSION",
        casualtyDate: "2026-08-10",
        casualtyLocation: "Golfo de León (42° 15' N, 004° 20' E)",
        voyageOrigin: "Puerto de Valencia (ESVLC)",
        voyageDestination: "Puerto de Génova (ITGOA)",
        portOfRefuge: "Puerto de Marsella (FRMRS)",
        dateArrivalPortOfRefuge: "2026-08-12",
        dateDeparturePortOfRefuge: "2026-08-26",
        governingRules: "YAR_2016",
        salvageContractType: "LOF_2024_SCOPIC",
        salvorName: "Smit Salvage BV / Boluda Towage",
        averageAdjusterFirm: "Richards Hogg Lindley (RHL London & Madrid)",
        leadAdjusterName: "Senior Adjuster David Sterling",
        estimatedLossUsd: 1845000.0,
        estimatedContributionPercentage: 7.5,
        declarationNarrative:
          "Durante la travesía se declaró un incendio grave en la Bodega N° 2. Para salvar la aventura marítima común, el Capitán ordenó inundar con agua y espuma las bodegas adyacentes y solicitar asistencia de remolcadores de salvamento bajo contrato Lloyd's Open Form (LOF 2024 con cláusula SCOPIC), desviando el buque al puerto de refugio de Marsella.",
        currencyCode: "USD",
        status: "SECURITY_COLLECTION",
      },
      {
        id: "ga_case_cadiz_02",
        caseReference: "GA-2026-CDZ-0034",
        vesselName: "MV Atlantic Pioneer",
        imoNumber: "9642019",
        flagState: "Panama",
        builtYear: 2018,
        grossTonnage: 42000,
        summerDwtMt: 55000.0,
        shipownerName: "Iberian Bulk Carriers SL",
        disponentOwnerOrCharterer: "Global Agri Commodities Corp",
        masterName: "Capt. Manuel Barrientos",
        casualtyType: "GROUNDING_REFLOATING",
        casualtyDate: "2026-07-25",
        casualtyLocation: "Bajo de Las Puercas - Bahía de Cádiz",
        voyageOrigin: "Puerto de Santos (BRSSZ)",
        voyageDestination: "Puerto de Santander (ESSDR)",
        portOfRefuge: "Puerto de Cádiz (ESCAD)",
        dateArrivalPortOfRefuge: "2026-07-28",
        dateDeparturePortOfRefuge: "2026-08-08",
        governingRules: "YAR_2016",
        salvageContractType: "LOF_2024_SCOPIC",
        salvorName: "Boluda Towage Cadiz",
        averageAdjusterFirm: "Clyde & Co Average Adjusters",
        leadAdjusterName: "Adjuster Beatriz Fuentes",
        estimatedLossUsd: 920000.0,
        estimatedContributionPercentage: 4.8,
        declarationNarrative:
          "Varada involuntaria en bajo arenoso a la entrada del canal. Para evitar la pérdida del buque, se forzaron máquinas y calderas (Regla VII) y se efectuó alijo parcial de 3.500 MT de mineral en barcazas (Regla VIII).",
        currencyCode: "USD",
        status: "ADJUSTMENT_IN_PROGRESS",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.gaAllowances)
    .values([
      {
        id: "ga_all_01",
        gaCaseId: "ga_case_valencia_01",
        allowanceCategory: "SHIP_SACRIFICE",
        yarRuleReference: "RULE_VII_MACHINERY_DAMAGE",
        description:
          "Daños a bombas de achique y sistemas eléctricos por inundación de extinción",
        creditedPartyType: "SHIPOWNER",
        creditedPartyName: "Mediterranean Shipping Carriers SA",
        originalCurrencyAmount: 250000.0,
        originalCurrency: "USD",
        exchangeRateToUsd: 1.0,
        amountUsd: 250000.0,
        isAdmissible: true,
        remarks: "Verificado por perito naval de RHL.",
      },
      {
        id: "ga_all_02",
        gaCaseId: "ga_case_valencia_01",
        allowanceCategory: "CARGO_SACRIFICE_EXTINGUISHMENT",
        yarRuleReference: "RULE_III_EXTINGUISHING_FIRE",
        description:
          "Daños directos por agua en 12 contenedores de carga general durante la extinción",
        creditedPartyType: "CARGO_OWNER",
        creditedPartyName: "Iberica Chem Trading SL",
        originalCurrencyAmount: 180000.0,
        originalCurrency: "USD",
        exchangeRateToUsd: 1.0,
        amountUsd: 180000.0,
        isAdmissible: true,
        remarks:
          "Daño por agua admisible bajo Regla III (daño por fuego excluido).",
      },
      {
        id: "ga_all_03",
        gaCaseId: "ga_case_valencia_01",
        allowanceCategory: "REFUGE_PORT_DISBURSEMENTS",
        yarRuleReference: "RULE_X_PORT_OF_REFUGE",
        description:
          "Tasas extraordinarias de entrada, atraque de emergencia y practicaje en Marsella",
        creditedPartyType: "SHIPOWNER",
        creditedPartyName: "Mediterranean Shipping Carriers SA",
        originalCurrencyAmount: 125000.0,
        originalCurrency: "USD",
        exchangeRateToUsd: 1.0,
        amountUsd: 125000.0,
        isAdmissible: true,
        remarks: "Desembolso sujeto a comisión del 2.5% Regla XX.",
      },
      {
        id: "ga_all_04",
        gaCaseId: "ga_case_valencia_01",
        allowanceCategory: "SALVAGE_AWARD_LOF",
        yarRuleReference: "RULE_PARAMOUNT_GENERAL",
        description:
          "Recompensa de salvamento acordada con remolcadores bajo contrato LOF 2024",
        creditedPartyType: "SALVOR",
        creditedPartyName: "Smit Salvage BV",
        originalCurrencyAmount: 650000.0,
        originalCurrency: "USD",
        exchangeRateToUsd: 1.0,
        amountUsd: 650000.0,
        isAdmissible: true,
        remarks:
          "Acuerdo amistoso de salvamento aprobado por aseguradoras de casco y carga.",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.gaContributoryInterests)
    .values([
      {
        id: "ga_ci_01",
        gaCaseId: "ga_case_valencia_01",
        interestCategory: "VESSEL",
        blReference: null,
        containerNumber: null,
        ownerOrReceiverName: "Mediterranean Shipping Carriers SA",
        cargoDescription: "Buque Portacontenedores MV Valencia Bridge",
        weightOrTeu: 1.0,
        soundValueDestinationUsd: 18500000.0,
        particularDamageDeductionUsd: 600000.0,
        madeGoodAllowanceUsd: 250000.0,
        contributoryValueUsd: 18150000.0,
        calculatedContributionUsd: 1361250.0,
        netFinancialBalanceUsd: 1111250.0,
        balanceType: "PAYABLE_DEBTOR",
        hasSecurityProvided: true,
        cargoReleaseAuthorized: true,
      },
      {
        id: "ga_ci_02",
        gaCaseId: "ga_case_valencia_01",
        interestCategory: "FREIGHT_AT_RISK",
        blReference: null,
        containerNumber: null,
        ownerOrReceiverName: "Mediterranean Shipping Carriers SA",
        cargoDescription: "Flete al Cobro Pendiente de Percepción",
        weightOrTeu: null,
        soundValueDestinationUsd: 720000.0,
        particularDamageDeductionUsd: 70000.0, // Gastos posteriores
        madeGoodAllowanceUsd: 0.0,
        contributoryValueUsd: 650000.0,
        calculatedContributionUsd: 48750.0,
        netFinancialBalanceUsd: 48750.0,
        balanceType: "PAYABLE_DEBTOR",
        hasSecurityProvided: true,
        cargoReleaseAuthorized: true,
      },
      {
        id: "ga_ci_03",
        gaCaseId: "ga_case_valencia_01",
        interestCategory: "CARGO",
        blReference: "MSCU-VAL-GEN-001",
        containerNumber: "MSKU-782910-3",
        ownerOrReceiverName: "Iberica Chem Trading SL",
        cargoDescription: "Resinas de Polipropileno en Pellets",
        weightOrTeu: 24.5,
        soundValueDestinationUsd: 1200000.0,
        particularDamageDeductionUsd: 0.0,
        madeGoodAllowanceUsd: 180000.0,
        contributoryValueUsd: 1380000.0,
        calculatedContributionUsd: 103500.0,
        netFinancialBalanceUsd: -76500.0, // Creditor (Made good 180k > Contribution 103.5k)
        balanceType: "RECEIVABLE_CREDITOR",
        hasSecurityProvided: true,
        cargoReleaseAuthorized: true,
      },
      {
        id: "ga_ci_04",
        gaCaseId: "ga_case_valencia_01",
        interestCategory: "CARGO",
        blReference: "MSCU-VAL-GEN-002",
        containerNumber: "MEDU-481920-5",
        ownerOrReceiverName: "TransMed Auto Parts Italia SRL",
        cargoDescription: "Componentes y Motores de Automoción",
        weightOrTeu: 18.2,
        soundValueDestinationUsd: 2400000.0,
        particularDamageDeductionUsd: 0.0,
        madeGoodAllowanceUsd: 0.0,
        contributoryValueUsd: 2400000.0,
        calculatedContributionUsd: 180000.0,
        netFinancialBalanceUsd: 180000.0,
        balanceType: "PAYABLE_DEBTOR",
        hasSecurityProvided: true,
        cargoReleaseAuthorized: true,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.gaSecurities)
    .values([
      {
        id: "ga_sec_val_01",
        gaCaseId: "ga_case_valencia_01",
        contributoryInterestId: "ga_ci_04",
        securityReference: "SEC-2026-VAL-001",
        securityType: "AVERAGE_BOND_AND_GUARANTEE",
        cargoConsigneeName: "TransMed Auto Parts Italia SRL",
        cargoConsigneeVat: "IT08920194821",
        insurerName: "Mapfre Global Risks SA",
        insurerPolicyNumber: "POL-MAR-2026-99210",
        insurerContactEmail: "marine.claims@mapfre.com",
        securityAmountUsd: 180000.0,
        depositBankName: "Banco Santander Madrid (Escrow Trust Account)",
        depositBankAccountNumber: "ES91 0049 1500 0512 3456 7890",
        cashDepositReceiptNumber: null,
        averageBondSigned: true,
        averageBondSignDate: "2026-08-16",
        averageGuaranteeSigned: true,
        averageGuaranteeSignDate: "2026-08-17",
        cargoReleaseAuthorized: true,
        releaseAuthorizedBy: "David Sterling (Average Adjuster)",
        releaseTimestamp: "2026-08-17T14:30:00Z",
        status: "CARGO_RELEASED",
        remarks:
          "Garantía de aseguradora validada y mercancía despachada en Marsella.",
      },
      {
        id: "ga_sec_val_02",
        gaCaseId: "ga_case_valencia_01",
        contributoryInterestId: "ga_ci_03",
        securityReference: "SEC-2026-VAL-002",
        securityType: "CASH_DEPOSIT",
        cargoConsigneeName: "Iberica Chem Trading SL",
        cargoConsigneeVat: "ESA46019284",
        insurerName: "Autoseguro Directo (Sin póliza marítima)",
        insurerPolicyNumber: null,
        insurerContactEmail: "financiero@ibericachem.es",
        securityAmountUsd: 241500.0, // 17.5% de $1.38M (Tasa 7.5% + 10% margen de seguridad)
        depositBankName: "Banco Santander (Joint Trust Account RHL)",
        depositBankAccountNumber: "ES91 0049 1500 0512 3456 7890",
        cashDepositReceiptNumber: "CDR-2026-0089",
        averageBondSigned: true,
        averageBondSignDate: "2026-08-18",
        averageGuaranteeSigned: false,
        averageGuaranteeSignDate: null,
        cargoReleaseAuthorized: true,
        releaseAuthorizedBy: "David Sterling (Average Adjuster)",
        releaseTimestamp: "2026-08-19T09:15:00Z",
        status: "CARGO_RELEASED",
        remarks:
          "Depósito en efectivo recibido y custodiado en cuenta fiduciaria conjunta.",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.gaAdjustments)
    .values([
      {
        id: "ga_adj_val_01",
        gaCaseId: "ga_case_valencia_01",
        adjustmentReference: "ADJ-2026-VAL-01",
        adjustmentDate: "2026-08-30",
        totalAllowancesUsd: 1205000.0,
        totalShipAllowancesUsd: 250000.0,
        totalCargoAllowancesUsd: 180000.0,
        totalRefugeExpensesUsd: 125000.0,
        totalSalvageAwardUsd: 650000.0,
        totalCommissionUsd: 3125.0, // 2.5% sobre $125k
        cmiInterestRatePercentage: 6.0,
        totalCmiInterestUsd: 3600.0,
        totalContributoryValueUsd: 22580000.0,
        vesselContributoryValueUsd: 18150000.0,
        freightContributoryValueUsd: 650000.0,
        cargoContributoryValueUsd: 3780000.0,
        containersContributoryValueUsd: 0.0,
        finalRateOfContributionPercentage: 5.3366,
        totalDebtorContributionsUsd: 1205000.0,
        totalCreditorRecoveriesUsd: 1205000.0,
        adjusterCertificationStatement:
          "Certificamos que la presente liquidación general de avería gruesa ha sido practicada con estricta sujeción a las Reglas de York y Amberes 2016 y al contrato de salvamento LOF 2024.",
        status: "CERTIFIED_BY_ADJUSTER",
      },
    ])
    .onConflictDoNothing();

  console.log(
    "✅ Creados Expedientes de Avería Gruesa, Masas Activas/Pasivas, Bonos LAB 77 y Ajustes.",
  );

  // Ensure admin user exists
  await import("../admin/adminService.js").then((m) => m.createAdmin());
  console.log("✅ Admin user ensured after seeding.");
  console.log("🎉 Seed masivo completado exitosamente.");
  process.exit(0);
}

main().catch((e) => {
  console.error("Error durante el seed:", e);
  process.exit(1);
});
