import { db } from "../index.js";
import * as schema from "../schema/index.js";
import { faker } from "@faker-js/faker";
import { sql } from "drizzle-orm";

export async function seedClaims(): Promise<void> {
  // 16. FREIGHT CARGO CLAIMS & INSURANCE SUBROGATION LEDGER
  const claim1Id = "clm_2026_hv_0041";
  await db
    .insert(schema.cargoClaims)
    .values({
      id: claim1Id,
      claimNumber: "CLM-2026-HV-0041",
      shipmentId: "shipment_valencia_miami_01",
      transportDocNumber: "MSCU-VLC-982104",
      transportMode: "OCEAN",
      governingConvention: "HAGUE_VISBY",
      incidentType: "WATER_DAMAGE",
      incidentDate: new Date(Date.now() - 86400000 * 14),
      noticeDate: new Date(Date.now() - 86400000 * 12),
      deliveryDate: new Date(Date.now() - 86400000 * 13),
      claimantName: "Florida Deco Architectural Supply LLC",
      carrierName: "Mediterranean Shipping Company (MSC)",
      packagesDamaged: 4,
      damagedWeightKg: 3200.0,
      claimedAmount: 24500.0,
      claimedCurrency: "EUR",
      statutorySdrRate: 2.0,
      statutoryLimitEur: 7968.0, // 3,200 kg * 2.00 SDR * 1.245 EUR/SDR = 7,968.00 €
      insuranceInsuredValue: 27000.0,
      insurancePolicyDeductible: 500.0,
      insurancePayoutAmount: 24000.0, // 24,500 claimed - 500 deductible
      subrogationRecoveredAmount: 7968.0, // Full statutory carrier cap recovered
      status: "RECOVERED",
      protestIssued: true,
      subrogationSigned: true,
      incidentDescription:
        "Entrada de agua de mar en contenedor 40' HC por fallo en la junta de estanqueidad de las puertas. Daño por humedad y salinidad en 4 pallets de porcelánico esmaltado.",
      surveyorData: {
        surveyorName: "Bureau Veritas Marine Cargo Surveys",
        reportNumber: "BV-MIA-2026-8819",
        inspectionDate: new Date(Date.now() - 86400000 * 11),
        assessedDepreciationPct: 100,
        causeOfLoss:
          "Fallo en junta de goma de la puerta del contenedor durante temporal marítimo.",
      },
      recoveryNotes:
        "Indemnización de seguro abonada al asegurado por 24.000 €. Recobro subrogatorio de 7.968,00 € liquidado por la naviera MSC conforme al límite estatutario de 2 DEG/kg Reglas de La Haya-Visby.",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  const claim2Id = "clm_2026_mc_0082";
  await db
    .insert(schema.cargoClaims)
    .values({
      id: claim2Id,
      claimNumber: "CLM-2026-MC-0082",
      shipmentId: "shipment_air_pharma_02",
      transportDocNumber: "075-84920153",
      transportMode: "AIR",
      governingConvention: "MONTREAL_1999",
      incidentType: "TEMPERATURE_EXCURSION",
      incidentDate: new Date(Date.now() - 86400000 * 5),
      noticeDate: new Date(Date.now() - 86400000 * 4),
      deliveryDate: new Date(Date.now() - 86400000 * 4),
      claimantName: "BioPharma Laboratories Europe SA",
      carrierName: "Iberia Líneas Aéreas de España SA",
      packagesDamaged: 2,
      damagedWeightKg: 120.0,
      claimedAmount: 45000.0,
      claimedCurrency: "EUR",
      statutorySdrRate: 22.0,
      statutoryLimitEur: 3286.8, // 120 kg * 22.00 SDR * 1.245 EUR/SDR = 3,286.80 €
      insuranceInsuredValue: 50000.0,
      insurancePolicyDeductible: 1000.0,
      insurancePayoutAmount: 44000.0,
      subrogationRecoveredAmount: 0.0,
      status: "PROTEST_ISSUED",
      protestIssued: true,
      subrogationSigned: false,
      incidentDescription:
        "Ruptura de la cadena de frío en bodega de carga aérea durante el tránsito MAD-FRA. Registrador térmico TempTale registró +18°C durante 6 horas continuas (límite contractualmente fijado +2°C a +8°C).",
      surveyorData: {
        surveyorName: "SGS Life Science Cold Chain Inspectors",
        reportNumber: "SGS-FRA-44021",
        inspectionDate: new Date(Date.now() - 86400000 * 3),
        assessedDepreciationPct: 100,
        causeOfLoss:
          "Fallo de conexión eléctrica en el contenedor Envirotainer activo en plataforma aeroportuaria.",
      },
      recoveryNotes:
        "Carta de protesta formal emitida a Iberia Cargo dentro del plazo legal de 14 días (Art. 31 Convenio de Montreal). Expediente remitido a peritación de seguro para autorización de pago.",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  const claim3Id = "clm_2026_cmr_0119";
  await db
    .insert(schema.cargoClaims)
    .values({
      id: claim3Id,
      claimNumber: "CLM-2026-CMR-0119",
      shipmentId: "shipment_road_ftl_03",
      transportDocNumber: "CMR-ES-2026-99120",
      transportMode: "ROAD",
      governingConvention: "CMR",
      incidentType: "CRUSH_COLLAPSE",
      incidentDate: new Date(Date.now() - 86400000 * 8),
      noticeDate: new Date(Date.now() - 86400000 * 7),
      deliveryDate: new Date(Date.now() - 86400000 * 7),
      claimantName: "Iberica Smart Devices SL",
      carrierName: "Trans-Iberia International Roadways SL",
      packagesDamaged: 6,
      damagedWeightKg: 4200.0,
      claimedAmount: 38000.0,
      claimedCurrency: "EUR",
      statutorySdrRate: 8.33,
      statutoryLimitEur: 43557.57, // 4,200 kg * 8.33 SDR * 1.245 EUR/SDR = 43,557.57 € (Límite legal superior al valor reclamado)
      insuranceInsuredValue: 40000.0,
      insurancePolicyDeductible: 600.0,
      insurancePayoutAmount: 37400.0,
      subrogationRecoveredAmount: 37400.0,
      status: "SUBROGATED",
      protestIssued: true,
      subrogationSigned: true,
      incidentDescription:
        "Frenazo brusco y vuelco parcial de carga por amarre deficiente del semirremolque en ruta AP-7. Colapso estructural y aplastamiento de 6 pallets de componentes electrónicos.",
      surveyorData: {
        surveyorName: "DEKRA Transport & Cargo Claims",
        reportNumber: "DEKRA-BCN-9912",
        inspectionDate: new Date(Date.now() - 86400000 * 6),
        assessedDepreciationPct: 90,
        causeOfLoss:
          "Falta de cinchas de trincaje reglamentarias conforme a norma EN 12195-1.",
      },
      recoveryNotes:
        "Reclamación totalmente recuperable contra el transportista bajo el Convenio CMR (Límite 8,33 DEG/kg = 43.557,57 € > Daño 38.000 €). Finiquito y subrogación firmados.",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  console.log("✅ Creados Expedientes de Siniestros y Recobros Subrogatorios.");
}
