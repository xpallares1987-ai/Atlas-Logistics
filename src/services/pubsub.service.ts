import { EventEmitter } from "events";
import { logger } from "../config/logger.js";

export const pubsub = new EventEmitter();

const DOCUMENT_UPLOAD_TOPIC = "document-uploaded-topic";

export const initPubSub = async () => {
  logger.info(
    `[PubSub Mock] initPubSub: Local topic ${DOCUMENT_UPLOAD_TOPIC} ready.`,
  );

  pubsub.on("accounting.sync.requested", (payload) => {
    logger.info(
      `[QuickBooks Mock Sync] Invoice ${payload.invoiceNumber || payload.invoiceId} (${payload.status}) synced to accounting system at ${payload.timestamp}`,
    );
  });
};

export const publishDocumentUploaded = async (payload: {
  shipmentId: string;
  gcsUrl: string;
  mimeType: string;
}) => {
  logger.debug("PubSub Mock: publishDocumentUploaded", { payload });
  return "mock-id";
};

export const publishInvoiceGenerated = async (payload: any) => {
  logger.debug("PubSub Mock: publishInvoiceGenerated", { payload });
  return "mock-message-id";
};
