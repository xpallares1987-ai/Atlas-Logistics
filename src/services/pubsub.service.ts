import { EventEmitter } from "events";

export const pubsub = new EventEmitter();

const DOCUMENT_UPLOAD_TOPIC = "document-uploaded-topic";

export const initPubSub = async () => {
  console.log(
    `[PubSub Mock] initPubSub: Local topic ${DOCUMENT_UPLOAD_TOPIC} ready.`,
  );

  pubsub.on("accounting.sync.requested", (payload) => {
    console.log(
      `[QuickBooks Mock Sync] Invoice ${payload.invoiceNumber || payload.invoiceId} (${payload.status}) synced to accounting system at ${payload.timestamp}`,
    );
  });
};

export const publishDocumentUploaded = async (payload: {
  shipmentId: string;
  gcsUrl: string;
  mimeType: string;
}) => {
  console.log(`[PubSub Mock] publishDocumentUploaded:`, payload);
  return "mock-id";
};

export const publishInvoiceGenerated = async (payload: any) => {
  console.log(`[PubSub Mock] publishInvoiceGenerated:`, payload);
  return "mock-message-id";
};
