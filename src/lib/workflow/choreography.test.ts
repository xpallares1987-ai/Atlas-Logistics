import { describe, it, expect, vi } from "vitest";
import {
  TransactionalJobBus,
  BusinessSagaOrchestrator,
  SagaStep,
} from "./choreography-engine.js";

describe("Dual-Track Choreography Engine", () => {
  describe("Track 1: TransactionalJobBus", () => {
    it("dispatches job to registered handler with in-memory execution", async () => {
      const bus = new TransactionalJobBus();
      const mockHandler = vi
        .fn()
        .mockResolvedValue({ pdfUrl: "https://s3/docs/inv-1.pdf" });

      bus.registerHandler("pdf-generation", mockHandler);

      const result = await bus.dispatch(
        "pdf-generation",
        "render-invoice-pdf",
        {
          invoiceId: "inv-101",
        },
      );

      expect(result.status).toBe("COMPLETED_SYNC");
      expect(result.result).toEqual({ pdfUrl: "https://s3/docs/inv-1.pdf" });
      expect(mockHandler).toHaveBeenCalledWith({ invoiceId: "inv-101" });
    });
  });

  describe("Track 2: BusinessSagaOrchestrator", () => {
    interface CustomsSagaContext {
      declarationId: string;
      hsCode: string;
      channel?: "GREEN" | "ORANGE" | "RED";
      cleared?: boolean;
      lotStatus?: "PENDING" | "RELEASED" | "HOLD";
    }

    it("successfully runs all steps of a business saga", async () => {
      const orchestrator = new BusinessSagaOrchestrator();

      const steps: SagaStep<CustomsSagaContext>[] = [
        {
          name: "ValidateDeclaration",
          execute: async (ctx) => ({ channel: "GREEN" }),
        },
        {
          name: "ClearCustoms",
          execute: async (ctx) => ({ cleared: true }),
        },
        {
          name: "ReleaseWarehouseLot",
          execute: async (ctx) => ({ lotStatus: "RELEASED" }),
        },
      ];

      const result = await orchestrator.execute("CustomsClearanceSaga", steps, {
        declarationId: "DEC-2026-001",
        hsCode: "8471.30.00",
      });

      expect(result.success).toBe(true);
      expect(result.finalContext.channel).toBe("GREEN");
      expect(result.finalContext.cleared).toBe(true);
      expect(result.finalContext.lotStatus).toBe("RELEASED");
      expect(result.executedSteps).toHaveLength(3);
      expect(result.executedSteps.every((s) => s.status === "COMPLETED")).toBe(
        true,
      );
    });

    it("triggers compensation rollback in reverse order when a step fails", async () => {
      const orchestrator = new BusinessSagaOrchestrator();
      const rollbackOrder: string[] = [];

      const steps: SagaStep<CustomsSagaContext>[] = [
        {
          name: "ReserveWarehouseLot",
          execute: async () => ({ lotStatus: "PENDING" }),
          compensate: async () => {
            rollbackOrder.push("CompensateReserveLot");
          },
        },
        {
          name: "LockCustomsDutyBond",
          execute: async () => ({ channel: "RED" }),
          compensate: async () => {
            rollbackOrder.push("CompensateLockDutyBond");
          },
        },
        {
          name: "PerformPhysicalInspection",
          execute: async () => {
            throw new Error("Physical inspection failed: Contraband detected");
          },
        },
      ];

      const result = await orchestrator.execute("CustomsClearanceSaga", steps, {
        declarationId: "DEC-2026-SUSPECT",
        hsCode: "9999.00.00",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Physical inspection failed");
      // Compensations must be executed in reverse order of completed steps:
      // LockCustomsDutyBond first, then ReserveWarehouseLot
      expect(rollbackOrder).toEqual([
        "CompensateLockDutyBond",
        "CompensateReserveLot",
      ]);
    });
  });
});
