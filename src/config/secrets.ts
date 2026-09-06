import dotenv from "dotenv";

dotenv.config({ path: ".env.local", override: false });

/**
 * Loads secrets from Google Cloud Secret Manager.
 * Currently a stub implementation for local development.
 *
 * In production with Google Cloud, implement real secret loading:
 * 1. Install @google-cloud/secret-manager
 * 2. Authenticate with GOOGLE_APPLICATION_CREDENTIALS
 * 3. Fetch secrets by name and set as process.env
 *
 * Example:
 * const secretManager = new SecretManagerServiceClient();
 * const name = secretManager.secretVersionPath(projectId, secretName, 'latest');
 * const [version] = await secretManager.accessSecretVersion({ name });
 * process.env[secretName] = version.payload.data.toString('utf-8');
 */
export async function loadSecrets(projectId: string) {
  console.log(
    `[Secrets] Local environment detected, using .env. Implement Google Cloud Secret Manager integration for production with projectId: ${projectId}`,
  );
}
