import { protectedProcedure, router } from "../trpc.js";
import { db } from "../../db/db.config.js";
import { TRPCError } from "@trpc/server";

export const shipmentsRouter = router({
  getShipments: protectedProcedure.query(async ({ ctx }) => {
    const { user } = ctx;

    // Using Drizzle relational queries for simplicity
    const results = await db.query.shipments.findMany({
      with: {
        origin: true,
        destination: true,
        supplier: true,
        billingParty: true,
      },
      where: (shipmentTable, { eq, or }) => {
        if (user.role === "CUSTOMER") {
          if (!user.companyId) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Customer has no company assigned.",
            });
          }
          // Only return shipments where the customer is either supplier or billing party
          return or(
            eq(shipmentTable.supplierId, user.companyId),
            eq(shipmentTable.billingPartyId, user.companyId),
          );
        }
        // Operators/Admins see all
        return undefined;
      },
      orderBy: (shipmentTable, { desc }) => [desc(shipmentTable.createdAt)],
      limit: 100,
    });

    return results;
  }),
});
