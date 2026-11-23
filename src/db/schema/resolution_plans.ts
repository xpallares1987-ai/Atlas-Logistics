/**
 * @file resolution_plans.ts
 * @description Drizzle ORM SQLite WAL schema for Autonomous Disruption Resolution,
 * Multi-Criteria Candidate Plan Synthesis, and Automated Rerouting Execution (ADR 0036).
 * Connects supply chain exceptions with multi-modal re-allocations and transactional outbox.
 * @module @atlas/db/schema/resolution_plans
 * @see {@link docs/adr/0036-autonomous-disruption-resolution-and-automated-rerouting-engine.md}
 */

import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { commonAuditFields } from "./_common.js";
import { supplyChainExceptions } from "./supply_chain_visibility.js";
import { purchaseOrders } from "./po.js";
import { bookings, shipments } from "./operations.js";

// ============================================================================
// 1. ENUMS & CONSTANTS
// ============================================================================

export const disruptionPlanTypeEnum = [
  "NEXT_SAILING",
  "MODAL_SHIFT",
  "SPLIT_EXPEDITE",
  "BUFFER_ADJUSTMENT",
  "CARRIER_REROUTE",
  "MODE_SHIFT_AIR",
  "MODE_SHIFT_RAIL",
  "TRANSSHIPMENT_BYPASS",
  "EXPEDITED_DRAYAGE",
  "SPLIT_SHIPMENT",
] as const;

export type DisruptionPlanType = (typeof disruptionPlanTypeEnum)[number];

export const resolutionPlanStatusEnum = [
  "DRAFT",
  "GENERATED",
  "PROPOSED",
  "PENDING_APPROVAL",
  "AUTO_APPROVED",
  "AUTO_EXECUTED",
  "MANUALLY_APPROVED",
  "REJECTED",
  "EXECUTED",
  "FAILED",
] as const;

export type ResolutionPlanStatus = (typeof resolutionPlanStatusEnum)[number];

export const executionStepStatusEnum = [
  "PENDING",
  "SUCCESS",
  "FAILED",
] as const;

export type ExecutionStepStatus = (typeof executionStepStatusEnum)[number];

// ============================================================================
// 2. DISRUPTION RESOLUTION PLANS TABLE
// ============================================================================

export const disruptionResolutionPlans = sqliteTable(
  "disruption_resolution_plans",
  {
    id: text("id").primaryKey(), // e.g. 'plan_01H...'
    tenantId: text("tenant_id").notNull().default("tenant_default"),
    exceptionId: text("exception_id")
      .notNull()
      .references(() => supplyChainExceptions.id, { onDelete: "cascade" }),
    poId: text("po_id")
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: "cascade" }),
    bookingId: text("booking_id").references(() => bookings.id, {
      onDelete: "set null",
    }),
    shipmentId: text("shipment_id").references(() => shipments.id, {
      onDelete: "set null",
    }),

    planType: text("plan_type", { enum: disruptionPlanTypeEnum }).notNull(),
    status: text("status", { enum: resolutionPlanStatusEnum })
      .notNull()
      .default("GENERATED"),

    confidenceScore: text("confidence_score").notNull().default("0.85"), // e.g. '0.92'
    recommendationRank: integer("recommendation_rank").notNull().default(1),

    estimatedTransitDays: integer("estimated_transit_days").notNull(),
    transitTimeDeltaHours: integer("transit_time_delta_hours").notNull(), // negative = hours saved, positive = added delay

    costDeltaAmount: text("cost_delta_amount").notNull().default("0.00"), // decimal monetary delta string
    costDeltaCurrency: text("cost_delta_currency").notNull().default("USD"),

    carbonDeltaKgCo2: text("carbon_delta_kg_co2").default("0.00"), // GLEC estimated carbon delta in kg CO2
    justification: text("justification").notNull(), // Human-readable explanation of why this plan was synthesized

    // Structured JSON payloads
    policyEvaluationJson: text("policy_evaluation_json", { mode: "json" }), // Rules evaluated and threshold verification
    actionPayloadJson: text("action_payload_json", { mode: "json" }), // Concrete mutation payload (new legs, carrier SCAC, etc.)

    executionError: text("execution_error"),
    approvedBy: text("approved_by"), // Operator User ID or 'SYSTEM_POLICY_AGENT'
    approvedAt: integer("approved_at", { mode: "timestamp" }),
    executedAt: integer("executed_at", { mode: "timestamp" }),

    ...commonAuditFields,
  },
  (table) => ({
    tenantExceptionIdx: index("idx_drp_tenant_exception").on(
      table.tenantId,
      table.exceptionId,
    ),
    tenantPoIdx: index("idx_drp_tenant_po").on(table.tenantId, table.poId),
    tenantStatusIdx: index("idx_drp_tenant_status").on(
      table.tenantId,
      table.status,
    ),
    tenantPlanTypeIdx: index("idx_drp_tenant_plan_type").on(
      table.tenantId,
      table.planType,
    ),
  }),
);

export type DisruptionResolutionPlan =
  typeof disruptionResolutionPlans.$inferSelect;
export type NewDisruptionResolutionPlan =
  typeof disruptionResolutionPlans.$inferInsert;

// ============================================================================
// 3. REROUTING EXECUTION LOGS TABLE
// ============================================================================

export const reroutingExecutionLogs = sqliteTable(
  "rerouting_execution_logs",
  {
    id: text("id").primaryKey(), // e.g. 'exec_log_01H...'
    tenantId: text("tenant_id").notNull().default("tenant_default"),
    planId: text("plan_id")
      .notNull()
      .references(() => disruptionResolutionPlans.id, { onDelete: "cascade" }),

    stepIndex: integer("step_index").notNull(), // 1, 2, 3...
    stepName: text("step_name").notNull(), // e.g. 'UPDATE_ROUTING_LEGS', 'REALLOCATE_BOOKING'
    status: text("status", { enum: executionStepStatusEnum })
      .notNull()
      .default("PENDING"),

    detailsJson: text("details_json", { mode: "json" }), // Step execution input/output payload
    errorMessage: text("error_message"),
    executedAt: integer("executed_at", { mode: "timestamp" }),

    ...commonAuditFields,
  },
  (table) => ({
    tenantPlanIdx: index("idx_rel_tenant_plan").on(
      table.tenantId,
      table.planId,
    ),
  }),
);

export type ReroutingExecutionLog = typeof reroutingExecutionLogs.$inferSelect;
export type NewReroutingExecutionLog =
  typeof reroutingExecutionLogs.$inferInsert;
