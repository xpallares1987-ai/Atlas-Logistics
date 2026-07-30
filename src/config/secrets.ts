import dotenv from "dotenv";

dotenv.config({ path: ".env.local", override: false });

export async function loadSecrets(projectId: string) {
  console.log("[Secrets] Local environment detected, using .env");
}
