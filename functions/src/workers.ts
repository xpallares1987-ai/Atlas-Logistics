import { Camunda8 } from "@camunda8/sdk";

let zeebeClient: any = null;

export function getZeebeWorker(clusterId: string, clientId: string, clientSecret: string) {
  if (!zeebeClient) {
    console.log("Initializing Camunda 8 Zeebe Client...");
    const c8 = new Camunda8({
      CAMUNDA_OAUTH_URL: "https://login.cloud.camunda.io/oauth/token",
      ZEEBE_ADDRESS: `${clusterId}.bru-2.zeebe.camunda.io:443`,
      ZEEBE_CLIENT_ID: clientId,
      ZEEBE_CLIENT_SECRET: clientSecret,
    });
    zeebeClient = c8.getZeebeGrpcApiClient();
  }
  return zeebeClient;
}

export function startWorkers(clusterId: string, clientId: string, clientSecret: string) {
  const zeebe = getZeebeWorker(clusterId, clientId, clientSecret);

  console.log("Starting Zeebe worker for 'validate-customs'...");
  
  zeebe.createWorker({
    taskType: "validate-customs",
    taskHandler: (job: any) => {
      console.log(`[Worker] Validating customs for job ${job.key}`);
      // const { variables } = job;
      
      // Simular lógica de aprobación aduanera predictiva o automática
      const isApproved = Math.random() > 0.1; // 90% approval rate
      
      return job.complete({
        customsApproved: isApproved,
        validatedAt: new Date().toISOString(),
        inspector: "Atlas AI Auto-Clearance"
      });
    }
  });

  return { status: "Workers started" };
}
