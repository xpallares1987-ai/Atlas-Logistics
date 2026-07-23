import { PubSub } from '@google-cloud/pubsub';

const usePubSub = !!(process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.PUBSUB_EMULATOR_HOST || process.env.NODE_ENV === 'production');
const pubsub = usePubSub ? new PubSub() : null;
const DOCUMENT_UPLOAD_TOPIC = 'document-uploaded-topic';

// Initialize topic (in production this is normally managed via Terraform/deployment scripts)
export const initPubSub = async () => {
  if (!pubsub) return;
  try {
    const [exists] = await pubsub.topic(DOCUMENT_UPLOAD_TOPIC).exists();
    if (!exists) {
      await pubsub.createTopic(DOCUMENT_UPLOAD_TOPIC);
      console.log(`Topic ${DOCUMENT_UPLOAD_TOPIC} created.`);
    }
  } catch (error) {
    console.warn('PubSub init warn (ignoring if running locally without emulator):', error);
  }
};

export const publishDocumentUploaded = async (payload: {
  shipmentId: string;
  gcsUrl: string;
  mimeType: string;
}) => {
  if (!pubsub) {
    console.log(`[PubSub Mock] Skipping publish for ${payload.shipmentId} (No credentials)`);
    return "mock-id";
  }
  try {
    const dataBuffer = Buffer.from(JSON.stringify(payload));
    const messageId = await pubsub.topic(DOCUMENT_UPLOAD_TOPIC).publishMessage({ data: dataBuffer });
    console.log(`Message ${messageId} published to ${DOCUMENT_UPLOAD_TOPIC}`);
    return messageId;
  } catch (error) {
    console.error(`Error publishing to ${DOCUMENT_UPLOAD_TOPIC}:`, error);
    throw error;
  }
};

export const publishInvoiceGenerated = async (payload: any) => {
  console.log(`[PubSub Mock] publishInvoiceGenerated:`, payload);
  return "mock-message-id";
};
