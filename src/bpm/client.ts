import { Camunda8 } from '@camunda8/sdk';

const c8 = new Camunda8();

const zbc = c8.getZeebeGrpcApiClient();

zbc.on('ready', () => {
  console.log('Zeebe Client connected successfully!');
});

zbc.on('connectionError', () => {
  console.log('Zeebe Client connection error. Check your cluster connection.');
});

export { zbc };
