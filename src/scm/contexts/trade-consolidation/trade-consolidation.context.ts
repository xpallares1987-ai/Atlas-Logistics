import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { eq, desc } from "drizzle-orm";
import { db } from "../../../db/index.js";
import {
  scmConsolidations,
  scmDocuments,
  scmCustomsCases,
  scmShipments,
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
import { ingestOperationalTrackingEvent } from "../tracking-events/tracking-events.context.js";

// ============================================================================
// 09. CONSOLIDATION BOUNDED CONTEXT (Many-to-Many House <-> Master)
// ============================================================================

export interface ConsolidationMember {
  membershipId: string;
  shipmentId: string;
  shipmentReference: string;
  transportLegSequenceNo: number;
  houseDocumentNumber: string;
  allocatedPackages: number;
  allocatedWeightKg: number;
  allocatedVolumeCbm: number;
  stuffingStatus: "PLANNED" | "STUFFED" | "UNSTUFFED";
  joinedAt: string;
}

export interface ConsolidationReadModel {
  consolidationId: string;
  consolidationReference: string;
  consolidationType:
    "LCL_CONSOLE" | "AIR_CONSOLE" | "ROAD_GROUPAGE" | "BUYERS_CONSOLIDATION";
  mode: string;
  originLocode: string;
  destinationLocode: string;
  carrierName: string;
  vesselOrFlight?: string | null;
  voyageNumber?: string | null;
  masterDocumentNumber: string;
  maxCapacityWeightKg: number;
  maxCapacityVolumeCbm: number;
  allocatedWeightKg: number;
  allocatedVolumeCbm: number;
  weightUtilizationPercent: number;
  volumeUtilizationPercent: number;
  status: string;
  members: ConsolidationMember[];
  equipmentIds: string[];
  updatedAt: string;
}

function mapConsolidationRow(
  row: typeof scmConsolidations.$inferSelect,
): ConsolidationReadModel {
  const members: ConsolidationMember[] = JSON.parse(row.membersJson || "[]");
  const equipmentIds: string[] = JSON.parse(row.equipmentIdsJson || "[]");
  const weightUtilizationPercent =
    row.maxCapacityWeightKg > 0
      ? Math.round((row.allocatedWeightKg / row.maxCapacityWeightKg) * 100)
      : 0;
  const volumeUtilizationPercent =
    row.maxCapacityVolumeCbm > 0
      ? Math.round((row.allocatedVolumeCbm / row.maxCapacityVolumeCbm) * 100)
      : 0;

  return {
    consolidationId: row.id,
    consolidationReference: row.consolidationReference,
    consolidationType: row.consolidationType as any,
    mode: row.mode,
    originLocode: row.originLocode,
    destinationLocode: row.destinationLocode,
    carrierName: row.carrierName,
    vesselOrFlight: row.vesselOrFlight,
    voyageNumber: row.voyageNumber,
    masterDocumentNumber: row.masterDocumentNumber,
    maxCapacityWeightKg: row.maxCapacityWeightKg,
    maxCapacityVolumeCbm: row.maxCapacityVolumeCbm,
    allocatedWeightKg: row.allocatedWeightKg,
    allocatedVolumeCbm: row.allocatedVolumeCbm,
    weightUtilizationPercent,
    volumeUtilizationPercent,
    status: row.status,
    members,
    equipmentIds,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function createConsolidation(
  input: {
    consolidationReference?: string;
    consolidationType?:
      "LCL_CONSOLE" | "AIR_CONSOLE" | "ROAD_GROUPAGE" | "BUYERS_CONSOLIDATION";
    mode: string;
    originLocode: string;
    destinationLocode: string;
    carrierName: string;
    vesselOrFlight?: string;
    voyageNumber?: string;
    masterDocumentNumber: string;
    maxCapacityWeightKg?: number;
    maxCapacityVolumeCbm?: number;
    equipmentIds?: string[];
  },
  actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
): Promise<ConsolidationReadModel> {
  await ensureScmFoundationTables();

  const maxWeight = input.maxCapacityWeightKg ?? 26000;
  const maxVolume = input.maxCapacityVolumeCbm ?? 68;

  assertInvariant(
    maxWeight > 0 && maxVolume > 0,
    "consolidation",
    "CONSOLIDATION_INVALID_CAPACITY",
    "Consolidation maxCapacityWeightKg and maxCapacityVolumeCbm must be > 0",
  );

  assertInvariant(
    Boolean(input.originLocode) &&
      Boolean(input.destinationLocode) &&
      input.originLocode !== input.destinationLocode,
    "consolidation",
    "CONSOLIDATION_INVALID_CORRIDOR",
    "Consolidation requires distinct originLocode and destinationLocode",
  );

  const id = `cns_${uuidv4()}`;
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const consolidationReference =
    input.consolidationReference || `CNS-2026-${randomSuffix}`;
  const now = new Date();

  await db.insert(scmConsolidations).values({
    id,
    consolidationReference,
    consolidationType: input.consolidationType || "LCL_CONSOLE",
    mode: input.mode,
    originLocode: input.originLocode,
    destinationLocode: input.destinationLocode,
    carrierName: input.carrierName,
    vesselOrFlight: input.vesselOrFlight || null,
    voyageNumber: input.voyageNumber || null,
    masterDocumentNumber: input.masterDocumentNumber,
    maxCapacityWeightKg: maxWeight,
    maxCapacityVolumeCbm: maxVolume,
    allocatedWeightKg: 0,
    allocatedVolumeCbm: 0,
    status: "OPEN_FOR_STUFFING",
    membersJson: "[]",
    equipmentIdsJson: JSON.stringify(input.equipmentIds || []),
    organizationId: actor.organizationId,
    branchId: actor.branchId,
    version: 1,
    createdAt: now,
    updatedAt: now,
  });

  const row = (
    await db
      .select()
      .from(scmConsolidations)
      .where(eq(scmConsolidations.id, id))
      .limit(1)
  )[0];

  const model = mapConsolidationRow(row);

  await outboxBus.enqueueEvents([
    {
      eventId: `evt_${uuidv4()}`,
      eventType: "consolidation.ConsolidationCreated.v1",
      schemaVersion: 1,
      producerContext: "consolidation",
      aggregateType: "Consolidation",
      aggregateId: id,
      aggregateVersion: 1,
      correlationId: `corr_${uuidv4()}`,
      causationId: `cmd_create_consolidation`,
      actor,
      occurredAt: now.toISOString(),
      payload: model,
    },
  ]);

  await outboxBus.relayPendingEvents();
  return model;
}

export async function addShipmentToConsolidation(
  input: {
    consolidationId: string;
    shipmentId: string;
    transportLegSequenceNo?: number;
    legMode?: string;
    legOriginLocode?: string;
    legDestinationLocode?: string;
    houseDocumentNumber: string;
    allocatedPackages: number;
    allocatedWeightKg: number;
    allocatedVolumeCbm: number;
  },
  actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
): Promise<ConsolidationReadModel> {
  await ensureScmFoundationTables();

  const [cnsRows, shpRows] = await Promise.all([
    db
      .select()
      .from(scmConsolidations)
      .where(eq(scmConsolidations.id, input.consolidationId))
      .limit(1),
    db
      .select()
      .from(scmShipments)
      .where(eq(scmShipments.id, input.shipmentId))
      .limit(1),
  ]);

  assertInvariant(
    cnsRows.length > 0,
    "consolidation",
    "CONSOLIDATION_NOT_FOUND",
    `Consolidation '${input.consolidationId}' not found`,
  );
  assertInvariant(
    shpRows.length > 0,
    "consolidation",
    "SHIPMENT_NOT_FOUND",
    `Shipment '${input.shipmentId}' not found`,
  );

  const cns = cnsRows[0];
  const shp = shpRows[0];

  // Invariant 1: Manifest Lock Guard
  assertInvariant(
    !["LOCKED_MANIFEST", "DEPARTED", "CLOSED"].includes(cns.status),
    "consolidation",
    "CONSOLIDATION_LOCKED_FOR_CHANGES",
    `Consolidation '${cns.consolidationReference}' is in status '${cns.status}' and cannot accept new House shipments`,
  );

  // Invariant 2: Mode & Corridor Match Guard
  const checkMode = input.legMode || shp.serviceMode;
  const checkOrigin = input.legOriginLocode || shp.originLocationId;
  const checkDest = input.legDestinationLocode || shp.destinationLocationId;

  assertInvariant(
    checkMode === cns.mode &&
      checkOrigin === cns.originLocode &&
      checkDest === cns.destinationLocode,
    "consolidation",
    "CONSOLIDATION_CORRIDOR_OR_MODE_MISMATCH",
    `House leg (${checkMode} ${checkOrigin}->${checkDest}) does not match Master Consolidation (${cns.mode} ${cns.originLocode}->${cns.destinationLocode})`,
  );

  // Invariant 3: Capacity Guard
  const nextWeight = cns.allocatedWeightKg + input.allocatedWeightKg;
  const nextVolume = cns.allocatedVolumeCbm + input.allocatedVolumeCbm;

  assertInvariant(
    nextWeight <= cns.maxCapacityWeightKg &&
      nextVolume <= cns.maxCapacityVolumeCbm,
    "consolidation",
    "CONSOLIDATION_CAPACITY_EXCEEDED",
    `Adding ${input.allocatedWeightKg} kg / ${input.allocatedVolumeCbm} m³ exceeds Master capacity (${cns.maxCapacityWeightKg} kg / ${cns.maxCapacityVolumeCbm} m³)`,
  );

  const members: ConsolidationMember[] = JSON.parse(cns.membersJson || "[]");
  const existingIdx = members.findIndex(
    (m) =>
      m.shipmentId === input.shipmentId &&
      m.transportLegSequenceNo === (input.transportLegSequenceNo || 1),
  );

  const newMember: ConsolidationMember = {
    membershipId: `cmem_${uuidv4()}`,
    shipmentId: input.shipmentId,
    shipmentReference: shp.shipmentReference,
    transportLegSequenceNo: input.transportLegSequenceNo || 1,
    houseDocumentNumber: input.houseDocumentNumber,
    allocatedPackages: input.allocatedPackages,
    allocatedWeightKg: input.allocatedWeightKg,
    allocatedVolumeCbm: input.allocatedVolumeCbm,
    stuffingStatus: "STUFFED",
    joinedAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    members[existingIdx] = newMember;
  } else {
    members.push(newMember);
  }

  const totalWeight = members.reduce((acc, m) => acc + m.allocatedWeightKg, 0);
  const totalVolume = members.reduce((acc, m) => acc + m.allocatedVolumeCbm, 0);
  const now = new Date();

  await db
    .update(scmConsolidations)
    .set({
      allocatedWeightKg: totalWeight,
      allocatedVolumeCbm: totalVolume,
      membersJson: JSON.stringify(members),
      version: cns.version + 1,
      updatedAt: now,
    })
    .where(eq(scmConsolidations.id, cns.id));

  const updatedRow = (
    await db
      .select()
      .from(scmConsolidations)
      .where(eq(scmConsolidations.id, cns.id))
      .limit(1)
  )[0];
  const model = mapConsolidationRow(updatedRow);

  await outboxBus.enqueueEvents([
    {
      eventId: `evt_${uuidv4()}`,
      eventType: "consolidation.ShipmentAddedToConsolidation.v1",
      schemaVersion: 1,
      producerContext: "consolidation",
      aggregateType: "Consolidation",
      aggregateId: cns.id,
      aggregateVersion: cns.version + 1,
      correlationId: `corr_${uuidv4()}`,
      causationId: `cmd_add_shipment_to_consolidation`,
      actor,
      occurredAt: now.toISOString(),
      payload: {
        consolidationId: cns.id,
        consolidationReference: cns.consolidationReference,
        masterDocumentNumber: cns.masterDocumentNumber,
        consolidationType: cns.consolidationType,
        shipmentId: input.shipmentId,
        shipmentReference: shp.shipmentReference,
        transportLegSequenceNo: newMember.transportLegSequenceNo,
        houseDocumentNumber: input.houseDocumentNumber,
        allocatedWeightKg: input.allocatedWeightKg,
        allocatedVolumeCbm: input.allocatedVolumeCbm,
      },
    },
  ]);

  await outboxBus.relayPendingEvents();
  return model;
}

export async function lockOrCloseConsolidation(
  input: {
    consolidationId: string;
    targetStatus: "LOCKED_MANIFEST" | "CLOSED";
  },
  actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
): Promise<ConsolidationReadModel> {
  await ensureScmFoundationTables();

  const rows = await db
    .select()
    .from(scmConsolidations)
    .where(eq(scmConsolidations.id, input.consolidationId))
    .limit(1);

  assertInvariant(
    rows.length > 0,
    "consolidation",
    "CONSOLIDATION_NOT_FOUND",
    `Consolidation '${input.consolidationId}' not found`,
  );

  const cns = rows[0];
  const now = new Date();

  await db
    .update(scmConsolidations)
    .set({
      status: input.targetStatus,
      version: cns.version + 1,
      updatedAt: now,
    })
    .where(eq(scmConsolidations.id, cns.id));

  const updated = (
    await db
      .select()
      .from(scmConsolidations)
      .where(eq(scmConsolidations.id, cns.id))
      .limit(1)
  )[0];
  const model = mapConsolidationRow(updated);

  await outboxBus.enqueueEvents([
    {
      eventId: `evt_${uuidv4()}`,
      eventType: "consolidation.ConsolidationClosed.v1",
      schemaVersion: 1,
      producerContext: "consolidation",
      aggregateType: "Consolidation",
      aggregateId: cns.id,
      aggregateVersion: cns.version + 1,
      correlationId: `corr_${uuidv4()}`,
      causationId: `cmd_lock_consolidation`,
      actor,
      occurredAt: now.toISOString(),
      payload: model,
    },
  ]);

  await outboxBus.relayPendingEvents();
  return model;
}

export async function getConsolidationsForShipment(
  shipmentId: string,
): Promise<ConsolidationReadModel[]> {
  await ensureScmFoundationTables();
  const allRows = await db
    .select()
    .from(scmConsolidations)
    .orderBy(desc(scmConsolidations.updatedAt));

  return allRows
    .map(mapConsolidationRow)
    .filter((c) => c.members.some((m) => m.shipmentId === shipmentId));
}

export async function listConsolidations(): Promise<ConsolidationReadModel[]> {
  await ensureScmFoundationTables();
  const rows = await db
    .select()
    .from(scmConsolidations)
    .orderBy(desc(scmConsolidations.updatedAt));
  return rows.map(mapConsolidationRow);
}

// ============================================================================
// 14. DOCUMENT MANAGEMENT BOUNDED CONTEXT (Immutable Versions & Approvals)
// ============================================================================

export interface DocumentVersionEntry {
  versionId: string;
  versionNumber: number;
  storageObjectKey: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  sha256Hash: string;
  changeNotes: string;
  createdBy: string;
  createdAt: string;
}

export interface DocumentApprovalEntry {
  approvalId: string;
  versionNumber: number;
  reviewerRole: string;
  reviewerUserId: string;
  decision: "APPROVED" | "REJECTED";
  comments: string;
  decidedAt: string;
}

export interface DocumentReadModel {
  documentId: string;
  shipmentId: string;
  ownerEntityType: string;
  ownerEntityId: string;
  documentType: string;
  documentReference: string;
  title: string;
  requiresApproval: boolean;
  currentVersionNo: number;
  lifecycleState:
    | "DRAFT"
    | "GENERATED"
    | "UNDER_REVIEW"
    | "APPROVED"
    | "REJECTED"
    | "ISSUED"
    | "SUPERSEDED"
    | "ARCHIVED";
  latestSha256Hash: string;
  versions: DocumentVersionEntry[];
  approvals: DocumentApprovalEntry[];
  updatedAt: string;
}

function mapDocumentRow(
  row: typeof scmDocuments.$inferSelect,
): DocumentReadModel {
  const versions: DocumentVersionEntry[] = JSON.parse(row.versionsJson || "[]");
  const approvals: DocumentApprovalEntry[] = JSON.parse(
    row.approvalsJson || "[]",
  );
  const latestVer = versions[versions.length - 1];

  return {
    documentId: row.id,
    shipmentId: row.shipmentId,
    ownerEntityType: row.ownerEntityType,
    ownerEntityId: row.ownerEntityId,
    documentType: row.documentType,
    documentReference: row.documentReference,
    title: row.title,
    requiresApproval: Boolean(row.requiresApproval),
    currentVersionNo: row.currentVersionNo,
    lifecycleState: row.lifecycleState as any,
    latestSha256Hash: latestVer?.sha256Hash || "",
    versions,
    approvals,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function generateOrUploadDocumentVersion(
  input: {
    documentId?: string;
    shipmentId: string;
    ownerEntityType?: string;
    ownerEntityId?: string;
    documentType: string;
    documentReference: string;
    title: string;
    requiresApproval?: boolean;
    fileName?: string;
    contentPayload?: string;
    changeNotes?: string;
  },
  actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
): Promise<DocumentReadModel> {
  await ensureScmFoundationTables();

  const now = new Date();
  const rawContent =
    input.contentPayload ||
    `${input.documentType}:${input.documentReference}:${input.shipmentId}:${now.toISOString()}`;
  const sha256Hash = crypto
    .createHash("sha256")
    .update(rawContent)
    .digest("hex");

  if (input.documentId) {
    const existingRows = await db
      .select()
      .from(scmDocuments)
      .where(eq(scmDocuments.id, input.documentId))
      .limit(1);

    assertInvariant(
      existingRows.length > 0,
      "document_mgmt",
      "DOCUMENT_NOT_FOUND",
      `Document '${input.documentId}' not found`,
    );

    const doc = existingRows[0];
    const versions: DocumentVersionEntry[] = JSON.parse(
      doc.versionsJson || "[]",
    );
    const nextVersionNo = doc.currentVersionNo + 1;

    const newVersionEntry: DocumentVersionEntry = {
      versionId: `dver_${uuidv4()}`,
      versionNumber: nextVersionNo,
      storageObjectKey: `s3://atlas-scm-docs/${doc.shipmentId}/${doc.documentType}/v${nextVersionNo}_${input.fileName || `${doc.documentReference}.pdf`}`,
      fileName:
        input.fileName || `${doc.documentReference}_v${nextVersionNo}.pdf`,
      mimeType: "application/pdf",
      byteSize: Buffer.byteLength(rawContent, "utf8") + 4096,
      sha256Hash,
      changeNotes:
        input.changeNotes ||
        (doc.lifecycleState === "ISSUED"
          ? `Manifest Corrector / Amendment sobre versión emitida v${doc.currentVersionNo}`
          : `Nueva versión documental v${nextVersionNo}`),
      createdBy: actor.userId,
      createdAt: now.toISOString(),
    };

    versions.push(newVersionEntry);

    // Post-Issue Immutability Invariant: uploading an amendment after ISSUED resets lifecycleState to UNDER_REVIEW for v+1
    const nextLifecycleState = doc.requiresApproval
      ? "UNDER_REVIEW"
      : "GENERATED";

    await db
      .update(scmDocuments)
      .set({
        currentVersionNo: nextVersionNo,
        lifecycleState: nextLifecycleState,
        versionsJson: JSON.stringify(versions),
        version: doc.version + 1,
        updatedAt: now,
      })
      .where(eq(scmDocuments.id, doc.id));

    const updated = (
      await db
        .select()
        .from(scmDocuments)
        .where(eq(scmDocuments.id, doc.id))
        .limit(1)
    )[0];
    const model = mapDocumentRow(updated);

    await outboxBus.enqueueEvents([
      {
        eventId: `evt_${uuidv4()}`,
        eventType: "document_mgmt.DocumentGenerated.v1",
        schemaVersion: 1,
        producerContext: "document_mgmt",
        aggregateType: "Document",
        aggregateId: doc.id,
        aggregateVersion: doc.version + 1,
        correlationId: `corr_${uuidv4()}`,
        causationId: `cmd_upload_document_version`,
        actor,
        occurredAt: now.toISOString(),
        payload: model,
      },
    ]);

    await outboxBus.relayPendingEvents();
    return model;
  }

  // Create new Document at version 1
  const docId = `doc_${uuidv4()}`;
  const requiresApproval = input.requiresApproval ?? true;
  const v1Entry: DocumentVersionEntry = {
    versionId: `dver_${uuidv4()}`,
    versionNumber: 1,
    storageObjectKey: `s3://atlas-scm-docs/${input.shipmentId}/${input.documentType}/v1_${input.fileName || `${input.documentReference}.pdf`}`,
    fileName: input.fileName || `${input.documentReference}_v1.pdf`,
    mimeType: "application/pdf",
    byteSize: Buffer.byteLength(rawContent, "utf8") + 4096,
    sha256Hash,
    changeNotes: input.changeNotes || "Generación inicial v1",
    createdBy: actor.userId,
    createdAt: now.toISOString(),
  };

  await db.insert(scmDocuments).values({
    id: docId,
    shipmentId: input.shipmentId,
    ownerEntityType: input.ownerEntityType || "SHIPMENT",
    ownerEntityId: input.ownerEntityId || input.shipmentId,
    documentType: input.documentType,
    documentReference: input.documentReference,
    title: input.title,
    requiresApproval,
    currentVersionNo: 1,
    lifecycleState: requiresApproval ? "UNDER_REVIEW" : "GENERATED",
    versionsJson: JSON.stringify([v1Entry]),
    approvalsJson: "[]",
    organizationId: actor.organizationId,
    branchId: actor.branchId,
    version: 1,
    createdAt: now,
    updatedAt: now,
  });

  const created = (
    await db
      .select()
      .from(scmDocuments)
      .where(eq(scmDocuments.id, docId))
      .limit(1)
  )[0];
  const model = mapDocumentRow(created);

  await outboxBus.enqueueEvents([
    {
      eventId: `evt_${uuidv4()}`,
      eventType: "document_mgmt.DocumentGenerated.v1",
      schemaVersion: 1,
      producerContext: "document_mgmt",
      aggregateType: "Document",
      aggregateId: docId,
      aggregateVersion: 1,
      correlationId: `corr_${uuidv4()}`,
      causationId: `cmd_generate_document`,
      actor,
      occurredAt: now.toISOString(),
      payload: model,
    },
  ]);

  await outboxBus.relayPendingEvents();
  return model;
}

export async function reviewAndApproveDocument(
  input: {
    documentId: string;
    decision: "APPROVED" | "REJECTED";
    comments?: string;
  },
  actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
): Promise<DocumentReadModel> {
  await ensureScmFoundationTables();

  const rows = await db
    .select()
    .from(scmDocuments)
    .where(eq(scmDocuments.id, input.documentId))
    .limit(1);

  assertInvariant(
    rows.length > 0,
    "document_mgmt",
    "DOCUMENT_NOT_FOUND",
    `Document '${input.documentId}' not found`,
  );

  const doc = rows[0];
  const approvals: DocumentApprovalEntry[] = JSON.parse(
    doc.approvalsJson || "[]",
  );
  const now = new Date();

  approvals.push({
    approvalId: `dappr_${uuidv4()}`,
    versionNumber: doc.currentVersionNo,
    reviewerRole: actor.roles[0] || "OPERATIONS_SUPERVISOR",
    reviewerUserId: actor.userId,
    decision: input.decision,
    comments:
      input.comments ||
      `Revisión documental de versión v${doc.currentVersionNo}: ${input.decision}`,
    decidedAt: now.toISOString(),
  });

  const nextState = input.decision === "APPROVED" ? "APPROVED" : "REJECTED";

  await db
    .update(scmDocuments)
    .set({
      lifecycleState: nextState,
      approvalsJson: JSON.stringify(approvals),
      version: doc.version + 1,
      updatedAt: now,
    })
    .where(eq(scmDocuments.id, doc.id));

  const updated = (
    await db
      .select()
      .from(scmDocuments)
      .where(eq(scmDocuments.id, doc.id))
      .limit(1)
  )[0];
  const model = mapDocumentRow(updated);

  await outboxBus.enqueueEvents([
    {
      eventId: `evt_${uuidv4()}`,
      eventType: "document_mgmt.DocumentApproved.v1",
      schemaVersion: 1,
      producerContext: "document_mgmt",
      aggregateType: "Document",
      aggregateId: doc.id,
      aggregateVersion: doc.version + 1,
      correlationId: `corr_${uuidv4()}`,
      causationId: `cmd_approve_document`,
      actor,
      occurredAt: now.toISOString(),
      payload: model,
    },
  ]);

  await outboxBus.relayPendingEvents();
  return model;
}

export async function issueDocument(
  documentId: string,
  actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
): Promise<DocumentReadModel> {
  await ensureScmFoundationTables();

  const rows = await db
    .select()
    .from(scmDocuments)
    .where(eq(scmDocuments.id, documentId))
    .limit(1);

  assertInvariant(
    rows.length > 0,
    "document_mgmt",
    "DOCUMENT_NOT_FOUND",
    `Document '${documentId}' not found`,
  );

  const doc = rows[0];
  const approvals: DocumentApprovalEntry[] = JSON.parse(
    doc.approvalsJson || "[]",
  );

  if (doc.requiresApproval) {
    const approvedForCurrentVersion = approvals.some(
      (a) =>
        a.versionNumber === doc.currentVersionNo && a.decision === "APPROVED",
    );

    assertInvariant(
      approvedForCurrentVersion,
      "document_mgmt",
      "DOCUMENT_ISSUE_REQUIRES_APPROVAL",
      `Document '${doc.documentReference}' (v${doc.currentVersionNo}) requires an APPROVED review for version v${doc.currentVersionNo} before transitioning to ISSUED`,
    );
  }

  const now = new Date();
  await db
    .update(scmDocuments)
    .set({
      lifecycleState: "ISSUED",
      version: doc.version + 1,
      updatedAt: now,
    })
    .where(eq(scmDocuments.id, doc.id));

  const updated = (
    await db
      .select()
      .from(scmDocuments)
      .where(eq(scmDocuments.id, doc.id))
      .limit(1)
  )[0];
  const model = mapDocumentRow(updated);

  await outboxBus.enqueueEvents([
    {
      eventId: `evt_${uuidv4()}`,
      eventType: "document_mgmt.DocumentIssued.v1",
      schemaVersion: 1,
      producerContext: "document_mgmt",
      aggregateType: "Document",
      aggregateId: doc.id,
      aggregateVersion: doc.version + 1,
      correlationId: `corr_${uuidv4()}`,
      causationId: `cmd_issue_document`,
      actor,
      occurredAt: now.toISOString(),
      payload: model,
    },
  ]);

  await outboxBus.relayPendingEvents();
  return model;
}

export async function getDocumentsForShipment(
  shipmentId: string,
): Promise<DocumentReadModel[]> {
  await ensureScmFoundationTables();
  const rows = await db
    .select()
    .from(scmDocuments)
    .where(eq(scmDocuments.shipmentId, shipmentId))
    .orderBy(desc(scmDocuments.updatedAt));
  return rows.map(mapDocumentRow);
}

// ============================================================================
// 15. CUSTOMS BOUNDED CONTEXT (Multi-Procedure Cases, Tariff Items & Holds)
// ============================================================================

export interface CustomsTariffItem {
  itemNo: number;
  hsCode: string;
  goodsDescription: string;
  countryOfOrigin: string;
  customsProcedureCode: string;
  statisticalValueEur: number;
  dutyRatePercent: number;
  vatRatePercent: number;
  calculatedDutyEur: number;
  calculatedVatEur: number;
}

export interface CustomsHoldRecord {
  holdId: string;
  reasonCode: string;
  channel: "YELLOW_DOC_CHECK" | "ORANGE" | "RED_PHYSICAL_INSPECTION";
  authorityNotes: string;
  openedAt: string;
  clearedAt?: string | null;
  resolutionNotes?: string | null;
}

export interface CustomsCaseReadModel {
  customsCaseId: string;
  caseNumber: string;
  shipmentId: string;
  procedureType:
    | "EXPORT_CLEARANCE"
    | "IMPORT_CLEARANCE"
    | "TRANSIT_BONDED"
    | "SECURITY_FILING_ENS_ISF_AMS";
  jurisdictionCountry: string;
  customsOfficeLocode: string;
  declarantEoriOrTaxId: string;
  exporterPartyId: string;
  importerOfRecordPartyId: string;
  customsBrokerName: string;
  mrnNumber?: string | null;
  channelAssigned?: string | null;
  state: string;
  tariffItems: CustomsTariffItem[];
  holds: CustomsHoldRecord[];
  openHoldsCount: number;
  totalCalculatedDutyEur: number;
  totalCalculatedVatEur: number;
  updatedAt: string;
}

function mapCustomsRow(
  row: typeof scmCustomsCases.$inferSelect,
): CustomsCaseReadModel {
  const tariffItems: CustomsTariffItem[] = JSON.parse(
    row.tariffItemsJson || "[]",
  );
  const holds: CustomsHoldRecord[] = JSON.parse(row.holdsJson || "[]");
  const openHoldsCount = holds.filter((h) => !h.clearedAt).length;

  return {
    customsCaseId: row.id,
    caseNumber: row.caseNumber,
    shipmentId: row.shipmentId,
    procedureType: row.procedureType as any,
    jurisdictionCountry: row.jurisdictionCountry,
    customsOfficeLocode: row.customsOfficeLocode,
    declarantEoriOrTaxId: row.declarantEoriOrTaxId,
    exporterPartyId: row.exporterPartyId,
    importerOfRecordPartyId: row.importerOfRecordPartyId,
    customsBrokerName: row.customsBrokerName,
    mrnNumber: row.mrnNumber,
    channelAssigned: row.channelAssigned,
    state: row.state,
    tariffItems,
    holds,
    openHoldsCount,
    totalCalculatedDutyEur: row.totalCalculatedDutyEur,
    totalCalculatedVatEur: row.totalCalculatedVatEur,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function createAndSubmitCustomsCase(
  input: {
    shipmentId: string;
    procedureType:
      | "EXPORT_CLEARANCE"
      | "IMPORT_CLEARANCE"
      | "TRANSIT_BONDED"
      | "SECURITY_FILING_ENS_ISF_AMS";
    jurisdictionCountry: string;
    customsOfficeLocode: string;
    declarantEoriOrTaxId: string;
    exporterPartyId?: string;
    importerOfRecordPartyId?: string;
    customsBrokerName?: string;
    tariffItems: Array<{
      hsCode: string;
      goodsDescription: string;
      countryOfOrigin: string;
      customsProcedureCode?: string;
      statisticalValueEur: number;
      dutyRatePercent?: number;
      vatRatePercent?: number;
    }>;
  },
  actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
): Promise<CustomsCaseReadModel> {
  await ensureScmFoundationTables();

  assertInvariant(
    Boolean(input.declarantEoriOrTaxId) &&
      input.declarantEoriOrTaxId.trim().length >= 8,
    "customs",
    "CUSTOMS_INVALID_TARIFF_OR_EORI",
    "Customs declaration submission requires a valid declarantEoriOrTaxId (>= 8 chars)",
  );

  assertInvariant(
    Array.isArray(input.tariffItems) && input.tariffItems.length > 0,
    "customs",
    "CUSTOMS_INVALID_TARIFF_OR_EORI",
    "Customs declaration submission requires at least one CustomsTariffItem",
  );

  const normalizedItems: CustomsTariffItem[] = input.tariffItems.map(
    (item, idx) => {
      const cleanHs = (item.hsCode || "").replace(/\D/g, "");
      assertInvariant(
        cleanHs.length >= 6 &&
          Boolean(item.countryOfOrigin) &&
          item.statisticalValueEur > 0,
        "customs",
        "CUSTOMS_INVALID_TARIFF_OR_EORI",
        `Tariff item #${idx + 1} requires valid HS Code (>= 6 digits), countryOfOrigin, and statisticalValueEur > 0`,
      );

      const dutyRate = item.dutyRatePercent ?? 4.5;
      const vatRate = item.vatRatePercent ?? 21.0;
      const calculatedDutyEur =
        Math.round(item.statisticalValueEur * (dutyRate / 100) * 100) / 100;
      const calculatedVatEur =
        Math.round(
          (item.statisticalValueEur + calculatedDutyEur) *
            (vatRate / 100) *
            100,
        ) / 100;

      return {
        itemNo: idx + 1,
        hsCode: item.hsCode,
        goodsDescription: item.goodsDescription,
        countryOfOrigin: item.countryOfOrigin,
        customsProcedureCode: item.customsProcedureCode || "4000",
        statisticalValueEur: item.statisticalValueEur,
        dutyRatePercent: dutyRate,
        vatRatePercent: vatRate,
        calculatedDutyEur,
        calculatedVatEur,
      };
    },
  );

  const totalCalculatedDutyEur =
    Math.round(
      normalizedItems.reduce((acc, i) => acc + i.calculatedDutyEur, 0) * 100,
    ) / 100;
  const totalCalculatedVatEur =
    Math.round(
      normalizedItems.reduce((acc, i) => acc + i.calculatedVatEur, 0) * 100,
    ) / 100;

  const id = `cus_${uuidv4()}`;
  const randomSeq = Math.floor(10000 + Math.random() * 90000);
  const caseNumber = `CUS-2026-${randomSeq}`;
  const mrnNumber = `26${input.jurisdictionCountry.slice(0, 2).toUpperCase()}00${randomSeq}R9`;
  const now = new Date();

  await db.insert(scmCustomsCases).values({
    id,
    caseNumber,
    shipmentId: input.shipmentId,
    procedureType: input.procedureType,
    jurisdictionCountry: input.jurisdictionCountry,
    customsOfficeLocode: input.customsOfficeLocode,
    declarantEoriOrTaxId: input.declarantEoriOrTaxId,
    exporterPartyId: input.exporterPartyId || "pty_exporter_default",
    importerOfRecordPartyId:
      input.importerOfRecordPartyId || "pty_importer_default",
    customsBrokerName:
      input.customsBrokerName || "Atlas Customs Brokerage S.L.",
    mrnNumber,
    channelAssigned: "GREEN",
    state: "SUBMITTED",
    tariffItemsJson: JSON.stringify(normalizedItems),
    holdsJson: "[]",
    totalCalculatedDutyEur,
    totalCalculatedVatEur,
    organizationId: actor.organizationId,
    branchId: actor.branchId,
    version: 1,
    createdAt: now,
    updatedAt: now,
  });

  const created = (
    await db
      .select()
      .from(scmCustomsCases)
      .where(eq(scmCustomsCases.id, id))
      .limit(1)
  )[0];
  const model = mapCustomsRow(created);

  await outboxBus.enqueueEvents([
    {
      eventId: `evt_${uuidv4()}`,
      eventType: "customs.CustomsCaseCreated.v1",
      schemaVersion: 1,
      producerContext: "customs",
      aggregateType: "CustomsCase",
      aggregateId: id,
      aggregateVersion: 1,
      correlationId: `corr_${uuidv4()}`,
      causationId: `cmd_submit_customs_case`,
      actor,
      occurredAt: now.toISOString(),
      payload: model,
    },
  ]);

  await outboxBus.relayPendingEvents();
  return model;
}

export async function placeCustomsInspectionHold(
  input: {
    customsCaseId: string;
    channel: "YELLOW_DOC_CHECK" | "ORANGE" | "RED_PHYSICAL_INSPECTION";
    reasonCode: string;
    authorityNotes: string;
  },
  actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
): Promise<CustomsCaseReadModel> {
  await ensureScmFoundationTables();

  const rows = await db
    .select()
    .from(scmCustomsCases)
    .where(eq(scmCustomsCases.id, input.customsCaseId))
    .limit(1);

  assertInvariant(
    rows.length > 0,
    "customs",
    "CUSTOMS_CASE_NOT_FOUND",
    `CustomsCase '${input.customsCaseId}' not found`,
  );

  const ccase = rows[0];
  const holds: CustomsHoldRecord[] = JSON.parse(ccase.holdsJson || "[]");
  const now = new Date();

  holds.push({
    holdId: `chold_${uuidv4()}`,
    reasonCode: input.reasonCode,
    channel: input.channel,
    authorityNotes: input.authorityNotes,
    openedAt: now.toISOString(),
    clearedAt: null,
    resolutionNotes: null,
  });

  await db
    .update(scmCustomsCases)
    .set({
      channelAssigned: input.channel,
      state: "UNDER_INSPECTION_HOLD",
      holdsJson: JSON.stringify(holds),
      version: ccase.version + 1,
      updatedAt: now,
    })
    .where(eq(scmCustomsCases.id, ccase.id));

  // Trigger operational tracking event CUSTOMS_HOLD (which pauses SLA Stop-Clock and creates deduplicated Exception)
  await ingestOperationalTrackingEvent(
    {
      shipmentId: ccase.shipmentId,
      eventCode: "CUSTOMS_HOLD",
      milestoneCode: "CUSTOMS_CLEARANCE",
      locationLocode: ccase.customsOfficeLocode,
      sourceType: "TERMINAL_PORT_CUSTOMS",
      timestampKind: "ESTIMATED",
      eventTimestamp: now.toISOString(),
      summary: `Aduana (${ccase.jurisdictionCountry}) asigna Canal ${input.channel} en ${ccase.caseNumber}: ${input.authorityNotes}`,
    },
    actor,
  );

  const updated = (
    await db
      .select()
      .from(scmCustomsCases)
      .where(eq(scmCustomsCases.id, ccase.id))
      .limit(1)
  )[0];
  const model = mapCustomsRow(updated);

  await outboxBus.enqueueEvents([
    {
      eventId: `evt_${uuidv4()}`,
      eventType: "customs.CustomsBlocked.v1",
      schemaVersion: 1,
      producerContext: "customs",
      aggregateType: "CustomsCase",
      aggregateId: ccase.id,
      aggregateVersion: ccase.version + 1,
      correlationId: `corr_${uuidv4()}`,
      causationId: `cmd_place_customs_hold`,
      actor,
      occurredAt: now.toISOString(),
      payload: model,
    },
  ]);

  await outboxBus.relayPendingEvents();
  return model;
}

export async function clearCustomsHoldAndRelease(
  input: {
    customsCaseId: string;
    clearOpenHolds: boolean;
    resolutionNotes?: string;
  },
  actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
): Promise<CustomsCaseReadModel> {
  await ensureScmFoundationTables();

  const rows = await db
    .select()
    .from(scmCustomsCases)
    .where(eq(scmCustomsCases.id, input.customsCaseId))
    .limit(1);

  assertInvariant(
    rows.length > 0,
    "customs",
    "CUSTOMS_CASE_NOT_FOUND",
    `CustomsCase '${input.customsCaseId}' not found`,
  );

  const ccase = rows[0];
  const holds: CustomsHoldRecord[] = JSON.parse(ccase.holdsJson || "[]");
  const now = new Date();

  if (input.clearOpenHolds) {
    for (const h of holds) {
      if (!h.clearedAt) {
        h.clearedAt = now.toISOString();
        h.resolutionNotes =
          input.resolutionNotes ||
          "Inspección documental/física superada con conformidad aduanera";
      }
    }
  }

  const remainingOpenHolds = holds.filter((h) => !h.clearedAt);

  // Invariant: A CustomsCase cannot transition to RELEASED while any CustomsHoldRecord remains open
  assertInvariant(
    remainingOpenHolds.length === 0,
    "customs",
    "CUSTOMS_CANNOT_RELEASE_WITH_OPEN_HOLD",
    `CustomsCase '${ccase.caseNumber}' has ${remainingOpenHolds.length} open inspection hold(s) and cannot be released until cleared`,
  );

  await db
    .update(scmCustomsCases)
    .set({
      channelAssigned: "GREEN",
      state: "RELEASED",
      holdsJson: JSON.stringify(holds),
      version: ccase.version + 1,
      updatedAt: now,
    })
    .where(eq(scmCustomsCases.id, ccase.id));

  // Trigger operational tracking event CUSTOMS_RELEASED (which resumes SLA Stop-Clock and advances Workflow Runtime)
  await ingestOperationalTrackingEvent(
    {
      shipmentId: ccase.shipmentId,
      eventCode: "CUSTOMS_RELEASED",
      milestoneCode: "CUSTOMS_CLEARANCE",
      locationLocode: ccase.customsOfficeLocode,
      sourceType: "TERMINAL_PORT_CUSTOMS",
      timestampKind: "ACTUAL",
      eventTimestamp: now.toISOString(),
      summary: `Levante Aduanero (${ccase.caseNumber} · MRN ${ccase.mrnNumber}) confirmado en ${ccase.customsOfficeLocode}`,
    },
    actor,
  );

  const updated = (
    await db
      .select()
      .from(scmCustomsCases)
      .where(eq(scmCustomsCases.id, ccase.id))
      .limit(1)
  )[0];
  const model = mapCustomsRow(updated);

  await outboxBus.enqueueEvents([
    {
      eventId: `evt_${uuidv4()}`,
      eventType: "customs.CustomsReleased.v1",
      schemaVersion: 1,
      producerContext: "customs",
      aggregateType: "CustomsCase",
      aggregateId: ccase.id,
      aggregateVersion: ccase.version + 1,
      correlationId: `corr_${uuidv4()}`,
      causationId: `cmd_release_customs_case`,
      actor,
      occurredAt: now.toISOString(),
      payload: model,
    },
  ]);

  await outboxBus.relayPendingEvents();
  return model;
}

export async function getCustomsCasesForShipment(
  shipmentId: string,
): Promise<CustomsCaseReadModel[]> {
  await ensureScmFoundationTables();
  const rows = await db
    .select()
    .from(scmCustomsCases)
    .where(eq(scmCustomsCases.shipmentId, shipmentId))
    .orderBy(desc(scmCustomsCases.updatedAt));
  return rows.map(mapCustomsRow);
}
