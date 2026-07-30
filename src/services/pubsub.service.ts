const DOCUMENT_UPLOAD_TOPIC = 'document-uploaded-topic';

export const initPubSub = async () => {
  console.log(`[PubSub Mock] initPubSub: Local topic ${DOCUMENT_UPLOAD_TOPIC} ready.`);
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
