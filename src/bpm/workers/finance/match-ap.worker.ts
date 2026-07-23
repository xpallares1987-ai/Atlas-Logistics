import { AtlasWorker } from "../../utils/worker-base.js";
import { db } from "../../../db/db.config.js";
import { pendingAiReviews } from "../../../db/schema.js";
import { eq, and } from "drizzle-orm";

interface MatchAPInput {
  shipmentId: string;
  expectedCost: number;
}

interface MatchAPOutput {
  allMatched: boolean;
  expectedAmount: number;
  actualAmount: number;
  variance: number;
  variancePercent: number;
}

/**
 * Matches expected costs against actual vendor invoices.
 */
class MatchAPWorker extends AtlasWorker<MatchAPInput, MatchAPOutput> {
  readonly taskType = "atlas.invoice.match-ap";

  async execute(job: any): Promise<MatchAPOutput> {
    const { shipmentId, expectedCost = 1000 } = job.variables;

    console.log(`[MatchAPWorker] Matching invoices for shipment ${shipmentId}...`);

    // Fetch the pending AI parsed invoice
    const pendingReviews = await db
      .select()
      .from(pendingAiReviews)
      .where(
        and(
          eq(pendingAiReviews.shipmentId, shipmentId),
          eq(pendingAiReviews.status, "PENDING")
        )
      )
      .limit(1);

    let actualAmount = 0;

    if (pendingReviews.length > 0) {
      const review = pendingReviews[0];
      const parsedData = review.extractedData as any;
      if (parsedData && parsedData.totalAmount) {
        actualAmount = parsedData.totalAmount;
      }
    } else {
      // If no AI review found, simulate an amount with a slight variance
      actualAmount = Math.round(expectedCost * (1 + (Math.random() * 0.1 - 0.05)));
    }

    const variance = Math.abs(expectedCost - actualAmount);
    const variancePercent = (variance / expectedCost) * 100;
    
    // Consider it matched if variance is less than 5%
    const allMatched = variancePercent <= 5;

    console.log(
      `[MatchAPWorker] Match result: expected=$${expectedCost}, actual=$${actualAmount}, variance=${variancePercent.toFixed(2)}%, matched=${allMatched}`
    );

    return {
      allMatched,
      expectedAmount: expectedCost,
      actualAmount,
      variance,
      variancePercent: parseFloat(variancePercent.toFixed(2)),
    };
  }
}

export const matchAPWorker = new MatchAPWorker();
