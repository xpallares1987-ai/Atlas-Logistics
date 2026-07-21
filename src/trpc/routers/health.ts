import { router, publicProcedure } from "../trpc.js";

export const healthRouter = router({
  check: publicProcedure.query(() => {
    return {
      status: "OK",
      timestamp: new Date().toISOString(),
      message: "tRPC is fully operational on Atlas Logistics V3",
    };
  }),
});
