import { db, client } from "./index.js";
import {
  carbonCalculations,
  carbonCalculationLegs,
  carbonOffsetProjects,
  carbonCertificates,
} from "./schema/index.js";
import { v4 as uuidv4 } from "uuid";
import { GlecCalculatorService } from "../services/carbon/glec-calculator.service.js";
import { fileURLToPath } from "url";
import path from "path";

export async function seedCarbonModule() {
  console.log(
    "🌱 Initializing and seeding Carbon Emissions Module (ISO 14083 / GLEC)...",
  );

  // Create tables if they do not exist
  await client.execute(`
    CREATE TABLE IF NOT EXISTS carbon_calculations (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL DEFAULT 'SHIPMENT',
      entity_id TEXT,
      reference_code TEXT NOT NULL,
      origin_city TEXT NOT NULL,
      destination_city TEXT NOT NULL,
      total_weight_kg REAL NOT NULL,
      total_distance_km REAL NOT NULL,
      total_tco2e_wtw REAL NOT NULL,
      total_tco2e_ttw REAL NOT NULL,
      total_tco2e_wtt REAL NOT NULL,
      carbon_intensity_gco2e_per_tkm REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'CALCULATED',
      offset_project_id TEXT,
      offset_cost_eur REAL,
      certificate_number TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS carbon_calculation_legs (
      id TEXT PRIMARY KEY,
      calculation_id TEXT NOT NULL,
      leg_order INTEGER NOT NULL,
      origin_name TEXT NOT NULL,
      destination_name TEXT NOT NULL,
      mode TEXT NOT NULL,
      distance_km REAL NOT NULL,
      weight_tonnes REAL NOT NULL,
      emission_factor_wtw REAL NOT NULL,
      emission_factor_ttw REAL NOT NULL,
      emission_factor_wtt REAL NOT NULL,
      leg_tco2e_wtw REAL NOT NULL,
      leg_tco2e_ttw REAL NOT NULL,
      leg_tco2e_wtt REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (calculation_id) REFERENCES carbon_calculations(id) ON DELETE CASCADE
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS carbon_offset_projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      standard TEXT NOT NULL,
      category TEXT NOT NULL,
      country TEXT NOT NULL,
      price_per_tco2e_eur REAL NOT NULL,
      available_credits_tco2e REAL NOT NULL,
      description TEXT NOT NULL,
      image_url TEXT,
      verification_registry_url TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS carbon_certificates (
      id TEXT PRIMARY KEY,
      certificate_number TEXT NOT NULL UNIQUE,
      calculation_id TEXT NOT NULL,
      beneficiary_name TEXT NOT NULL,
      project_id TEXT NOT NULL,
      project_name TEXT NOT NULL,
      project_standard TEXT NOT NULL,
      offset_tco2e REAL NOT NULL,
      amount_paid_eur REAL NOT NULL,
      qr_validation_url TEXT NOT NULL,
      issued_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (calculation_id) REFERENCES carbon_calculations(id),
      FOREIGN KEY (project_id) REFERENCES carbon_offset_projects(id)
    );
  `);

  // Clear existing carbon seed data
  await client.execute("DELETE FROM carbon_calculation_legs");
  await client.execute("DELETE FROM carbon_certificates");
  await client.execute("DELETE FROM carbon_calculations");
  await client.execute("DELETE FROM carbon_offset_projects");

  // 1. Seed Verified Projects
  const project1Id = "proj-amazon-reforest-01";
  const project2Id = "proj-north-sea-wind-02";
  const project3Id = "proj-finland-biochar-03";
  const project4Id = "proj-climeworks-dac-04";
  const project5Id = "proj-colombia-mangrove-05";

  await db.insert(carbonOffsetProjects).values([
    {
      id: project1Id,
      name: "Reforestación Amazónica Madre de Dios",
      standard: "VERRA_VCS",
      category: "REFORESTATION",
      country: "Perú (PE)",
      pricePerTco2eEur: 18.5,
      availableCreditsTco2e: 12500.0,
      description:
        "Protección de bosque tropical primario y restauración de corredores biológicos de biodiversidad con comunidades nativas.",
      imageUrl:
        "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=600&q=80",
      verificationRegistryUrl:
        "https://registry.verra.org/app/projectDetail/VCS/1842",
      active: true,
    },
    {
      id: project2Id,
      name: "Parque Eólico Marino Thor (Mar del Norte)",
      standard: "GOLD_STANDARD",
      category: "RENEWABLE_ENERGY",
      country: "Dinamarca (DK)",
      pricePerTco2eEur: 14.0,
      availableCreditsTco2e: 35000.0,
      description:
        "Generación de energía 100% limpia para desplazar combustibles fósiles en la red interconectada europea.",
      imageUrl:
        "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=600&q=80",
      verificationRegistryUrl:
        "https://registry.goldstandard.org/projects/details/4921",
      active: true,
    },
    {
      id: project3Id,
      name: "Biochar Carbon Removal Puro.earth",
      standard: "PURO_EARTH",
      category: "BIOCHAR",
      country: "Finlandia (FI)",
      pricePerTco2eEur: 95.0,
      availableCreditsTco2e: 4800.0,
      description:
        "Captura de carbono de alta permanencia (1000+ años) mediante pirólisis de residuos silvícolas sostenibles.",
      imageUrl:
        "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&q=80",
      verificationRegistryUrl:
        "https://puro.earth/carbon-removal-suppliers/4412",
      active: true,
    },
    {
      id: project4Id,
      name: "Captura Directa de Aire Orca (Climeworks)",
      standard: "GOLD_STANDARD",
      category: "DIRECT_AIR_CAPTURE",
      country: "Islandia (IS)",
      pricePerTco2eEur: 250.0,
      availableCreditsTco2e: 1200.0,
      description:
        "Extracción directa de CO2 de la atmósfera con mineralización permanente en basalto subterráneo.",
      imageUrl:
        "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600&q=80",
      verificationRegistryUrl:
        "https://registry.goldstandard.org/projects/details/9012",
      active: true,
    },
    {
      id: project5Id,
      name: "Manglares Azules Bahía de Cispatá",
      standard: "VERRA_VCS",
      category: "BLUE_CARBON",
      country: "Colombia (CO)",
      pricePerTco2eEur: 22.0,
      availableCreditsTco2e: 8900.0,
      description:
        "Conservación y restauración de ecosistemas de manglar costero con alta capacidad de secuestro de carbono azul.",
      imageUrl:
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80",
      verificationRegistryUrl:
        "https://registry.verra.org/app/projectDetail/VCS/2290",
      active: true,
    },
  ]);

  // 2. Pre-calculated Journeys
  const journey1Legs = [
    {
      originName: "Shanghai International Port (SIPG)",
      destinationName: "Puerto de Valencia (Noatum Terminal)",
      mode: "OCEAN_CONTAINER" as const,
      distanceKm: 19200,
      weightKg: 22000,
    },
    {
      originName: "Puerto de Valencia",
      destinationName: "Madrid Coslada Logistics Hub",
      mode: "ROAD_DIESEL" as const,
      distanceKm: 360,
      weightKg: 22000,
    },
  ];

  const j1 = GlecCalculatorService.calculateJourney(journey1Legs);
  const calc1Id = "calc-sh-2026-0891";

  await db.insert(carbonCalculations).values({
    id: calc1Id,
    entityType: "SHIPMENT",
    entityId: "shipment-001",
    referenceCode: "SH-2026-0891",
    originCity: "Shanghai",
    destinationCity: "Madrid",
    totalWeightKg: 22000,
    totalDistanceKm: j1.totalDistanceKm,
    totalTco2eWtw: j1.totalTco2eWtw,
    totalTco2eTtw: j1.totalTco2eTtw,
    totalTco2eWtt: j1.totalTco2eWtt,
    carbonIntensityGco2ePerTkm: j1.carbonIntensityGco2ePerTkm,
    status: "OFFSET_COMPLETED",
    offsetProjectId: project1Id,
    offsetCostEur: Number((j1.totalTco2eWtw * 18.5).toFixed(2)),
    certificateNumber: "ATLAS-CARBON-2026-0891",
  });

  for (const leg of j1.legs) {
    await db.insert(carbonCalculationLegs).values({
      id: uuidv4(),
      calculationId: calc1Id,
      legOrder: leg.legOrder,
      originName: leg.originName,
      destinationName: leg.destinationName,
      mode: leg.mode,
      distanceKm: leg.distanceKm,
      weightTonnes: leg.weightTonnes,
      emissionFactorWtw: leg.factors.wtw,
      emissionFactorTtw: leg.factors.ttw,
      emissionFactorWtt: leg.factors.wtt,
      legTco2eWtw: leg.legTco2eWtw,
      legTco2eTtw: leg.legTco2eTtw,
      legTco2eWtt: leg.legTco2eWtt,
    });
  }

  // Pre-seed Certificate 1
  await db.insert(carbonCertificates).values({
    id: uuidv4(),
    certificateNumber: "ATLAS-CARBON-2026-0891",
    calculationId: calc1Id,
    beneficiaryName: "Iberia Retail Group S.A.",
    projectId: project1Id,
    projectName: "Reforestación Amazónica Madre de Dios",
    projectStandard: "VERRA_VCS",
    offsetTco2e: j1.totalTco2eWtw,
    amountPaidEur: Number((j1.totalTco2eWtw * 18.5).toFixed(2)),
    qrValidationUrl:
      "https://verify.atlas-logistics.io/carbon/ATLAS-CARBON-2026-0891",
  });

  // Journey 2: Air Cargo
  const journey2Legs = [
    {
      originName: "Frankfurt Airport (FRA CargoCity)",
      destinationName: "New York JFK International",
      mode: "AIR_FREIGHT" as const,
      distanceKm: 6200,
      weightKg: 4500,
    },
    {
      originName: "New York JFK Cargo",
      destinationName: "Manhattan Distribution Hub",
      mode: "ROAD_EV" as const,
      distanceKm: 35,
      weightKg: 4500,
    },
  ];

  const j2 = GlecCalculatorService.calculateJourney(journey2Legs);
  const calc2Id = "calc-sh-2026-0904";

  await db.insert(carbonCalculations).values({
    id: calc2Id,
    entityType: "SHIPMENT",
    entityId: "shipment-002",
    referenceCode: "SH-2026-0904",
    originCity: "Frankfurt",
    destinationCity: "New York",
    totalWeightKg: 4500,
    totalDistanceKm: j2.totalDistanceKm,
    totalTco2eWtw: j2.totalTco2eWtw,
    totalTco2eTtw: j2.totalTco2eTtw,
    totalTco2eWtt: j2.totalTco2eWtt,
    carbonIntensityGco2ePerTkm: j2.carbonIntensityGco2ePerTkm,
    status: "CALCULATED",
  });

  for (const leg of j2.legs) {
    await db.insert(carbonCalculationLegs).values({
      id: uuidv4(),
      calculationId: calc2Id,
      legOrder: leg.legOrder,
      originName: leg.originName,
      destinationName: leg.destinationName,
      mode: leg.mode,
      distanceKm: leg.distanceKm,
      weightTonnes: leg.weightTonnes,
      emissionFactorWtw: leg.factors.wtw,
      emissionFactorTtw: leg.factors.ttw,
      emissionFactorWtt: leg.factors.wtt,
      legTco2eWtw: leg.legTco2eWtw,
      legTco2eTtw: leg.legTco2eTtw,
      legTco2eWtt: leg.legTco2eWtt,
    });
  }

  // Journey 3: Rail Green Corridor
  const journey3Legs = [
    {
      originName: "Rotterdam Rail Terminal (Maasvlakte)",
      destinationName: "Duisburg Intermodal Terminal",
      mode: "RAIL_ELECTRIC" as const,
      distanceKm: 240,
      weightKg: 45000,
    },
    {
      originName: "Duisburg Intermodal Terminal",
      destinationName: "Vienna Freudenau Railhub",
      mode: "RAIL_ELECTRIC" as const,
      distanceKm: 920,
      weightKg: 45000,
    },
  ];

  const j3 = GlecCalculatorService.calculateJourney(journey3Legs);
  const calc3Id = "calc-sh-2026-0912";

  await db.insert(carbonCalculations).values({
    id: calc3Id,
    entityType: "SHIPMENT",
    entityId: "shipment-003",
    referenceCode: "SH-2026-0912",
    originCity: "Rotterdam",
    destinationCity: "Viena",
    totalWeightKg: 45000,
    totalDistanceKm: j3.totalDistanceKm,
    totalTco2eWtw: j3.totalTco2eWtw,
    totalTco2eTtw: j3.totalTco2eTtw,
    totalTco2eWtt: j3.totalTco2eWtt,
    carbonIntensityGco2ePerTkm: j3.carbonIntensityGco2ePerTkm,
    status: "OFFSET_COMPLETED",
    offsetProjectId: project2Id,
    offsetCostEur: Number((j3.totalTco2eWtw * 14.0).toFixed(2)),
    certificateNumber: "ATLAS-CARBON-2026-0912",
  });

  for (const leg of j3.legs) {
    await db.insert(carbonCalculationLegs).values({
      id: uuidv4(),
      calculationId: calc3Id,
      legOrder: leg.legOrder,
      originName: leg.originName,
      destinationName: leg.destinationName,
      mode: leg.mode,
      distanceKm: leg.distanceKm,
      weightTonnes: leg.weightTonnes,
      emissionFactorWtw: leg.factors.wtw,
      emissionFactorTtw: leg.factors.ttw,
      emissionFactorWtt: leg.factors.wtt,
      legTco2eWtw: leg.legTco2eWtw,
      legTco2eTtw: leg.legTco2eTtw,
      legTco2eWtt: leg.legTco2eWtt,
    });
  }

  // Pre-seed Certificate 2
  await db.insert(carbonCertificates).values({
    id: uuidv4(),
    certificateNumber: "ATLAS-CARBON-2026-0912",
    calculationId: calc3Id,
    beneficiaryName: "Central Europe Automotive GmbH",
    projectId: project2Id,
    projectName: "Parque Eólico Marino Thor (Mar del Norte)",
    projectStandard: "GOLD_STANDARD",
    offsetTco2e: j3.totalTco2eWtw,
    amountPaidEur: Number((j3.totalTco2eWtw * 14.0).toFixed(2)),
    qrValidationUrl:
      "https://verify.atlas-logistics.io/carbon/ATLAS-CARBON-2026-0912",
  });

  console.log(
    "✅ Carbon Emissions Module seeded successfully with verified projects and sample journeys!",
  );
}

const isMain =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  seedCarbonModule()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Error seeding carbon module:", err);
      process.exit(1);
    });
}
