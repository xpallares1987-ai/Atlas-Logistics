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
      {
        id: "cc_insulin_9904",
        trackingNumber: "CC-2026-9904",
        batchNumber: "BATCH-INS-2026-9901",
        productDescription:
          "Insulina Humana Recombinante (1x40' High Cube Reefer)",
        pharmaClassification: "BIOLOGICS_VACCINES",
        profileId: "prof_pharma_cold",
        packagingType: "ACTIVE_REEFER_CONTAINER",
        setpointTempCelsius: 4.0,
        loggerSerialNumber: "TT-GEO-449108",
        loggerModel: "TempTale GEO Ultra 4G Real-Time",
        mktCalculatedCelsius: 4.2,
        excursionDurationMinutes: 0,
        excursionStatus: "COMPLIANT",
        gdpReleaseVerdict: "RELEASED_FOR_DISTRIBUTION",
        responsiblePersonName:
          "Dra. Elena Ruiz (Directora Técnica Farmacéutica QP/RP)",
        qualityAuditNotes:
          "Tránsito marítimo directo impecable. Temperatura estable en 4.0°C - 4.4°C durante toda la navegación.",
        originLocation: "Algeciras APM Terminals",
        destinationLocation: "New York Red Hook Container Terminal",
        departureTime: "2026-08-22T10:00:00Z",
        estimatedArrivalTime: "2026-09-01T14:00:00Z",
      },
      {
        id: "cc_oncol_9905",
        trackingNumber: "CC-2026-9905",
        batchNumber: "BATCH-ONC-BIO-8821",
        productDescription:
          "Anticuerpos Monoclonales Oncológicos Viales Inyectables",
        pharmaClassification: "BIOLOGICS_VACCINES",
        profileId: "prof_pharma_cold",
        packagingType: "INSULATED_EPS_GEL_PACKS",
        setpointTempCelsius: 5.0,
        loggerSerialNumber: "TT-VIP-912440",
        loggerModel: "Sensitech TempTale Ultra BLE",
        mktCalculatedCelsius: 4.95,
        excursionDurationMinutes: 0,
        excursionStatus: "COMPLIANT",
        gdpReleaseVerdict: "RELEASED_FOR_DISTRIBUTION",
        responsiblePersonName: "Dr. Marc Torres (Persona Responsable GDP)",
        qualityAuditNotes:
          "Envío aéreo expreso con embalaje isotérmico VIP de alto rendimiento. MKT dentro de rango sin desviaciones.",
        originLocation: "Madrid Barajas Pharma Cargo Hub",
        destinationLocation: "Chicago O'Hare Pharma Center",
        departureTime: "2026-08-27T07:00:00Z",
        estimatedArrivalTime: "2026-08-28T18:00:00Z",
      },
      {
        id: "cc_plasma_9906",
        trackingNumber: "CC-2026-9906",
        batchNumber: "BATCH-PLAS-FR-2026",
        productDescription:
          "Plasma Humano Congelado para Fraccionamiento Industrial",
        pharmaClassification: "BIOLOGICS_VACCINES",
        profileId: "prof_frozen",
        packagingType: "ACTIVE_REEFER_CONTAINER",
        setpointTempCelsius: -20.0,
        loggerSerialNumber: "TT-FROZ-771203",
        loggerModel: "Sensitech ColdWatch Cryo Satellite",
        mktCalculatedCelsius: -21.4,
        excursionDurationMinutes: 0,
        excursionStatus: "COMPLIANT",
        gdpReleaseVerdict: "RELEASED_FOR_DISTRIBUTION",
        responsiblePersonName:
          "Dra. Elena Ruiz (Directora Técnica Farmacéutica QP/RP)",
        qualityAuditNotes:
          "Temperatura criogénica constante a -22.0°C. Respaldo por grupo electrógeno diésel en todo momento.",
        originLocation: "Barcelona Port Container Terminal (BEST)",
        destinationLocation: "Antwerp Euroports Cold Store",
        departureTime: "2026-08-24T16:00:00Z",
        estimatedArrivalTime: "2026-08-28T09:00:00Z",
      },
      {
        id: "cc_berries_9907",
        trackingNumber: "CC-2026-9907",
        batchNumber: "BATCH-FRESH-AGRO-3310",
        productDescription:
          "Frambuesas y Arándanos de Huelva en Atmósfera Controlada (1x40' CA)",
        pharmaClassification: "PERISHABLES_FOOD",
        profileId: "prof_perishable",
        packagingType: "ACTIVE_REEFER_CONTAINER",
        setpointTempCelsius: 2.0,
        loggerSerialNumber: "TT-AGRO-881290",
        loggerModel: "DaWiFi Smart Fresh Agro Logger",
        mktCalculatedCelsius: 2.3,
        excursionDurationMinutes: 25,
        excursionStatus: "MINOR_EXCURSION",
        gdpReleaseVerdict: "RELEASED_FOR_DISTRIBUTION",
        responsiblePersonName:
          "Ing. Agrónomo Fernando Soler (QA Quality Fruit)",
        qualityAuditNotes:
          "Ligera subida a 5.1°C durante apertura de puertas para inspección de aduana. Gas O2 y CO2 mantenidos al 5% y 15%.",
        originLocation: "Muelle de Huelva / Corredor Algeciras",
        destinationLocation: "Rotterdam Maasvlakte Coldstore Hub",
        departureTime: "2026-08-25T11:00:00Z",
        estimatedArrivalTime: "2026-08-29T14:00:00Z",
      },
      {
        id: "cc_insulin_9908",
        trackingNumber: "CC-2026-9908",
        batchNumber: "BATCH-HUMIRA-2026-09",
        productDescription:
          "Adalimumab 40mg/0.8ml Solución Inyectable (2.000 jeringas precargadas)",
        pharmaClassification: "BIOLOGICS_VACCINES",
        profileId: "prof_pharma_cold",
        packagingType: "INSULATED_EPS_GEL_PACKS",
        setpointTempCelsius: 4.0,
        loggerSerialNumber: "TT-GEO-993210",
        loggerModel: "TempTale GEO Ultra 4G Real-Time",
        mktCalculatedCelsius: 4.65,
        excursionDurationMinutes: 0,
        excursionStatus: "COMPLIANT",
        gdpReleaseVerdict: "RELEASED_FOR_DISTRIBUTION",
        responsiblePersonName:
          "Dra. Elena Ruiz (Directora Técnica Farmacéutica QP/RP)",
        qualityAuditNotes:
          "Transporte multimodal directo Barcelona - Milán. Cadena de frío preservada estrictamente entre 3.8°C y 5.4°C.",
        originLocation: "Barcelona BioPharma Park (BCN)",
        destinationLocation: "Milano Logistics Hub (MXP)",
        departureTime: "2026-08-28T06:00:00Z",
        estimatedArrivalTime: "2026-08-30T06:00:00Z",
      },
      {
        id: "cc_vaccine_9909",
        trackingNumber: "CC-2026-9909",
        batchNumber: "BATCH-HEXA-2026-11B",
        productDescription:
          "Vacuna Hexavalente Pediátrica DTPa-VHB-PIV-Hib (1.500 dosis)",
        pharmaClassification: "BIOLOGICS_VACCINES",
        profileId: "prof_pharma_cold",
        packagingType: "INSULATED_EPS_GEL_PACKS",
        setpointTempCelsius: 5.0,
        loggerSerialNumber: "TT-BLE-771920",
        loggerModel: "Sensitech TempTale Ultra BLE",
        mktCalculatedCelsius: 5.42,
        excursionDurationMinutes: 20,
        excursionStatus: "MINOR_EXCURSION",
        gdpReleaseVerdict: "RELEASED_FOR_DISTRIBUTION",
        responsiblePersonName: "Dr. Marc Torres (Persona Responsable GDP)",
        qualityAuditNotes:
          "Excursión transitoria de 20 min a 8.4°C en plataforma de carga de Madrid Barajas. MKT final de 5.42°C dentro del rango de estabilidad autorizado.",
        originLocation: "Madrid Barajas Pharma Cargo Hub",
        destinationLocation: "Lisboa Aeroporto Terminal Carga",
        departureTime: "2026-08-29T08:00:00Z",
        estimatedArrivalTime: "2026-08-30T14:00:00Z",
      },
      {
        id: "cc_perishable_9910",
        trackingNumber: "CC-2026-9910",
        batchNumber: "BATCH-AGRO-CITRUS-04",
        productDescription:
          "Naranjas Valencianas IGP Selección Exportación (1x40' High Cube Reefer)",
        pharmaClassification: "PERISHABLES_FOOD",
        profileId: "prof_perishable",
        packagingType: "ACTIVE_REEFER_CONTAINER",
        setpointTempCelsius: 3.0,
        loggerSerialNumber: "TT-REEF-883011",
        loggerModel: "Carrier Transicold DataCOLD 600",
        mktCalculatedCelsius: 3.12,
        excursionDurationMinutes: 0,
        excursionStatus: "COMPLIANT",
        gdpReleaseVerdict: "RELEASED_FOR_DISTRIBUTION",
        responsiblePersonName:
          "Ing. Agrónomo Fernando Soler (QA Quality Fruit)",
        qualityAuditNotes:
          "Temperatura de pulpa y ambiente de contenedor mantenida en 3.0°C ± 0.3°C. Ventilación de aire fresco a 25 m³/h.",
        originLocation: "Puerto de Valencia (Muelle de la Xina)",
        destinationLocation: "Hamburg Fruit Terminal (Burchardkai)",
        departureTime: "2026-08-27T10:00:00Z",
        estimatedArrivalTime: "2026-08-31T18:00:00Z",
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

      // Readings for cc_insulin_9904 (+2°C to +8°C)
      {
        id: "rd_ins_01",
        coldChainShipmentId: "cc_insulin_9904",
        recordedAt: "2026-08-22T10:00:00Z",
        probeTemperatureCelsius: 4.1,
        ambientTemperatureCelsius: 26.0,
        relativeHumidityPct: 50.0,
        isExcursion: false,
        powerSupplyMode: "MAINS_ELECTRIC",
      },
      {
        id: "rd_ins_02",
        coldChainShipmentId: "cc_insulin_9904",
        recordedAt: "2026-08-25T14:00:00Z",
        probeTemperatureCelsius: 4.2,
        ambientTemperatureCelsius: 29.5,
        relativeHumidityPct: 49.0,
        isExcursion: false,
        powerSupplyMode: "MAINS_ELECTRIC",
      },
      {
        id: "rd_ins_03",
        coldChainShipmentId: "cc_insulin_9904",
        recordedAt: "2026-08-29T18:00:00Z",
        probeTemperatureCelsius: 4.0,
        ambientTemperatureCelsius: 22.0,
        relativeHumidityPct: 48.0,
        isExcursion: false,
        powerSupplyMode: "MAINS_ELECTRIC",
      },

      // Readings for cc_oncol_9905 (+2°C to +8°C VIP Passive)
      {
        id: "rd_onc_01",
        coldChainShipmentId: "cc_oncol_9905",
        recordedAt: "2026-08-27T07:00:00Z",
        probeTemperatureCelsius: 4.8,
        ambientTemperatureCelsius: 21.0,
        relativeHumidityPct: 45.0,
        isExcursion: false,
        powerSupplyMode: "BATTERY_PASSIVE",
      },
      {
        id: "rd_onc_02",
        coldChainShipmentId: "cc_oncol_9905",
        recordedAt: "2026-08-27T16:00:00Z",
        probeTemperatureCelsius: 5.2,
        ambientTemperatureCelsius: 28.0,
        relativeHumidityPct: 42.0,
        isExcursion: false,
        powerSupplyMode: "BATTERY_PASSIVE",
      },
      {
        id: "rd_onc_03",
        coldChainShipmentId: "cc_oncol_9905",
        recordedAt: "2026-08-28T18:00:00Z",
        probeTemperatureCelsius: 4.9,
        ambientTemperatureCelsius: 19.0,
        relativeHumidityPct: 40.0,
        isExcursion: false,
        powerSupplyMode: "BATTERY_PASSIVE",
      },

      // Readings for cc_plasma_9906 (-25°C to -15°C Frozen)
      {
        id: "rd_plas_01",
        coldChainShipmentId: "cc_plasma_9906",
        recordedAt: "2026-08-24T16:00:00Z",
        probeTemperatureCelsius: -21.8,
        ambientTemperatureCelsius: 25.0,
        relativeHumidityPct: 50.0,
        isExcursion: false,
        powerSupplyMode: "GENSET_DIESEL",
      },
      {
        id: "rd_plas_02",
        coldChainShipmentId: "cc_plasma_9906",
        recordedAt: "2026-08-26T12:00:00Z",
        probeTemperatureCelsius: -21.2,
        ambientTemperatureCelsius: 27.0,
        relativeHumidityPct: 52.0,
        isExcursion: false,
        powerSupplyMode: "MAINS_ELECTRIC",
      },
      {
        id: "rd_plas_03",
        coldChainShipmentId: "cc_plasma_9906",
        recordedAt: "2026-08-28T09:00:00Z",
        probeTemperatureCelsius: -20.9,
        ambientTemperatureCelsius: 22.0,
        relativeHumidityPct: 48.0,
        isExcursion: false,
        powerSupplyMode: "MAINS_ELECTRIC",
      },

      // Readings for cc_berries_9907 (+0°C to +4°C Fresh)
      {
        id: "rd_ber_01",
        coldChainShipmentId: "cc_berries_9907",
        recordedAt: "2026-08-25T11:00:00Z",
        probeTemperatureCelsius: 2.1,
        ambientTemperatureCelsius: 28.0,
        relativeHumidityPct: 88.0,
        isExcursion: false,
        powerSupplyMode: "MAINS_ELECTRIC",
      },
      {
        id: "rd_ber_02",
        coldChainShipmentId: "cc_berries_9907",
        recordedAt: "2026-08-27T09:30:00Z",
        probeTemperatureCelsius: 5.1, // Minor excursion during physical customs inspection
        ambientTemperatureCelsius: 30.0,
        relativeHumidityPct: 92.0,
        isExcursion: true,
        powerSupplyMode: "BATTERY_PASSIVE",
      },
      {
        id: "rd_ber_03",
        coldChainShipmentId: "cc_berries_9907",
        recordedAt: "2026-08-29T14:00:00Z",
        probeTemperatureCelsius: 2.2,
        ambientTemperatureCelsius: 21.0,
        relativeHumidityPct: 89.0,
        isExcursion: false,
        powerSupplyMode: "MAINS_ELECTRIC",
      },
    ])
    .onConflictDoNothing();

  // Generate 48-Hour Continuous High-Resolution Datalogger Curves (EN 12830)
  const continuousTelemetryReadings: Array<{
    id: string;
    coldChainShipmentId: string;
    recordedAt: string;
    probeTemperatureCelsius: number;
    ambientTemperatureCelsius: number;
    relativeHumidityPct: number;
    isExcursion: boolean;
    powerSupplyMode: "GENSET_DIESEL" | "MAINS_ELECTRIC" | "BATTERY_PASSIVE";
  }> = [];

  // 1. 48 Hours continuous for Adalimumab Humira (cc_insulin_9908, 2°C to 8°C)
  const startHumira = Date.parse("2026-08-28T06:00:00Z");
  for (let h = 0; h <= 48; h++) {
    const recordedAt = new Date(startHumira + h * 3600 * 1000).toISOString();
    const probe = Number(
      (4.3 + Math.sin(h / 3) * 0.4 + (h % 5) * 0.05).toFixed(1),
    );
    const ambient = Number((21.0 + Math.sin(h / 4) * 4.5).toFixed(1));
    const humidity = Number((46.0 + Math.cos(h / 3) * 5.0).toFixed(1));
    continuousTelemetryReadings.push({
      id: `rd_humira_${String(h).padStart(2, "0")}`,
      coldChainShipmentId: "cc_insulin_9908",
      recordedAt,
      probeTemperatureCelsius: probe,
      ambientTemperatureCelsius: ambient,
      relativeHumidityPct: humidity,
      isExcursion: false,
      powerSupplyMode: "BATTERY_PASSIVE",
    });
  }

  // 2. 24 Hours continuous for Hexavalent Vaccine (cc_vaccine_9909, with 20min apron excursion)
  const startHexa = Date.parse("2026-08-29T08:00:00Z");
  for (let h = 0; h <= 24; h++) {
    const recordedAt = new Date(startHexa + h * 3600 * 1000).toISOString();
    const isExcursion = h === 6; // Hour 6 transfer on tarmac
    const probe = isExcursion
      ? 8.4
      : Number((4.9 + Math.cos(h / 2.5) * 0.35).toFixed(1));
    const ambient = isExcursion
      ? 33.5
      : Number((22.0 + Math.sin(h / 3) * 3.5).toFixed(1));
    const humidity = Number((48.0 + (h % 4) * 1.2).toFixed(1));
    continuousTelemetryReadings.push({
      id: `rd_hexa_${String(h).padStart(2, "0")}`,
      coldChainShipmentId: "cc_vaccine_9909",
      recordedAt,
      probeTemperatureCelsius: probe,
      ambientTemperatureCelsius: ambient,
      relativeHumidityPct: humidity,
      isExcursion,
      powerSupplyMode: "BATTERY_PASSIVE",
    });
  }

  // 3. 48 Hours continuous for Citrus Export 40' Reefer (cc_perishable_9910, 0°C to 4°C)
  const startCitrus = Date.parse("2026-08-27T10:00:00Z");
  for (let h = 0; h <= 48; h++) {
    const recordedAt = new Date(startCitrus + h * 3600 * 1000).toISOString();
    const probe = Number((3.0 + Math.sin(h / 5) * 0.22).toFixed(1));
    const ambient = Number((24.0 + Math.sin(h / 4) * 5.0).toFixed(1));
    const humidity = Number((90.0 + Math.cos(h / 4) * 2.5).toFixed(1));
    continuousTelemetryReadings.push({
      id: `rd_citrus_${String(h).padStart(2, "0")}`,
      coldChainShipmentId: "cc_perishable_9910",
      recordedAt,
      probeTemperatureCelsius: probe,
      ambientTemperatureCelsius: ambient,
      relativeHumidityPct: humidity,
      isExcursion: false,
      powerSupplyMode: h < 30 ? "MAINS_ELECTRIC" : "GENSET_DIESEL",
    });
  }

  // Insert in batches of 50 to maintain optimal SQLite query plan performance
  for (let i = 0; i < continuousTelemetryReadings.length; i += 50) {
    const batch = continuousTelemetryReadings.slice(i, i + 50);
    await db
      .insert(schema.temperatureReadings)
      .values(batch)
      .onConflictDoNothing();
  }

  console.log(
    "✅ Creados Perfiles Térmicos, Expediciones Farmacéuticas GDP y Telemetría de Dataloggers.",
  );
}
