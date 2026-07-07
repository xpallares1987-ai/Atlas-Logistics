import { Camunda8 } from "@camunda8/sdk";

export async function deployToCamunda(
  clusterId: string,
  clientId: string,
  clientSecret: string,
  xml: string
) {
  const c8 = new Camunda8({
    CAMUNDA_OAUTH_URL: "https://login.cloud.camunda.io/oauth/token",
    ZEEBE_ADDRESS: `${clusterId}.bru-2.zeebe.camunda.io:443`,
    ZEEBE_CLIENT_ID: clientId,
    ZEEBE_CLIENT_SECRET: clientSecret,
  });

  const zeebe = c8.getZeebeGrpcApiClient();

  try {
    const res = await zeebe.deployResource({
      process: Buffer.from(xml, "utf8"),
      name: "process.bpmn",
    });

    return res;
  } catch (err) {
    console.error("Error deploying to Zeebe:", err);
    throw new Error("Failed to deploy to Camunda 8.");
  }
}
