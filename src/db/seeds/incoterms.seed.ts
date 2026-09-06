import { db } from "../index.js";
import * as schema from "../schema/index.js";
import { faker } from "@faker-js/faker";
import { sql } from "drizzle-orm";

export async function seedIncoterms(): Promise<void> {
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
}
