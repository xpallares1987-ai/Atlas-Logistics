import { v4 as uuidv4 } from "uuid";
import { eq, desc } from "drizzle-orm";
import { db } from "../../../db/index.js";
import {
  scmWorkflowDefinitions,
  scmWorkflowInstances,
  scmDecisionDefinitions,
  scmDecisionEvaluationLogs,
  scmShipments,
  scmCargos,
  scmEquipmentAssignments,
  scmQualityAssessments,
  scmMilestonePlans,
} from "../../../db/schema/scm_foundation.js";
import {
  SecurityActorContext,
  DEFAULT_OPERATOR_ACTOR,
  assertInvariant,
} from "../../kernel/primitives.js";
import {
  ensureScmFoundationTables,
  outboxBus,
} from "../../kernel/outbox-bus.js";

let automationSubscribersRegistered = false;
let automationDefsSeeded = false;

export type HitPolicy = "UNIQUE" | "FIRST" | "PRIORITY" | "COLLECT";

export interface DecisionRuleRow {
  rowId: string;
  priorityOrder: number;
  conditions: Record<string, any>; // Key-value matching conditions ("*" or omitted = wildcard)
  outputs: Record<string, any>;
  ruleAnnotation: string;
}

export interface DecisionEvaluationRecord {
  evaluationId: string;
  decisionKey: string;
  versionNumber: number;
  shipmentId: string;
  inputsSnapshot: Record<string, any>;
  matchedRowIds: string[];
  ruleAnnotations: string[];
  outputSnapshot: Record<string, any>;
  callerContext: string;
  correlationId: string;
  evaluatedAt: string;
}

export type WorkflowNodeType =
  | "START_EVENT"
  | "CALL_DECISION_RULE"
  | "HUMAN_TASK"
  | "EXCLUSIVE_GATEWAY"
  | "WAIT_FOR_DOMAIN_EVENT"
  | "SERVICE_COMMAND"
  | "END_EVENT";

export interface ActivityNodeDef {
  nodeId: string;
  sequenceOrder: number;
  nodeType: WorkflowNodeType;
  label: string;
  decisionKey?: string;
  expectedEventCode?: string;
  description: string;
}

export interface SequenceFlowDef {
  flowId: string;
  sourceNodeId: string;
  targetNodeId: string;
  conditionExpression?: string;
  isDefaultFlow?: boolean;
}

export interface WorkflowStateReadModel {
  processInstanceId: string;
  processKey: string;
  versionNumber: number;
  state:
    "RUNNING" | "SUSPENDED" | "BLOCKED_AT_GATEWAY" | "COMPLETED" | "TERMINATED";
  currentNodeId: string;
  currentNodeLabel: string;
  blockingReason?: string | null;
  nodes: Array<{
    nodeId: string;
    sequenceOrder: number;
    nodeType: WorkflowNodeType;
    label: string;
    description: string;
    decisionKey?: string;
    status: "COMPLETED" | "ACTIVE" | "BLOCKED" | "PENDING";
  }>;
  availableUserCommands: string[];
  variablesSnapshot: Record<string, any>;
  updatedAt: string;
}

export const CANONICAL_WORKFLOW_NODES: ActivityNodeDef[] = [
  {
    nodeId: "NODE_START",
    sequenceOrder: 1,
    nodeType: "START_EVENT",
    label: "1. Apertura de Expediente",
    description: "Inicio del proceso operativo tras ShipmentCreated.",
  },
  {
    nodeId: "NODE_DECISION_ASSIGN",
    sequenceOrder: 2,
    nodeType: "CALL_DECISION_RULE",
    label: "2. Regla de Asignación Operativa",
    decisionKey: "DECISION_OPERATIONAL_ASSIGNMENT",
    description:
      "Evalúa Decision Table para asignar Mesa Especialista (HazMat / Reefer / Ocean / Air).",
  },
  {
    nodeId: "NODE_WAIT_ROUTE_CARGO",
    sequenceOrder: 3,
    nodeType: "WAIT_FOR_DOMAIN_EVENT",
    label: "3. Planificación de Ruta & Manifiesto Cargo",
    expectedEventCode: "RouteVersionPublished+CargoDeclared",
    description:
      "Espera publicación de RoutePlan (v1+) y declaración de jerarquía Cargo -> Packages -> Goods.",
  },
  {
    nodeId: "NODE_WAIT_VGM_GATEIN",
    sequenceOrder: 4,
    nodeType: "WAIT_FOR_DOMAIN_EVENT",
    label: "4. Gate-In & Certificación SOLAS VGM",
    expectedEventCode: "VGM_VERIFIED",
    description:
      "Espera confirmación física de Gate-In portuario y pesaje SOLAS VGM certificado.",
  },
  {
    nodeId: "NODE_GATEWAY_DQ_EXPORT",
    sequenceOrder: 5,
    nodeType: "EXCLUSIVE_GATEWAY",
    label: "5. Gateway Calidad (DQ Gate) & Regla Embarque",
    decisionKey: "DECISION_EXPORT_RELEASE_GATE",
    description:
      "Bloquea el avance si Data Quality Gate está en BLOCKED o falta aprobación obligatoria.",
  },
  {
    nodeId: "NODE_WAIT_CUSTOMS_RELEASE",
    sequenceOrder: 6,
    nodeType: "WAIT_FOR_DOMAIN_EVENT",
    label: "6. Despacho Aduanero & Levante",
    expectedEventCode: "CUSTOMS_RELEASED",
    description:
      "Espera levante aduanero (CUSTOMS_RELEASED) con gestión automática de Stop-Clock SLA.",
  },
  {
    nodeId: "NODE_END_CLOSURE_READY",
    sequenceOrder: 7,
    nodeType: "END_EVENT",
    label: "7. Entrega Final & Cierre Operativo",
    description:
      "Proceso completado y listo para liquidación financiera y cierre (ShipmentClosed).",
  },
];

export const CANONICAL_SEQUENCE_FLOWS: SequenceFlowDef[] = [
  {
    flowId: "FL-01",
    sourceNodeId: "NODE_START",
    targetNodeId: "NODE_DECISION_ASSIGN",
    isDefaultFlow: true,
  },
  {
    flowId: "FL-02",
    sourceNodeId: "NODE_DECISION_ASSIGN",
    targetNodeId: "NODE_WAIT_ROUTE_CARGO",
    isDefaultFlow: true,
  },
  {
    flowId: "FL-03",
    sourceNodeId: "NODE_WAIT_ROUTE_CARGO",
    targetNodeId: "NODE_WAIT_VGM_GATEIN",
    isDefaultFlow: true,
  },
  {
    flowId: "FL-04",
    sourceNodeId: "NODE_WAIT_VGM_GATEIN",
    targetNodeId: "NODE_GATEWAY_DQ_EXPORT",
    isDefaultFlow: true,
  },
  {
    flowId: "FL-05",
    sourceNodeId: "NODE_GATEWAY_DQ_EXPORT",
    targetNodeId: "NODE_WAIT_CUSTOMS_RELEASE",
    conditionExpression:
      "dataQualityGate != 'BLOCKED' && gateDecision != 'BLOCK_RELEASE'",
  },
  {
    flowId: "FL-06",
    sourceNodeId: "NODE_WAIT_CUSTOMS_RELEASE",
    targetNodeId: "NODE_END_CLOSURE_READY",
    isDefaultFlow: true,
  },
];

export async function ensureAutomationDefinitionsSeeded(): Promise<void> {
  await ensureScmFoundationTables();
  if (automationDefsSeeded) return;

  const now = new Date();

  // 1. Seed Decision Table #1: DECISION_OPERATIONAL_ASSIGNMENT (FIRST hit policy)
  const assignRows: DecisionRuleRow[] = [
    {
      rowId: "R-ASSIGN-01",
      priorityOrder: 1,
      conditions: { hasDangerousGoods: true },
      outputs: {
        assignedTeamId: "team_dg_hazmat_desk",
        assignedRole: "HAZMAT_IMO_SPECIALIST",
        priorityTier: "CRITICAL_VIP",
        mandatoryChecklistCode: "CHK_IMDG_IATA_DGR",
      },
      ruleAnnotation:
        "Mercancía Peligrosa (IMO/ADR/DGR) detectada: asignación obligatoria a mesa especialista HazMat.",
    },
    {
      rowId: "R-ASSIGN-02",
      priorityOrder: 2,
      conditions: { hasTemperatureControl: true },
      outputs: {
        assignedTeamId: "team_reefer_pharma_desk",
        assignedRole: "COLD_CHAIN_COORDINATOR",
        priorityTier: "HIGH_PRIORITY",
        mandatoryChecklistCode: "CHK_ATP_REEFER_PRECOOL",
      },
      ruleAnnotation:
        "Carga con control de temperatura activa: asignación a mesa Cold Chain & Reefer.",
    },
    {
      rowId: "R-ASSIGN-03",
      priorityOrder: 3,
      conditions: { serviceMode: "SEA", direction: "IMPORT" },
      outputs: {
        assignedTeamId: "team_ocean_import_bcn",
        assignedRole: "OCEAN_IMPORT_TRAFFIC",
        priorityTier: "STANDARD",
        mandatoryChecklistCode: "CHK_FCL_IMPORT_MANIFEST",
      },
      ruleAnnotation:
        "Tráfico Marítimo de Importación estándar asignado a Ocean Import Desk.",
    },
    {
      rowId: "R-ASSIGN-04",
      priorityOrder: 4,
      conditions: { serviceMode: "AIR" },
      outputs: {
        assignedTeamId: "team_airfreight_ops",
        assignedRole: "AIR_OPERATIONS_AGENT",
        priorityTier: "HIGH_PRIORITY",
        mandatoryChecklistCode: "CHK_AWB_SECURITY_SPX",
      },
      ruleAnnotation:
        "Tráfico Aéreo asignado a Airfreight Desk con control de seguridad SPX.",
    },
    {
      rowId: "R-ASSIGN-DEFAULT",
      priorityOrder: 99,
      conditions: {},
      outputs: {
        assignedTeamId: "team_multimodal_ops",
        assignedRole: "OPERATIONS_COORDINATOR",
        priorityTier: "STANDARD",
        mandatoryChecklistCode: "CHK_GENERAL_CARGO",
      },
      ruleAnnotation:
        "Regla fallback por defecto: coordinación operativa general multimodal.",
    },
  ];

  await db
    .insert(scmDecisionDefinitions)
    .values({
      id: "ddef_operational_assignment_v1",
      decisionKey: "DECISION_OPERATIONAL_ASSIGNMENT",
      title: "Matriz de Asignación de Equipo Operativo y Checklist",
      description:
        "Determina automáticamente el equipo propietario, rol especialista y checklist obligatorio según modo, dirección y naturaleza de la mercancía (DG / Reefer).",
      versionNumber: 1,
      status: "ACTIVE",
      hitPolicy: "FIRST",
      inputColumnsJson: JSON.stringify([
        { fieldName: "serviceMode", dataType: "ENUM" },
        { fieldName: "direction", dataType: "ENUM" },
        { fieldName: "hasDangerousGoods", dataType: "BOOLEAN" },
        { fieldName: "hasTemperatureControl", dataType: "BOOLEAN" },
      ]),
      outputColumnsJson: JSON.stringify([
        { fieldName: "assignedTeamId", dataType: "STRING" },
        { fieldName: "assignedRole", dataType: "STRING" },
        { fieldName: "priorityTier", dataType: "ENUM" },
        { fieldName: "mandatoryChecklistCode", dataType: "STRING" },
      ]),
      rulesRowsJson: JSON.stringify(assignRows),
      updatedAt: now,
    })
    .onConflictDoNothing();

  // 2. Seed Decision Table #2: DECISION_EXPORT_RELEASE_GATE (COLLECT hit policy)
  const gateRows: DecisionRuleRow[] = [
    {
      rowId: "R-GATE-01",
      priorityOrder: 1,
      conditions: { dataQualityGate: "BLOCKED" },
      outputs: {
        gateDecision: "BLOCK_RELEASE",
        requiredApproval: "DATA_QUALITY_REMEDIATION",
        reason:
          "Data Quality Gate en estado BLOCKED impide cruzar el Gateway de liberación.",
      },
      ruleAnnotation:
        "Bloqueo estricto si existen hallazgos BLOCKING en la evaluación de Data Quality.",
    },
    {
      rowId: "R-GATE-02",
      priorityOrder: 2,
      conditions: { vgmVerified: false },
      outputs: {
        gateDecision: "BLOCK_RELEASE",
        requiredApproval: "SOLAS_VGM_CERTIFICATION",
        reason:
          "Normativa SOLAS: prohibido autorizar embarque sin pesaje VGM verificado.",
      },
      ruleAnnotation:
        "Bloqueo normativo SOLAS por ausencia de certificación VGM.",
    },
    {
      rowId: "R-GATE-03",
      priorityOrder: 3,
      conditions: { hasDangerousGoods: true },
      outputs: {
        gateDecision: "REQUIRE_HAZMAT_SIGN_OFF",
        requiredApproval: "IMDG_DANGEROUS_GOODS_APPROVAL",
        reason:
          "Mercancía IMO declarada: exige validación de Declaración de Mercancías Peligrosas (DGD).",
      },
      ruleAnnotation:
        "Añade requisito de aprobación documental IMDG cuando el expediente contiene carga DG.",
    },
    {
      rowId: "R-GATE-04",
      priorityOrder: 4,
      conditions: { dataQualityGate: "PASSED", vgmVerified: true },
      outputs: {
        gateDecision: "ALLOW_RELEASE",
        requiredApproval: "AUTO_GREEN_GATEWAY",
        reason:
          "Calidad de datos al 100% y SOLAS VGM verificado: paso de Gateway autorizado.",
      },
      ruleAnnotation:
        "Autorización automática de Gateway cuando DQ Gate = PASSED y VGM = true.",
    },
  ];

  await db
    .insert(scmDecisionDefinitions)
    .values({
      id: "ddef_export_release_gate_v1",
      decisionKey: "DECISION_EXPORT_RELEASE_GATE",
      title: "Tabla de Decisión de Control de Gateway Operativo & Calidad",
      description:
        "Evalúa en modo COLLECT todos los requisitos normativos (Data Quality Gate, SOLAS VGM, Mercancías Peligrosas) antes de permitir el avance del Workflow.",
      versionNumber: 1,
      status: "ACTIVE",
      hitPolicy: "COLLECT",
      inputColumnsJson: JSON.stringify([
        { fieldName: "dataQualityGate", dataType: "ENUM" },
        { fieldName: "vgmVerified", dataType: "BOOLEAN" },
        { fieldName: "hasDangerousGoods", dataType: "BOOLEAN" },
        { fieldName: "incoterm", dataType: "STRING" },
      ]),
      outputColumnsJson: JSON.stringify([
        { fieldName: "gateDecision", dataType: "ENUM" },
        { fieldName: "requiredApproval", dataType: "STRING" },
        { fieldName: "reason", dataType: "STRING" },
      ]),
      rulesRowsJson: JSON.stringify(gateRows),
      updatedAt: now,
    })
    .onConflictDoNothing();

  // 3. Seed Canonical Workflow ProcessDefinition: PROCESS_FREIGHT_EXECUTION_V1
  await db
    .insert(scmWorkflowDefinitions)
    .values({
      id: "wfdef_freight_execution_v1",
      processKey: "PROCESS_FREIGHT_EXECUTION",
      versionNumber: 1,
      name: "Orquestación Estándar End-to-End de Expediente SCM (BPMN-like v1)",
      status: "ACTIVE",
      nodesJson: JSON.stringify(CANONICAL_WORKFLOW_NODES),
      sequenceFlowsJson: JSON.stringify(CANONICAL_SEQUENCE_FLOWS),
      createdAt: now,
    })
    .onConflictDoNothing();

  automationDefsSeeded = true;
}

function rowMatchesInputs(
  conditions: Record<string, any>,
  inputs: Record<string, any>,
): boolean {
  for (const [key, expectedVal] of Object.entries(conditions)) {
    if (expectedVal === "*" || expectedVal === undefined) continue;
    if (inputs[key] !== expectedVal) {
      return false;
    }
  }
  return true;
}

/**
 * Evaluates a versioned Decision Table (`DecisionDefinition`) deterministically
 * and writes an append-only `DecisionEvaluationRecord` for 100% Audit Explainability.
 */
export async function evaluateDecisionTable(
  input: {
    decisionKey: string;
    shipmentId: string;
    inputs: Record<string, any>;
    callerContext?: string;
    correlationId?: string;
  },
  actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
): Promise<DecisionEvaluationRecord> {
  await ensureAutomationDefinitionsSeeded();

  const defs = await db
    .select()
    .from(scmDecisionDefinitions)
    .where(eq(scmDecisionDefinitions.decisionKey, input.decisionKey))
    .limit(1);

  assertInvariant(
    defs.length > 0,
    "rules_decisions",
    "DECISION_DEFINITION_NOT_FOUND",
    `DecisionDefinition '${input.decisionKey}' not found`,
  );

  const def = defs[0];
  assertInvariant(
    def.status === "ACTIVE",
    "rules_decisions",
    "DECISION_DEFINITION_NOT_ACTIVE",
    `DecisionDefinition '${input.decisionKey}' is not ACTIVE`,
  );

  const rows: DecisionRuleRow[] = JSON.parse(def.rulesRowsJson);
  const sortedRows = [...rows].sort(
    (a, b) => a.priorityOrder - b.priorityOrder,
  );

  const matchedRows = sortedRows.filter((r) =>
    rowMatchesInputs(r.conditions, input.inputs),
  );

  assertInvariant(
    matchedRows.length > 0,
    "rules_decisions",
    "DECISION_NO_MATCHING_RULE_ROW",
    `No rule row matched in DecisionTable '${input.decisionKey}' for inputs ${JSON.stringify(input.inputs)}`,
  );

  const hitPolicy = def.hitPolicy as HitPolicy;
  const selectedRows =
    hitPolicy === "FIRST" || hitPolicy === "PRIORITY" || hitPolicy === "UNIQUE"
      ? [matchedRows[0]]
      : matchedRows; // COLLECT returns all matching rows

  let outputSnapshot: Record<string, any> = {};
  if (hitPolicy === "COLLECT") {
    const gateDecisions = selectedRows.map((r) => r.outputs.gateDecision);
    const overallGateDecision = gateDecisions.includes("BLOCK_RELEASE")
      ? "BLOCK_RELEASE"
      : gateDecisions.includes("REQUIRE_HAZMAT_SIGN_OFF")
        ? "REQUIRE_HAZMAT_SIGN_OFF"
        : "ALLOW_RELEASE";

    outputSnapshot = {
      overallGateDecision,
      requiredApprovals: selectedRows.map((r) => r.outputs.requiredApproval),
      reasons: selectedRows.map((r) => r.outputs.reason),
      collectedOutputs: selectedRows.map((r) => r.outputs),
    };
  } else {
    outputSnapshot = { ...selectedRows[0].outputs };
  }

  const evaluationId = `deval_${uuidv4()}`;
  const correlationId = input.correlationId || `corr_${uuidv4()}`;
  const evaluatedAt = new Date().toISOString();
  const matchedRowIds = selectedRows.map((r) => r.rowId);
  const ruleAnnotations = selectedRows.map((r) => r.ruleAnnotation);
  const callerContext = input.callerContext || "WORKFLOW_OR_MANUAL_INVOCATION";

  await db.insert(scmDecisionEvaluationLogs).values({
    evaluationId,
    decisionKey: def.decisionKey,
    versionNumber: def.versionNumber,
    shipmentId: input.shipmentId,
    inputsSnapshotJson: JSON.stringify(input.inputs),
    matchedRowIdsJson: JSON.stringify(matchedRowIds),
    ruleAnnotationsJson: JSON.stringify(ruleAnnotations),
    outputSnapshotJson: JSON.stringify(outputSnapshot),
    callerContext,
    correlationId,
    evaluatedAt,
  });

  const record: DecisionEvaluationRecord = {
    evaluationId,
    decisionKey: def.decisionKey,
    versionNumber: def.versionNumber,
    shipmentId: input.shipmentId,
    inputsSnapshot: input.inputs,
    matchedRowIds,
    ruleAnnotations,
    outputSnapshot,
    callerContext,
    correlationId,
    evaluatedAt,
  };

  await outboxBus.enqueueEvents([
    {
      eventId: `evt_${uuidv4()}`,
      eventType: "rules_decisions.DecisionEvaluated.v1",
      schemaVersion: 1,
      producerContext: "rules_decisions",
      aggregateType: "DecisionEvaluationRecord",
      aggregateId: evaluationId,
      aggregateVersion: 1,
      correlationId,
      causationId: correlationId,
      actor,
      occurredAt: evaluatedAt,
      payload: record,
    },
  ]);

  return record;
}

export async function publishDecisionTableVersion(
  input: {
    decisionKey: string;
    title: string;
    description?: string;
    hitPolicy: HitPolicy;
    rulesRows: DecisionRuleRow[];
  },
  actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
) {
  await ensureAutomationDefinitionsSeeded();

  assertInvariant(
    Array.isArray(input.rulesRows) && input.rulesRows.length > 0,
    "rules_decisions",
    "DECISION_EMPTY_RULES_ROWS",
    "A published DecisionDefinition must contain at least one rule row",
  );

  assertInvariant(
    ["UNIQUE", "FIRST", "PRIORITY", "COLLECT"].includes(input.hitPolicy),
    "rules_decisions",
    "DECISION_INVALID_HIT_POLICY",
    `Unsupported hitPolicy '${input.hitPolicy}'`,
  );

  const existing = await db
    .select()
    .from(scmDecisionDefinitions)
    .where(eq(scmDecisionDefinitions.decisionKey, input.decisionKey))
    .limit(1);

  const now = new Date();
  let nextVersion = 1;

  if (existing.length > 0) {
    nextVersion = existing[0].versionNumber + 1;
    await db
      .update(scmDecisionDefinitions)
      .set({
        title: input.title,
        description: input.description || existing[0].description,
        versionNumber: nextVersion,
        hitPolicy: input.hitPolicy,
        rulesRowsJson: JSON.stringify(input.rulesRows),
        updatedAt: now,
      })
      .where(eq(scmDecisionDefinitions.decisionKey, input.decisionKey));
  } else {
    await db.insert(scmDecisionDefinitions).values({
      id: `ddef_${uuidv4()}`,
      decisionKey: input.decisionKey,
      title: input.title,
      description: input.description || "",
      versionNumber: 1,
      status: "ACTIVE",
      hitPolicy: input.hitPolicy,
      inputColumnsJson: "[]",
      outputColumnsJson: "[]",
      rulesRowsJson: JSON.stringify(input.rulesRows),
      updatedAt: now,
    });
  }

  return {
    decisionKey: input.decisionKey,
    versionNumber: nextVersion,
    hitPolicy: input.hitPolicy,
    rulesCount: input.rulesRows.length,
    updatedBy: actor.userId,
  };
}

export async function listDecisionDefinitions() {
  await ensureAutomationDefinitionsSeeded();
  const rows = await db.select().from(scmDecisionDefinitions);
  return rows.map((r) => ({
    id: r.id,
    decisionKey: r.decisionKey,
    title: r.title,
    description: r.description,
    versionNumber: r.versionNumber,
    status: r.status,
    hitPolicy: r.hitPolicy,
    inputColumns: JSON.parse(r.inputColumnsJson),
    outputColumns: JSON.parse(r.outputColumnsJson),
    rulesRows: JSON.parse(r.rulesRowsJson),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function getDecisionEvaluationsForShipment(
  shipmentId: string,
): Promise<DecisionEvaluationRecord[]> {
  await ensureAutomationDefinitionsSeeded();
  const rows = await db
    .select()
    .from(scmDecisionEvaluationLogs)
    .where(eq(scmDecisionEvaluationLogs.shipmentId, shipmentId))
    .orderBy(desc(scmDecisionEvaluationLogs.evaluatedAt))
    .limit(25);

  return rows.map((r) => ({
    evaluationId: r.evaluationId,
    decisionKey: r.decisionKey,
    versionNumber: r.versionNumber,
    shipmentId: r.shipmentId,
    inputsSnapshot: JSON.parse(r.inputsSnapshotJson),
    matchedRowIds: JSON.parse(r.matchedRowIdsJson),
    ruleAnnotations: JSON.parse(r.ruleAnnotationsJson),
    outputSnapshot: JSON.parse(r.outputSnapshotJson),
    callerContext: r.callerContext,
    correlationId: r.correlationId,
    evaluatedAt: r.evaluatedAt,
  }));
}

/**
 * Initializes a BPMN-like `ProcessInstance` for a Shipment, executes NODE_START
 * and NODE_DECISION_ASSIGN (`DECISION_OPERATIONAL_ASSIGNMENT`), and parks the active
 * token at `NODE_WAIT_ROUTE_CARGO`.
 */
export async function initializeWorkflowForShipment(
  params: {
    shipmentId: string;
    referenceNumber: string;
    serviceMode: string;
    direction: string;
    incoterm: string;
    organizationId: string;
    branchId: string;
    hasDangerousGoods?: boolean;
    hasTemperatureControl?: boolean;
  },
  actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
): Promise<WorkflowStateReadModel> {
  await ensureAutomationDefinitionsSeeded();

  const existing = await db
    .select()
    .from(scmWorkflowInstances)
    .where(eq(scmWorkflowInstances.shipmentId, params.shipmentId))
    .limit(1);

  if (existing.length > 0) {
    return buildWorkflowStateReadModel(existing[0]);
  }

  // Evaluate Decision Table #1 (`DECISION_OPERATIONAL_ASSIGNMENT`)
  const evalRecord = await evaluateDecisionTable(
    {
      decisionKey: "DECISION_OPERATIONAL_ASSIGNMENT",
      shipmentId: params.shipmentId,
      inputs: {
        serviceMode: params.serviceMode,
        direction: params.direction,
        hasDangerousGoods: Boolean(params.hasDangerousGoods),
        hasTemperatureControl: Boolean(params.hasTemperatureControl),
      },
      callerContext: "workflow_runtime.NODE_DECISION_ASSIGN",
    },
    actor,
  );

  // Apply assignedTeamId to the Shipment coordinator record if matched
  if (evalRecord.outputSnapshot.assignedTeamId) {
    await db
      .update(scmShipments)
      .set({
        teamId: evalRecord.outputSnapshot.assignedTeamId,
        updatedAt: new Date(),
      })
      .where(eq(scmShipments.id, params.shipmentId));
  }

  const instanceId = `wfi_${uuidv4()}`;
  const now = new Date();
  const completedNodeIds = ["NODE_START", "NODE_DECISION_ASSIGN"];
  const currentNodeId = "NODE_WAIT_ROUTE_CARGO";

  const variablesSnapshot = {
    serviceMode: params.serviceMode,
    direction: params.direction,
    incoterm: params.incoterm,
    hasDangerousGoods: Boolean(params.hasDangerousGoods),
    hasTemperatureControl: Boolean(params.hasTemperatureControl),
    assignedTeamId: evalRecord.outputSnapshot.assignedTeamId,
    assignedRole: evalRecord.outputSnapshot.assignedRole,
    mandatoryChecklistCode: evalRecord.outputSnapshot.mandatoryChecklistCode,
    routePublished: false,
    cargoDeclared: false,
    vgmVerified: false,
    dataQualityGate: "PASSED",
    customsReleased: false,
  };

  await db
    .insert(scmWorkflowInstances)
    .values({
      id: instanceId,
      processDefinitionId: "wfdef_freight_execution_v1",
      processKey: "PROCESS_FREIGHT_EXECUTION",
      versionNumber: 1,
      shipmentId: params.shipmentId,
      referenceNumber: params.referenceNumber,
      state: "RUNNING",
      currentNodeId,
      activeTokensJson: JSON.stringify([
        {
          tokenId: `tok_${uuidv4()}`,
          nodeId: currentNodeId,
          state: "ACTIVE",
          enteredAt: now.toISOString(),
        },
      ]),
      completedNodeIdsJson: JSON.stringify(completedNodeIds),
      variablesSnapshotJson: JSON.stringify(variablesSnapshot),
      blockingReason: null,
      organizationId: params.organizationId,
      branchId: params.branchId,
      version: 1,
      startedAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();

  const createdRow = (
    await db
      .select()
      .from(scmWorkflowInstances)
      .where(eq(scmWorkflowInstances.shipmentId, params.shipmentId))
      .limit(1)
  )[0];

  return buildWorkflowStateReadModel(createdRow);
}

export function buildWorkflowStateReadModel(
  row: typeof scmWorkflowInstances.$inferSelect,
): WorkflowStateReadModel {
  const completedIds: string[] = JSON.parse(row.completedNodeIdsJson || "[]");
  const variables: Record<string, any> = JSON.parse(
    row.variablesSnapshotJson || "{}",
  );

  const nodes = CANONICAL_WORKFLOW_NODES.map((n) => {
    let status: "COMPLETED" | "ACTIVE" | "BLOCKED" | "PENDING" = "PENDING";
    if (completedIds.includes(n.nodeId)) {
      status = "COMPLETED";
    } else if (row.currentNodeId === n.nodeId) {
      status =
        row.state === "BLOCKED_AT_GATEWAY"
          ? "BLOCKED"
          : row.state === "COMPLETED"
            ? "COMPLETED"
            : "ACTIVE";
    }
    return {
      nodeId: n.nodeId,
      sequenceOrder: n.sequenceOrder,
      nodeType: n.nodeType,
      label: n.label,
      description: n.description,
      decisionKey: n.decisionKey,
      status,
    };
  });

  const currentNode =
    CANONICAL_WORKFLOW_NODES.find((n) => n.nodeId === row.currentNodeId) ||
    CANONICAL_WORKFLOW_NODES[0];

  const availableUserCommands: string[] = ["EvaluateDecisionTables"];
  if (row.state === "SUSPENDED") {
    availableUserCommands.push("ResumeWorkflow");
  } else if (row.state !== "COMPLETED") {
    availableUserCommands.push("AdvanceWorkflowToken", "SuspendWorkflow");
  }

  return {
    processInstanceId: row.id,
    processKey: row.processKey,
    versionNumber: row.versionNumber,
    state: row.state as any,
    currentNodeId: row.currentNodeId,
    currentNodeLabel: currentNode.label,
    blockingReason: row.blockingReason,
    nodes,
    availableUserCommands,
    variablesSnapshot: variables,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getWorkflowStateForShipment(
  shipmentId: string,
): Promise<WorkflowStateReadModel | null> {
  await ensureAutomationDefinitionsSeeded();

  const rows = await db
    .select()
    .from(scmWorkflowInstances)
    .where(eq(scmWorkflowInstances.shipmentId, shipmentId))
    .limit(1);

  if (rows.length > 0) {
    return buildWorkflowStateReadModel(rows[0]);
  }

  // Auto-initialize if the shipment exists in shipment_exec_shipments
  const shpRows = await db
    .select()
    .from(scmShipments)
    .where(eq(scmShipments.id, shipmentId))
    .limit(1);

  if (shpRows.length === 0) return null;
  const shp = shpRows[0];

  return initializeWorkflowForShipment({
    shipmentId: shp.id,
    referenceNumber: shp.shipmentReference,
    serviceMode: shp.serviceMode,
    direction: shp.direction,
    incoterm: shp.incoterm,
    organizationId: shp.organizationId,
    branchId: shp.branchId,
  });
}

/**
 * Suspends or Resumes a `ProcessInstance`.
 * Invariant: A SUSPENDED process instance freezes all tokens until resumed.
 */
export async function toggleWorkflowInstanceState(
  input: {
    shipmentId: string;
    action: "SUSPEND" | "RESUME";
    reason?: string;
  },
  actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
): Promise<WorkflowStateReadModel> {
  await ensureAutomationDefinitionsSeeded();
  await getWorkflowStateForShipment(input.shipmentId);

  const rows = await db
    .select()
    .from(scmWorkflowInstances)
    .where(eq(scmWorkflowInstances.shipmentId, input.shipmentId))
    .limit(1);

  assertInvariant(
    rows.length > 0,
    "workflow_runtime",
    "WORKFLOW_INSTANCE_NOT_FOUND",
    `Workflow instance for shipment '${input.shipmentId}' not found`,
  );

  const instance = rows[0];
  const nextState = input.action === "SUSPEND" ? "SUSPENDED" : "RUNNING";

  await db
    .update(scmWorkflowInstances)
    .set({
      state: nextState,
      blockingReason:
        input.action === "SUSPEND"
          ? input.reason || "Suspendido manualmente por operador"
          : null,
      version: instance.version + 1,
      updatedAt: new Date(),
    })
    .where(eq(scmWorkflowInstances.id, instance.id));

  await outboxBus.enqueueEvents([
    {
      eventId: `evt_${uuidv4()}`,
      eventType: "workflow_runtime.ProcessStateChanged.v1",
      schemaVersion: 1,
      producerContext: "workflow_runtime",
      aggregateType: "ProcessInstance",
      aggregateId: instance.id,
      aggregateVersion: instance.version + 1,
      correlationId: `corr_${uuidv4()}`,
      causationId: `cmd_wf_${input.action.toLowerCase()}`,
      actor,
      occurredAt: new Date().toISOString(),
      payload: {
        processInstanceId: instance.id,
        shipmentId: input.shipmentId,
        previousState: instance.state,
        newState: nextState,
        reason: input.reason || null,
      },
    },
  ]);

  await outboxBus.relayPendingEvents();

  const updated = (
    await db
      .select()
      .from(scmWorkflowInstances)
      .where(eq(scmWorkflowInstances.id, instance.id))
      .limit(1)
  )[0];

  return buildWorkflowStateReadModel(updated);
}

/**
 * Evaluates and advances the active token of a Shipment's `ProcessInstance`.
 * Enforces:
 * 1. Invariant `WORKFLOW_INSTANCE_SUSPENDED` when state === "SUSPENDED".
 * 2. Gateway Guard `WORKFLOW_GATEWAY_BLOCKED_BY_DQ_OR_RULE` at `NODE_GATEWAY_DQ_EXPORT`
 *    when Data Quality Gate === "BLOCKED" or `DECISION_EXPORT_RELEASE_GATE` returns `BLOCK_RELEASE`.
 */
export async function advanceWorkflowTokenForShipment(
  input: {
    shipmentId: string;
    triggerReason?: string;
    strictGateAssertion?: boolean;
  },
  actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
): Promise<{
  workflowState: WorkflowStateReadModel;
  latestEvaluations: DecisionEvaluationRecord[];
}> {
  await ensureAutomationDefinitionsSeeded();
  await getWorkflowStateForShipment(input.shipmentId);

  const [instanceRows, shpRows, cargoRows, equipRows, dqRows, msRows] =
    await Promise.all([
      db
        .select()
        .from(scmWorkflowInstances)
        .where(eq(scmWorkflowInstances.shipmentId, input.shipmentId))
        .limit(1),
      db
        .select()
        .from(scmShipments)
        .where(eq(scmShipments.id, input.shipmentId))
        .limit(1),
      db
        .select()
        .from(scmCargos)
        .where(eq(scmCargos.shipmentId, input.shipmentId)),
      db
        .select()
        .from(scmEquipmentAssignments)
        .where(eq(scmEquipmentAssignments.shipmentId, input.shipmentId)),
      db
        .select()
        .from(scmQualityAssessments)
        .where(eq(scmQualityAssessments.shipmentId, input.shipmentId))
        .limit(1),
      db
        .select()
        .from(scmMilestonePlans)
        .where(eq(scmMilestonePlans.shipmentId, input.shipmentId))
        .limit(1),
    ]);

  assertInvariant(
    instanceRows.length > 0 && shpRows.length > 0,
    "workflow_runtime",
    "WORKFLOW_INSTANCE_NOT_FOUND",
    `ProcessInstance for shipment '${input.shipmentId}' not found`,
  );

  const instance = instanceRows[0];
  const shp = shpRows[0];

  if (input.strictGateAssertion) {
    assertInvariant(
      instance.state !== "SUSPENDED",
      "workflow_runtime",
      "WORKFLOW_INSTANCE_SUSPENDED",
      `ProcessInstance '${instance.id}' is SUSPENDED and cannot advance tokens until resumed`,
    );
  } else if (instance.state === "SUSPENDED") {
    return {
      workflowState: buildWorkflowStateReadModel(instance),
      latestEvaluations: await getDecisionEvaluationsForShipment(
        input.shipmentId,
      ),
    };
  }

  const completedIds: string[] = JSON.parse(
    instance.completedNodeIdsJson || "[]",
  );
  const variables: Record<string, any> = JSON.parse(
    instance.variablesSnapshotJson || "{}",
  );

  const hasDG = cargoRows.some((c) => Boolean(c.hasDangerousGoods));
  const hasTemp = cargoRows.some((c) => Boolean(c.hasTemperatureControl));
  const hasCargo = cargoRows.length > 0;
  const hasRoute = msRows.length > 0;

  const milestones: any[] =
    msRows.length > 0 ? JSON.parse(msRows[0].milestonesJson) : [];
  const vgmMilestoneDone = milestones.some(
    (m) => m.milestoneCode === "VGM_CUTOFF" && m.status === "COMPLETED",
  );
  const vgmFromEquip = equipRows.some((e) => (e.vgmWeightKg || 0) > 0);
  const vgmVerified = vgmMilestoneDone || vgmFromEquip;

  const customsReleased = milestones.some(
    (m) => m.milestoneCode === "CUSTOMS_CLEARANCE" && m.status === "COMPLETED",
  );

  const dqGateStatus = dqRows.length > 0 ? dqRows[0].gateStatus : "PASSED";

  variables.hasDangerousGoods = hasDG;
  variables.hasTemperatureControl = hasTemp;
  variables.routePublished = hasRoute;
  variables.cargoDeclared = hasCargo;
  variables.vgmVerified = vgmVerified;
  variables.dataQualityGate = dqGateStatus;
  variables.customsReleased = customsReleased;

  // 1. Re-evaluate DECISION_OPERATIONAL_ASSIGNMENT if cargo properties changed
  const assignEval = await evaluateDecisionTable(
    {
      decisionKey: "DECISION_OPERATIONAL_ASSIGNMENT",
      shipmentId: input.shipmentId,
      inputs: {
        serviceMode: shp.serviceMode,
        direction: shp.direction,
        hasDangerousGoods: hasDG,
        hasTemperatureControl: hasTemp,
      },
      callerContext:
        input.triggerReason || "workflow_runtime.TokenEvaluationStep",
    },
    actor,
  );

  variables.assignedTeamId = assignEval.outputSnapshot.assignedTeamId;
  variables.assignedRole = assignEval.outputSnapshot.assignedRole;
  variables.mandatoryChecklistCode =
    assignEval.outputSnapshot.mandatoryChecklistCode;

  if (
    assignEval.outputSnapshot.assignedTeamId &&
    assignEval.outputSnapshot.assignedTeamId !== shp.teamId
  ) {
    await db
      .update(scmShipments)
      .set({
        teamId: assignEval.outputSnapshot.assignedTeamId,
        updatedAt: new Date(),
      })
      .where(eq(scmShipments.id, shp.id));
  }

  const markCompleted = (nodeId: string) => {
    if (!completedIds.includes(nodeId)) {
      completedIds.push(nodeId);
    }
  };

  markCompleted("NODE_START");
  markCompleted("NODE_DECISION_ASSIGN");

  let nextNodeId = instance.currentNodeId;
  let nextState:
    | "RUNNING"
    | "SUSPENDED"
    | "BLOCKED_AT_GATEWAY"
    | "COMPLETED"
    | "TERMINATED" = "RUNNING";
  let blockingReason: string | null = null;

  // Step through the graph deterministically based on domain state & gateway rules
  if (hasRoute && hasCargo) {
    markCompleted("NODE_WAIT_ROUTE_CARGO");
    nextNodeId = "NODE_WAIT_VGM_GATEIN";
  } else {
    nextNodeId = "NODE_WAIT_ROUTE_CARGO";
  }

  if (
    (completedIds.includes("NODE_WAIT_ROUTE_CARGO") && vgmVerified) ||
    input.strictGateAssertion
  ) {
    if (vgmVerified) {
      markCompleted("NODE_WAIT_VGM_GATEIN");
    }
    nextNodeId = "NODE_GATEWAY_DQ_EXPORT";

    // Evaluate Decision Table #2 (`DECISION_EXPORT_RELEASE_GATE`) at Gateway
    const gateEval = await evaluateDecisionTable(
      {
        decisionKey: "DECISION_EXPORT_RELEASE_GATE",
        shipmentId: input.shipmentId,
        inputs: {
          dataQualityGate: dqGateStatus,
          vgmVerified,
          hasDangerousGoods: hasDG,
          incoterm: shp.incoterm,
        },
        callerContext: "workflow_runtime.NODE_GATEWAY_DQ_EXPORT",
      },
      actor,
    );

    const overallDecision = gateEval.outputSnapshot.overallGateDecision;
    variables.lastGatewayDecision = overallDecision;
    variables.requiredApprovals = gateEval.outputSnapshot.requiredApprovals;

    if (dqGateStatus === "BLOCKED" || overallDecision === "BLOCK_RELEASE") {
      nextState = "BLOCKED_AT_GATEWAY";
      const reasons: string[] = gateEval.outputSnapshot.reasons || [];
      blockingReason =
        reasons[0] ||
        `Gateway bloqueado por DataQuality (${dqGateStatus}) o falta de VGM.`;

      await db
        .update(scmWorkflowInstances)
        .set({
          state: nextState,
          currentNodeId: "NODE_GATEWAY_DQ_EXPORT",
          completedNodeIdsJson: JSON.stringify(completedIds),
          variablesSnapshotJson: JSON.stringify(variables),
          blockingReason,
          version: instance.version + 1,
          updatedAt: new Date(),
        })
        .where(eq(scmWorkflowInstances.id, instance.id));

      if (input.strictGateAssertion) {
        assertInvariant(
          false,
          "workflow_runtime",
          "WORKFLOW_GATEWAY_BLOCKED_BY_DQ_OR_RULE",
          blockingReason,
        );
      }
    } else {
      // Gateway passed!
      markCompleted("NODE_GATEWAY_DQ_EXPORT");
      nextNodeId = "NODE_WAIT_CUSTOMS_RELEASE";
      nextState = "RUNNING";
      blockingReason = null;
    }
  }

  if (
    completedIds.includes("NODE_GATEWAY_DQ_EXPORT") &&
    (customsReleased || shp.closureState === "CLOSED")
  ) {
    markCompleted("NODE_WAIT_CUSTOMS_RELEASE");
    markCompleted("NODE_END_CLOSURE_READY");
    nextNodeId = "NODE_END_CLOSURE_READY";
    nextState = "COMPLETED";
  }

  const now = new Date();
  await db
    .update(scmWorkflowInstances)
    .set({
      state: nextState,
      currentNodeId: nextNodeId,
      activeTokensJson: JSON.stringify([
        {
          tokenId: `tok_${uuidv4()}`,
          nodeId: nextNodeId,
          state: nextState === "COMPLETED" ? "COMPLETED" : "ACTIVE",
          enteredAt: now.toISOString(),
        },
      ]),
      completedNodeIdsJson: JSON.stringify(completedIds),
      variablesSnapshotJson: JSON.stringify(variables),
      blockingReason,
      version: instance.version + 1,
      updatedAt: now,
      completedAt: nextState === "COMPLETED" ? now : null,
    })
    .where(eq(scmWorkflowInstances.id, instance.id));

  await outboxBus.enqueueEvents([
    {
      eventId: `evt_${uuidv4()}`,
      eventType: "workflow_runtime.WorkflowTokenAdvanced.v1",
      schemaVersion: 1,
      producerContext: "workflow_runtime",
      aggregateType: "ProcessInstance",
      aggregateId: instance.id,
      aggregateVersion: instance.version + 1,
      correlationId: `corr_${uuidv4()}`,
      causationId: input.triggerReason || "workflow_advance",
      actor,
      occurredAt: now.toISOString(),
      payload: {
        processInstanceId: instance.id,
        shipmentId: input.shipmentId,
        currentNodeId: nextNodeId,
        state: nextState,
        blockingReason,
        completedNodeIds: completedIds,
      },
    },
  ]);

  const updatedRow = (
    await db
      .select()
      .from(scmWorkflowInstances)
      .where(eq(scmWorkflowInstances.id, instance.id))
      .limit(1)
  )[0];

  return {
    workflowState: buildWorkflowStateReadModel(updatedRow),
    latestEvaluations: await getDecisionEvaluationsForShipment(
      input.shipmentId,
    ),
  };
}

export function registerAutomationSubscribers(): void {
  if (automationSubscribersRegistered) return;

  // 1. On ShipmentCreated -> Initialize ProcessInstance and evaluate DECISION_OPERATIONAL_ASSIGNMENT
  outboxBus.subscribe(
    "shipment_execution.ShipmentCreated.v1",
    "workflow_runtime.OnShipmentCreated",
    async (event) => {
      const p = event.payload;
      await initializeWorkflowForShipment(
        {
          shipmentId: p.shipmentId,
          referenceNumber: p.shipmentReference,
          serviceMode: p.serviceMode,
          direction: p.direction,
          incoterm: p.incoterm,
          organizationId: p.organizationId,
          branchId: p.branchId,
        },
        event.actor,
      );
    },
  );

  // 2. On RouteVersionPublished -> Advance workflow token if ready
  outboxBus.subscribe(
    "transport_planning.RouteVersionPublished.v1",
    "workflow_runtime.OnRouteVersionPublished",
    async (event) => {
      const p = event.payload;
      await advanceWorkflowTokenForShipment(
        {
          shipmentId: p.shipmentId,
          triggerReason: "transport_planning.RouteVersionPublished.v1",
        },
        event.actor,
      );
    },
  );

  // 3. On CargoDeclared -> Re-evaluate assignment rules (DG/Reefer) & advance workflow token
  outboxBus.subscribe(
    "cargo_equipment.CargoDeclared.v1",
    "workflow_runtime.OnCargoDeclared",
    async (event) => {
      const p = event.payload;
      await advanceWorkflowTokenForShipment(
        {
          shipmentId: p.shipmentId,
          triggerReason: "cargo_equipment.CargoDeclared.v1",
        },
        event.actor,
      );
    },
  );

  // 4. On EquipmentAssigned -> Re-evaluate SOLAS VGM & gateway readiness
  outboxBus.subscribe(
    "cargo_equipment.EquipmentAssigned.v1",
    "workflow_runtime.OnEquipmentAssigned",
    async (event) => {
      const p = event.payload;
      await advanceWorkflowTokenForShipment(
        {
          shipmentId: p.shipmentId,
          triggerReason: "cargo_equipment.EquipmentAssigned.v1",
        },
        event.actor,
      );
    },
  );

  // 5. On TransportEventReceived -> Advance workflow on VGM_VERIFIED or CUSTOMS_RELEASED
  outboxBus.subscribe(
    "tracking_events.TransportEventReceived.v1",
    "workflow_runtime.OnTransportEventReceived",
    async (event) => {
      const p = event.payload;
      await advanceWorkflowTokenForShipment(
        {
          shipmentId: p.shipmentId,
          triggerReason: `tracking_events.${p.eventCode}`,
        },
        event.actor,
      );
    },
  );

  // 6. On QualityAssessmentCompleted -> Block or unblock NODE_GATEWAY_DQ_EXPORT reactively
  outboxBus.subscribe(
    "data_quality.QualityAssessmentCompleted.v1",
    "workflow_runtime.OnQualityAssessmentCompleted",
    async (event) => {
      const p = event.payload;
      await advanceWorkflowTokenForShipment(
        {
          shipmentId: p.shipmentId,
          triggerReason: `data_quality.QualityAssessmentCompleted.${p.activeStage}`,
        },
        event.actor,
      );
    },
  );

  // 7. On ShipmentClosed -> Complete ProcessInstance
  outboxBus.subscribe(
    "shipment_execution.ShipmentClosed.v1",
    "workflow_runtime.OnShipmentClosed",
    async (event) => {
      const p = event.payload;
      await advanceWorkflowTokenForShipment(
        {
          shipmentId: p.shipmentId,
          triggerReason: "shipment_execution.ShipmentClosed.v1",
        },
        event.actor,
      );
    },
  );

  automationSubscribersRegistered = true;
}
