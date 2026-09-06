import { db } from "../index.js";
import * as schema from "../schema/index.js";
import { faker } from "@faker-js/faker";
import { sql } from "drizzle-orm";

export async function seedColdChain(): Promise<void> {
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
}
