import { db } from "../index.js";
import * as schema from "../schema/index.js";
import { faker } from "@faker-js/faker";
import { sql } from "drizzle-orm";

export interface CoreSeedContext {
  companyIds: string[];
  userIds: string[];
  locationIds: string[];
  laneIds: string[];
  carrierIds: string[];
  brokerIds: string[];
  hsCodeIds: string[];
  standardHsCodes: any[];
}

export async function seedCore(): Promise<CoreSeedContext> {
  // 0. ADDRESS TYPES MASTER CATALOG
  for (const def of schema.ADDRESS_TYPE_DEFINITIONS) {
    await db
      .insert(schema.addressTypes)
      .values({
        code: def.code,
        name: def.name,
        description: def.description,
      })
      .onConflictDoUpdate({
        target: schema.addressTypes.code,
        set: {
          name: def.name,
          description: def.description,
        },
      });
  }

  // 1. CORPORATE GROUPS (COMPANIES)
  const companyIds: string[] = [];
  for (const grp of schema.ENTERPRISE_COMPANY_GROUPS) {
    companyIds.push(grp.id);
    await db
      .insert(schema.companies)
      .values({
        id: grp.id,
        name: grp.name,
        groupCode: grp.groupCode,
        sector: grp.sector,
        headquartersCountry: grp.headquartersCountry,
        taxId: grp.taxId,
        creditLimit: grp.creditLimit,
      })
      .onConflictDoUpdate({
        target: schema.companies.id,
        set: {
          name: grp.name,
          groupCode: grp.groupCode,
          sector: grp.sector,
          headquartersCountry: grp.headquartersCountry,
          taxId: grp.taxId,
          creditLimit: grp.creditLimit,
        },
      });
  }
  console.log(`✅ Creados ${companyIds.length} grupos corporativos.`);

  // 2. USERS & CONTACTS (Deterministic Demo Roles + Realistic Team)
  const demoUsers = [
    {
      id: "admin_user_id",
      email: "admin@atlas.com",
      role: "ADMIN",
      firstName: "Carlos",
      lastName: "Mendoza",
      companyId: companyIds[0],
    },
    {
      id: "accounting_user_id",
      email: "accounting@atlas.com",
      role: "ACCOUNTING",
      firstName: "Sofía",
      lastName: "Navarro",
      companyId: companyIds[0],
    },
    {
      id: "controlling_user_id",
      email: "controlling@atlas.com",
      role: "CONTROLLING",
      firstName: "Javier",
      lastName: "Ribera",
      companyId: companyIds[0],
    },
    {
      id: "operator_user_id",
      email: "operator@atlas.com",
      role: "OPERATIONS",
      firstName: "Elena",
      lastName: "Vega",
      companyId: companyIds[0],
    },
    {
      id: "customs_user_id",
      email: "customs@atlas.com",
      role: "OPERATIONS",
      firstName: "Mateo",
      lastName: "Ortiz",
      companyId: companyIds[1],
    },
    {
      id: "treasury_user_id",
      email: "treasury@atlas.com",
      role: "CONTROLLING",
      firstName: "Lucía",
      lastName: "Domínguez",
      companyId: companyIds[0],
    },
    {
      id: "customer_user_id",
      email: "customer@atlas.com",
      role: "CUSTOMER",
      firstName: "Alejandro",
      lastName: "Iberia",
      companyId: companyIds[2],
    },
  ];

  const userIds: string[] = [];

  for (const u of demoUsers) {
    userIds.push(u.id);
    await db
      .insert(schema.users)
      .values({
        id: u.id,
        companyId: u.companyId,
        email: u.email,
        role: u.role,
      })
      .onConflictDoNothing();

    await db
      .insert(schema.contacts)
      .values({
        id: `contact_${u.id}`,
        companyId: u.companyId,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        phone: "+34 912 345 678",
      })
      .onConflictDoNothing();
  }

  for (const companyId of companyIds) {
    // Additional Users
    for (let i = 0; i < 2; i++) {
      const id = faker.string.uuid();
      userIds.push(id);
      await db.insert(schema.users).values({
        id,
        companyId,
        email: faker.internet.email(),
        role: i === 0 ? "OPERATIONS" : "CUSTOMER",
      });
    }

    // Additional Contacts
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
  console.log(
    `✅ Creados ${userIds.length} usuarios y contactos (5 perfiles demo + equipo).`,
  );

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
  // 5. CARRIERS & CUSTOMS BROKERS (Referenced from canonical addresses registry)
  const carrierIds = [
    "addr_carr_maersk",
    "addr_carr_msc",
    "addr_carr_hapag",
    "addr_carr_one",
    "addr_carr_cosco",
    "addr_carr_evergreen",
  ];

  const brokerIds = ["addr_broker_bcn", "addr_broker_vlc"];

  // Defensive legacy mirror to satisfy SQLite table-level foreign keys on rates & customs_declarations
  for (const cid of carrierIds) {
    try {
      await db.run(
        sql`INSERT OR IGNORE INTO carriers (id, name, scac, type) VALUES (${cid}, ${cid}, ${cid.slice(-4).toUpperCase()}, 'OCEAN')`,
      );
    } catch {
      // Table may not exist in future schema migrations
    }
  }

  for (const bid of brokerIds) {
    try {
      await db.run(
        sql`INSERT OR IGNORE INTO customs_brokers (id, name, license_number) VALUES (${bid}, ${bid}, ${bid.slice(-8).toUpperCase()})`,
      );
    } catch {
      // Table may not exist in future schema migrations
    }
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

  return {
    companyIds,
    userIds,
    locationIds,
    laneIds,
    carrierIds,
    brokerIds,
    hsCodeIds,
    standardHsCodes,
  };
}
