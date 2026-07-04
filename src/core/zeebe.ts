import { ZBClient } from 'zeebe-node';
import { env } from './config.js';

// Initialize the Zeebe client
// It connects to a local broker by default (localhost:26500) if no env vars are provided
export const zbc = new ZBClient({
  onReady: () => console.log(`[Zeebe] Connected to Zeebe cluster`),
  onConnectionError: () => console.log(`[Zeebe] Connection error (make sure Camunda 8 is running locally)`),
});

/**
 * Helper to deploy a BPMN diagram to the Zeebe cluster.
 * @param bpmnPath - Path to the .bpmn file
 */
export async function deployWorkflow(bpmnPath: string) {
  try {
    const res = await zbc.deployProcess(bpmnPath);
    console.log(`[Zeebe] Deployed workflow:`, res);
    return res;
  } catch (error) {
    console.error(`[Zeebe] Failed to deploy workflow:`, error);
    throw error;
  }
}

/**
 * Helper to create a new process instance for a specific BPMN process ID.
 * @param bpmnProcessId - The ID of the process defined in the BPMN XML
 * @param variables - Initial state variables for the workflow
 */
export async function startWorkflowInstance(bpmnProcessId: string, variables: Record<string, any> = {}) {
  try {
    const res = await zbc.createProcessInstance({ bpmnProcessId, variables });
    console.log(`[Zeebe] Started workflow instance: ${res.processInstanceKey}`);
    return res;
  } catch (error) {
    console.error(`[Zeebe] Failed to start workflow instance:`, error);
    throw error;
  }
}
