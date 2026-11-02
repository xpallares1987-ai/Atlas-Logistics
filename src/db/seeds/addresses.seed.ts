import { db } from "../index.js";
import { companies, addresses, addressContacts } from "../schema/core.js";
import {
  bookings,
  shipments,
  shipmentContainers,
} from "../schema/operations.js";
import { documents } from "../schema/support.js";
import { formatAllBlBoxes } from "@atlas/shared";
import { ensureAddressesTables } from "../../routes/addresses.routes.js";
import { ensureBookingsColumns } from "../../services/booking-lifecycle.service.js";
import { eq } from "drizzle-orm";

export async function seedAddressesAndBookings(tenantCompanyId = "c-1") {
  await ensureAddressesTables();
  await ensureBookingsColumns();

  // Ensure tenant company exists
  await db
    .insert(companies)
    .values({
      id: tenantCompanyId,
      name: "Atlas Global Freight Forwarding S.L.",
      taxId: "ESB99887766",
      creditLimit: 5000000,
    })
    .onConflictDoNothing();

  console.log(
    "🌱 [Seed:Addresses] Injecting realistic maritime & logistics master directory...",
  );

  // 1. Definition of Realistic Master Directory Entities across all 10 types
  const seedEntities = [
    // CUSTOMER / SHIPPERS
    {
      id: "addr_cust_iberian",
      companyId: tenantCompanyId,
      addressType: "CUSTOMER",
      companyName: "Iberian Chemicals & Polymers S.A.",
      tradeName: "Iberian Polymers Export",
      taxId: "ESA08234567",
      street1: "Moll de Ponent 44, Polígono Franc",
      street2: "Edificio Químicas, Nave 3",
      zipCode: "08039",
      city: "Barcelona",
      federalState: "Cataluña",
      country: "ES",
      unLocode: "ESBCN",
      isDefaultShipper: true,
      isDefaultConsignee: false,
      isDefaultNotify: false,
      notes:
        "Cargas peligrosas ADR/IMO clase 3 y 8. Recepción documental hasta las 17:30.",
      contacts: [
        {
          id: "cnt_ib_1",
          fullName: "Jordi Font i Solé",
          email: "j.font@iberianpolymers.com",
          phone: "+34 932 456 789",
          mobile: "+34 611 223 344",
          roleCategory: "OPERATIONS",
          jobTitle: "Export Operations Director",
          isPrimary: true,
        },
        {
          id: "cnt_ib_2",
          fullName: "Marta Soler Puig",
          email: "m.soler@iberianpolymers.com",
          phone: "+34 932 456 790",
          roleCategory: "SALES",
          jobTitle: "Commercial Key Account Manager",
          isPrimary: false,
        },
      ],
    },
    {
      id: "addr_cust_valencia_citrus",
      companyId: tenantCompanyId,
      addressType: "CUSTOMER",
      companyName: "Valencia Citrus & Fresh Agro S.L.",
      tradeName: "Valencitrus Premium",
      taxId: "ESB46123456",
      street1: "Avinguda del Port 120",
      street2: "Planta 4, Módulo B",
      zipCode: "46024",
      city: "Valencia",
      federalState: "Comunidad Valenciana",
      country: "ES",
      unLocode: "ESVLC",
      isDefaultShipper: false,
      isDefaultConsignee: false,
      isDefaultNotify: false,
      notes:
        "Envíos refrigerados (Reefer 40HR). Monitoreo de atmósfera controlada.",
      contacts: [
        {
          id: "cnt_vc_1",
          fullName: "Vicente Navarro Calabuig",
          email: "v.navarro@valencitrus.es",
          phone: "+34 963 881 122",
          mobile: "+34 644 556 677",
          roleCategory: "OPERATIONS",
          jobTitle: "Cold Chain Freight Manager",
          isPrimary: true,
        },
      ],
    },
    {
      id: "addr_cust_bavarian",
      companyId: tenantCompanyId,
      addressType: "CUSTOMER",
      companyName: "Bavarian Automotive Components GmbH",
      tradeName: "BAV Automatics",
      taxId: "DE812345678",
      street1: "Industriestraße 88",
      street2: "Tor 4 Logistikzentrum",
      zipCode: "80331",
      city: "Munich",
      federalState: "Bavaria",
      country: "DE",
      unLocode: "DEMUC",
      isDefaultShipper: false,
      isDefaultConsignee: false,
      isDefaultNotify: false,
      notes: "Piezas de precisión automotriz para ensamblaje Just-in-Time.",
      contacts: [
        {
          id: "cnt_bav_1",
          fullName: "Klaus Schmidt",
          email: "k.schmidt@bav-auto.de",
          phone: "+49 89 2345 6780",
          roleCategory: "MANAGEMENT",
          jobTitle: "VP Global Supply Chain",
          isPrimary: true,
        },
      ],
    },

    // CARRIERS (Navieras)
    {
      id: "addr_carr_maersk",
      companyId: tenantCompanyId,
      addressType: "CARRIER",
      companyName: "Maersk Line Spain A/S",
      tradeName: "A.P. Moller - Maersk",
      taxId: "ESA28109876",
      street1: "Paseo de la Castellana 95",
      street2: "Edificio Torre Europa, Planta 18",
      zipCode: "28046",
      city: "Madrid",
      federalState: "Madrid",
      country: "ES",
      unLocode: "ESMAD",
      isDefaultShipper: false,
      isDefaultConsignee: false,
      isDefaultNotify: false,
      notes:
        "SCAC Code: MAEU. Conexiones directas Asia-Mediterráneo y Transatlántico.",
      contacts: [
        {
          id: "cnt_msk_1",
          fullName: "David Jensen",
          email: "david.jensen@maersk.com",
          phone: "+34 914 179 000",
          roleCategory: "SALES",
          jobTitle: "Liner Key Account Director",
          isPrimary: true,
        },
      ],
    },
    {
      id: "addr_carr_msc",
      companyId: tenantCompanyId,
      addressType: "CARRIER",
      companyName: "MSC Mediterranean Shipping Company S.A.",
      tradeName: "MSC Global Headquarters",
      taxId: "CHE105952874",
      street1: "Chemin Rieu 12-14",
      street2: "MSC Executive Tower",
      zipCode: "1208",
      city: "Geneva",
      federalState: "Geneva",
      country: "CH",
      unLocode: "CHGVA",
      isDefaultShipper: false,
      isDefaultConsignee: false,
      isDefaultNotify: false,
      notes:
        "SCAC Code: MSCU. La mayor línea naviera portacontenedores del mundo.",
      contacts: [
        {
          id: "cnt_msc_1",
          fullName: "Marco Rossi",
          email: "m.rossi@msc.com",
          phone: "+41 22 703 8888",
          roleCategory: "OPERATIONS",
          jobTitle: "Mediterranean Vessel Operations Head",
          isPrimary: true,
        },
      ],
    },
    {
      id: "addr_carr_hapag",
      companyId: tenantCompanyId,
      addressType: "CARRIER",
      companyName: "Hapag-Lloyd AG",
      tradeName: "Hapag-Lloyd",
      taxId: "DE118519504",
      street1: "Ballindamm 25",
      street2: "Zentrale",
      zipCode: "20095",
      city: "Hamburg",
      federalState: "Hamburg",
      country: "DE",
      unLocode: "DEHAM",
      isDefaultShipper: false,
      isDefaultConsignee: false,
      isDefaultNotify: false,
      notes:
        "SCAC Code: HLCU. Calidad en servicio regular norte de Europa y América.",
      contacts: [
        {
          id: "cnt_hl_1",
          fullName: "Thomas Becker",
          email: "t.becker@hlag.com",
          phone: "+49 40 3001 0",
          roleCategory: "OPERATIONS",
          jobTitle: "Container Logistics Coordinator",
          isPrimary: true,
        },
      ],
    },

    // CARRIER AGENTS (Agentes Navieros en Puertos Clave)
    {
      id: "addr_agent_msc_bcn",
      companyId: tenantCompanyId,
      addressType: "CARRIER_AGENT",
      companyName: "Mediterranean Shipping Agency Barcelona S.L.",
      tradeName: "MSC Barcelona Agency",
      taxId: "ESB60987654",
      street1: "Moll de Ponent s/n, Terminal Port",
      street2: "Edificio MSC, Planta 2",
      zipCode: "08039",
      city: "Barcelona",
      federalState: "Cataluña",
      country: "ES",
      unLocode: "ESBCN",
      isDefaultShipper: false,
      isDefaultConsignee: false,
      isDefaultNotify: false,
      notes:
        "Agente consignatario oficial para recaladas en el Port de Barcelona.",
      contacts: [
        {
          id: "cnt_ag_msc_1",
          fullName: "Marc Vila Roig",
          email: "m.vila@msc-agency.com",
          phone: "+34 934 001 002",
          mobile: "+34 670 112 233",
          roleCategory: "OPERATIONS",
          jobTitle: "Head of Maritime Operations",
          isPrimary: true,
        },
        {
          id: "cnt_ag_msc_2",
          fullName: "Laura Gomez Vives",
          email: "l.gomez@msc-agency.com",
          phone: "+34 934 001 003",
          roleCategory: "CUSTOMS",
          jobTitle: "Port Vessel Clearances",
          isPrimary: false,
        },
      ],
    },
    {
      id: "addr_agent_maersk_rtm",
      companyId: tenantCompanyId,
      addressType: "CARRIER_AGENT",
      companyName: "Maersk Port Services Rotterdam B.V.",
      tradeName: "Maersk Rotterdam Discharge Desk",
      taxId: "NL801234567B01",
      street1: "Boompjes 40",
      street2: "Willemswerf Building, Floor 12",
      zipCode: "3011 XB",
      city: "Rotterdam",
      federalState: "South Holland",
      country: "NL",
      unLocode: "NLRTM",
      isDefaultShipper: false,
      isDefaultConsignee: false,
      isDefaultNotify: false,
      notes:
        "Agente de descarga y entrega de conocimientos de embarque en Rotterdam.",
      contacts: [
        {
          id: "cnt_ag_msk_1",
          fullName: "Jan De Vries",
          email: "j.devries@maersk-rtm.nl",
          phone: "+31 10 205 7100",
          mobile: "+31 6 1234 5678",
          roleCategory: "OPERATIONS",
          jobTitle: "Port Discharge Manager",
          isPrimary: true,
        },
      ],
    },
    {
      id: "addr_agent_pacific_lax",
      companyId: tenantCompanyId,
      addressType: "CARRIER_AGENT",
      companyName: "Pacific Maritime Agency Los Angeles Inc.",
      tradeName: "Pacific LAX Vessel Services",
      taxId: "US951234567",
      street1: "400 Ocean Gate, Suite 800",
      street2: "Long Beach Harbor Center",
      zipCode: "90802",
      city: "Los Angeles",
      federalState: "California",
      country: "US",
      unLocode: "USLAX",
      isDefaultShipper: false,
      isDefaultConsignee: false,
      isDefaultNotify: false,
      notes:
        "Casilla 4 B/L agente consignatario en la Costa Oeste de Estados Unidos.",
      contacts: [
        {
          id: "cnt_pma_1",
          fullName: "Johnathan Miller",
          email: "j.miller@pacific-maritime.com",
          phone: "+1 562 435 7000",
          roleCategory: "PORT_OPERATIONS",
          jobTitle: "West Coast Vessel Delivery Agent",
          isPrimary: true,
        },
      ],
    },

    // CUSTOMS BROKERS (Agentes de Aduanas)
    {
      id: "addr_broker_bcn",
      companyId: tenantCompanyId,
      addressType: "CUSTOMS_BROKER",
      companyName: "Aduanas Trans-Mediterráneo S.L.P.",
      tradeName: "Trans-Med Customs OEA",
      taxId: "ESB08554433",
      street1: "Passeig Josep Carner 27",
      street2: "Edificio de Aduanas, Despacho 402",
      zipCode: "08038",
      city: "Barcelona",
      federalState: "Cataluña",
      country: "ES",
      unLocode: "ESBCN",
      isDefaultShipper: false,
      isDefaultConsignee: false,
      isDefaultNotify: false,
      notes:
        "Operador Económico Autorizado (OEA-F). DUA de importación y exportación.",
      contacts: [
        {
          id: "cnt_atm_1",
          fullName: "Carlos Ortiz Balaguer",
          email: "c.ortiz@aduanastransmed.es",
          phone: "+34 933 012 345",
          mobile: "+34 689 334 455",
          roleCategory: "CUSTOMS",
          jobTitle: "Director Técnico Aduanero Colegiado",
          isPrimary: true,
        },
      ],
    },
    {
      id: "addr_broker_vlc",
      companyId: tenantCompanyId,
      addressType: "CUSTOMS_BROKER",
      companyName: "Iberia Customs & Trade Compliance S.A.",
      tradeName: "Iberia Customs Valencia",
      taxId: "ESA46998877",
      street1: "Carrer de les Drassanes 10",
      street2: "Planta Baja",
      zipCode: "46024",
      city: "Valencia",
      federalState: "Comunidad Valenciana",
      country: "ES",
      unLocode: "ESVLC",
      isDefaultShipper: false,
      isDefaultConsignee: false,
      isDefaultNotify: false,
      notes:
        "Especialistas en inspecciones en PIF (Puesto de Inspección Fronterizo).",
      contacts: [
        {
          id: "cnt_icv_1",
          fullName: "Francisco Ruiz Beltrán",
          email: "f.ruiz@iberiacustoms.es",
          phone: "+34 963 671 200",
          roleCategory: "CUSTOMS",
          jobTitle: "Despachante de Aduanas OEA",
          isPrimary: true,
        },
      ],
    },

    // PORT AUTHORITIES & TERMINALS
    {
      id: "addr_port_bcn",
      companyId: tenantCompanyId,
      addressType: "PORT_AUTHORITY",
      companyName: "Autoridad Portuaria de Barcelona",
      tradeName: "Port de Barcelona",
      taxId: "ESQ0867012G",
      street1: "Portal de la Pau 6",
      street2: "Sede Corporativa",
      zipCode: "08039",
      city: "Barcelona",
      federalState: "Cataluña",
      country: "ES",
      unLocode: "ESBCN",
      isDefaultShipper: false,
      isDefaultConsignee: false,
      isDefaultNotify: false,
      notes:
        "Autoridad del enclave portuario de Barcelona. Tasas T3 y atraques.",
      contacts: [
        {
          id: "cnt_apb_1",
          fullName: "Dr. Xavier Valls Cardona",
          email: "x.valls@portdebarcelona.cat",
          phone: "+34 932 986 000",
          roleCategory: "MANAGEMENT",
          jobTitle: "Jefe de Operaciones Marítimas y Calado",
          isPrimary: true,
        },
      ],
    },
    {
      id: "addr_term_best_bcn",
      companyId: tenantCompanyId,
      addressType: "TERMINAL",
      companyName: "Hutchison Ports BEST (Barcelona Europe South Terminal)",
      tradeName: "BEST Terminal Muelle Prat",
      taxId: "ESA63456789",
      street1: "Muelle Prat s/n",
      street2: "Acceso Puerta 1",
      zipCode: "08820",
      city: "El Prat de Llobregat",
      federalState: "Barcelona",
      country: "ES",
      unLocode: "ESBCN",
      isDefaultShipper: false,
      isDefaultConsignee: false,
      isDefaultNotify: false,
      notes:
        "Terminal semi-automatizada más eficiente del Mediterráneo. Grúas Post-Panamax.",
      contacts: [
        {
          id: "cnt_best_1",
          fullName: "Control de Puertas y Terminal",
          email: "gates@best.com.es",
          phone: "+34 935 084 440",
          roleCategory: "PORT_OPERATIONS",
          jobTitle: "TOC (Terminal Operations Center)",
          isPrimary: true,
        },
      ],
    },
    {
      id: "addr_term_apm_vlc",
      companyId: tenantCompanyId,
      addressType: "TERMINAL",
      companyName: "APM Terminals Valencia S.A.U.",
      tradeName: "APMT Valencia",
      taxId: "ESA46112233",
      street1: "Muelle de Levante s/n",
      street2: "Acceso Terminal Norte",
      zipCode: "46024",
      city: "Valencia",
      federalState: "Valencia",
      country: "ES",
      unLocode: "ESVLC",
      isDefaultShipper: false,
      isDefaultConsignee: false,
      isDefaultNotify: false,
      notes:
        "Hub principal de trasbordo de contenedores en el corredor ibérico.",
      contacts: [
        {
          id: "cnt_apmt_1",
          fullName: "Despacho de Operaciones APMT",
          email: "valencia.operations@apmterminals.com",
          phone: "+34 963 241 500",
          roleCategory: "PORT_OPERATIONS",
          jobTitle: "Vessel Planning Supervisor",
          isPrimary: true,
        },
      ],
    },

    // INLAND CONTAINER DEPOT (ICD / Puerto Seco)
    {
      id: "addr_icd_coslada",
      companyId: tenantCompanyId,
      addressType: "INLAND_CONTAINER_DEPOT",
      companyName: "Puerto Seco de Coslada S.A.",
      tradeName: "Terminal Intermodal Coslada",
      taxId: "ESA81223344",
      street1: "Avenida de Fuentemar 20",
      street2: "Plataforma Logística Central",
      zipCode: "28823",
      city: "Coslada",
      federalState: "Madrid",
      country: "ES",
      unLocode: "ESMAD",
      isDefaultShipper: false,
      isDefaultConsignee: false,
      isDefaultNotify: false,
      notes:
        "Conexión ferroviaria diaria con los puertos de Barcelona, Valencia y Algeciras.",
      contacts: [
        {
          id: "cnt_psc_1",
          fullName: "Eduardo Lozano Prieto",
          email: "e.lozano@puertosecocoslada.com",
          phone: "+34 916 708 000",
          roleCategory: "DISPATCH_TRACKING",
          jobTitle: "Jefe de Tráfico Ferroviario Intermodal",
          isPrimary: true,
        },
      ],
    },

    // HAULIER (Transportista Terrestre)
    {
      id: "addr_haul_transmaritim",
      companyId: tenantCompanyId,
      addressType: "HAULIER",
      companyName: "Transportes Portuarios Trans-Marítim S.L.",
      tradeName: "Trans-Marítim Haulage",
      taxId: "ESB08112233",
      street1: "Zona Franca Sector B, Carrer D 14",
      street2: "Base de Camiones y Portacontenedores",
      zipCode: "08040",
      city: "Barcelona",
      federalState: "Cataluña",
      country: "ES",
      unLocode: "ESBCN",
      isDefaultShipper: false,
      isDefaultConsignee: false,
      isDefaultNotify: false,
      notes:
        "Flota de 45 cabezas tractoras con plataformas portacontenedores 20', 40' y Genset para Reefer.",
      contacts: [
        {
          id: "cnt_tm_1",
          fullName: "Manuel Gómez Alarcón",
          email: "trafico@transmaritim.es",
          phone: "+34 932 234 500",
          mobile: "+34 655 443 322",
          roleCategory: "DISPATCH_TRACKING",
          jobTitle: "Jefe de Flota y Despacho Terrestre",
          isPrimary: true,
        },
      ],
    },

    // CONSIGNEE & NOTIFY PARTIES
    {
      id: "addr_consignee_continental",
      companyId: tenantCompanyId,
      addressType: "CONSIGNEE_NOTIFY",
      companyName: "Continental Distribution Logistics B.V.",
      tradeName: "Continental Euro-Hub",
      taxId: "NL847291039B01",
      street1: "Waalhaven Zuidzijde 14",
      street2: "Building 3, Gate 7",
      zipCode: "3089 JH",
      city: "Rotterdam",
      federalState: "South Holland",
      country: "NL",
      unLocode: "NLRTM",
      isDefaultShipper: false,
      isDefaultConsignee: true,
      isDefaultNotify: false,
      notes:
        "Consignatario habitual europeo para distribución en Benelux y Alemania.",
      contacts: [
        {
          id: "cnt_cdl_1",
          fullName: "Hendrik van Dijk",
          email: "h.vandijk@continental-logistics.nl",
          phone: "+31 10 429 8800",
          roleCategory: "OPERATIONS",
          jobTitle: "Inbound Cargo Director",
          isPrimary: true,
        },
      ],
    },
    {
      id: "addr_notify_atlas_desk",
      companyId: tenantCompanyId,
      addressType: "CONSIGNEE_NOTIFY",
      companyName: "Atlas Global Freight Forwarding (Local Notify Desk)",
      tradeName: "Atlas 24/7 Operations Duty",
      taxId: "ESB99887766",
      street1: "Moll de Barcelona s/n",
      street2: "World Trade Center, Edifici Est, Planta 4",
      zipCode: "08039",
      city: "Barcelona",
      federalState: "Cataluña",
      country: "ES",
      unLocode: "ESBCN",
      isDefaultShipper: false,
      isDefaultConsignee: false,
      isDefaultNotify: true,
      notes:
        "Casilla 3 Notify Party predeterminada para seguimiento automatizado de llegadas.",
      contacts: [
        {
          id: "cnt_atls_duty",
          fullName: "Atlas Port Ops Duty Team",
          email: "notify-ops@atlas-logistics.com",
          phone: "+34 934 999 100",
          roleCategory: "OPERATIONS",
          jobTitle: "24/7 Maritime Desk Officer",
          isPrimary: true,
        },
      ],
    },
  ];

  // Insert or update addresses and linked contacts
  for (const entity of seedEntities) {
    const { contacts, ...addressFields } = entity;

    await db
      .insert(addresses)
      .values({
        ...addressFields,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoNothing();

    if (contacts && contacts.length > 0) {
      for (const contact of contacts) {
        await db
          .insert(addressContacts)
          .values({
            ...contact,
            addressId: entity.id,
            roleCategory: contact.roleCategory as any,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .onConflictDoNothing();
      }
    }
  }

  console.log(
    `✅ [Seed:Addresses] Insertadas ${seedEntities.length} entidades maestras y sus contactos.`,
  );

  // 2. Realistic Bookings linked with Addresses Hub & B/L Snapshots
  console.log(
    "🌱 [Seed:Bookings] Injecting realistic bookings linked to Addresses Hub...",
  );

  const preseededBookings = [
    {
      id: "bkg_seed_01",
      referenceNumber: "BKG-202611-8841",
      customerId: tenantCompanyId,
      status: "CONFIRMED",
      origin: "ESBCN",
      destination: "NLRTM",
      serviceType: "FCL",
      equipment: "40HC",
      vessel: "MSC OSCAR",
      voyage: "2612E",
      shipperAddressId: "addr_cust_iberian",
      consigneeAddressId: "addr_consignee_continental",
      notifyAddressId: "addr_notify_atlas_desk",
      dischargeAgentAddressId: "addr_agent_maersk_rtm",
      isToOrder: false,
      orderOf: null,
      cargoDetails: {
        carrier: "MSC",
        carrierBookingNumber: "MSCU8912304",
        commodity: "Polímeros Industriales de Alta Densidad",
        weightKg: 24500,
        containerNumber: "MSCU9412093",
        sealNumber: "SL-MSC-88129",
        poNumber: "PO-EUROPE-2026-904",
        incoterm: "CIF",
        rateAmount: 1850,
        currency: "EUR",
        transitDays: 6,
        customerName: "Iberian Chemicals & Polymers S.A.",
        consigneeName: "Continental Distribution Logistics B.V.",
      },
    },
    {
      id: "bkg_seed_02",
      referenceNumber: "BKG-202611-9214",
      customerId: tenantCompanyId,
      status: "CONFIRMED",
      origin: "ESVLC",
      destination: "USLAX",
      serviceType: "FCL",
      equipment: "40HR", // Reefer
      vessel: "MAERSK MC-KINNEY MOLLER",
      voyage: "2614W",
      shipperAddressId: "addr_cust_valencia_citrus",
      consigneeAddressId: null, // Negotiable To Order
      notifyAddressId: "addr_notify_atlas_desk",
      dischargeAgentAddressId: "addr_agent_pacific_lax",
      isToOrder: true,
      orderOf: "BANCO SANTANDER S.A. (LC LC998234)",
      cargoDetails: {
        carrier: "Maersk",
        carrierBookingNumber: "MAEU7712399",
        commodity: "Cítricos Frescos Grado Premium (Atmosfera Controlada +4ºC)",
        weightKg: 22100,
        containerNumber: "MAEU6543210",
        sealNumber: "SL-MAEU-44012",
        poNumber: "PO-US-CAL-4412",
        incoterm: "CFR",
        rateAmount: 3600,
        currency: "USD",
        transitDays: 18,
        customerName: "Valencia Citrus & Fresh Agro S.L.",
        consigneeName: "TO ORDER OF BANCO SANTANDER S.A.",
      },
    },
    {
      id: "bkg_seed_03",
      referenceNumber: "BKG-202611-3012",
      customerId: tenantCompanyId,
      status: "PENDING",
      origin: "ESBCN",
      destination: "DEHAM",
      serviceType: "FCL",
      equipment: "20GP",
      vessel: "HAPAG BERLIN",
      voyage: "2615N",
      shipperAddressId: "addr_cust_iberian",
      consigneeAddressId: "addr_cust_bavarian",
      notifyAddressId: "addr_notify_atlas_desk",
      dischargeAgentAddressId: null,
      isToOrder: false,
      orderOf: null,
      cargoDetails: {
        carrier: "Hapag-Lloyd",
        commodity: "Componentes Químicos Aditivos para Automoción",
        weightKg: 14200,
        poNumber: "PO-GER-BAV-8821",
        incoterm: "FOB",
        rateAmount: 1450,
        currency: "EUR",
        transitDays: 8,
        customerName: "Iberian Chemicals & Polymers S.A.",
        consigneeName: "Bavarian Automotive Components GmbH",
      },
    },
    {
      id: "bkg_seed_04",
      referenceNumber: "BKG-202611-4401",
      customerId: tenantCompanyId,
      status: "PENDING",
      origin: "ESVLC",
      destination: "NLRTM",
      serviceType: "FCL",
      equipment: "40HC",
      vessel: "CMA CGM ANTOINE DE SAINT EXUPERY",
      voyage: "2616E",
      shipperAddressId: "addr_cust_valencia_citrus",
      consigneeAddressId: "addr_consignee_continental",
      notifyAddressId: "addr_notify_atlas_desk",
      dischargeAgentAddressId: "addr_agent_maersk_rtm",
      isToOrder: false,
      orderOf: null,
      cargoDetails: {
        carrier: "CMA CGM",
        commodity: "Cargamento Mixto Hortofrutícola",
        weightKg: 21800,
        poNumber: "PO-ROTTERDAM-5512",
        incoterm: "DAP",
        rateAmount: 2100,
        currency: "EUR",
        transitDays: 5,
        customerName: "Valencia Citrus & Fresh Agro S.L.",
        consigneeName: "Continental Distribution Logistics B.V.",
      },
    },
  ];

  for (const bkg of preseededBookings) {
    // Generate precomputed canonical B/L snapshot
    const shipperItem = seedEntities.find((e) => e.id === bkg.shipperAddressId);
    const consigneeItem = seedEntities.find(
      (e) => e.id === bkg.consigneeAddressId,
    );
    const notifyItem = seedEntities.find((e) => e.id === bkg.notifyAddressId);
    const agentItem = seedEntities.find(
      (e) => e.id === bkg.dischargeAgentAddressId,
    );

    const blSnapshot = formatAllBlBoxes({
      shipper: shipperItem,
      shipperContact: shipperItem?.contacts?.[0],
      consignee: consigneeItem,
      consigneeContact: consigneeItem?.contacts?.[0],
      isToOrder: bkg.isToOrder,
      orderOf: bkg.orderOf || undefined,
      notify: notifyItem,
      notifyContact: notifyItem?.contacts?.[0],
      agent: agentItem,
      agentContact: agentItem?.contacts?.[0],
    });

    const now = new Date();
    await db
      .insert(bookings)
      .values({
        id: bkg.id,
        referenceNumber: bkg.referenceNumber,
        customerId: bkg.customerId,
        status: bkg.status,
        origin: bkg.origin,
        destination: bkg.destination,
        serviceType: bkg.serviceType,
        equipment: bkg.equipment,
        vessel: bkg.vessel,
        voyage: bkg.voyage,
        shipperAddressId: bkg.shipperAddressId,
        consigneeAddressId: bkg.consigneeAddressId,
        notifyAddressId: bkg.notifyAddressId,
        dischargeAgentAddressId: bkg.dischargeAgentAddressId,
        isToOrder: bkg.isToOrder,
        orderOf: bkg.orderOf,
        blPartiesSnapshot: JSON.stringify(blSnapshot),
        cargoDetails: JSON.stringify({
          ...bkg.cargoDetails,
          blParties: blSnapshot,
        }),
        estimatedDeparture: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();
  }

  console.log(
    `✅ [Seed:Bookings] Insertados ${preseededBookings.length} bookings de prueba vinculados.`,
  );
}

// Allow direct CLI execution: tsx src/db/seeds/addresses.seed.ts
const isMain =
  import.meta.url.includes("addresses.seed.ts") ||
  (process.argv[1] && process.argv[1].includes("addresses.seed.ts"));

if (isMain) {
  seedAddressesAndBookings()
    .then(() => {
      console.log("🏁 [Seed:Addresses] Seed finalizado con éxito.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ [Seed:Addresses] Error durante la inyección:", err);
      process.exit(1);
    });
}
