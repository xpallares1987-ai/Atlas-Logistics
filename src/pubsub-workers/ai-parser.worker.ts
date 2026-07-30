import { db } from "../db/db.config.js";
import {
  shipments,
  companies,
  shipmentDocuments,
  pendingAiReviews,
} from "../db/schema.js";
import { eq, ilike } from "drizzle-orm";
import { geminiInvoiceSchema } from "../services/invoiceParser.schema.js";

export const startAiParserWorker = async () => {
  console.warn("[AI-Parser Worker] Disabled in local dev (GCP dependencies removed).");
};
