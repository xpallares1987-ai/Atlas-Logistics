import { ZBClient } from 'zeebe-node';

export const zbc = new ZBClient({
  camundaCloud: {
    clusterId: process.env.ZEEBE_CLUSTER_ID as string,
    clientId: process.env.ZEEBE_CLIENT_ID as string,
    clientSecret: process.env.ZEEBE_CLIENT_SECRET as string,
    clusterRegion: process.env.ZEEBE_CLUSTER_REGION as string,
  },
});

export const deployProcess = async (resourcePath: string) => {
  return await zbc.deployResource({ resourceName: resourcePath });
};

export const createShipmentInstance = async (trackingNumber: string, carrierId: number) => {
  return await zbc.createProcessInstance({
    bpmnProcessId: 'ShipmentProcess',
    variables: {
      trackingNumber,
      carrierId,
      status: 'Booked'
    },
  });
};

export const evaluateSurcharges = async (carrierCode: string) => {
  const result = await zbc.evaluateDecision({
    decisionId: 'SurchargeDecision',
    variables: {
      carrier: carrierCode
    }
  });
  return result.evaluatedDecision;
};

export const createZeebeWorker = (taskType: string, handler: (job: any) => Promise<void>) => {
  return zbc.createWorker({
    taskType,
    taskHandler: async (job, complete) => {
      try {
        await handler(job.variables);
        complete.success();
      } catch (error) {
        complete.failure((error as Error).message, 0);
      }
    }
  });
};