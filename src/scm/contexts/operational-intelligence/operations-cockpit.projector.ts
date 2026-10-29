import { v4 as uuidv4 } from "uuid";
import { eq, desc } from "drizzle-orm";
import { db } from "../../../db/index.js";
import {
  scmCockpitWorkItems,
  scmShipment360Views,
} from "../../../db/schema/scm_foundation.js";
import {
  SecurityActorContext,
  DEFAULT_OPERATOR_ACTOR,
  assertInvariant,
  assertAbacScope,
} from "../../kernel/primitives.js";
import {
  ensureScmFoundationTables,
  outboxBus,
} from "../../kernel/outbox-bus.js";
import { createCustomerOrder } from "../orders/order.context.js";
import { createShipmentExecution } from "../shipment-execution/shipment.context.js";
import { publishShipmentRoutePlan } from "../transport-planning/route-plan.context.js";
import {
  declareShipmentCargo,
  assignShipmentEquipment,
} from "../cargo-equipment/cargo-equipment.context.js";
import {
  Shipment360ReadModel,
  registerShipment360Projectors,
} from "./shipment360.projector.js";

export interface AttentionScoreBreakdown {
  slaScore: number; // Weight 35%
  healthScore: number; // Weight 25%
  severityScore: number; // Weight 20%
  commercialTierScore: number; // Weight 10%
  workflowGateScore: number; // Weight 10%
  totalAttentionScore: number; // 0..100
}

export interface OperationsCockpitItemReadModel {
  workItemId: string;
  workItemType:
    "HUMAN_TASK" | "APPROVAL" | "REVIEW" | "FOLLOW_UP" | "ACTIVE_EXCEPTION";
  title: string;
  description: string;
  attentionScore: number;
  scoreBreakdown: AttentionScoreBreakdown;
  urgencyBucket: "IMMEDIATE_ACTION" | "DUE_TODAY" | "AT_RISK" | "UPCOMING";
  status: "OPEN" | "COMPLETED";

  organizationId: string;
  branchId: string;
  teamId: string;
  assigneeUserId: string | null;
  assigneeName: string;

  subject: {
    entityType: "SHIPMENT" | "ORDER" | "DOCUMENT" | "CUSTOMS_CASE" | "INVOICE";
    entityId: string;
    referenceNumber: string;
    shipmentId: string;
    customerName: string;
    customerTier: "STRATEGIC_VIP" | "ENTERPRISE" | "STANDARD";
    routeSummary: string;
    transportMode: "SEA" | "AIR" | "ROAD" | "RAIL" | "MULTIMODAL";
  };

  shipmentHealth: "ON_TRACK" | "AT_RISK" | "CRITICAL" | "BLOCKED";
  slaSnapshot: {
    slaInstanceId: string;
    slaName: string;
    status: "ON_TRACK" | "AT_RISK" | "BREACHED" | "PAUSED";
    deadlineAt: string;
    remainingMinutes: number;
  };
  dataQualityGate: "PASSED" | "WARN" | "BLOCKED";

  primaryAction: {
    commandName: string;
    actionLabel: string;
    inputPlaceholder: string;
    defaultResolutionValue: string;
  };

  resolution?: {
    resolvedBy: string;
    resolvedAt: string;
    notes: string;
    appliedValue?: string;
  };
  updatedAt: string;
}

export function calculateAttentionScore(params: {
  slaScore: number;
  healthScore: number;
  severityScore: number;
  commercialTierScore: number;
  workflowGateScore: number;
}): AttentionScoreBreakdown {
  const total = Math.round(
    0.35 * params.slaScore +
      0.25 * params.healthScore +
      0.2 * params.severityScore +
      0.1 * params.commercialTierScore +
      0.1 * params.workflowGateScore,
  );
  return {
    ...params,
    totalAttentionScore: Math.min(100, Math.max(0, total)),
  };
}

let seedInitialized = false;

export async function ensureScmDemoSeedData(): Promise<void> {
  if (seedInitialized) return;
  await ensureScmFoundationTables();
  registerShipment360Projectors();

  const existingViews = await db
    .select({ shipmentId: scmShipment360Views.shipmentId })
    .from(scmShipment360Views)
    .limit(1);

  const existingCockpit = await db
    .select({ workItemId: scmCockpitWorkItems.workItemId })
    .from(scmCockpitWorkItems)
    .limit(1);

  if (existingViews.length > 0 && existingCockpit.length > 0) {
    seedInitialized = true;
    return;
  }

  seedInitialized = true;
  const actor = DEFAULT_OPERATOR_ACTOR;

  // ==========================================================================
  // SEED EXPEDIENTE 1: ATLS-2026-84102 (SEA FCL — Lithium-Ion DG, AT_RISK)
  // ==========================================================================
  const ord1 = await createCustomerOrder(
    {
      orderNumber: "ORD-2026-90101",
      customerPartyId: "pty_iberian_ev_motors",
      customerName: "Iberian EV Motors & Energy S.A.",
      serviceMode: "FCL",
      incoterm: "FOB",
      movementScope: "PORT_TO_DOOR",
      originLocationId: "CNSHA",
      destinationLocationId: "ESBCN",
      cargoReadyDate: "2026-11-02",
      requiredDeliveryDate: "2026-12-04",
      autoConfirm: true,
      cargoRequirements: [
        {
          commodityDescription: "EV High-Voltage Battery Modules (UN3480)",
          hsCode: "8507.60.00",
          packageCount: 80,
          grossWeightKg: 21600,
          volumeCbm: 58,
          requestedEquipmentType: "40HC",
          isDangerousGoods: true,
        },
      ],
    },
    actor,
  );

  const shp1 = await createShipmentExecution(
    {
      shipmentReference: "ATLS-2026-84102",
      customerAccountId: "pty_iberian_ev_motors",
      customerName: "Iberian EV Motors & Energy S.A.",
      serviceMode: "SEA",
      serviceType: "FCL",
      incoterm: "FOB",
      direction: "IMPORT",
      originLocationId: "CNSHA",
      destinationLocationId: "ESBCN",
      orderAllocations: [
        {
          orderId: ord1.id,
          orderNumber: ord1.orderNumber,
          allocatedPackages: 80,
          allocatedWeightKg: 21600,
          allocatedVolumeCbm: 58,
        },
      ],
      externalRefs: [
        { type: "CARRIER_BOOKING", value: "MAEU-26094811", isPrimary: true },
        { type: "MASTER_BL", value: "MAEU991028471", isPrimary: false },
        { type: "HOUSE_BL", value: "HBL-ATLS-84102", isPrimary: false },
        { type: "CUSTOMER_PO", value: "PO-IBEV-7741", isPrimary: false },
      ],
    },
    actor,
  );

  await publishShipmentRoutePlan(
    {
      shipmentId: shp1.id,
      changeReason: "Initial v1 Route via Singapore Hub",
      stops: [
        {
          stopId: "st_sha",
          sequenceNo: 1,
          locationId: "CNSHA",
          locationName: "Shanghai Yangshan Deepwater Port",
          stopRole: "POL",
          cutOffs: {
            vgmCutOffAt: "2026-10-30T16:00:00Z",
            siCutOffAt: "2026-10-30T18:00:00Z",
            gateInCutOffAt: "2026-10-31T12:00:00Z",
          },
        },
        {
          stopId: "st_sin",
          sequenceNo: 2,
          locationId: "SGSIN",
          locationName: "PSA Singapore Transshipment Terminal",
          stopRole: "TRANSSHIPMENT",
        },
        {
          stopId: "st_bcn",
          sequenceNo: 3,
          locationId: "ESBCN",
          locationName: "BEST Terminal Port of Barcelona",
          stopRole: "POD",
        },
      ],
      legs: [
        {
          sequenceNo: 1,
          originStopId: "st_sha",
          destinationStopId: "st_sin",
          originLocode: "CNSHA",
          destinationLocode: "SGSIN",
          mode: "SEA",
          legCategory: "MAIN_CARRIAGE",
          carrierName: "Maersk",
          vesselOrFlight: "MAERSK MC-KINNEY MOLLER",
          voyageNumber: "618W",
          plannedDepartureAt: "2026-11-02T08:00:00Z",
          plannedArrivalAt: "2026-11-08T14:00:00Z",
        },
        {
          sequenceNo: 2,
          originStopId: "st_sin",
          destinationStopId: "st_bcn",
          originLocode: "SGSIN",
          destinationLocode: "ESBCN",
          mode: "SEA",
          legCategory: "MAIN_CARRIAGE",
          carrierName: "Maersk",
          vesselOrFlight: "MAERSK HANOI",
          voyageNumber: "620W",
          plannedDepartureAt: "2026-11-10T06:00:00Z",
          plannedArrivalAt: "2026-11-28T07:00:00Z",
        },
      ],
    },
    actor,
  );

  const crg1 = await declareShipmentCargo(
    {
      shipmentId: shp1.id,
      packages: [
        {
          packageType: "PALLET",
          quantity: 50,
          dimensionsCm: { length: 120, width: 100, height: 145 },
          grossWeightKg: 14600,
          volumeCbm: 40,
          stackable: false,
          marksAndNumbers: "IBEV-BAT-2026 / UN3480",
          goods: [
            {
              description: "Lithium-Ion Traction Battery Packs 800V",
              hsCode: "8507.60.00",
              countryOfOrigin: "CN",
              dangerousGoods: {
                unNumber: "UN3480",
                imoClass: "9",
                packingGroup: "II",
              },
            },
          ],
        },
        {
          packageType: "CRATE",
          quantity: 30,
          dimensionsCm: { length: 100, width: 80, height: 110 },
          grossWeightKg: 7000,
          volumeCbm: 18,
          stackable: true,
          marksAndNumbers: "IBEV-INV-2026",
          goods: [
            {
              description: "SiC Power Inverters & BMS Controllers",
              hsCode: "8504.40.85",
              countryOfOrigin: "CN",
            },
          ],
        },
      ],
    },
    actor,
  );

  await assignShipmentEquipment(
    {
      shipmentId: shp1.id,
      equipmentCategory: "CONTAINER",
      isoTypeCode: "40HC",
      equipmentNumber: "MSKU9482710",
      seals: ["SL-MAEU-99182", "SL-CUST-4401"],
      tareWeightKg: 3850,
      vgmWeightKg: 25450,
      pickupPin: "8842",
      status: "SEALED",
      cargoAllocations: [
        {
          cargoId: crg1.id,
          allocatedPackages: 80,
          allocatedWeightKg: 21600,
          allocatedVolumeCbm: 58,
        },
      ],
    },
    actor,
  );

  // ==========================================================================
  // SEED EXPEDIENTE 2: ATLS-2026-84215 (AIR PHARMA COLD-CHAIN — CRITICAL)
  // ==========================================================================
  const ord2 = await createCustomerOrder(
    {
      orderNumber: "ORD-2026-90102",
      customerPartyId: "pty_biopharma_iberia",
      customerName: "BioPharma Nordics & Iberia Labs",
      serviceMode: "AIR",
      incoterm: "CIP",
      movementScope: "DOOR_TO_DOOR",
      originLocationId: "DEFRA",
      destinationLocationId: "ESMAD",
      cargoReadyDate: "2026-10-29",
      requiredDeliveryDate: "2026-10-31",
      autoConfirm: true,
      cargoRequirements: [
        {
          commodityDescription: "Oncology Monoclonal Antibodies (+2°C to +8°C)",
          hsCode: "3002.15.00",
          packageCount: 12,
          grossWeightKg: 1840,
          volumeCbm: 9.6,
          requestedEquipmentType: "RKN_ENVIROTAINER",
          isTemperatureControlled: true,
        },
      ],
    },
    actor,
  );

  const shp2 = await createShipmentExecution(
    {
      shipmentReference: "ATLS-2026-84215",
      customerAccountId: "pty_biopharma_iberia",
      customerName: "BioPharma Nordics & Iberia Labs",
      serviceMode: "AIR",
      serviceType: "AIR_PHARMA_EXPRESS",
      incoterm: "CIP",
      direction: "IMPORT",
      originLocationId: "DEFRA",
      destinationLocationId: "ESMAD",
      orderAllocations: [
        {
          orderId: ord2.id,
          orderNumber: ord2.orderNumber,
          allocatedPackages: 12,
          allocatedWeightKg: 1840,
          allocatedVolumeCbm: 9.6,
        },
      ],
      externalRefs: [
        { type: "MAWB", value: "020-88492014", isPrimary: true },
        { type: "HAWB", value: "ATLS-FRA-9910", isPrimary: false },
      ],
    },
    actor,
  );

  await publishShipmentRoutePlan(
    {
      shipmentId: shp2.id,
      changeReason: "Direct Lufthansa Cargo Cool-Center Charter",
      stops: [
        {
          stopId: "st_fra",
          sequenceNo: 1,
          locationId: "DEFRA",
          locationName: "Frankfurt Pharma Hub Terminal",
          stopRole: "POL",
        },
        {
          stopId: "st_mad",
          sequenceNo: 2,
          locationId: "ESMAD",
          locationName: "Madrid-Barajas Air Cargo Cold Storage",
          stopRole: "POD",
        },
      ],
      legs: [
        {
          sequenceNo: 1,
          originStopId: "st_fra",
          destinationStopId: "st_mad",
          originLocode: "DEFRA",
          destinationLocode: "ESMAD",
          mode: "AIR",
          legCategory: "MAIN_CARRIAGE",
          carrierName: "Lufthansa Cargo",
          vesselOrFlight: "LH8314",
          voyageNumber: "29OCT",
          plannedDepartureAt: "2026-10-29T18:00:00Z",
          plannedArrivalAt: "2026-10-29T20:45:00Z",
        },
      ],
    },
    actor,
  );

  const crg2 = await declareShipmentCargo(
    {
      shipmentId: shp2.id,
      packages: [
        {
          packageType: "PALLET",
          quantity: 12,
          dimensionsCm: { length: 120, width: 80, height: 100 },
          grossWeightKg: 1840,
          volumeCbm: 9.6,
          stackable: false,
          marksAndNumbers: "PHARMA-GDP-2C8C",
          goods: [
            {
              description: "Biologic Therapeutic Vials (+2°C to +8°C Active)",
              hsCode: "3002.15.00",
              countryOfOrigin: "DE",
              temperatureControl: {
                minCelsius: 2,
                maxCelsius: 8,
                setPointCelsius: 5,
              },
            },
          ],
        },
      ],
    },
    actor,
  );

  await assignShipmentEquipment(
    {
      shipmentId: shp2.id,
      equipmentCategory: "ULD",
      isoTypeCode: "RKN",
      equipmentNumber: "RKN40912LH",
      seals: ["SL-GDP-77109"],
      tareWeightKg: 265,
      vgmWeightKg: 2105,
      status: "GATED_IN",
      cargoAllocations: [
        {
          cargoId: crg2.id,
          allocatedPackages: 12,
          allocatedWeightKg: 1840,
          allocatedVolumeCbm: 9.6,
        },
      ],
    },
    actor,
  );

  // ==========================================================================
  // SEED SMART WORK QUEUE ITEMS (OperationsCockpitReadModel)
  // ==========================================================================
  const now = new Date();
  const sampleWorkItems: OperationsCockpitItemReadModel[] = [
    {
      workItemId: "wrk_imo_dg_approval_01",
      workItemType: "APPROVAL",
      title:
        "Validar Declaración IMO DG (UN3480 Clase 9) y Certificado MSDS antes de Cut-Off",
      description:
        "El expediente ATLS-2026-84102 declara 50 pallets de baterías de litio (UN3480). El motor de Reglas requiere firma de Dangerous Goods Safety Advisor y verificación de ficha MSDS para liberar el embarque en CNSHA.",
      scoreBreakdown: calculateAttentionScore({
        slaScore: 98,
        healthScore: 90,
        severityScore: 95,
        commercialTierScore: 100,
        workflowGateScore: 100,
      }),
      attentionScore: 96,
      urgencyBucket: "IMMEDIATE_ACTION",
      status: "OPEN",
      organizationId: actor.organizationId,
      branchId: actor.branchId,
      teamId: "team_ocean_import",
      assigneeUserId: actor.userId,
      assigneeName: "Coordinator Desk (Tú)",
      subject: {
        entityType: "SHIPMENT",
        entityId: shp1.id,
        referenceNumber: shp1.shipmentReference,
        shipmentId: shp1.id,
        customerName: shp1.customerName,
        customerTier: "STRATEGIC_VIP",
        routeSummary: "CNSHA → SGSIN → ESBCN (FCL 40HC)",
        transportMode: "SEA",
      },
      shipmentHealth: "CRITICAL",
      slaSnapshot: {
        slaInstanceId: "sla_dg_cutoff_84102",
        slaName: "IMDG Dangerous Goods Terminal Cut-Off",
        status: "AT_RISK",
        deadlineAt: new Date(now.getTime() + 95 * 60 * 1000).toISOString(),
        remainingMinutes: 95,
      },
      dataQualityGate: "BLOCKED",
      primaryAction: {
        commandName: "cargo_equipment.ApproveDangerousGoodsManifest",
        actionLabel: "Aprobar DGD IMO & Desbloquear Gate",
        inputPlaceholder: "Nº Autorización IMDG / Notas de validación...",
        defaultResolutionValue:
          "IMDG-AUTH-2026-UN3480-OK — MSDS y embalaje Packing Group II verificados.",
      },
      updatedAt: now.toISOString(),
    },
    {
      workItemId: "wrk_pharma_temp_review_02",
      workItemType: "ACTIVE_EXCEPTION",
      title:
        "Confirmar Pre-Acondicionamiento Activo (+5°C) de ULD RKN40912LH en Frankfurt",
      description:
        "El sensor de telemetría del contenedor activo Envirotainer RKN40912LH reportó apertura de puerta en rampa DEFRA (+7.4°C). Verificar estabilización térmica antes del despegue del vuelo LH8314.",
      scoreBreakdown: calculateAttentionScore({
        slaScore: 92,
        healthScore: 85,
        severityScore: 90,
        commercialTierScore: 100,
        workflowGateScore: 85,
      }),
      attentionScore: 90,
      urgencyBucket: "IMMEDIATE_ACTION",
      status: "OPEN",
      organizationId: actor.organizationId,
      branchId: actor.branchId,
      teamId: "team_air_pharma",
      assigneeUserId: actor.userId,
      assigneeName: "Coordinator Desk (Tú)",
      subject: {
        entityType: "SHIPMENT",
        entityId: shp2.id,
        referenceNumber: shp2.shipmentReference,
        shipmentId: shp2.id,
        customerName: shp2.customerName,
        customerTier: "STRATEGIC_VIP",
        routeSummary: "DEFRA → ESMAD (AIR RKN Cold-Chain)",
        transportMode: "AIR",
      },
      shipmentHealth: "AT_RISK",
      slaSnapshot: {
        slaInstanceId: "sla_gdp_temp_84215",
        slaName: "EU GDP Cold-Chain Excursion SLA",
        status: "AT_RISK",
        deadlineAt: new Date(now.getTime() + 140 * 60 * 1000).toISOString(),
        remainingMinutes: 140,
      },
      dataQualityGate: "PASSED",
      primaryAction: {
        commandName: "exception_mgmt.ResolveColdChainAlert",
        actionLabel: "Certificar Estabilidad +5.0°C y Cerrar Excepción",
        inputPlaceholder: "Lectura de sonda certificada y lote de batería...",
        defaultResolutionValue:
          "Sonda interna estabilizada en +4.8°C, batería RKN al 98%. Autorizado embarque LH8314.",
      },
      updatedAt: now.toISOString(),
    },
    {
      workItemId: "wrk_hbl_draft_review_03",
      workItemType: "REVIEW",
      title:
        "Emitir y Aprobar House Bill of Lading (HBL-ATLS-84102) tras cierre de SI",
      description:
        "Las Shipping Instructions (EDI 304) de Iberian EV Motors están completas. Revisar correspondencia de partidas arancelarias (8507.60 / 8504.40) y emitir HBL versión v1.",
      scoreBreakdown: calculateAttentionScore({
        slaScore: 78,
        healthScore: 65,
        severityScore: 70,
        commercialTierScore: 100,
        workflowGateScore: 80,
      }),
      attentionScore: 76,
      urgencyBucket: "DUE_TODAY",
      status: "OPEN",
      organizationId: actor.organizationId,
      branchId: actor.branchId,
      teamId: "team_ocean_import",
      assigneeUserId: actor.userId,
      assigneeName: "Coordinator Desk (Tú)",
      subject: {
        entityType: "DOCUMENT",
        entityId: "doc_hbl_84102",
        referenceNumber: shp1.shipmentReference,
        shipmentId: shp1.id,
        customerName: shp1.customerName,
        customerTier: "STRATEGIC_VIP",
        routeSummary: "CNSHA → SGSIN → ESBCN (FCL 40HC)",
        transportMode: "SEA",
      },
      shipmentHealth: "AT_RISK",
      slaSnapshot: {
        slaInstanceId: "sla_si_cutoff_84102",
        slaName: "DCSA Shipping Instructions & HBL Issuance",
        status: "ON_TRACK",
        deadlineAt: new Date(now.getTime() + 320 * 60 * 1000).toISOString(),
        remainingMinutes: 320,
      },
      dataQualityGate: "WARN",
      primaryAction: {
        commandName: "document_mgmt.ApproveAndIssueDocument",
        actionLabel: "Aprobar y Emitir HBL v1",
        inputPlaceholder: "Observaciones de emisión documental...",
        defaultResolutionValue:
          "HBL-ATLS-84102 revisado contra Packing List y VGM (25,450 kg). Emitido sin discrepancias.",
      },
      updatedAt: now.toISOString(),
    },
    {
      workItemId: "wrk_customs_sanitary_04",
      workItemType: "HUMAN_TASK",
      title:
        "Presentar Pre-Declaración Sanitaria AEMPS / DUA Importación en Aduana Madrid",
      description:
        "El expediente aéreo farmacéutico ATLS-2026-84215 permite despacho anticipado antes del aterrizaje de LH8314. Verificar certificado de análisis (CoA) y transmitir MRN.",
      scoreBreakdown: calculateAttentionScore({
        slaScore: 68,
        healthScore: 60,
        severityScore: 65,
        commercialTierScore: 90,
        workflowGateScore: 75,
      }),
      attentionScore: 68,
      urgencyBucket: "DUE_TODAY",
      status: "OPEN",
      organizationId: actor.organizationId,
      branchId: actor.branchId,
      teamId: "team_customs_desk",
      assigneeUserId: actor.userId,
      assigneeName: "Customs Specialist",
      subject: {
        entityType: "CUSTOMS_CASE",
        entityId: "cst_mad_84215",
        referenceNumber: shp2.shipmentReference,
        shipmentId: shp2.id,
        customerName: shp2.customerName,
        customerTier: "STRATEGIC_VIP",
        routeSummary: "DEFRA → ESMAD (AIR RKN Cold-Chain)",
        transportMode: "AIR",
      },
      shipmentHealth: "ON_TRACK",
      slaSnapshot: {
        slaInstanceId: "sla_customs_prefile_84215",
        slaName: "Customs Pre-Clearance Filing Window",
        status: "ON_TRACK",
        deadlineAt: new Date(now.getTime() + 480 * 60 * 1000).toISOString(),
        remainingMinutes: 480,
      },
      dataQualityGate: "PASSED",
      primaryAction: {
        commandName: "customs.SubmitCustomsDeclaration",
        actionLabel: "Transmitir DUA Anticipado y Registrar MRN",
        inputPlaceholder: "Número MRN asignado por AEAT...",
        defaultResolutionValue:
          "MRN 26ES002801948271R4 asignado — Canal VERDE / Levante automático autorizado.",
      },
      updatedAt: now.toISOString(),
    },
  ];

  for (const item of sampleWorkItems) {
    await db
      .insert(scmCockpitWorkItems)
      .values({
        workItemId: item.workItemId,
        workItemType: item.workItemType,
        title: item.title,
        description: item.description,
        attentionScore: item.attentionScore,
        urgencyBucket: item.urgencyBucket,
        status: item.status,
        organizationId: item.organizationId,
        branchId: item.branchId,
        teamId: item.teamId,
        assigneeUserId: item.assigneeUserId,
        shipmentId: item.subject.shipmentId,
        referenceNumber: item.subject.referenceNumber,
        itemModelJson: JSON.stringify(item),
        updatedAt: now,
      })
      .onConflictDoNothing();
  }
}

export async function listOperationsCockpitItems(
  filters: {
    status?: "OPEN" | "COMPLETED" | "ALL";
    urgencyBucket?: string;
    search?: string;
  } = {},
  actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
) {
  await ensureScmDemoSeedData();

  const rows = await db
    .select()
    .from(scmCockpitWorkItems)
    .orderBy(desc(scmCockpitWorkItems.attentionScore));

  const allItems: OperationsCockpitItemReadModel[] = rows
    .filter((r) => r.organizationId === actor.organizationId)
    .map((r) => JSON.parse(r.itemModelJson));

  const statusFilter = filters.status || "OPEN";
  let filtered = allItems.filter((item) =>
    statusFilter === "ALL" ? true : item.status === statusFilter,
  );

  if (filters.urgencyBucket && filters.urgencyBucket !== "ALL") {
    if (filters.urgencyBucket === "DATA_QUALITY_BLOCKED") {
      filtered = filtered.filter((i) => i.dataQualityGate === "BLOCKED");
    } else if (filters.urgencyBucket === "APPROVALS") {
      filtered = filtered.filter((i) => i.workItemType === "APPROVAL");
    } else {
      filtered = filtered.filter(
        (i) => i.urgencyBucket === filters.urgencyBucket,
      );
    }
  }

  if (filters.search && filters.search.trim()) {
    const q = filters.search.toLowerCase();
    filtered = filtered.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.subject.referenceNumber.toLowerCase().includes(q) ||
        i.subject.customerName.toLowerCase().includes(q) ||
        i.subject.routeSummary.toLowerCase().includes(q),
    );
  }

  const openItems = allItems.filter((i) => i.status === "OPEN");
  const completedItems = allItems.filter((i) => i.status === "COMPLETED");

  return {
    summary: {
      totalOpen: openItems.length,
      immediateActionCount: openItems.filter(
        (i) => i.urgencyBucket === "IMMEDIATE_ACTION",
      ).length,
      dueTodayCount: openItems.filter((i) => i.urgencyBucket === "DUE_TODAY")
        .length,
      dataQualityBlockedCount: openItems.filter(
        (i) => i.dataQualityGate === "BLOCKED",
      ).length,
      approvalsCount: openItems.filter((i) => i.workItemType === "APPROVAL")
        .length,
      completedTodayCount: completedItems.length,
    },
    items: filtered,
  };
}

export async function executeCockpitWorkItem(
  workItemId: string,
  input: {
    resolutionNotes?: string;
    appliedValue?: string;
  },
  actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
): Promise<{
  completedItem: OperationsCockpitItemReadModel;
  updatedShipment360: Shipment360ReadModel | null;
}> {
  await ensureScmDemoSeedData();

  const rows = await db
    .select()
    .from(scmCockpitWorkItems)
    .where(eq(scmCockpitWorkItems.workItemId, workItemId))
    .limit(1);

  assertInvariant(
    rows.length > 0,
    "work_management",
    "WORK_ITEM_NOT_FOUND",
    `Work item '${workItemId}' not found in Smart Work Queue`,
  );

  const row = rows[0];
  assertAbacScope(actor, row.organizationId, row.branchId);

  const item: OperationsCockpitItemReadModel = JSON.parse(row.itemModelJson);
  const nowIso = new Date().toISOString();

  item.status = "COMPLETED";
  item.dataQualityGate = "PASSED";
  item.shipmentHealth = "ON_TRACK";
  item.slaSnapshot.status = "ON_TRACK";
  item.resolution = {
    resolvedBy: actor.userId,
    resolvedAt: nowIso,
    notes:
      input.resolutionNotes ||
      item.primaryAction.defaultResolutionValue ||
      "Resolved via Smart Work Queue in-situ execution",
    appliedValue: input.appliedValue,
  };
  item.updatedAt = nowIso;

  await db
    .update(scmCockpitWorkItems)
    .set({
      status: "COMPLETED",
      itemModelJson: JSON.stringify(item),
      updatedAt: new Date(),
    })
    .where(eq(scmCockpitWorkItems.workItemId, workItemId));

  // Emit domain event to Outbox and update Shipment360ReadModel if linked to a shipment
  let updatedShipment360: Shipment360ReadModel | null = null;

  if (item.subject.shipmentId) {
    const viewRows = await db
      .select()
      .from(scmShipment360Views)
      .where(eq(scmShipment360Views.shipmentId, item.subject.shipmentId))
      .limit(1);

    if (viewRows.length > 0) {
      const viewRow = viewRows[0];
      const model: Shipment360ReadModel = JSON.parse(viewRow.readModelJson);

      model.controlSummary.health.status = "ON_TRACK";
      model.controlSummary.health.score = Math.min(
        100,
        model.controlSummary.health.score + 15,
      );
      model.controlSummary.dataQuality.gateStatus = "PASSED";
      model.controlSummary.dataQuality.score = 100;
      model.projectionVersion = viewRow.projectionVersion + 1;
      model.lastUpdatedAt = nowIso;
      model.activityTrail.unshift({
        eventId: `evt_${uuidv4().substring(0, 8)}`,
        eventType: `${item.primaryAction.commandName}.Completed.v1`,
        occurredAt: nowIso,
        producerContext: "work_management",
      });

      await db
        .update(scmShipment360Views)
        .set({
          healthStatus: "ON_TRACK",
          projectionVersion: model.projectionVersion,
          readModelJson: JSON.stringify(model),
          updatedAt: new Date(),
        })
        .where(eq(scmShipment360Views.shipmentId, item.subject.shipmentId));

      updatedShipment360 = model;
    }
  }

  await outboxBus.enqueueEvents([
    {
      eventId: `evt_${uuidv4()}`,
      eventType: "work_management.TaskCompletedInSitu.v1",
      schemaVersion: 1,
      producerContext: "work_management",
      aggregateType: "Task",
      aggregateId: workItemId,
      aggregateVersion: 2,
      correlationId: uuidv4(),
      causationId: uuidv4(),
      actor,
      occurredAt: nowIso,
      payload: {
        workItemId,
        commandExecuted: item.primaryAction.commandName,
        shipmentId: item.subject.shipmentId,
        referenceNumber: item.subject.referenceNumber,
        resolution: item.resolution,
      },
    },
  ]);
  await outboxBus.relayPendingEvents();

  return { completedItem: item, updatedShipment360 };
}

export async function listShipment360ReadModels(
  actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
): Promise<Shipment360ReadModel[]> {
  await ensureScmDemoSeedData();

  const rows = await db
    .select()
    .from(scmShipment360Views)
    .orderBy(desc(scmShipment360Views.updatedAt));

  return rows
    .filter((r) => r.organizationId === actor.organizationId)
    .map((r) => JSON.parse(r.readModelJson) as Shipment360ReadModel);
}
