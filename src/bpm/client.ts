import 'dotenv/config';
import { Camunda8 } from '@camunda8/sdk';

const c8 = new Camunda8({
  ZEEBE_CLIENT_ID: process.env.CAMUNDA_CLIENT_ID,
  ZEEBE_CLIENT_SECRET: process.env.CAMUNDA_CLIENT_SECRET,
  CAMUNDA_CLUSTER_ID: process.env.CAMUNDA_CLUSTER_ID,
  CAMUNDA_CLUSTER_REGION: process.env.CAMUNDA_CLUSTER_REGION || 'bru-2',
});

const zbc = c8.getZeebeGrpcApiClient();

zbc.on('ready', () => {
  console.log('Zeebe Client connected successfully!');
});

zbc.on('connectionError', () => {
  console.log('Zeebe Client connection error. Check your cluster connection.');
});

export { zbc };
