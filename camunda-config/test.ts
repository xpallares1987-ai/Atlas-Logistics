import { zbc } from '../src/bpm/client.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTest() {
  try {
    console.log('Deploying BPMN...');
    const deployResponse = await zbc.deployResource({
      processFilename: path.join(__dirname, 'bpmn', 'rate-comparer.bpmn')
    });
    console.log('Deployed:', deployResponse);

    console.log('Starting Process Instance...');
    const instanceResponse = await zbc.createProcessInstance({
      bpmnProcessId: 'rate-comparer-process',
      variables: {
        origin: 'Madrid',
        destination: 'Barcelona',
        weight: 1500
      }
    });
    console.log('Instance started:', instanceResponse);

    // Wait a bit to let the worker process the job
    setTimeout(() => {
      console.log('Test completed. You can verify the results in the backend logs or Camunda Operate.');
      process.exit(0);
    }, 5000);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

runTest();
