# 0008 SCM Embedded SQLite Architecture, Outbox Eventing, and CQRS BFF

- **Status**: Accepted
- **Deciders**: Engineering Team & AI Assistant
- **Date**: 2026-10-31

## Context and Problem Statement

The SCM freight forwarding core required robust operational capabilities: transactional consistency for shipment execution, versioned workflow orchestration, and high-performance UI read models. We needed to choose a storage, eventing, and query architecture that delivers enterprise-grade consistency with zero cloud hosting cost for single-tenant / local deployments.

## Decision Drivers

- Zero-cost, self-contained local developer experience without external database servers.
- Strict transactional atomicity binding domain aggregate mutations with event emission (Dual-Write Prevention).
- High-performance UI rendering without joining multiple transactional tables.
- Versioned, customizable freight forwarding workflow execution inspired by BPMN/Camunda.

## Decision Outcome

Chosen option:
1. **Embedded SQLite with WAL Mode**: Embedded relational persistence for operational aggregates and CQRS projections.
2. **Transactional Outbox & Bus**: Guaranteed at-least-once event delivery with consumer inbox idempotency and dead-letter queue (DLQ).
3. **Versioned Workflow Engine**: Normalized SQLite tables defining immutable workflow versions and DAG task dependencies with cycle validation.
4. **CQRS Read Model Projections & Operations BFF**: Denormalized views (`op_intelligence_shipment_360_views_v2` and `op_intelligence_cockpit_items_v2`) updated reactively, supporting in-situ task execution.

### Consequences

- **Good**: Sub-millisecond read times for Shipment 360 and Operations Cockpit views; atomic consistency; zero cloud database cost; fully testable in memory/file-backed SQLite.
- **Good**: Work-to-User UX paradigm eliminates manual task hunting across screens.
- **Bad**: Multiple simultaneous writer processes require SQLite WAL mode and busy timeout management.
