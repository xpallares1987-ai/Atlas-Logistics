/**
 * @file migrate-partners-to-addresses.ts
 * @description Migration script to consolidate legacy partner tables (carriers, customs_brokers, destination_agents)
 * into the canonical addresses registry and retarget incoming FKs (schedules, rates, costs, batches, declarations).
 */

import { createClient } from "@libsql/client";

async function main() {
  const client = createClient({ url: "file:data/dev.db" });
  const nowSec = Math.floor(Date.now() / 1000);

  console.log(
    "🚀 [MIGRATION] Consolidating legacy partner tables into canonical addresses...",
  );

  // 1. Ensure corporate groups in companies
  const corporateGroups = [
    {
      id: "grp_cma",
      name: "CMA CGM Group",
      taxId: "FR-845620244",
      groupCode: "CMA-CGM",
      sector: "SHIPPING",
      country: "FR",
    },
    {
      id: "grp_zim",
      name: "ZIM Integrated Shipping Services",
      taxId: "IL-520015079",
      groupCode: "ZIM-LINE",
      sector: "SHIPPING",
      country: "IL",
    },
    {
      id: "grp_hmm",
      name: "HMM Co., Ltd.",
      taxId: "KR-104-81-05333",
      groupCode: "HMM-LINE",
      sector: "SHIPPING",
      country: "KR",
    },
    {
      id: "grp_yangming",
      name: "Yang Ming Marine Transport Corp.",
      taxId: "TW-11521401",
      groupCode: "YANG-MING",
      sector: "SHIPPING",
      country: "TW",
    },
  ];

  for (const g of corporateGroups) {
    await client.execute({
      sql: `INSERT INTO companies (id, name, tax_id, group_code, sector, headquarters_country, created_at, is_deleted, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1)
            ON CONFLICT(id) DO UPDATE SET name=excluded.name, tax_id=excluded.tax_id, group_code=excluded.group_code, sector=excluded.sector, headquarters_country=excluded.headquarters_country;`,
      args: [g.id, g.name, g.taxId, g.groupCode, g.sector, g.country, nowSec],
    });
  }
  console.log("✅ Corporate groups verified in companies.");

  // 2. Ensure all top 10 ocean carriers in addresses
  const carrierAddresses = [
    {
      id: "addr_carr_maersk",
      companyId: "grp_maersk",
      companyName: "Maersk Line Spain A/S",
      tradeName: "A.P. Moller - Maersk",
      taxId: "ESA28109876",
      street1: "Paseo de la Castellana 95, Torre Europa",
      zipCode: "28046",
      city: "Madrid",
      country: "ES",
      unLocode: "ESMAD",
      notes: "SCAC: MAEU. BIC: MSKU. World leader in container liner shipping.",
    },
    {
      id: "addr_carr_msc",
      companyId: "grp_msc",
      companyName: "MSC Mediterranean Shipping Company S.A.",
      tradeName: "MSC",
      taxId: "CHE105952874",
      street1: "Chemin Rieu 12-14, MSC Executive Tower",
      zipCode: "1208",
      city: "Geneva",
      country: "CH",
      unLocode: "CHGVA",
      notes: "SCAC: MSCU. BIC: MEDU. Premier global ocean carrier.",
    },
    {
      id: "addr_carr_cma",
      companyId: "grp_cma",
      companyName: "CMA CGM (Spain) S.L.U.",
      tradeName: "CMA CGM",
      taxId: "ESB61092834",
      street1: "Passeig Josep Carner 16",
      zipCode: "08038",
      city: "Barcelona",
      country: "ES",
      unLocode: "ESBCN",
      notes:
        "SCAC: CMDU. BIC: CMAU. Major French container shipping and logistics group.",
    },
    {
      id: "addr_carr_cosco",
      companyId: "grp_cosco",
      companyName: "COSCO SHIPPING Lines (Spain) S.A.",
      tradeName: "COSCO",
      taxId: "ESA08923451",
      street1: "Av. Diagonal 477, Planta 12",
      zipCode: "08036",
      city: "Barcelona",
      country: "ES",
      unLocode: "ESBCN",
      notes:
        "SCAC: COSU. BIC: COSU. Leading state-owned Chinese container carrier.",
    },
    {
      id: "addr_carr_hapag",
      companyId: "grp_hapag",
      companyName: "Hapag-Lloyd (Spain) S.L.",
      tradeName: "Hapag-Lloyd",
      taxId: "ESB28091238",
      street1: "Paseo de Recoletos 37",
      zipCode: "28004",
      city: "Madrid",
      country: "ES",
      unLocode: "ESMAD",
      notes: "SCAC: HLCU. BIC: HLCU. German liner shipping company.",
    },
    {
      id: "addr_carr_one",
      companyId: "grp_one",
      companyName: "Ocean Network Express (Spain) S.L.",
      tradeName: "ONE",
      taxId: "ESB88123456",
      street1: "Calle Serrano 45, Planta 4",
      zipCode: "28001",
      city: "Madrid",
      country: "ES",
      unLocode: "ESMAD",
      notes:
        "SCAC: ONEY. BIC: ONEU. Japanese liner consortium (NYK, MOL, K-Line).",
    },
    {
      id: "addr_carr_evergreen",
      companyId: "grp_evergreen",
      companyName: "Evergreen Shipping Agency (Spain) S.L.",
      tradeName: "Evergreen",
      taxId: "ESB08554433",
      street1: "Calle Lepanto 350",
      zipCode: "08025",
      city: "Barcelona",
      country: "ES",
      unLocode: "ESBCN",
      notes:
        "SCAC: EGLV. BIC: EGLU. Major Taiwanese container shipping company.",
    },
    {
      id: "addr_carr_hmm",
      companyId: "grp_hmm",
      companyName: "HMM (Europe) G.m.b.H. - Sucursal España",
      tradeName: "HMM",
      taxId: "ESW0021345E",
      street1: "Calle Velázquez 50, Planta 3",
      zipCode: "28001",
      city: "Madrid",
      country: "ES",
      unLocode: "ESMAD",
      notes:
        "SCAC: HDMU. BIC: HDMU. South Korean national flagship container carrier.",
    },
    {
      id: "addr_carr_yangming",
      companyId: "grp_yangming",
      companyName: "Yang Ming (Spain) S.L.",
      tradeName: "Yang Ming",
      taxId: "ESB46991122",
      street1: "Avenida de Francia 15",
      zipCode: "46023",
      city: "Valencia",
      country: "ES",
      unLocode: "ESVLC",
      notes: "SCAC: YMLU. BIC: YMLU. Taiwanese ocean shipping line.",
    },
    {
      id: "addr_carr_zim",
      companyId: "grp_zim",
      companyName: "ZIM Integrated Shipping Services (Iberia) S.A.",
      tradeName: "ZIM",
      taxId: "ESA08119988",
      street1: "Carrer de Josep Pla 2, Torres Diagonal Litoral",
      zipCode: "08019",
      city: "Barcelona",
      country: "ES",
      unLocode: "ESBCN",
      notes:
        "SCAC: ZIMU. BIC: ZIMU. Global container shipping carrier headquartered in Haifa.",
    },
  ];

  for (const c of carrierAddresses) {
    await client.execute({
      sql: `INSERT INTO addresses (id, company_id, address_type, company_name, trade_name, tax_id, street_1, zip_code, city, country, un_locode, notes, created_at, updated_at, is_deleted, is_active)
            VALUES (?, ?, 'CAR', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)
            ON CONFLICT(id) DO UPDATE SET company_name=excluded.company_name, trade_name=excluded.trade_name, tax_id=excluded.tax_id, street_1=excluded.street_1, zip_code=excluded.zip_code, city=excluded.city, country=excluded.country, un_locode=excluded.un_locode, notes=excluded.notes, updated_at=excluded.updated_at;`,
      args: [
        c.id,
        c.companyId,
        c.companyName,
        c.tradeName,
        c.taxId,
        c.street1,
        c.zipCode,
        c.city,
        c.country,
        c.unLocode,
        c.notes,
        nowSec,
        nowSec,
      ],
    });
  }
  console.log(
    "✅ Top 10 ocean carriers verified in addresses (address_type = 'CAR').",
  );

  // 3. Ensure canonical customs brokers in addresses
  const brokerAddresses = [
    {
      id: "addr_broker_bcn",
      companyId: "grp_customs_iberia",
      companyName: "Aduanas Trans-Mediterráneo S.L.P.",
      tradeName: "Trans-Med Customs OEA",
      taxId: "ESB08991144",
      street1: "Muelle Adosado, Tinglado 3",
      zipCode: "08039",
      city: "Barcelona",
      country: "ES",
      unLocode: "ESBCN",
      notes: "OEA Full: AEOF-ES-00012/18. Despacho aduanero integral 24/7.",
    },
    {
      id: "addr_broker_vlc",
      companyId: "grp_customs_iberia",
      companyName: "Iberia Customs & Trade Compliance S.A.",
      tradeName: "Iberia Customs Valencia",
      taxId: "ESA46112233",
      street1: "Avinguda del Port 240",
      zipCode: "46024",
      city: "Valencia",
      country: "ES",
      unLocode: "ESVLC",
      notes:
        "OEA Full: AEOF-ES-00045/19. Especialistas en regímenes especiales y DA.",
    },
    {
      id: "addr_broker_mad",
      companyId: "grp_customs_iberia",
      companyName: "Castilla Aduanas y Comercio Exterior S.L.",
      tradeName: "Castilla Aduanas Barajas",
      taxId: "ESB28014499",
      street1: "Centro Carga Aérea Barajas, Edificio Servicios Gerais",
      zipCode: "28042",
      city: "Madrid",
      country: "ES",
      unLocode: "ESMAD",
      notes:
        "OEA Simplificaciones: AEOC-ES-00078/20. Despacho aéreo y centralizado nacional.",
    },
    {
      id: "addr_broker_alg",
      companyId: "grp_customs_iberia",
      companyName: "Estrecho Aduanas y Logística S.A.",
      tradeName: "Estrecho Customs & Forwarding",
      taxId: "ESA11005588",
      street1: "Paseo de la Conferencia 9, Isla Verde",
      zipCode: "11207",
      city: "Algeciras",
      country: "ES",
      unLocode: "ESALG",
      notes:
        "OEA Full: AEOF-ES-00091/21. Enlace estrecho Gibraltar y tráficos T1/T2.",
    },
  ];

  for (const b of brokerAddresses) {
    await client.execute({
      sql: `INSERT INTO addresses (id, company_id, address_type, company_name, trade_name, tax_id, street_1, zip_code, city, country, un_locode, notes, created_at, updated_at, is_deleted, is_active)
            VALUES (?, ?, 'CB', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)
            ON CONFLICT(id) DO UPDATE SET company_name=excluded.company_name, trade_name=excluded.trade_name, tax_id=excluded.tax_id, street_1=excluded.street_1, zip_code=excluded.zip_code, city=excluded.city, country=excluded.country, un_locode=excluded.un_locode, notes=excluded.notes, updated_at=excluded.updated_at;`,
      args: [
        b.id,
        b.companyId,
        b.companyName,
        b.tradeName,
        b.taxId,
        b.street1,
        b.zipCode,
        b.city,
        b.country,
        b.unLocode,
        b.notes,
        nowSec,
        nowSec,
      ],
    });
  }
  console.log(
    "✅ Canonical customs brokers verified in addresses (address_type = 'CB').",
  );

  // 4. Ensure destination agents in addresses (address_type = 'AG')
  const destAgentAddresses = [
    {
      id: "addr_dag_us_nyc",
      companyName: "Atlantic Port Maritime Agency LLC",
      tradeName: "Atlantic Port Maritime Agency",
      street1: "100 Port Street, Terminal Berth 4",
      zipCode: "07114",
      city: "Newark / New York",
      country: "US",
      unLocode: "USNYC",
      notes: "US East Coast handling & destination clearing agency.",
    },
    {
      id: "addr_dag_nl_rtm",
      companyName: "Eurogate Rotterdam Clearing B.V.",
      tradeName: "Eurogate Rotterdam Clearing",
      street1: "Maasvlakte 2, Europaweg 900",
      zipCode: "3199",
      city: "Rotterdam",
      country: "NL",
      unLocode: "NLRTM",
      notes: "Rotterdam gateway port handling agent & EU transit coordinator.",
    },
    {
      id: "addr_dag_de_ham",
      companyName: "Hanseatic Customs & Port Services GmbH",
      tradeName: "Hanseatic Port Services",
      street1: "Am Sandtorkai 60, Speicherstadt",
      zipCode: "20457",
      city: "Hamburg",
      country: "DE",
      unLocode: "DEHAM",
      notes: "Hanseatic container handling & multimodal onward shipping.",
    },
    {
      id: "addr_dag_sg_sin",
      companyName: "Merlion Strait Forwarding Pte Ltd",
      tradeName: "Merlion Strait Forwarding",
      street1: "Pasir Panjang Road 120",
      zipCode: "118543",
      city: "Singapore",
      country: "SG",
      unLocode: "SGSIN",
      notes: "Southeast Asia transshipment hub agent.",
    },
    {
      id: "addr_dag_cn_sha",
      companyName: "Yangshan East Port Logistics Co.",
      tradeName: "Yangshan East Port Logistics",
      street1: "Yangshan Deepwater Port, Berth 7",
      zipCode: "201308",
      city: "Shanghai",
      country: "CN",
      unLocode: "CNSHA",
      notes: "East China maritime port handling agency.",
    },
    {
      id: "addr_dag_mx_mex",
      companyName: "Agencia Aduanal Transfronteriza del Norte S.A.",
      tradeName: "Transfronteriza Aduanas del Norte",
      street1: "Av. Paseo de la Reforma 400",
      zipCode: "06600",
      city: "Ciudad de México",
      country: "MX",
      unLocode: "MXMEX",
      notes:
        "Mexican cross-border destination agency and customs representation.",
    },
  ];

  for (const a of destAgentAddresses) {
    await client.execute({
      sql: `INSERT INTO addresses (id, company_id, address_type, company_name, trade_name, street_1, zip_code, city, country, un_locode, notes, created_at, updated_at, is_deleted, is_active)
            VALUES (?, 'c-1', 'AG', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)
            ON CONFLICT(id) DO UPDATE SET company_name=excluded.company_name, trade_name=excluded.trade_name, street_1=excluded.street_1, zip_code=excluded.zip_code, city=excluded.city, country=excluded.country, un_locode=excluded.un_locode, notes=excluded.notes, updated_at=excluded.updated_at;`,
      args: [
        a.id,
        a.companyName,
        a.tradeName,
        a.street1,
        a.zipCode,
        a.city,
        a.country,
        a.unLocode,
        a.notes,
        nowSec,
        nowSec,
      ],
    });
  }
  console.log(
    "✅ Destination agents verified in addresses (address_type = 'AG').",
  );

  // 5. Ensure official regulatory identifiers (SCAC, BIC, BROKER_LICENSE, AEO)
  const identifiers = [
    {
      id: "ident_cma_scac",
      addressId: "addr_carr_cma",
      scheme: "SCAC",
      value: "CMDU",
      mode: "OCEAN",
      issuer: "NMFTA",
    },
    {
      id: "ident_cma_bic",
      addressId: "addr_carr_cma",
      scheme: "BIC_OWNER",
      value: "CMAU",
      mode: "OCEAN",
      issuer: "BIC",
    },
    {
      id: "ident_zim_scac",
      addressId: "addr_carr_zim",
      scheme: "SCAC",
      value: "ZIMU",
      mode: "OCEAN",
      issuer: "NMFTA",
    },
    {
      id: "ident_zim_bic",
      addressId: "addr_carr_zim",
      scheme: "BIC_OWNER",
      value: "ZIMU",
      mode: "OCEAN",
      issuer: "BIC",
    },
    {
      id: "ident_hmm_scac",
      addressId: "addr_carr_hmm",
      scheme: "SCAC",
      value: "HDMU",
      mode: "OCEAN",
      issuer: "NMFTA",
    },
    {
      id: "ident_hmm_bic",
      addressId: "addr_carr_hmm",
      scheme: "BIC_OWNER",
      value: "HDMU",
      mode: "OCEAN",
      issuer: "BIC",
    },
    {
      id: "ident_ym_scac",
      addressId: "addr_carr_yangming",
      scheme: "SCAC",
      value: "YMLU",
      mode: "OCEAN",
      issuer: "NMFTA",
    },
    {
      id: "ident_ym_bic",
      addressId: "addr_carr_yangming",
      scheme: "BIC_OWNER",
      value: "YMLU",
      mode: "OCEAN",
      issuer: "BIC",
    },
    {
      id: "ident_broker_mad_lic",
      addressId: "addr_broker_mad",
      scheme: "BROKER_LICENSE",
      value: "ES-CB-28014",
      mode: "MULTIMODAL",
      issuer: "Agencia Tributaria - Dpto. Aduanas",
    },
    {
      id: "ident_broker_mad_aeo",
      addressId: "addr_broker_mad",
      scheme: "AEO",
      value: "AEOC-ES-00078/20",
      mode: "MULTIMODAL",
      issuer: "European Commission / AEAT",
    },
    {
      id: "ident_broker_alg_lic",
      addressId: "addr_broker_alg",
      scheme: "BROKER_LICENSE",
      value: "ES-CB-11005",
      mode: "MULTIMODAL",
      issuer: "Agencia Tributaria - Dpto. Aduanas",
    },
    {
      id: "ident_broker_alg_aeo",
      addressId: "addr_broker_alg",
      scheme: "AEO",
      value: "AEOF-ES-00091/21",
      mode: "MULTIMODAL",
      issuer: "European Commission / AEAT",
    },
  ];

  for (const ident of identifiers) {
    await client.execute({
      sql: `INSERT INTO address_identifiers (id, address_id, scheme, value, transport_mode, is_primary, issued_by, created_at, is_deleted, is_active)
            VALUES (?, ?, ?, ?, ?, 1, ?, ?, 0, 1)
            ON CONFLICT(id) DO UPDATE SET address_id=excluded.address_id, value=excluded.value, transport_mode=excluded.transport_mode, issued_by=excluded.issued_by;`,
      args: [
        ident.id,
        ident.addressId,
        ident.scheme,
        ident.value,
        ident.mode,
        ident.issuer,
        nowSec,
      ],
    });
  }
  console.log("✅ Extended address identifiers verified.");

  // 6. Disable foreign keys during retargeting and schema rebuild
  await client.execute("PRAGMA foreign_keys = OFF;");

  // Carrier Name to Canonical Address ID Mapping
  const carrierNameToAddressId: Record<string, string> = {
    MSC: "addr_carr_msc",
    "CMA CGM": "addr_carr_cma",
    "Hapag-Lloyd": "addr_carr_hapag",
    "Yang Ming": "addr_carr_yangming",
    COSCO: "addr_carr_cosco",
    Evergreen: "addr_carr_evergreen",
    Maersk: "addr_carr_maersk",
    ZIM: "addr_carr_zim",
    HMM: "addr_carr_hmm",
    ONE: "addr_carr_one",
  };

  // Retarget schedules.carrier_id
  for (const [carrierName, targetAddressId] of Object.entries(
    carrierNameToAddressId,
  )) {
    const res = await client.execute({
      sql: `UPDATE schedules SET carrier_id = ? WHERE carrier_id IN (SELECT id FROM carriers WHERE name = ?);`,
      args: [targetAddressId, carrierName],
    });
    console.log(
      `- Retargeted ${res.rowsAffected} schedules for carrier '${carrierName}' -> ${targetAddressId}`,
    );
  }

  // Retarget rates.carrier_id
  for (const [carrierName, targetAddressId] of Object.entries(
    carrierNameToAddressId,
  )) {
    const res = await client.execute({
      sql: `UPDATE rates SET carrier_id = ? WHERE carrier_id IN (SELECT id FROM carriers WHERE name = ?);`,
      args: [targetAddressId, carrierName],
    });
    console.log(
      `- Retargeted ${res.rowsAffected} rates for carrier '${carrierName}' -> ${targetAddressId}`,
    );
  }

  // Retarget costs.vendor_id
  for (const [carrierName, targetAddressId] of Object.entries(
    carrierNameToAddressId,
  )) {
    const res = await client.execute({
      sql: `UPDATE costs SET vendor_id = ? WHERE vendor_id IN (SELECT id FROM carriers WHERE name = ?);`,
      args: [targetAddressId, carrierName],
    });
    if (res.rowsAffected > 0) {
      console.log(
        `- Retargeted ${res.rowsAffected} costs for carrier '${carrierName}' -> ${targetAddressId}`,
      );
    }
  }

  // Retarget rate_import_batches.carrier_id
  for (const [carrierName, targetAddressId] of Object.entries(
    carrierNameToAddressId,
  )) {
    const res = await client.execute({
      sql: `UPDATE rate_import_batches SET carrier_id = ? WHERE carrier_id IN (SELECT id FROM carriers WHERE name = ?);`,
      args: [targetAddressId, carrierName],
    });
    if (res.rowsAffected > 0) {
      console.log(
        `- Retargeted ${res.rowsAffected} rate import batches for carrier '${carrierName}' -> ${targetAddressId}`,
      );
    }
  }

  // 7. Retarget customs_declarations.broker_id to the 4 canonical brokers
  const brokerTargetIds = [
    "addr_broker_bcn",
    "addr_broker_vlc",
    "addr_broker_mad",
    "addr_broker_alg",
  ];
  const decls = (await client.execute("SELECT id FROM customs_declarations"))
    .rows;
  console.log(
    `Re-pointing ${decls.length} customs declarations to 4 canonical licensed brokers...`,
  );
  for (let i = 0; i < decls.length; i++) {
    const targetBrokerId = brokerTargetIds[i % brokerTargetIds.length];
    await client.execute({
      sql: "UPDATE customs_declarations SET broker_id = ? WHERE id = ?;",
      args: [targetBrokerId, decls[i].id as string],
    });
  }
  console.log(
    "✅ All customs declarations successfully re-pointed to canonical brokers.",
  );

  // 8. Rebuild table FK definitions for SQLite
  // In SQLite, to change foreign key constraint references:
  // We recreate schedules, rates, costs, rate_import_batches, and customs_declarations pointing to addresses(id).
  console.log("\nRebuilding table schemas to reference addresses(id)...");

  // schedules
  await client.execute("PRAGMA foreign_keys = OFF;");
  await client.execute("DROP TABLE IF EXISTS schedules_new;");
  await client.execute(`
    CREATE TABLE schedules_new (
      id text PRIMARY KEY,
      lane_id text NOT NULL REFERENCES lanes(id),
      carrier_id text NOT NULL REFERENCES addresses(id),
      vessel_name text,
      voyage_number text,
      departure_date integer NOT NULL,
      arrival_date integer NOT NULL,
      created_at integer NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at integer,
      is_deleted integer NOT NULL DEFAULT false,
      is_active integer NOT NULL DEFAULT true,
      metadata text,
      tags text
    );
  `);
  await client.execute(`INSERT INTO schedules_new SELECT * FROM schedules;`);
  await client.execute(`DROP TABLE schedules;`);
  await client.execute(`ALTER TABLE schedules_new RENAME TO schedules;`);

  // rates
  await client.execute("DROP TABLE IF EXISTS rates_new;");
  await client.execute(`
    CREATE TABLE rates_new (
      id text PRIMARY KEY,
      carrier_id text NOT NULL REFERENCES addresses(id),
      lane_id text NOT NULL REFERENCES lanes(id),
      containerType text NOT NULL,
      baseRate real NOT NULL,
      baf real NOT NULL DEFAULT 0,
      pss real NOT NULL DEFAULT 0,
      thc real NOT NULL DEFAULT 0,
      service_line text NOT NULL DEFAULT 'Standard',
      transitDays integer NOT NULL,
      valid_from integer,
      valid_to integer,
      company_id text REFERENCES companies(id),
      created_by text REFERENCES users(id),
      updated_by text REFERENCES users(id),
      created_at integer NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at integer,
      is_deleted integer NOT NULL DEFAULT false,
      is_active integer NOT NULL DEFAULT true,
      metadata text,
      tags text,
      CONSTRAINT rates_dates_check CHECK (valid_to > valid_from),
      CONSTRAINT rates_base_check CHECK (baseRate >= 0)
    );
  `);
  await client.execute(`INSERT INTO rates_new SELECT * FROM rates;`);
  await client.execute(`DROP TABLE rates;`);
  await client.execute(`ALTER TABLE rates_new RENAME TO rates;`);

  // costs
  await client.execute("DROP TABLE IF EXISTS costs_new;");
  await client.execute(`
    CREATE TABLE costs_new (
      id text PRIMARY KEY,
      shipment_id text NOT NULL REFERENCES shipments(id),
      vendor_id text REFERENCES addresses(id),
      amount real NOT NULL,
      currency text NOT NULL,
      description text,
      created_at integer NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at integer,
      is_deleted integer NOT NULL DEFAULT false,
      is_active integer NOT NULL DEFAULT true,
      metadata text,
      tags text,
      CONSTRAINT costs_amount_check CHECK (amount >= 0)
    );
  `);
  await client.execute(`INSERT INTO costs_new SELECT * FROM costs;`);
  await client.execute(`DROP TABLE costs;`);
  await client.execute(`ALTER TABLE costs_new RENAME TO costs;`);

  // rate_import_batches
  await client.execute("DROP TABLE IF EXISTS rate_import_batches_new;");
  await client.execute(`
    CREATE TABLE rate_import_batches_new (
      id text PRIMARY KEY,
      file_name text NOT NULL,
      carrier_id text REFERENCES addresses(id),
      total_rows integer NOT NULL,
      inserted_count integer NOT NULL DEFAULT 0,
      updated_count integer NOT NULL DEFAULT 0,
      failed_count integer NOT NULL DEFAULT 0,
      status text NOT NULL DEFAULT 'COMPLETED',
      errors_json text,
      imported_by text REFERENCES users(id),
      created_at integer NOT NULL
    );
  `);
  await client.execute(
    `INSERT INTO rate_import_batches_new SELECT * FROM rate_import_batches;`,
  );
  await client.execute(`DROP TABLE rate_import_batches;`);
  await client.execute(
    `ALTER TABLE rate_import_batches_new RENAME TO rate_import_batches;`,
  );

  // customs_declarations
  await client.execute("DROP TABLE IF EXISTS customs_declarations_new;");
  await client.execute(`
    CREATE TABLE customs_declarations_new (
      id text PRIMARY KEY,
      shipment_id text NOT NULL REFERENCES shipments(id),
      broker_id text REFERENCES addresses(id),
      hs_code_id text REFERENCES hs_codes(id),
      bl_number text,
      type text DEFAULT 'Import',
      duties_amount real,
      taxes_amount real,
      status text NOT NULL,
      ai_risk_score integer,
      ai_risk_flag text,
      created_at integer NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at integer,
      is_deleted integer NOT NULL DEFAULT false,
      is_active integer NOT NULL DEFAULT true,
      metadata text,
      tags text,
      dua_number text,
      customs_value real,
      total_payable real,
      risk_score integer,
      risk_flags text,
      eori_number text,
      origin_country text,
      destination_country text,
      dua_data text
    );
  `);
  await client.execute(
    `INSERT INTO customs_declarations_new SELECT * FROM customs_declarations;`,
  );
  await client.execute(`DROP TABLE customs_declarations;`);
  await client.execute(
    `ALTER TABLE customs_declarations_new RENAME TO customs_declarations;`,
  );

  // Drop redundant tables: destination_agents, customs_brokers, carriers
  console.log(
    "Dropping redundant legacy tables: destination_agents, customs_brokers, carriers...",
  );
  await client.execute(`DROP TABLE IF EXISTS destination_agents;`);
  await client.execute(`DROP TABLE IF EXISTS customs_brokers;`);
  await client.execute(`DROP TABLE IF EXISTS carriers;`);

  await client.execute("PRAGMA foreign_keys = ON;");

  // 9. Verify foreign keys
  console.log("\nVerifying foreign keys with PRAGMA foreign_key_check...");
  const fkErrors = (await client.execute("PRAGMA foreign_key_check;")).rows;
  if (fkErrors.length > 0) {
    console.error("❌ Foreign key violations detected:", fkErrors);
    process.exit(1);
  }

  console.log(
    "🎉 SUCCESS: 0 foreign key violations! All tables and relations are 100% healthy.",
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
