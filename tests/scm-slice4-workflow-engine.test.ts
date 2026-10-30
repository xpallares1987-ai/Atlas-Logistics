import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import scmV1Routes from "../src/routes/scm-v1.routes.js";
import { ensureWorkflowEngineTables } from "../src/scm/kernel/workflow-engine-tables.js";
import {
  createWorkflowDefinition,
  createWorkflowDefinitionVersion,
  addTaskDefinitionToVersion,
  addDependencyDefinitionToVersion,
  publishWorkflowDefinitionVersion,
  getWorkflowVersionWithDAG,
  instantiateWorkflow,
  getWorkflowInstanceById,
  seedStandardWorkflowDefinitions,
} from "../src/scm/contexts/workflow-engine/workflow-engine.context.js";
import {
  createOperationalShipment,
  createInitialRoutePlan,
  getShipment360OperationalModel,
  getOperationalAuditTrail,
} from "../src/scm/contexts/operational-core/slice1-operational.context.js";
import {
  completeTask,
  getTasksForSubject,
} from "../src/scm/contexts/work-management/work-management.context.js";

describe("SCM Logical Model v1 — Vertical Slice 4: Versioned Workflow Definitions & Instances", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(scmV1Routes, { prefix: "/api/scm/v1" });
    await app.ready();
    await ensureWorkflowEngineTables();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("1. Workflow Definition & Version Lifecycle (Immutability Invariant)", () => {
    it("creates a draft definition version, attaches tasks/dependencies, and publishes it as immutable", async () => {
      // 1. Create Definition
      const def = await createWorkflowDefinition({
        definitionKey: `AIR_IMPORT_DIRECT_${Date.now()}`,
        name: "Air Cargo Priority Import Operations",
        category: "IMPORT",
        serviceMode: "AIR",
      });
      expect(def.workflowDefinitionId).toBeDefined();
      expect(def.status).toBe("ACTIVE");

      // 2. Create Version 1 (DRAFT)
      const ver = await createWorkflowDefinitionVersion({
        workflowDefinitionId: def.workflowDefinitionId,
        triggerEventType: "transport_planning.RoutePlanned.v2",
        matchCondition: { serviceMode: "AIR", direction: "IMPORT" },
      });
      expect(ver.versionNumber).toBe(1);
      expect(ver.status).toBe("DRAFT");

      // 3. Add Task Definitions to DRAFT
      const t1 = await addTaskDefinitionToVersion({
        workflowVersionId: ver.workflowVersionId,
        taskTypeCode: "RECEIVE_AWB_PRE_ALERT",
        title: "Receive Air Waybill Pre-Alert",
        defaultPriority: "HIGH",
        slaDurationMinutes: 60,
        sequenceHint: 1,
      });

      const t2 = await addTaskDefinitionToVersion({
        workflowVersionId: ver.workflowVersionId,
        taskTypeCode: "EXECUTE_IMPORT_CUSTOMS_CLEARANCE",
        title: "Execute Import Customs Clearance",
        defaultPriority: "CRITICAL",
        slaDurationMinutes: 180,
        sequenceHint: 2,
      });

      // 4. Add Dependency: t1 -> t2
      await addDependencyDefinitionToVersion({
        workflowVersionId: ver.workflowVersionId,
        predecessorTaskTypeCode: t1.taskTypeCode,
        successorTaskTypeCode: t2.taskTypeCode,
        dependencyType: "FINISH_TO_START",
      });

      // 5. Publish Version 1
      const published = await publishWorkflowDefinitionVersion(
        ver.workflowVersionId,
      );
      expect(published.status).toBe("PUBLISHED");
      expect(published.publishedAt).toBeDefined();
      expect(published.tasks?.length).toBe(2);
      expect(published.dependencies?.length).toBe(1);

      // 6. Invariant Check: PUBLISHED version is strictly immutable!
      await expect(
        addTaskDefinitionToVersion({
          workflowVersionId: ver.workflowVersionId,
          taskTypeCode: "UNAUTHORIZED_MODIFICATION",
          title: "Should Fail",
        }),
      ).rejects.toThrowError(
        /is in status 'PUBLISHED' and cannot be modified|WORKFLOW_VERSION_IMMUTABLE/,
      );

      await expect(
        addDependencyDefinitionToVersion({
          workflowVersionId: ver.workflowVersionId,
          predecessorTaskTypeCode: t2.taskTypeCode,
          successorTaskTypeCode: t1.taskTypeCode,
        }),
      ).rejects.toThrowError(
        /is in status 'PUBLISHED' and cannot be modified|WORKFLOW_VERSION_IMMUTABLE/,
      );
    });
  });

  describe("2. Workflow Definition DAG Cycle Prevention", () => {
    it("rejects directed cycles (A -> B -> C -> A) in definition dependencies during authoring", async () => {
      const def = await createWorkflowDefinition({
        definitionKey: `CYCLE_TEST_DEF_${Date.now()}`,
        name: "Cycle Validation Workflow",
        category: "DOMESTIC",
      });

      const ver = await createWorkflowDefinitionVersion({
        workflowDefinitionId: def.workflowDefinitionId,
      });

      // Add three task definitions: NODE_A, NODE_B, NODE_C
      await addTaskDefinitionToVersion({
        workflowVersionId: ver.workflowVersionId,
        taskTypeCode: "NODE_A",
        title: "Node A",
      });
      await addTaskDefinitionToVersion({
        workflowVersionId: ver.workflowVersionId,
        taskTypeCode: "NODE_B",
        title: "Node B",
      });
      await addTaskDefinitionToVersion({
        workflowVersionId: ver.workflowVersionId,
        taskTypeCode: "NODE_C",
        title: "Node C",
      });

      // A -> B
      await addDependencyDefinitionToVersion({
        workflowVersionId: ver.workflowVersionId,
        predecessorTaskTypeCode: "NODE_A",
        successorTaskTypeCode: "NODE_B",
      });

      // B -> C
      await addDependencyDefinitionToVersion({
        workflowVersionId: ver.workflowVersionId,
        predecessorTaskTypeCode: "NODE_B",
        successorTaskTypeCode: "NODE_C",
      });

      // C -> A would introduce a directed cycle A -> B -> C -> A!
      await expect(
        addDependencyDefinitionToVersion({
          workflowVersionId: ver.workflowVersionId,
          predecessorTaskTypeCode: "NODE_C",
          successorTaskTypeCode: "NODE_A",
        }),
      ).rejects.toThrowError(
        /Cycle detected in Workflow Definition Version|WORKFLOW_DAG_CYCLE_DETECTED/,
      );
    });
  });

  describe("3. Workflow Instantiation & Task DAG Materialization", () => {
    it("instantiates a versioned workflow definition, materializing concrete tasks and dependencies", async () => {
      // Seed standard ocean export workflow definition
      const def = await seedStandardWorkflowDefinitions();
      expect(def.activeVersionId).toBeDefined();

      const shipmentId = `shp_wfi_test_${Date.now()}`;

      // Instantiate workflow for this shipment
      const instance = await instantiateWorkflow({
        definitionKey: "OCEAN_EXPORT_STANDARD",
        subjectType: "SHIPMENT",
        subjectId: shipmentId,
        variables: { priorityCustomer: true, bookingRef: "BK-EXP-001" },
      });

      expect(instance.instanceId).toBeDefined();
      expect(instance.status).toBe("RUNNING");
      expect(instance.tasks.length).toBe(3);

      // Verify task statuses in instance and work_mgmt_tasks_v2
      const taskA = instance.tasks.find(
        (t) => t.taskTypeCode === "CONFIRM_CARRIER_BOOKING",
      );
      const taskB = instance.tasks.find(
        (t) => t.taskTypeCode === "VERIFY_VGM_CUTOFF",
      );
      const taskC = instance.tasks.find(
        (t) => t.taskTypeCode === "ISSUE_BILL_OF_LADING",
      );

      expect(taskA?.status).toBe("OPEN");
      expect(taskB?.status).toBe("BLOCKED");
      expect(taskC?.status).toBe("BLOCKED");

      // Verify tasks are present in subject task view
      const tasksInDb = await getTasksForSubject("SHIPMENT", shipmentId);
      expect(tasksInDb.length).toBe(3);

      const dbTaskA = tasksInDb.find(
        (t) => t.taskType === "CONFIRM_CARRIER_BOOKING",
      );
      const dbTaskB = tasksInDb.find((t) => t.taskType === "VERIFY_VGM_CUTOFF");
      expect(dbTaskA?.isBlocked).toBe(false);
      expect(dbTaskB?.isBlocked).toBe(true);
      expect(dbTaskB?.dependencies.length).toBe(1);
    });
  });

  describe("4. Task Completion Cascading & Workflow Auto-Completion", () => {
    it("advances workflow instance state as tasks complete, transitioning the workflow instance to COMPLETED upon final task finish", async () => {
      await seedStandardWorkflowDefinitions();
      const shipmentId = `shp_wfi_complete_${Date.now()}`;

      const instance = await instantiateWorkflow({
        definitionKey: "OCEAN_EXPORT_STANDARD",
        subjectType: "SHIPMENT",
        subjectId: shipmentId,
      });

      const taskAId = instance.tasks.find(
        (t) => t.taskTypeCode === "CONFIRM_CARRIER_BOOKING",
      )!.taskId;
      const taskBId = instance.tasks.find(
        (t) => t.taskTypeCode === "VERIFY_VGM_CUTOFF",
      )!.taskId;
      const taskCId = instance.tasks.find(
        (t) => t.taskTypeCode === "ISSUE_BILL_OF_LADING",
      )!.taskId;

      // 1. Complete Task A -> unblocks Task B
      await completeTask(taskAId, { bookingRef: "BK-OK-1" });
      const instCheck = await getWorkflowInstanceById(instance.instanceId);
      expect(instCheck.status).toBe("RUNNING");

      const taskBCheck = (
        await getTasksForSubject("SHIPMENT", shipmentId)
      ).find((t) => t.taskId === taskBId);
      expect(taskBCheck?.status).toBe("OPEN");
      expect(taskBCheck?.isBlocked).toBe(false);

      // 2. Complete Task B -> unblocks Task C
      await completeTask(taskBId, { vgmWeightKg: 22400 });
      const taskCCheck = (
        await getTasksForSubject("SHIPMENT", shipmentId)
      ).find((t) => t.taskId === taskCId);
      expect(taskCCheck?.status).toBe("OPEN");
      expect(taskCCheck?.isBlocked).toBe(false);

      // 3. Complete Task C -> All tasks completed -> WorkflowInstance transitions to COMPLETED
      await completeTask(taskCId, { blNumber: "HBL-ESBCN-001" });

      const finalInstance = await getWorkflowInstanceById(instance.instanceId);
      expect(finalInstance.status).toBe("COMPLETED");
      expect(finalInstance.completedAt).toBeDefined();
      expect(finalInstance.tasks.every((t) => t.status === "COMPLETED")).toBe(
        true,
      );
    });
  });

  describe("5. End-to-End Operational Reactive Integration via API", () => {
    it("creates shipment, plans route, auto-selects versioned workflow definition, executes DAG, and verifies audit trail", async () => {
      const shipmentRef = `SHP-WF-E2E-${Date.now()}`;

      // 1. Create Operational Shipment via API
      const resShipment = await app.inject({
        method: "POST",
        url: "/api/scm/v1/operational/shipments",
        payload: {
          shipmentReference: shipmentRef,
          serviceType: "OCEAN_FCL",
          customerPartyId: "pty_global_export",
        },
      });
      expect(resShipment.statusCode).toBe(201);
      const shipment = resShipment.json();

      // 2. Plan Route via API (triggers RoutePlanned.v2 -> MilestonePlan -> Versioned Workflow Instantiation)
      const resRoute = await app.inject({
        method: "POST",
        url: `/api/scm/v1/operational/shipments/${shipment.shipmentId}/route-plan`,
        payload: {
          stops: [
            { sequence: 1, locationId: "ESBCN", stopType: "PORT" },
            { sequence: 2, locationId: "SGSIN", stopType: "PORT" },
          ],
          legs: [
            {
              sequence: 1,
              originLocationId: "ESBCN",
              destinationLocationId: "SGSIN",
              transportMode: "OCEAN",
              plannedDeparture: "2026-11-15T08:00:00Z",
              plannedArrival: "2026-12-05T12:00:00Z",
            },
          ],
        },
      });
      expect(resRoute.statusCode).toBe(201);

      // 3. Verify Shipment 360 view has active workflow-instantiated tasks
      const res360 = await app.inject({
        method: "GET",
        url: `/api/scm/v1/operational/shipments/${shipment.shipmentId}/360`,
      });
      expect(res360.statusCode).toBe(200);
      const model360 = res360.json();
      expect(model360.tasks.length).toBe(3);

      const taskA = model360.tasks.find(
        (t: any) => t.taskType === "CONFIRM_CARRIER_BOOKING",
      );
      expect(taskA.status).toBe("OPEN");
      expect(taskA.isBlocked).toBe(false);

      // 4. Complete tasks sequentially through API
      const taskB = model360.tasks.find(
        (t: any) => t.taskType === "VERIFY_VGM_CUTOFF",
      );
      const taskC = model360.tasks.find(
        (t: any) => t.taskType === "ISSUE_BILL_OF_LADING",
      );

      await app.inject({
        method: "POST",
        url: `/api/scm/v1/operational/tasks/${taskA.taskId}/complete`,
        payload: { result: { booking: "CONFIRMED" } },
      });

      await app.inject({
        method: "POST",
        url: `/api/scm/v1/operational/tasks/${taskB.taskId}/complete`,
        payload: { result: { vgm: "VERIFIED" } },
      });

      await app.inject({
        method: "POST",
        url: `/api/scm/v1/operational/tasks/${taskC.taskId}/complete`,
        payload: { result: { bl: "ISSUED" } },
      });

      // 5. Inspect Audit Trail via API
      const resAudit = await app.inject({
        method: "GET",
        url: `/api/scm/v1/operational/shipments/${shipment.shipmentId}/audit-trail`,
      });
      expect(resAudit.statusCode).toBe(200);
      const auditSteps = resAudit.json();

      const stages = auditSteps.map((s: any) => s.stage);
      expect(stages).toContain("SHIPMENT_CREATED");
      expect(stages).toContain("ROUTE_PLANNED");
      expect(stages).toContain("MILESTONES_GENERATED");
      expect(stages).toContain("WORKFLOW_STARTED");
      expect(stages).toContain("TASKS_GENERATED");
      expect(stages).toContain("TASK_COMPLETED");
      expect(stages).toContain("TASK_UNBLOCKED");
      expect(stages).toContain("WORKFLOW_COMPLETED");
    });
  });
});
