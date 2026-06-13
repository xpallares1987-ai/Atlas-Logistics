import { Camunda8 } from '@camunda8/sdk';

const c8 = new Camunda8();
export const zbc = c8.getZeebeGrpcApiClient();

export const deployProcess = async (resourcePath: string) => {
  return await zbc.deployResource({ processFilename: resourcePath });
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
  return result.evaluatedDecisions[0]?.decisionOutput || null;
};

export const createZeebeWorker = (taskType: string, handler: (job: any) => Promise<void>) => {
  return zbc.createWorker({
    taskType,
    taskHandler: async (job: any) => {
      try {
        await handler(job.variables);
        return job.complete();
      } catch (error) {
        return job.fail((error as Error).message, 0);
      }
    }
  });
};