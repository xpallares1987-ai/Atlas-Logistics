/**
 * BPMN Workflow Engine & Human Task Inbox Domain Module
 * BPMN 2.0 orchestration, task assignments, transitions, and execution workers.
 */

export * from "../../bpm/workflow-engine.service.js";
export { default as bpmnRoutes } from "../../routes/bpmn.routes.js";
export { default as tasksRoutes } from "../../routes/tasks.routes.js";
