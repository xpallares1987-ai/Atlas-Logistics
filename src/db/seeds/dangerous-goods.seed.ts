import { db } from "../index.js";
import * as schema from "../schema/index.js";
import { faker } from "@faker-js/faker";
import { sql } from "drizzle-orm";

export async function seedDangerousGoods(): Promise<void> {
  console.log(
    "☣️ Inyectando Expedientes de Mercancías Peligrosas (DGR), Partidas UN, Auditorías de Segregación y Fichas EmS...",
  );
  await db
    .insert(schema.dgShipments)
    .values([
      {
        id: "dg_ship_valencia_01",
        shipmentReference: "DGD-2026-VAL-0089",
        transportMode: "MARITIME_OCEAN",
        carrierName: "Maersk Line (Ocean Carrier)",
        vesselOrFlightOrVehiclePlate: "MV Valencia Bridge",
        voyageOrFlightNumber: "V.2608W",
        originPortOrLocation: "Puerto de Valencia (ESVLC)",
        destinationPortOrLocation: "Puerto de Singapur (SGSIN)",
        shipperName: "Iberica Chemical Solutions SL",
        shipperAddress: "Avda. del Puerto 120, 46024 Valencia, España",
        consigneeName: "Asia Pacific Polymers Ltd",
        consigneeAddress: "Jurong Island Chemical Cluster, 628001 Singapore",
        emergencyContactName: "CHEMTREC / Centro de Emergencias Químicas",
        emergencyContactPhone: "+34 91 562 04 20",
        aircraftType: "NOT_APPLICABLE",
        totalPackages: 6,
        totalNetQuantityKg: 2800.0,
        totalGrossMassKg: 3120.0,
        hasRadioactiveMaterials: false,
        hasMarinePollutants: true,
        hasLithiumBatteries: false,
        segregationStatus: "COMPLIANT_SEGREGATED",
        status: "CERTIFIED_READY",
        declarationRemarks:
          "Cargamento estibado en contenedor estanco bajo normas de segregación IMDG 7.2.",
      },
      {
        id: "dg_ship_frankfurt_02",
        shipmentReference: "DGD-2026-FRA-0142",
        transportMode: "AIR_CARGO",
        carrierName: "Lufthansa Cargo AG",
        vesselOrFlightOrVehiclePlate: "Boeing 777F (Flight LH8220)",
        voyageOrFlightNumber: "LH8220",
        originPortOrLocation: "Aeropuerto de Frankfurt (FRA)",
        destinationPortOrLocation: "Chicago O'Hare Intl (ORD)",
        shipperName: "Bavarian Energy Storage Systems GmbH",
        shipperAddress: "Industriestrasse 45, 80331 Munich, Germany",
        consigneeName: "Midwest EV Battery Assembly Corp",
        consigneeAddress: "2200 W O'Hare Drive, Chicago, IL 60666, USA",
        emergencyContactName: "CHEMTREC Global Response",
        emergencyContactPhone: "+1 800 424 9300",
        aircraftType: "CARGO_AIRCRAFT_ONLY_CAO",
        totalPackages: 8,
        totalNetQuantityKg: 280.0,
        totalGrossMassKg: 340.0,
        hasRadioactiveMaterials: false,
        hasMarinePollutants: false,
        hasLithiumBatteries: true,
        segregationStatus: "COMPLIANT_SEGREGATED",
        status: "CERTIFIED_READY",
        declarationRemarks:
          "Baterías de Ion-Litio UN 3480 embaladas bajo PI 965 Sec IA con SoC <= 25%. CAO Obligatorio.",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.dgConsignmentItems)
    .values([
      {
        id: "dg_item_01",
        dgShipmentId: "dg_ship_valencia_01",
        unNumber: "UN 1203",
        properShippingName: "GASOLINE",
        technicalChemicalName: "Gasolina de Automoción Octanaje 95",
        primaryHazardClass: "3",
        subsidiaryHazardClasses: null,
        packingGroup: "PG_II",
        flashPointCelsius: -45.0,
        isMarinePollutant: true,
        packageCount: 4,
        packageTypeDescription: "Tambores de acero (1A1)",
        packageUnCode: "1A1",
        netQuantityPerPackage: 200.0,
        unitOfMeasure: "LITERS",
        totalNetQuantity: 800.0,
        totalGrossMassKg: 920.0,
        netExplosiveMassKg: 0,
        isLimitedQuantityLq: false,
        exceptedQuantityCode: "E2",
        adrTransportCategory: 2,
        adrPointsCalculated: 2400.0, // 800 * 3
        adrTunnelRestrictionCode: "D/E",
        kemlerHazardIdNumber: "33",
        emsFireCode: "F-E",
        emsSpillageCode: "S-E",
        iataPackingInstruction: "364",
        lithiumBatterySection: "NOT_APPLICABLE",
        lithiumStateOfChargePercentage: null,
      },
      {
        id: "dg_item_02",
        dgShipmentId: "dg_ship_valencia_01",
        unNumber: "UN 3082",
        properShippingName:
          "ENVIRONMENTALLY HAZARDOUS SUBSTANCE, LIQUID, N.O.S.",
        technicalChemicalName: "Mezcla de biocidas industriales biodegradables",
        primaryHazardClass: "9",
        subsidiaryHazardClasses: null,
        packingGroup: "PG_III",
        flashPointCelsius: null,
        isMarinePollutant: true,
        packageCount: 2,
        packageTypeDescription: "Grandes recipientes para granel IBC (31HA1)",
        packageUnCode: "31HA1",
        netQuantityPerPackage: 1000.0,
        unitOfMeasure: "LITERS",
        totalNetQuantity: 2000.0,
        totalGrossMassKg: 2200.0,
        netExplosiveMassKg: 0,
        isLimitedQuantityLq: false,
        exceptedQuantityCode: "E1",
        adrTransportCategory: 3,
        adrPointsCalculated: 2000.0, // 2000 * 1
        adrTunnelRestrictionCode: "-",
        kemlerHazardIdNumber: "90",
        emsFireCode: "F-A",
        emsSpillageCode: "S-F",
        iataPackingInstruction: "964",
        lithiumBatterySection: "NOT_APPLICABLE",
        lithiumStateOfChargePercentage: null,
      },
      {
        id: "dg_item_03",
        dgShipmentId: "dg_ship_frankfurt_02",
        unNumber: "UN 3480",
        properShippingName: "LITHIUM ION BATTERIES",
        technicalChemicalName: "Baterías recargables de tracción 150 Wh",
        primaryHazardClass: "9",
        subsidiaryHazardClasses: null,
        packingGroup: "NONE",
        flashPointCelsius: null,
        isMarinePollutant: false,
        packageCount: 8,
        packageTypeDescription: "Cajas de cartón reforzado (4G)",
        packageUnCode: "4G",
        netQuantityPerPackage: 35.0,
        unitOfMeasure: "KILOGRAMS",
        totalNetQuantity: 280.0,
        totalGrossMassKg: 340.0,
        netExplosiveMassKg: 0,
        isLimitedQuantityLq: false,
        exceptedQuantityCode: "E0",
        adrTransportCategory: 2,
        adrPointsCalculated: 840.0, // 280 * 3
        adrTunnelRestrictionCode: "E",
        kemlerHazardIdNumber: "90",
        emsFireCode: "F-A",
        emsSpillageCode: "S-I",
        iataPackingInstruction: "965",
        lithiumBatterySection: "SECTION_IA",
        lithiumStateOfChargePercentage: 25.0,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.dgSegregationAudits)
    .values([
      {
        id: "dg_seg_01",
        dgShipmentId: "dg_ship_valencia_01",
        containerOrVehicleNumber: "MSKU-891024-3",
        auditDate: "2026-09-01",
        evaluatedItemIdsJson: JSON.stringify(["dg_item_01", "dg_item_02"]),
        segregationComplianceStatus: "COMPLIANT_SEGREGATED",
        totalConflictsDetected: 0,
        conflictDetailsJson: JSON.stringify([]),
        auditorName: "DG Safety Adviser Carlos Vega",
        auditCertificateStatement:
          "Auditoría de segregación conforme bajo IMDG 7.2.4. La Clase 3 (Gasolina) y Clase 9 (Biocidas) son químicamente compatibles para co-carga en el mismo contenedor.",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.dgEmergencyCards)
    .values([
      {
        id: "dg_emc_01",
        dgShipmentId: "dg_ship_valencia_01",
        cardReference: "EMC-2026-VAL-001",
        unNumbersSummary:
          "UN 1203 (Gasolina), UN 3082 (Materia Peligrosa Medio Ambiente)",
        primaryClassesSummary:
          "Clase 3 (Líquido Inflamable), Clase 9 (Misceláneos)",
        emergencyPhone24h: "+34 91 562 04 20",
        fireInterventionProtocol:
          "Usar espuma resistente al alcohol, polvo químico seco o CO2. Enfriar envases expuestos desde distancia de seguridad con agua pulverizada.",
        spillageContainmentProtocol:
          "Eliminar todas las fuentes de ignición. Confinar el derrame con barreras absorbentes inertes. Evitar vertido a desagües o al medio marino.",
        firstAidProtocol:
          "Retirar a la víctima al aire fresco. En caso de contacto con la piel/ojos, lavar con agua abundante durante 15 min.",
        requiredPpeEquipment:
          "Gafas estancas, guantes de nitrilo, calzado antiestático y máscara con filtro para vapores orgánicos.",
        specialEnvironmentalHazards:
          "Contaminante Marino (MARPOL Anexo III). Tóxico para la vida acuática con efectos duraderos.",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.dgPackingCertificates)
    .values([
      {
        id: "dg_pack_01",
        dgShipmentId: "dg_ship_valencia_01",
        certificateReference: "CPC-2026-VAL-0089",
        containerOrVehicleNumber: "MSKU-891024-3",
        sealNumberIso17712: "ES-VAL-H-992104",
        packingFacilityName: "Terminal Química de Graneles Port Valencia",
        packingFacilityAddress: "Muelle de la Química, 46024 Valencia",
        declarantName: "Javier Navarro (Jefe de Estiba DGR)",
        declarantCompany: "Atlas Logistics Port Terminal SL",
        declarantPosition: "Dangerous Goods Certified Loader",
        isCleanDrySuitable: true,
        isSegregationCompliant: true,
        isPackagesSoundUndamaged: true,
        isProperlySecuredBraced: true,
        isPlacardedAndMarked: true,
        signDate: "2026-09-01",
        status: "CERTIFIED_COMPLIANT",
      },
    ])
    .onConflictDoNothing();

  console.log(
    "✅ Creados Expedientes de Mercancías Peligrosas (DGR), Partidas UN, Auditorías de Segregación y Fichas EmS.",
  );
}
