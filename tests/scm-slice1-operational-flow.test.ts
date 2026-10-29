import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import scmV1Routes from "../src/routes/scm-v1.routes.js";
import {
  createTask,
  addTaskDependency,
  completeTask,
} from "../src/scm/contexts/work-management/work-management.context.js";
import {
  createOperationalShipment,
  updateOperationalShipment,
  getShipment360OperationalModel,
} from "../src/scm/contexts/operational-core/slice1-operational.context.js";
import { DomainInvariantError } from "../src/scm/kernel/primitives.js";

describe("SCM Logical Model v1 — Vertical Slice 1 & 2 Operational Flow", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(scmV1Routes, { prefix: "/api/scm/v1" });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("1. Task Management: Strict DAG Transitive Cycle Prevention", () => {
    it("rejects direct self-dependencies (A -> A)", async () => {
      const taskA = await createTask({
        taskType: "CUSTOMS_DOCUMENT_PREP",
        subjectType: "SHIPMENT",
        subjectId: "shp_test_dag_1",
      });

      await expect(
        addTaskDependency({
          predecessorTaskId: taskA.taskId,
          successorTaskId: taskA.taskId,
        }),
      ).rejects.toThrowError(
        /Task '.*' cannot depend on itself|TASK_SELF_DEPENDENCY_FORBIDDEN/,
      );
    });

    it("rejects 2-hop cycles (A -> B -> A)", async () => {
      const taskA = await createTask({
        taskType: "VERIFY_COMMERCIAL_INVOICE",
        subjectType: "SHIPMENT",
        subjectId: "shp_test_dag_2",
      });
      const taskB = await createTask({
        taskType: "GENERATE_PACKING_LIST",
        subjectType: "SHIPMENT",
        subjectId: "shp_test_dag_2",
      });

      // A -> B is valid
      const depAB = await addTaskDependency({
        predecessorTaskId: taskA.taskId,
        successorTaskId: taskB.taskId,
      });
      expect(depAB.dependencyId).toBeDefined();

      // B -> A must be rejected by cycle detector
      await expect(
        addTaskDependency({
          predecessorTaskId: taskB.taskId,
          successorTaskId: taskA.taskId,
        }),
      ).rejects.toThrowError(
        /Cycle detected: Task '.*' is already reachable from '.*'|TASK_CYCLIC_DEPENDENCY_DETECTED/,
      );
    });

    it("rejects 3-hop transitive cycles (A -> B -> C -> A)", async () => {
      const taskA = await createTask({
        taskType: "BOOK_CONTAINER_PICKUP",
        subjectType: "SHIPMENT",
        subjectId: "shp_test_dag_3",
      });
      const taskB = await createTask({
        taskType: "SUBMIT_EXPORT_DECLARATION",
        subjectType: "SHIPMENT",
        subjectId: "shp_test_dag_3",
      });
      const taskC = await createTask({
        taskType: "REQUEST_CUSTOMS_RELEASE",
        subjectType: "SHIPMENT",
        subjectId: "shp_test_dag_3",
      });

      // A -> B
      await addTaskDependency({
        predecessorTaskId: taskA.taskId,
        successorTaskId: taskB.taskId,
      });
      // B -> C
      await addTaskDependency({
        predecessorTaskId: taskB.taskId,
        successorTaskId: taskC.taskId,
      });

      // C -> A would close the triangle cycle A -> B -> C -> A
      await expect(
        addTaskDependency({
          predecessorTaskId: taskC.taskId,
          successorTaskId: taskA.taskId,
        }),
      ).rejects.toThrowError(
        /Cycle detected: Task '.*' is already reachable from '.*'|TASK_CYCLIC_DEPENDENCY_DETECTED/,
      );
    });

    it("allows valid multi-path diamond DAGs without false positive cycle errors (A -> B, A -> C, B -> D, C -> D)", async () => {
      const taskA = await createTask({
        taskType: "INSPECT_CARGO",
        subjectType: "SHIPMENT",
        subjectId: "shp_test_dag_4",
      });
      const taskB = await createTask({
        taskType: "ISSUE_PHYTOSANITARY_CERT",
        subjectType: "SHIPMENT",
        subjectId: "shp_test_dag_4",
      });
      const taskC = await createTask({
        taskType: "ISSUE_ORIGIN_CERT",
        subjectType: "SHIPMENT",
        subjectId: "shp_test_dag_4",
      });
      const taskD = await createTask({
        taskType: "CLEAR_EXPORT_GATE",
        subjectType: "SHIPMENT",
        subjectId: "shp_test_dag_4",
      });

      // Diamond:
      //      A
      //     / \
      //    B   C
      //     \ /
      //      D
      await addTaskDependency({
        predecessorTaskId: taskA.taskId,
        successorTaskId: taskB.taskId,
      });
      await addTaskDependency({
        predecessorTaskId: taskA.taskId,
        successorTaskId: taskC.taskId,
      });
      await addTaskDependency({
        predecessorTaskId: taskB.taskId,
        successorTaskId: taskD.taskId,
      });
      const depCD = await addTaskDependency({
        predecessorTaskId: taskC.taskId,
        successorTaskId: taskD.taskId,
      });

      expect(depCD.dependencyId).toBeDefined();
    });
  });

  describe("2. Task Gating & Unblocking Flow", () => {
    it("blocks task completion until predecessor is completed, and automatically unblocks successor", async () => {
      const pred = await createTask({
        taskType: "ORIGIN_GATE_IN_CHECK",
        subjectType: "SHIPMENT",
        subjectId: "shp_test_gate_1",
      });
      const succ = await createTask({
        taskType: "LOAD_ON_VESSEL",
        subjectType: "SHIPMENT",
        subjectId: "shp_test_gate_1",
      });

      // Add finish-to-start blocking dependency: pred must finish before succ starts
      await addTaskDependency({
        predecessorTaskId: pred.taskId,
        successorTaskId: succ.taskId,
        dependencyType: "FINISH_TO_START",
        status: "BLOCKING",
      });

      // Attempting to complete successor while predecessor is OPEN must throw TASK_BLOCKED_BY_PREDECESSOR
      await expect(completeTask(succ.taskId)).rejects.toThrowError(
        /Cannot complete Task '.*': blocked by incomplete predecessor Task|TASK_BLOCKED_BY_PREDECESSOR/,
      );

      // Now complete predecessor
      const completedPred = await completeTask(pred.taskId, {
        gateConfirmed: true,
      });
      expect(completedPred.status).toBe("COMPLETED");
      expect(completedPred.completedAt).toBeDefined();

      // Completing successor must now succeed!
      const completedSucc = await completeTask(succ.taskId, {
        vesselCraneId: "CRANE-04",
      });
      expect(completedSucc.status).toBe("COMPLETED");
      expect(completedSucc.completedAt).toBeDefined();
    });
  });

  describe("3. Aggregate Optimistic Concurrency Control", () => {
    it("prevents lost updates when expectedVersion does not match current version", async () => {
      const shp = await createOperationalShipment({
        shipmentReference: `SHP-OCC-${Date.now()}`,
        serviceType: "OCEAN_FCL",
        customerPartyId: "pty_cust_occ",
      });

      expect(shp.version).toBe(1);

      // Update with mismatched expectedVersion (e.g. stale client version 99)
      await expect(
        updateOperationalShipment({
          shipmentId: shp.shipmentId,
          expectedVersion: 99,
          lifecycle: "IN_TRANSIT",
        }),
      ).rejects.toThrowError(
        /Optimistic locking conflict on Shipment|CONCURRENCY_CONFLICT/,
      );

      // Update with matching expectedVersion 1 succeeds and bumps to version 2
      const updated = await updateOperationalShipment({
        shipmentId: shp.shipmentId,
        expectedVersion: 1,
        lifecycle: "IN_TRANSIT",
      });
      expect(updated.version).toBe(2);
      expect(updated.lifecycle).toBe("IN_TRANSIT");

      // Attempting to reuse stale version 1 must now fail
      await expect(
        updateOperationalShipment({
          shipmentId: shp.shipmentId,
          expectedVersion: 1,
          lifecycle: "DELIVERED",
        }),
      ).rejects.toThrowError(
        /Optimistic locking conflict on Shipment|CONCURRENCY_CONFLICT/,
      );
    });
  });

  describe("4. End-to-End Operational Flow (Slice 1 -> Slice 2 Reactive Architecture)", () => {
    it("executes Command -> Event -> Outbox -> Reactive Generation of MilestonePlan and Gated Task DAG -> Shipment360 Projection", async () => {
      const shipmentRef = `SHP-OPS-${Date.now()}`;

      // Step 1: Create Operational Shipment via API
      const resCreate = await app.inject({
        method: "POST",
        url: "/api/scm/v1/operational/shipments",
        payload: {
          shipmentReference: shipmentRef,
          serviceType: "OCEAN_FCL",
          customerPartyId: "pty_global_trader",
          bookingReference: `BK-${shipmentRef}`,
          teamId: "TEAM-ES-BARCELONA",
        },
      });

      expect(resCreate.statusCode).toBe(201);
      const createdShipment = resCreate.json();
      expect(createdShipment.shipmentId).toBeDefined();
      expect(createdShipment.shipmentReference).toBe(shipmentRef);
      expect(createdShipment.lifecycle).toBe("CREATED");
      expect(createdShipment.references.length).toBeGreaterThan(0);
      expect(createdShipment.partyRoles.length).toBeGreaterThan(0);
      expect(createdShipment.assignments.length).toBeGreaterThan(0);

      const shipmentId = createdShipment.shipmentId;

      // Step 2: Create Initial Corridor Route Plan via API
      const resRoute = await app.inject({
        method: "POST",
        url: `/api/scm/v1/operational/shipments/${shipmentId}/route-plan`,
        payload: {
          stops: [
            {
              sequence: 1,
              locationId: "ESBCN",
              stopType: "PORT",
              plannedDeparture: "2026-11-05T08:00:00Z",
            },
            {
              sequence: 2,
              locationId: "USNYC",
              stopType: "PORT",
              plannedArrival: "2026-11-18T18:00:00Z",
            },
          ],
          legs: [
            {
              sequence: 1,
              originLocationId: "ESBCN",
              destinationLocationId: "USNYC",
              transportMode: "OCEAN",
              plannedDeparture: "2026-11-05T08:00:00Z",
              plannedArrival: "2026-11-18T18:00:00Z",
            },
          ],
        },
      });

      expect(resRoute.statusCode).toBe(201);
      const createdRoute = resRoute.json();
      expect(createdRoute.routePlanId).toBeDefined();
      expect(createdRoute.status).toBe("PUBLISHED");

      // Step 3: Verify Shipment360 CQRS Projection
      const res360 = await app.inject({
        method: "GET",
        url: `/api/scm/v1/operational/shipments/${shipmentId}/360`,
      });

      expect(res360.statusCode).toBe(200);
      const model360 = res360.json();

      // Validate Shipment aggregate state
      expect(model360.shipment.shipmentId).toBe(shipmentId);
      expect(model360.shipment.lifecycle).toBe("PLANNED");

      // Validate RoutePlan aggregate state
      expect(model360.routePlan).toBeDefined();
      expect(model360.routePlan.stops.length).toBe(2);
      expect(model360.routePlan.legs.length).toBe(1);

      // Validate Reactive MilestonePlan generation (triggered by RoutePlanned.v2 event)
      expect(model360.milestonePlan).toBeDefined();
      expect(model360.milestonePlan.milestones.length).toBe(5);
      const milestoneCodes = model360.milestonePlan.milestones.map(
        (m: any) => m.milestoneType,
      );
      expect(milestoneCodes).toEqual([
        "GATE_IN",
        "VGM_CUTOFF",
        "POL_DEPARTURE",
        "ETA_POD",
        "POD_DELIVERY",
      ]);

      // Validate Reactive Task DAG generation (triggered by MilestonePlanCreated.v2 event)
      expect(model360.tasks.length).toBe(3);
      const taskA = model360.tasks.find(
        (t: any) => t.taskType === "CONFIRM_CARRIER_BOOKING",
      );
      const taskB = model360.tasks.find(
        (t: any) => t.taskType === "VERIFY_VGM_CUTOFF",
      );
      const taskC = model360.tasks.find(
        (t: any) => t.taskType === "ISSUE_BILL_OF_LADING",
      );

      expect(taskA).toBeDefined();
      expect(taskB).toBeDefined();
      expect(taskC).toBeDefined();

      // Task A is first in pipeline -> OPEN
      expect(taskA.status).toBe("OPEN");
      expect(taskA.isBlocked).toBe(false);

      // Task B depends on Task A -> BLOCKED
      expect(taskB.status).toBe("BLOCKED");
      expect(taskB.isBlocked).toBe(true);

      // Task C depends on Task B -> BLOCKED
      expect(taskC.status).toBe("BLOCKED");
      expect(taskC.isBlocked).toBe(true);

      // Step 4: Step through gated Task execution
      // Attempting to complete Task C should fail with 422 DOMAIN_INVARIANT_VIOLATION
      const resCompleteFail = await app.inject({
        method: "POST",
        url: `/api/scm/v1/operational/tasks/${taskC.taskId}/complete`,
        payload: { result: { docId: "BL-999" } },
      });
      expect(resCompleteFail.statusCode).toBe(422);
      expect(resCompleteFail.json().code).toBe("TASK_BLOCKED_BY_PREDECESSOR");

      // 1. Complete Task A
      const resCompleteA = await app.inject({
        method: "POST",
        url: `/api/scm/v1/operational/tasks/${taskA.taskId}/complete`,
        payload: { result: { carrierBookingNumber: "CMA-BCN-998822" } },
      });
      expect(resCompleteA.statusCode).toBe(200);
      expect(resCompleteA.json().status).toBe("COMPLETED");

      // Now Task B should be automatically unblocked to OPEN!
      const resTasksAfterA = await app.inject({
        method: "GET",
        url: `/api/scm/v1/operational/tasks?subjectType=SHIPMENT&subjectId=${shipmentId}`,
      });
      expect(resTasksAfterA.statusCode).toBe(200);
      const tasksAfterA = resTasksAfterA.json();
      const updatedB = tasksAfterA.find((t: any) => t.taskId === taskB.taskId);
      expect(updatedB.status).toBe("OPEN");
      expect(updatedB.isBlocked).toBe(false);

      // 2. Complete Task B
      const resCompleteB = await app.inject({
        method: "POST",
        url: `/api/scm/v1/operational/tasks/${taskB.taskId}/complete`,
        payload: { result: { vgmWeightKg: 24500, method: "METHOD_1" } },
      });
      expect(resCompleteB.statusCode).toBe(200);
      expect(resCompleteB.json().status).toBe("COMPLETED");

      // Now Task C should be automatically unblocked to OPEN!
      const resTasksAfterB = await app.inject({
        method: "GET",
        url: `/api/scm/v1/operational/tasks?subjectType=SHIPMENT&subjectId=${shipmentId}`,
      });
      const tasksAfterB = resTasksAfterB.json();
      const updatedC = tasksAfterB.find((t: any) => t.taskId === taskC.taskId);
      expect(updatedC.status).toBe("OPEN");
      expect(updatedC.isBlocked).toBe(false);

      // 3. Complete Task C
      const resCompleteC = await app.inject({
        method: "POST",
        url: `/api/scm/v1/operational/tasks/${taskC.taskId}/complete`,
        payload: {
          result: { blNumber: "BL-BCN-NYC-00129", originalIssued: true },
        },
      });
      expect(resCompleteC.statusCode).toBe(200);
      expect(resCompleteC.json().status).toBe("COMPLETED");

      // Final inspection on Shipment 360 projection: all 3 tasks are COMPLETED
      const final360 = await getShipment360OperationalModel(shipmentId);
      expect(final360.tasks.every((t) => t.status === "COMPLETED")).toBe(true);
    });
  });
});
