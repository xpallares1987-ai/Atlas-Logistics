# Atlas Logistics — SCM Platform Architecture & Runtime Specification

## 1. Architectural Foundation & Overview

Atlas Logistics is an event-driven, domain-driven Supply Chain Management (SCM) platform optimized for freight forwarding operations. It is designed around clean bounded contexts, strict aggregate consistency boundaries, transactional event publishing (Outbox Pattern), versioned workflow orchestration, and high-performance CQRS read model projections.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                 OPERATIONS BFF                                   │
│  GET /operational/shipments-360    GET /operational/cockpit (My Work Queue)      │
│  GET /operational/shipments/:id/360 POST /operational/cockpit/:id/execute        │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │ Queries Projected Views
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             CQRS PROJECTION STORE                                │
│       op_intelligence_shipment_360_views_v2    op_intelligence_cockpit_items_v2   │
└────────────────────────────────────────▲─────────────────────────────────────────┘
                                         │ Updates asynchronously / read-through
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                          TRANSACTIONAL OUTBOX & BUS                              │
│                platform_gov_outbox_v2  ──►  platform_gov_inbox_v2                │
│                         (PENDING -> PROCESSING -> PROCESSED | FAILED / DLQ)       │
└────────────────────────────────────────▲─────────────────────────────────────────┘
                                         │ Emitted inside atomic DB transactions
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                            OPERATIONAL CORE AGGREGATES                           │
│  Party & CRM          Shipment Execution    Transport Planning   Workflow Engine │
│  party_crm_*          shipment_exec_*       transport_plan_*     wf_engine_*     │
│  Tracking & Milestones Work Management      Cargo & Equipment                    │
│  tracking_*           work_mgmt_*           cargo_equip_*                        │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Domain Aggregates & Relational Entities

Persistent storage is backed by normalized SQLite tables (`src/db/schema/scm_entities_sqlite.ts`):

1. **Party & CRM (`party_crm_*`)**:
   - Aggregate Root: `Party` (`party_crm_parties_v2`).
   - Owned Entities: `PartyAddress`, `PartyContact`, `PartyRole`, `PartyRelationship`, `PartyExternalIdentifier`.
   - Invariant: Parties hold polymorphic roles (`CUSTOMER`, `CARRIER`, `SHIPPER`, `CONSIGNEE`) without duplicating records.
2. **Shipment Execution (`shipment_exec_*`)**:
   - Aggregate Root: `Shipment` (`shipment_exec_shipments_v2`).
   - Owned Entities: `ShipmentReference`, `ShipmentPartyRole`, `ShipmentAssignment`.
   - Invariant: A Shipment references other contexts by ID only, not physical navigation. Optimistic locking enforced via `version` column.
3. **Transport Planning (`transport_plan_*`)**:
   - Aggregate Root: `RoutePlan` (`transport_plan_route_plans_v2`).
   - Versioned child: `RouteVersion` (`transport_plan_route_versions_v2`).
   - Composed components: `RouteStop`, `TransportLeg`.
4. **Milestone Tracking (`tracking_*`)**:
   - Aggregate Root: `MilestonePlan` (`tracking_milestone_plans_v2`).
   - Dynamic milestones: `Milestone`, `EstimateRevision`.
5. **Work Management (`work_mgmt_*`)**:
   - Aggregate Root: `Task` (`work_mgmt_tasks_v2`).
   - Graph Association: `TaskDependency` (`work_mgmt_task_dependencies_v2`).
   - Invariant: Strict Directed Acyclic Graph (DAG) enforcement. Direct self-loops and transitive multi-hop cycles are rejected before persistence.

---

## 3. Transactional Outbox & Resilient Runtime

To guarantee that aggregate state changes and domain events never desynchronize:

1. **Atomic Transaction Boundaries**:
   Mutations to aggregates and insertions into `platform_gov_outbox_v2` share the exact same SQLite transaction (`db.transaction(...)`).
2. **Outbox Lifecycle**:
   - `PENDING`: Enqueued and ready for relay.
   - `PROCESSING`: Picked up by the relay processor.
   - `PROCESSED`: Successfully dispatched to all registered idempotent subscribers.
   - `FAILED`: Dead-lettered after exceeding retry limit (default: 3 attempts).
3. **Dead Letter Queue (DLQ) & Replay**:
   Failed events are preserved with error telemetry and can be inspected via `GET /api/scm/v1/operational/outbox/dlq` and replayed with `POST /api/scm/v1/operational/outbox/dlq/:eventId/replay`.
4. **Consumer Idempotency**:
   The `platform_gov_inbox_v2` table records `(event_id, consumer_id)`. Duplicate deliveries are safely skipped.
5. **Command Deduplication**:
   Endpoints accept `x-idempotency-key` and store execution fingerprints in `platform_gov_command_idempotency_v2`.
6. **Operational Audit Trail**:
   The causality chain can be reconstructed on demand (`GET /api/scm/v1/operational/shipments/:id/audit-trail`):
   $$\text{Shipment Created} \to \text{Route Planned} \to \text{Milestones Generated} \to \text{Workflow Started} \to \text{Task Completed} \to \text{Task Unblocked}$$

---

## 4. Versioned Workflow Engine

Inspired by BPMN/Camunda but tailored for freight forwarding (`src/scm/contexts/workflow-engine/`):

1. **Separation of Definition vs Instance**:
   - Definitions: `WorkflowDefinition`, `WorkflowDefinitionVersion`, `TaskDefinition`, `DependencyDefinition`.
   - Instances: `WorkflowInstance`, `TaskInstance`.
2. **Version Immutability**:
   Once a version transitions to `PUBLISHED`, its task definitions and dependency graph become strictly immutable (`WORKFLOW_VERSION_IMMUTABLE`).
3. **Pre-Publication DAG Cycle Validation**:
   Publishing runs a topological cycle detection algorithm (`assertVersionIsDAG`). Definitions containing cycles cannot be published.
4. **Dynamic Instantiation & Materialization**:
   When a shipment route is planned (`RoutePlanned.v2`), the engine selects the active published definition (e.g., `OCEAN_EXPORT_STANDARD` v1), instantiates `WorkflowInstance`, and materializes tasks into `scmLogicalTasks` and `scmLogicalTaskDependencies`.
5. **Auto-Finalization**:
   When the final task of an instance is completed, the workflow instance automatically transitions to `COMPLETED` and emits `workflow_engine.WorkflowInstanceCompleted.v2`.

---

## 5. Operational Intelligence BFF (Shipment 360 & Operations Cockpit)

Optimized for high-performance UI rendering without transactional table joins (`src/scm/contexts/operational-intelligence/`):

1. **Shipment 360 Projected Read Model**:
   - Stored denormalized in `op_intelligence_shipment_360_views_v2`.
   - Aggregates shipment metadata, routing stops & legs, milestone progress, workflow execution state, health scores, and task action metadata.
   - Self-healing read-through: If a view is queried before the outbox ticks, it computes, stores, and serves the projection instantly.
2. **Operations Cockpit ("Work-to-User" Paradigm)**:
   - Stored in `op_intelligence_cockpit_items_v2`.
   - Serves prioritized work queues for operators:
     * Only actionable tasks are highlighted (`status === "OPEN"` and `isBlocked === false`).
     * Blocked tasks clearly document which predecessor task must finish first.
     * `attentionScore` (0–100) dynamically ranks tasks by priority, service mode, and SLA urgency.
3. **In-situ Execution Endpoint (`POST /operational/cockpit/:workItemId/execute`)**:
   - Operators resolve tasks directly from the Cockpit view.
   - The BFF completes the task, flushes event cascades, re-projects the shipment, and returns newly unlocked work items in the same response.
