import { db } from "../index.js";
import * as schema from "../schema/index.js";
import { faker } from "@faker-js/faker";
import { sql } from "drizzle-orm";

export async function seedRail(): Promise<void> {
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
}
