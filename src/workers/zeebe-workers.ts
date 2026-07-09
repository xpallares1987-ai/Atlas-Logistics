import { ZBClient } from "zeebe-node";
import { eventBus } from "../core/event-bus.js";

/**
 * Register Zeebe job workers to execute BPMN service tasks.
 * @param zbc - The initialized Zeebe client
 */
export function startZeebeWorkers(zbc: ZBClient) {
  // Example Worker: Calculate Surcharges
  zbc.createWorker({
    taskType: "calculate-surcharges",
    taskHandler: (job) => {
      console.log(`[Worker] Calculating surcharges for job ${job.key}`);

      const { shipmentId, baseCost } = job.variables;

      // Simulate some heavy calculation...
      const totalCost = (baseCost || 1000) * 1.15; // +15% BAF/PSS

      // Emit an event that the WebSocket will broadcast to the frontend
      eventBus.publish("workflow:update", {
        type: "SURCHARGE_CALCULATED",
        shipmentId,
        details: `Surcharges computed. Total cost: $${totalCost}`,
      });

      return job.complete({
        totalCost,
        surchargeApplied: true,
      });
    },
  });

  // Example Worker: Notify Customs
  zbc.createWorker({
    taskType: "notify-customs",
    taskHandler: (job) => {
      console.log(`[Worker] Notifying customs for job ${job.key}`);

      const { shipmentId } = job.variables;

      eventBus.publish("workflow:update", {
        type: "CUSTOMS_NOTIFIED",
        shipmentId,
        details: "Customs declaration submitted electronically via EDI.",
      });

      return job.complete({
        customsStatus: "SUBMITTED",
      });
    },
  });
}
