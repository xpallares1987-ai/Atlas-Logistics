import { db } from "../index.js";
import * as schema from "../schema/index.js";
import { faker } from "@faker-js/faker";
import { sql } from "drizzle-orm";

export async function seedRoadFreight(): Promise<void> {
  // 17. ROAD FREIGHT CONSIGNMENTS (e-CMR & CARTA DE PORTE)
  const consignment1Id = "road_cmr_mad_lyon_01";
  await db
    .insert(schema.roadConsignments)
    .values({
      id: consignment1Id,
      consignmentNumber: "CMR-2026-99210",
      shipmentId: "shipment_road_ftl_03",
      consignmentType: "INTERNATIONAL_CMR",
      status: "IN_TRANSIT",
      senderName: "Iberia Logistics Hub Coslada SA",
      senderAddress: "Avda. Central del Transporte 14, 28821 Coslada (Madrid)",
      senderCountry: "España (ES)",
      consigneeName: "Rhône-Alpes Distribution Centre SARL",
      consigneeAddress: "Rue de l'Aviation 44, 69125 Lyon-Saint Exupéry",
      consigneeCountry: "France (FR)",
      carrierName: "Trans-Iberia International Roadways SL",
      carrierVat: "ESA88192044",
      tractorPlate: "4829-LTM",
      trailerPlate: "R-9102-BCN",
      driverName: "Carlos Santana Ruiz",
      driverLicense: "ES-91028374-B",
      driverPhone: "+34 655 492 104",
      originCity: "Madrid (Coslada Hub)",
      destinationCity: "Lyon (Saint Exupéry)",
      totalDistanceKm: 1180.0,
      estimatedDrivingHours: 15.7,
      requiredRestBreaksCount: 3,
      pickupDate: new Date(Date.now() - 86400000 * 1),
      deliveryDate: new Date(Date.now() + 86400000 * 1),
      totalPallets: 30,
      palletCapacityMax: 33,
      totalGrossWeightKg: 19500.0,
      payloadCapacityMaxKg: 24000.0,
      trailerFloorUtilizationPct: 90.91,
      isAdrHazardous: false,
      adrTotalPoints: 0.0,
      adrExemption1136Applied: false,
      orangePlatesRequired: false,
      tunnelRestrictionCode: null,
      goodsDescription:
        "Dispositivos electrónicos de consumo y accesorios en 30 Euro-pallets flejados con film retráctil.",
      specialInstructions:
        "Tránsito internacional vía Jonquera. Control de precinto aduanero en destino. Respetar tacógrafo CE 561/2006.",
      cargoItemsData: [
        {
          itemNumber: 1,
          description: "Smart TVs & Monitores LED",
          packages: 12,
          grossWeightKg: 7800.0,
          isAdr: false,
        },
        {
          itemNumber: 2,
          description: "Equipos de Telecomunicaciones",
          packages: 18,
          grossWeightKg: 11700.0,
          isAdr: false,
        },
      ],
      routeStopsData: [
        {
          stopOrder: 1,
          type: "PICKUP",
          city: "Madrid Coslada",
          arrival: new Date(Date.now() - 86400000 * 1),
          status: "COMPLETED",
        },
        {
          stopOrder: 2,
          type: "REST_BREAK",
          city: "Zaragoza (AP-2)",
          arrival: new Date(Date.now() - 86400000 * 0.8),
          status: "COMPLETED",
        },
        {
          stopOrder: 3,
          type: "REST_BREAK",
          city: "Girona La Jonquera (AP-7)",
          arrival: new Date(Date.now() - 86400000 * 0.4),
          status: "COMPLETED",
        },
        {
          stopOrder: 4,
          type: "DELIVERY",
          city: "Lyon Saint-Exupéry",
          arrival: new Date(Date.now() + 86400000 * 1),
          status: "PENDING",
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  const consignment2Id = "road_cmr_adr_frankfurt_02";
  await db
    .insert(schema.roadConsignments)
    .values({
      id: consignment2Id,
      consignmentNumber: "CMR-2026-ADR-0418",
      shipmentId: null,
      consignmentType: "INTERNATIONAL_CMR",
      status: "DISPATCHED",
      senderName: "Química Industrial Catalana SA",
      senderAddress: "Polígono Químico Sur, Parcela 12, 43006 Tarragona",
      senderCountry: "España (ES)",
      consigneeName: "BASF Coatings & Polyurethane GmbH",
      consigneeAddress:
        "Carl-Bosch-Straße 38, 67056 Ludwigshafen (Frankfurt Area)",
      consigneeCountry: "Deutschland (DE)",
      carrierName: "EcoTankers Trans-European Logistics",
      carrierVat: "ESB99482012",
      tractorPlate: "3310-MWP",
      trailerPlate: "R-7741-TRG",
      driverName: "Alejandro Gómez Soler",
      driverLicense: "ES-ADR-992144",
      driverPhone: "+34 677 819 302",
      originCity: "Tarragona (Zona Química)",
      destinationCity: "Frankfurt / Ludwigshafen",
      totalDistanceKm: 1420.0,
      estimatedDrivingHours: 18.9,
      requiredRestBreaksCount: 4,
      pickupDate: new Date(),
      deliveryDate: new Date(Date.now() + 86400000 * 2),
      totalPallets: 18,
      palletCapacityMax: 33,
      totalGrossWeightKg: 9600.0,
      payloadCapacityMaxKg: 24000.0,
      trailerFloorUtilizationPct: 54.55,
      isAdrHazardous: true,
      adrTotalPoints: 9600.0, // 9,600 kg Cat 3 * 1 = 9,600 pts (> 1,000 pts)
      adrExemption1136Applied: false,
      orangePlatesRequired: true,
      tunnelRestrictionCode: "(D/E)",
      goodsDescription:
        "UN 1263 PINTURAS (inflamables, punto de inflamación 24°C), 3, GE III, (D/E). Mercancía Peligrosa ADR.",
      specialInstructions:
        "PLACAS NARANJA REGLAMENTARIAS OBLIGATORIAS. Prohibido paso por túneles categoría D y E. Conductor con carné ADR básico y cisternas.",
      cargoItemsData: [
        {
          itemNumber: 1,
          description: "Pinturas Epoxi Industriales UN 1263",
          unCode: "UN 1263",
          adrClass: "3",
          packingGroup: "III",
          adrCategory: 3,
          multiplier: 1,
          points: 9600,
          packages: 18,
          grossWeightKg: 9600.0,
          isAdr: true,
        },
      ],
      routeStopsData: [
        {
          stopOrder: 1,
          type: "PICKUP",
          city: "Tarragona",
          arrival: new Date(),
          status: "COMPLETED",
        },
        {
          stopOrder: 2,
          type: "DELIVERY",
          city: "Ludwigshafen / Frankfurt",
          arrival: new Date(Date.now() + 86400000 * 2),
          status: "PENDING",
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  const consignment3Id = "road_cdp_val_mad_03";
  await db
    .insert(schema.roadConsignments)
    .values({
      id: consignment3Id,
      consignmentNumber: "CDP-2026-MAD-VAL-11",
      shipmentId: "shipment_valencia_miami_01",
      consignmentType: "NATIONAL_CARTA_PORTE",
      status: "DELIVERED",
      senderName: "Cerámicas del Mediterráneo SL",
      senderAddress: "Camí Vell de Castelló s/n, 12540 Vila-real (Castellón)",
      senderCountry: "España (ES)",
      consigneeName: "Atlas Logistics Intermodal Terminal Valencia",
      consigneeAddress: "Muelle de Levante s/n, 46024 Puerto de Valencia",
      consigneeCountry: "España (ES)",
      carrierName: "Transportes Terrestres Levante SL",
      carrierVat: "ESB46192837",
      tractorPlate: "1102-KRT",
      trailerPlate: "R-4412-VLC",
      driverName: "Vicente Navarro Calvo",
      driverLicense: "ES-12948192-C",
      driverPhone: "+34 611 204 955",
      originCity: "Vila-real (Castellón)",
      destinationCity: "Valencia (Puerto)",
      totalDistanceKm: 75.0,
      estimatedDrivingHours: 1.1,
      requiredRestBreaksCount: 0,
      pickupDate: new Date(Date.now() - 86400000 * 3),
      deliveryDate: new Date(Date.now() - 86400000 * 3),
      totalPallets: 33,
      palletCapacityMax: 33,
      totalGrossWeightKg: 23400.0,
      payloadCapacityMaxKg: 24000.0,
      trailerFloorUtilizationPct: 100.0,
      isAdrHazardous: false,
      adrTotalPoints: 0.0,
      adrExemption1136Applied: false,
      orangePlatesRequired: false,
      tunnelRestrictionCode: null,
      goodsDescription:
        "Carga completa FTL: 33 Euro-pallets de baldosas cerámicas y gres porcelánico para exportación marítima.",
      specialInstructions:
        "Carta de Porte Nacional sujeta a la Ley 15/2009 y RDL 3/2022 (Prohibición expresa de carga y descarga por el conductor). Cláusula de paralizaciones aplicable a partir de 1 hora de espera.",
      cargoItemsData: [
        {
          itemNumber: 1,
          description: "Pallets Cerámica Esmaltada 60x60",
          packages: 33,
          grossWeightKg: 23400.0,
          isAdr: false,
        },
      ],
      routeStopsData: [
        {
          stopOrder: 1,
          type: "PICKUP",
          city: "Vila-real",
          arrival: new Date(Date.now() - 86400000 * 3),
          status: "COMPLETED",
        },
        {
          stopOrder: 2,
          type: "DELIVERY",
          city: "Valencia Puerto",
          arrival: new Date(Date.now() - 86400000 * 3),
          status: "COMPLETED",
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  console.log(
    "✅ Creadas Expediciones de Transporte Terrestre (e-CMR y Cartas de Porte).",
  );
}
