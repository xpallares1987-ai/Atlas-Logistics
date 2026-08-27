import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { faker } from "@faker-js/faker";
import { sql } from "drizzle-orm";
import * as schema from "./schema/index.js";
import "dotenv/config";

// Provide fallback since .env might not have TURSO_URL or LOCAL_DB_URL yet.
const client = createClient({ url: "file:atlas-erp-v2.db" });
const db = drizzle(client, { schema });

async function main() {
  console.log("🌱 Comenzando la inyección masiva de datos realistas (Seed)...");

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
    await db.insert(schema.tasks).values({
      id,
      title: faker.helpers.arrayElement(taskNames),
      description: faker.lorem.sentence(),
      assignedTo: faker.helpers.arrayElement(userIds),
      status: faker.helpers.arrayElement(["TODO", "IN_PROGRESS", "DONE"]),
      dueDate: faker.date.soon({ days: 10 }),
      shipmentId: faker.helpers.arrayElement(shipmentIds),
    });
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
