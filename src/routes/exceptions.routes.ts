import { FastifyInstance } from "fastify";

// In-memory exception store for development
const exceptionUpdates = new Map<
  string,
  {
    status: string;
    acknowledged_by?: string;
    assigned_to?: string;
    resolution_note?: string;
  }
>();

export default async function exceptionsRoutes(app: FastifyInstance) {
  // PATCH /exceptions/:id — Update exception status
  app.patch<{
    Params: { id: string };
    Body: { action: string; userId?: string; note?: string };
  }>("/:id", async (request, reply) => {
    const { id } = request.params;
    const { action, userId, note } = request.body;

    const update: {
      status: string;
      acknowledged_by?: string;
      assigned_to?: string;
      resolution_note?: string;
    } = { status: action };
    if (action === "acknowledge") {
      update.acknowledged_by = userId || "system";
    } else if (action === "assign") {
      update.assigned_to = userId || "unassigned";
    } else if (action === "resolve") {
      update.resolution_note = note || "";
      update.status = "resolved";
    }

    exceptionUpdates.set(id, update);
    return reply.send({ success: true, id, ...update });
  });
}
