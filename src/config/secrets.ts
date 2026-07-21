import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local", override: false });

const client = new SecretManagerServiceClient();

export async function loadSecrets(projectId: string) {
  if (process.env.NODE_ENV !== "production") {
    console.log("[Secrets] Local environment detected, using .env");
    return;
  }

  try {
    const secretsToLoad = [
      "DATABASE_URL",
      "ZEEBE_ADDRESS",
      "ZEEBE_CLIENT_ID",
      "ZEEBE_CLIENT_SECRET",
      "ZEEBE_AUTHORIZATION_SERVER_URL",
    ];

    for (const secretName of secretsToLoad) {
      if (!process.env[secretName]) {
        try {
          const [version] = await client.accessSecretVersion({
            name: `projects/${projectId}/secrets/${secretName}/versions/latest`,
          });
          const payload = version.payload?.data?.toString();
          if (payload) {
            process.env[secretName] = payload;
            console.log(`[Secrets] Successfully loaded ${secretName} from Secret Manager`);
          }
        } catch (e: any) {
          console.warn(`[Secrets] Could not load ${secretName}: ${e.message}`);
        }
      }
    }
  } catch (error) {
    console.error("[Secrets] Error loading secrets from GCP:", error);
  }
}
