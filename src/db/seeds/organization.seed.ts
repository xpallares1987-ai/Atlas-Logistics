/**
 * @file organization.seed.ts
 * @description Deterministic Master Seed Injection for Global Freight Forwarding Stations, Departments, RBAC, Alliances & MQC Contracts.
 * @module @atlas/db/seeds/organization
 */

import { db } from "../index.js";
import {
  companies,
  addresses,
  users,
  branchOffices,
  departments,
  roles,
  permissions,
  rolePermissions,
  userStationAssignments,
  forwardingAgentNetworks,
  carrierAllocationContracts,
} from "../schema/index.js";
import { sql, eq } from "drizzle-orm";

// ============================================================================
// 1. REALISTIC GLOBAL LOGISTICS STATIONS & ADDRESSES
// ============================================================================

const GLOBAL_STATION_ADDRESSES = [
  {
    id: "addr_stn_esbcn",
    companyId: "c-1",
    addressType: "FW",
    companyName: "Atlas Logistics Worldwide - Barcelona Port Gateway",
    tradeName: "Atlas Logistics BCN Ocean Gateway",
    taxId: "ESB99887766",
    street1: "Moll de Ponent s/n, ZAL Port",
    street2: "Edificio Service Center, Planta 3",
    zipCode: "08039",
    city: "Barcelona",
    federalState: "Cataluña",
    country: "ES",
    unLocode: "ESBCN",
    lat: 41.334,
    lon: 2.148,
    formattedAddress: "Moll de Ponent s/n, 08039 Barcelona, Spain",
    verificationStatus: "VERIFIED",
  },
  {
    id: "addr_stn_esvlc",
    companyId: "c-1",
    addressType: "FW",
    companyName: "Atlas Logistics Worldwide - Valencia Maritime Branch",
    tradeName: "Atlas Logistics VLC Ocean Branch",
    taxId: "ESB99887766",
    street1: "Muelle de la Aduana s/n",
    zipCode: "46024",
    city: "Valencia",
    federalState: "Comunitat Valenciana",
    country: "ES",
    unLocode: "ESVLC",
    lat: 39.462,
    lon: -0.325,
    formattedAddress: "Muelle de la Aduana, 46024 Valencia, Spain",
    verificationStatus: "VERIFIED",
  },
  {
    id: "addr_stn_esmad",
    companyId: "c-1",
    addressType: "FW",
    companyName: "Atlas Logistics Worldwide - Madrid Barajas Air Hub",
    tradeName: "Atlas Logistics MAD Air Cargo City",
    taxId: "ESB99887766",
    street1: "Centro de Carga Aérea, Parcela 2.4",
    zipCode: "28042",
    city: "Madrid",
    federalState: "Madrid",
    country: "ES",
    unLocode: "ESMAD",
    lat: 40.483,
    lon: -3.567,
    formattedAddress: "Centro de Carga Aérea Barajas, 28042 Madrid, Spain",
    verificationStatus: "VERIFIED",
  },
  {
    id: "addr_stn_nlrtm",
    companyId: "c-1",
    addressType: "FW",
    companyName: "Atlas Logistics Worldwide - Rotterdam Gateway",
    tradeName: "Atlas Logistics RTM Deepwater Gateway",
    taxId: "NL889900112B01",
    street1: "Waalhaven Oostzijde 88",
    zipCode: "3087 BM",
    city: "Rotterdam",
    country: "NL",
    unLocode: "NLRTM",
    lat: 51.888,
    lon: 4.442,
    formattedAddress: "Waalhaven Oostzijde 88, 3087 BM Rotterdam, Netherlands",
    verificationStatus: "VERIFIED",
  },
  {
    id: "addr_stn_deham",
    companyId: "c-1",
    addressType: "FW",
    companyName: "Atlas Logistics Worldwide - Hamburg Elbe Station",
    tradeName: "Atlas Logistics HAM Port Terminal",
    taxId: "DE332211990",
    street1: "Am Sandtorkai 48, Speicherstadt",
    zipCode: "20457",
    city: "Hamburg",
    country: "DE",
    unLocode: "DEHAM",
    lat: 53.543,
    lon: 9.992,
    formattedAddress: "Am Sandtorkai 48, 20457 Hamburg, Germany",
    verificationStatus: "VERIFIED",
  },
  {
    id: "addr_stn_beanr",
    companyId: "c-1",
    addressType: "FW",
    companyName: "Atlas Logistics Worldwide - Antwerp Scheldt Intermodal",
    tradeName: "Atlas Logistics ANR Intermodal Hub",
    taxId: "BE0987654321",
    street1: "Haven 1025, Scheldelaan",
    zipCode: "2030",
    city: "Antwerpen",
    country: "BE",
    unLocode: "BEANR",
    lat: 51.272,
    lon: 4.331,
    formattedAddress: "Scheldelaan, 2030 Antwerpen, Belgium",
    verificationStatus: "VERIFIED",
  },
  {
    id: "addr_stn_sgsin",
    companyId: "c-1",
    addressType: "FW",
    companyName: "Atlas Logistics Worldwide - Singapore Transshipment Station",
    tradeName: "Atlas Logistics SIN Megahub",
    taxId: "SG198700234M",
    street1: "10 Pasir Panjang Road, Mapletree Business City",
    zipCode: "117438",
    city: "Singapore",
    country: "SG",
    unLocode: "SGSIN",
    lat: 1.275,
    lon: 103.793,
    formattedAddress: "10 Pasir Panjang Rd, Singapore 117438",
    verificationStatus: "VERIFIED",
  },
  {
    id: "addr_stn_cnsha",
    companyId: "c-1",
    addressType: "FW",
    companyName: "Atlas Logistics Worldwide - Shanghai Yangshan Gateway",
    tradeName: "Atlas Logistics SHA Deepwater Branch",
    taxId: "CN9131000077889900",
    street1: "Pudong Avenue 1600, Lujiazui Tower",
    zipCode: "200135",
    city: "Shanghai",
    country: "CN",
    unLocode: "CNSHA",
    lat: 31.238,
    lon: 121.524,
    formattedAddress: "Pudong Ave 1600, Shanghai, China",
    verificationStatus: "VERIFIED",
  },
  {
    id: "addr_stn_usnyc",
    companyId: "c-1",
    addressType: "FW",
    companyName: "Atlas Logistics Worldwide - New York / Newark Gateway",
    tradeName: "Atlas Logistics NYC Metro Terminal",
    taxId: "US13-9876543",
    street1: "Port Newark Container Terminal Way, Building 105",
    zipCode: "07114",
    city: "Newark",
    federalState: "NJ",
    country: "US",
    unLocode: "USNYC",
    lat: 40.695,
    lon: -74.152,
    formattedAddress: "Port Newark Container Terminal, Newark, NJ 07114, USA",
    verificationStatus: "VERIFIED",
  },
  {
    id: "addr_stn_usmia",
    companyId: "c-1",
    addressType: "FW",
    companyName: "Atlas Logistics Worldwide - Miami LatAm Gateway",
    tradeName: "Atlas Logistics MIA Air Cargo Gateway",
    taxId: "US59-1234567",
    street1: "6300 NW 18th St, Building 716-A",
    zipCode: "33122",
    city: "Miami",
    federalState: "FL",
    country: "US",
    unLocode: "USMIA",
    lat: 25.795,
    lon: -80.301,
    formattedAddress: "6300 NW 18th St, Miami, FL 33122, USA",
    verificationStatus: "VERIFIED",
  },
];

const GLOBAL_STATIONS = [
  {
    id: "stn_esbcn_01",
    companyId: "c-1",
    addressId: "addr_stn_esbcn",
    stationCode: "BCN-OCEAN",
    name: "Barcelona Port Ocean Gateway",
    stationType: "OCEAN_GATEWAY",
    unLocode: "ESBCN",
    iataCode: "BCN",
    primaryCurrency: "EUR",
    timezone: "Europe/Madrid",
    fmcOtiNumber: "028911-NF",
    iataNumericCode: "78-4-0123",
  },
  {
    id: "stn_esvlc_01",
    companyId: "c-1",
    addressId: "addr_stn_esvlc",
    stationCode: "VLC-OCEAN",
    name: "Valencia Maritime Terminal Station",
    stationType: "OCEAN_GATEWAY",
    unLocode: "ESVLC",
    primaryCurrency: "EUR",
    timezone: "Europe/Madrid",
    fmcOtiNumber: "028911-NF",
  },
  {
    id: "stn_esmad_01",
    companyId: "c-1",
    addressId: "addr_stn_esmad",
    stationCode: "MAD-AIR",
    name: "Madrid Barajas Air Cargo Hub",
    stationType: "AIR_CARGO_HUB",
    unLocode: "ESMAD",
    iataCode: "MAD",
    primaryCurrency: "EUR",
    timezone: "Europe/Madrid",
    iataNumericCode: "78-4-7123",
  },
  {
    id: "stn_nlrtm_01",
    companyId: "c-1",
    addressId: "addr_stn_nlrtm",
    stationCode: "RTM-GATEWAY",
    name: "Rotterdam Maasvlakte Gateway Station",
    stationType: "OCEAN_GATEWAY",
    unLocode: "NLRTM",
    iataCode: "RTM",
    primaryCurrency: "EUR",
    timezone: "Europe/Amsterdam",
    fmcOtiNumber: "028911-NF",
  },
  {
    id: "stn_deham_01",
    companyId: "c-1",
    addressId: "addr_stn_deham",
    stationCode: "HAM-ELBE",
    name: "Hamburg Elbe Deepwater Station",
    stationType: "OCEAN_GATEWAY",
    unLocode: "DEHAM",
    iataCode: "HAM",
    primaryCurrency: "EUR",
    timezone: "Europe/Berlin",
  },
  {
    id: "stn_beanr_01",
    companyId: "c-1",
    addressId: "addr_stn_beanr",
    stationCode: "ANR-SCHELDT",
    name: "Antwerp Scheldt Intermodal Rail Ramp",
    stationType: "INTERMODAL_RAIL_RAMP",
    unLocode: "BEANR",
    primaryCurrency: "EUR",
    timezone: "Europe/Brussels",
  },
  {
    id: "stn_sgsin_01",
    companyId: "c-1",
    addressId: "addr_stn_sgsin",
    stationCode: "SIN-HUB",
    name: "Singapore Pasir Panjang Transshipment Hub",
    stationType: "OCEAN_GATEWAY",
    unLocode: "SGSIN",
    iataCode: "SIN",
    primaryCurrency: "SGD",
    timezone: "Asia/Singapore",
  },
  {
    id: "stn_cnsha_01",
    companyId: "c-1",
    addressId: "addr_stn_cnsha",
    stationCode: "SHA-OCEAN",
    name: "Shanghai Yangshan Deepwater Station",
    stationType: "OCEAN_GATEWAY",
    unLocode: "CNSHA",
    iataCode: "PVG",
    primaryCurrency: "CNY",
    timezone: "Asia/Shanghai",
  },
  {
    id: "stn_usnyc_01",
    companyId: "c-1",
    addressId: "addr_stn_usnyc",
    stationCode: "NYC-GATEWAY",
    name: "New York / Newark Maritime Terminal",
    stationType: "OCEAN_GATEWAY",
    unLocode: "USNYC",
    iataCode: "EWR",
    primaryCurrency: "USD",
    timezone: "America/New_York",
    fmcOtiNumber: "019284-NF",
  },
  {
    id: "stn_usmia_01",
    companyId: "c-1",
    addressId: "addr_stn_usmia",
    stationCode: "MIA-AIR",
    name: "Miami International LatAm Cargo Gateway",
    stationType: "AIR_CARGO_HUB",
    unLocode: "USMIA",
    iataCode: "MIA",
    primaryCurrency: "USD",
    timezone: "America/New_York",
    iataNumericCode: "01-1-9876",
  },
];

// ============================================================================
// 2. ENTERPRISE RBAC ROLES & PERMISSIONS
// ============================================================================

const ENTERPRISE_ROLES = [
  {
    id: "role_branch_director",
    name: "Branch Director",
    description:
      "Overall station executive managing P&L, signing legal B/Ls, and approving credit limits.",
    isSystemRole: true,
  },
  {
    id: "role_ocean_operator",
    name: "Ocean Freight Specialist",
    description:
      "Maritime forwarding clerk executing FCL/LCL bookings, B/Ls, VGM filings, and container tracking.",
    isSystemRole: true,
  },
  {
    id: "role_air_dispatcher",
    name: "Air Logistics Controller",
    description:
      "Air freight clerk generating e-AWBs, flight bookings, and Cargo iQ milestone updates.",
    isSystemRole: true,
  },
  {
    id: "role_customs_declarant",
    name: "Licensed Customs Declarant",
    description:
      "AEO customs broker certified to lodge import/export DUAs, tariff classifications, and transit T1 bonds.",
    isSystemRole: true,
  },
  {
    id: "role_drayage_controller",
    name: "Intermodal Drayage Dispatcher",
    description:
      "Port cartage dispatcher assigning hauliers, tracking detention demurrage, and issuing e-CMRs.",
    isSystemRole: true,
  },
  {
    id: "role_financial_controller",
    name: "Freight Financial Controller",
    description:
      "Financial auditor managing carrier invoice reconciliation, demurrage disputes, and agent settlements.",
    isSystemRole: true,
  },
  {
    id: "role_sales_key_accounts",
    name: "Key Account Commercial Manager",
    description:
      "Client commercial executive managing freight RFQs, rate negotiations, and CRM relationships.",
    isSystemRole: true,
  },
  {
    id: "role_compliance_officer",
    name: "Trade & Environmental Compliance Officer",
    description:
      "Regulatory auditor managing EU CBAM declarations, FuelEU Maritime surplus pools, and IMDG dangerous goods.",
    isSystemRole: true,
  },
];

const ENTERPRISE_PERMISSIONS = [
  // Operations
  {
    id: "perm_shp_create",
    code: "shipments:create_booking",
    category: "OPERATIONS",
    description: "Create multimodal booking",
  },
  {
    id: "perm_shp_confirm",
    code: "shipments:confirm_onboard",
    category: "OPERATIONS",
    description: "Confirm vessel departure & loaded on board",
  },
  {
    id: "perm_shp_cancel",
    code: "shipments:cancel",
    category: "OPERATIONS",
    description: "Cancel operational booking",
  },
  {
    id: "perm_trk_milestones",
    code: "tracking:update_milestones",
    category: "OPERATIONS",
    description: "Inject milestone updates and AIS coordinates",
  },
  {
    id: "perm_stw_approve",
    code: "stowage:approve_plan",
    category: "OPERATIONS",
    description: "Validate and approve 3D vessel stowage plan",
  },
  // Documents
  {
    id: "perm_doc_hbl",
    code: "documents:issue_hbl",
    category: "DOCUMENTS",
    description: "Draft and generate House Bill of Lading (HBL)",
  },
  {
    id: "perm_doc_obl",
    code: "documents:release_obl",
    category: "DOCUMENTS",
    description: "Release Original Bill of Lading with electronic endorsement",
  },
  {
    id: "perm_doc_ecmr",
    code: "documents:sign_ecmr",
    category: "DOCUMENTS",
    description: "Cryptographically sign e-CMR electronic consignment note",
  },
  {
    id: "perm_doc_eawb",
    code: "documents:issue_eawb",
    category: "DOCUMENTS",
    description: "Issue and transmit IATA ONE Record e-AWB",
  },
  // Customs
  {
    id: "perm_cst_submit",
    code: "customs:submit_declaration",
    category: "CUSTOMS",
    description: "Transmit official DUA/SAD customs declaration",
  },
  {
    id: "perm_cst_t1",
    code: "customs:sign_transit_t1",
    category: "CUSTOMS",
    description: "Sign bonded transit T1 document under global guarantee",
  },
  {
    id: "perm_cst_inspect",
    code: "customs:inspect_bonded_lots",
    category: "CUSTOMS",
    description: "Audit customs warehouse stock entries and fiscal lots",
  },
  // Drayage
  {
    id: "perm_dry_dispatch",
    code: "drayage:dispatch_truck",
    category: "DRAYAGE",
    description: "Dispatch drayage transport order to haulier fleet",
  },
  {
    id: "perm_dry_gate",
    code: "drayage:override_gate_pass",
    category: "DRAYAGE",
    description: "Authorize terminal pin release and gate pass override",
  },
  // Finance
  {
    id: "perm_fin_credit",
    code: "finance:approve_credit_override",
    category: "FINANCE",
    description: "Approve commercial credit limit override > €50,000",
  },
  {
    id: "perm_fin_settle",
    code: "finance:settle_agent_invoice",
    category: "FINANCE",
    description: "Approve reciprocal agent profit-share net payment",
  },
  {
    id: "perm_fin_waive",
    code: "finance:waive_demurrage_fees",
    category: "FINANCE",
    description: "Authorize waiver or dispute settlement of demurrage penalty",
  },
  {
    id: "perm_prc_rates",
    code: "pricing:edit_carrier_buy_rates",
    category: "FINANCE",
    description: "Edit carrier contract baseline buy-rates and BAF surcharges",
  },
  // Green & Compliance
  {
    id: "perm_grn_fueleu",
    code: "green:allocate_fueleu_surplus",
    category: "COMPLIANCE",
    description: "Allocate cryptographic FuelEU Maritime insetting tokens",
  },
  {
    id: "perm_grn_carbon",
    code: "green:certify_carbon_offset",
    category: "COMPLIANCE",
    description: "Issue ISO 14083 / GLEC verified carbon certificate",
  },
  {
    id: "perm_cmp_aeo",
    code: "compliance:audit_aeo",
    category: "COMPLIANCE",
    description: "Audit 7-point container inspection and AEO seal registry",
  },
  {
    id: "perm_cmp_imdg",
    code: "compliance:approve_imdg",
    category: "COMPLIANCE",
    description: "Validate IMDG hazmat segregation certificate",
  },
  // Administration
  {
    id: "perm_adm_station",
    code: "organization:manage_stations",
    category: "ADMIN",
    description: "Create and configure global branch offices & cost centers",
  },
  {
    id: "perm_adm_users",
    code: "organization:manage_users",
    category: "ADMIN",
    description: "Assign staff to stations, departments, and security roles",
  },
];

// ============================================================================
// 3. GLOBAL AGENT ALLIANCES & CARRIER COMMITMENT CONTRACTS
// ============================================================================

const FORWARDING_NETWORKS = [
  {
    id: "net_fiata",
    networkCode: "FIATA",
    name: "International Federation of Freight Forwarders Associations",
    secretarialBody: "FIATA Secretariat, Geneva, Switzerland",
    financialProtectionCoverageUsd: 250000,
    arbitrationJurisdiction: "Geneva / ICC International Court",
  },
  {
    id: "net_wca",
    networkCode: "WCA",
    name: "WCA Inter Global Freight Forwarding Network",
    secretarialBody: "WCAworld Headquarters, Fort Lauderdale / Bangkok",
    financialProtectionCoverageUsd: 150000,
    arbitrationJurisdiction:
      "Singapore International Arbitration Centre (SIAC)",
  },
  {
    id: "net_c5c",
    networkCode: "C5C",
    name: "Connecting 5 Continents Global Forwarding Alliance",
    secretarialBody: "C5C Alliance Management, Frankfurt, Germany",
    financialProtectionCoverageUsd: 100000,
    arbitrationJurisdiction: "Frankfurt am Main / DIS Rules",
  },
];

// ============================================================================
// MASTER SEED RUNNER
// ============================================================================

export async function seedOrganization(): Promise<void> {
  console.log(
    "🏢 [Seed:Organization] Seeding Global Stations, Departments, Granular RBAC & MQC Contracts...",
  );
  const now = new Date();

  // 1. Ensure Tenant Holding Group exists in companies
  await db
    .insert(companies)
    .values({
      id: "c-1",
      name: "Atlas Global Freight Forwarding S.L.",
      groupCode: "HOLDING_ATLAS",
      sector: "FREIGHT_FORWARDING_3PL",
      headquartersCountry: "ES",
      taxId: "ESB99887766",
      creditLimit: 10000000,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: companies.id,
      set: {
        groupCode: "HOLDING_ATLAS",
        sector: "FREIGHT_FORWARDING_3PL",
        headquartersCountry: "ES",
        updatedAt: now,
      },
    });

  // 2. Ensure Physical Station Addresses exist in addresses
  for (const addr of GLOBAL_STATION_ADDRESSES) {
    await db
      .insert(addresses)
      .values({
        id: addr.id,
        companyId: addr.companyId,
        addressType: addr.addressType as any,
        companyName: addr.companyName,
        tradeName: addr.tradeName,
        taxId: addr.taxId,
        street1: addr.street1,
        street2: addr.street2,
        zipCode: addr.zipCode,
        city: addr.city,
        federalState: addr.federalState,
        country: addr.country,
        unLocode: addr.unLocode,
        lat: addr.lat,
        lon: addr.lon,
        formattedAddress: addr.formattedAddress,
        verificationStatus: addr.verificationStatus as any,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: addresses.id,
        set: {
          companyName: addr.companyName,
          tradeName: addr.tradeName,
          unLocode: addr.unLocode,
          lat: addr.lat,
          lon: addr.lon,
          updatedAt: now,
        },
      });
  }

  // 3. Seed Roles
  for (const r of ENTERPRISE_ROLES) {
    await db
      .insert(roles)
      .values({
        id: r.id,
        name: r.name,
        description: r.description,
        isSystemRole: r.isSystemRole,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: roles.name,
        set: { description: r.description, updatedAt: now },
      });
  }

  // 4. Seed Permissions
  for (const p of ENTERPRISE_PERMISSIONS) {
    await db
      .insert(permissions)
      .values({
        id: p.id,
        code: p.code,
        category: p.category,
        description: p.description,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: permissions.code,
        set: {
          description: p.description,
          category: p.category,
          updatedAt: now,
        },
      });
  }

  // 5. Seed Role Permissions Linkages
  // Grant all permissions to Branch Director
  for (const p of ENTERPRISE_PERMISSIONS) {
    await db
      .insert(rolePermissions)
      .values({
        id: `rp_bd_${p.id}`,
        roleId: "role_branch_director",
        permissionId: p.id,
        createdAt: now,
      })
      .onConflictDoNothing();
  }

  // Grant specialized permissions to Ocean Operator
  const oceanPerms = [
    "perm_shp_create",
    "perm_shp_confirm",
    "perm_trk_milestones",
    "perm_stw_approve",
    "perm_doc_hbl",
  ];
  for (const pid of oceanPerms) {
    await db
      .insert(rolePermissions)
      .values({
        id: `rp_ocean_${pid}`,
        roleId: "role_ocean_operator",
        permissionId: pid,
        createdAt: now,
      })
      .onConflictDoNothing();
  }

  // Grant customs permissions to Customs Declarant
  const customsPerms = [
    "perm_cst_submit",
    "perm_cst_t1",
    "perm_cst_inspect",
    "perm_cmp_aeo",
  ];
  for (const pid of customsPerms) {
    await db
      .insert(rolePermissions)
      .values({
        id: `rp_cst_${pid}`,
        roleId: "role_customs_declarant",
        permissionId: pid,
        createdAt: now,
      })
      .onConflictDoNothing();
  }

  // 6. Seed Global Stations (branch_offices)
  // Fetch existing admin user for assignment as initial station manager
  const adminUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "ADMIN"))
    .limit(1);
  const defaultManagerId = adminUsers[0]?.id || null;

  for (const stn of GLOBAL_STATIONS) {
    await db
      .insert(branchOffices)
      .values({
        id: stn.id,
        companyId: stn.companyId,
        addressId: stn.addressId,
        stationCode: stn.stationCode,
        name: stn.name,
        stationType: stn.stationType as any,
        unLocode: stn.unLocode,
        iataCode: stn.iataCode,
        primaryCurrency: stn.primaryCurrency,
        timezone: stn.timezone,
        fmcOtiNumber: stn.fmcOtiNumber,
        iataNumericCode: stn.iataNumericCode,
        managerUserId: defaultManagerId,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: branchOffices.stationCode,
        set: {
          name: stn.name,
          unLocode: stn.unLocode,
          primaryCurrency: stn.primaryCurrency,
          timezone: stn.timezone,
          updatedAt: now,
        },
      });

    // 7. Seed Departments per Station
    const depts = [
      {
        code: "OCEAN_EXPORT",
        name: `${stn.stationCode} - Ocean Export Operations`,
        costCenter: `CC-${stn.unLocode}-01`,
      },
      {
        code: "OCEAN_IMPORT",
        name: `${stn.stationCode} - Ocean Import & Deconsolidation`,
        costCenter: `CC-${stn.unLocode}-02`,
      },
      {
        code: "CUSTOMS_BROKERAGE",
        name: `${stn.stationCode} - Customs Brokerage & AEO Clearance`,
        costCenter: `CC-${stn.unLocode}-03`,
      },
      {
        code: "ROAD_DRAYAGE",
        name: `${stn.stationCode} - Port Haulage & Intermodal Dispatch`,
        costCenter: `CC-${stn.unLocode}-04`,
      },
      {
        code: "FINANCE_CONTROLLING",
        name: `${stn.stationCode} - Freight Audit & Financial Controlling`,
        costCenter: `CC-${stn.unLocode}-05`,
      },
    ];

    if (stn.iataCode) {
      depts.push({
        code: "AIR_LOGISTICS",
        name: `${stn.stationCode} - Air Freight Logistics & CASS Netting`,
        costCenter: `CC-${stn.unLocode}-06`,
      });
    }

    for (const d of depts) {
      const deptId = `dept_${stn.stationCode.toLowerCase()}_${d.code.toLowerCase()}`;
      await db
        .insert(departments)
        .values({
          id: deptId,
          branchId: stn.id,
          code: d.code as any,
          name: d.name,
          costCenter: d.costCenter,
          emailAlias: `${d.code.toLowerCase()}.${stn.stationCode.toLowerCase()}@atlas-logistics.com`,
          managerUserId: defaultManagerId,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: departments.id,
          set: {
            name: d.name,
            costCenter: d.costCenter,
            updatedAt: now,
          },
        });
    }
  }

  // 8. Seed Forwarding Agent Networks
  for (const net of FORWARDING_NETWORKS) {
    await db
      .insert(forwardingAgentNetworks)
      .values({
        id: net.id,
        networkCode: net.networkCode,
        name: net.name,
        secretarialBody: net.secretarialBody,
        financialProtectionCoverageUsd: net.financialProtectionCoverageUsd,
        arbitrationJurisdiction: net.arbitrationJurisdiction,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: forwardingAgentNetworks.networkCode,
        set: {
          name: net.name,
          secretarialBody: net.secretarialBody,
          updatedAt: now,
        },
      });
  }

  // 9. Seed Carrier Allocation Contracts (MQC / BSA)
  const carrierMaersk = await db
    .select({ id: addresses.id })
    .from(addresses)
    .where(eq(addresses.id, "addr_carr_maersk"))
    .limit(1);
  const carrierMaerskAddress = carrierMaersk[0] || null;

  if (carrierMaerskAddress) {
    await db
      .insert(carrierAllocationContracts)
      .values({
        id: "alloc_msk_fewb_2026",
        carrierAddressId: "addr_carr_maersk",
        branchId: "stn_esbcn_01",
        contractReference: "SC-MSK-2026-FEWB-001",
        tradeLaneName:
          "FEWB - Far East Westbound (Shanghai -> Barcelona/Rotterdam)",
        effectiveFrom: new Date("2026-01-01"),
        effectiveTo: new Date("2026-12-31"),
        monthlyTeuMqc: 450, // 450 TEU monthly commitment
        committedTeuTiers: {
          fclStandard: 350,
          fclReefer: 60,
          specialCargo: 40,
        },
        deadfreightPenaltyRatePerTeu: 280, // $280 per unfulfilled slot
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: carrierAllocationContracts.id,
        set: {
          monthlyTeuMqc: 450,
          updatedAt: now,
        },
      });
  }

  // 10. Seed User Station & Department Assignments
  const opsUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "OPERATIONS"))
    .limit(1);
  const opsUser = opsUsers[0] || null;

  if (opsUser) {
    await db
      .insert(userStationAssignments)
      .values({
        id: `assign_${opsUser.id}_esbcn_ocean`,
        userId: opsUser.id,
        branchId: "stn_esbcn_01",
        departmentId: "dept_bcn-ocean_ocean_export",
        roleId: "role_ocean_operator",
        isPrimary: true,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();
  }

  console.log(
    "✅ [Seed:Organization] 10 Global Stations, 52 Departments, 8 RBAC Roles & MQC Contracts seeded successfully.",
  );
}
