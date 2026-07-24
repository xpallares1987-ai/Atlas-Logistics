import { XMLParser } from "fast-xml-parser";

export type BPMNNodeType =
  | "startEvent"
  | "endEvent"
  | "serviceTask"
  | "userTask"
  | "exclusiveGateway"
  | "parallelGateway"
  | "sequenceFlow";

export interface BPMNNode {
  id: string;
  type: BPMNNodeType;
  name?: string;
  taskType?: string; // For service tasks (e.g. zeebe:taskDefinition type)
  outgoing: string[];
  incoming: string[];
  rawElement: any;
}

export class BPMNParser {
  private parsedData: any;
  private nodes: Map<string, BPMNNode> = new Map();
  private flows: Map<string, any> = new Map();

  constructor(xmlContent: string) {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      isArray: (name) => {
        // Force elements that can have multiples into arrays
        return [
          "bpmn:sequenceFlow",
          "bpmn:serviceTask",
          "bpmn:userTask",
          "bpmn:startEvent",
          "bpmn:endEvent",
          "bpmn:exclusiveGateway",
          "bpmn:outgoing",
          "bpmn:incoming",
          "zeebe:taskDefinition",
        ].includes(name);
      },
    });
    this.parsedData = parser.parse(xmlContent);
    this.indexNodes();
  }

  private indexNodes() {
    const definitions =
      this.parsedData["bpmn:definitions"] || this.parsedData["definitions"];
    if (!definitions) throw new Error("Invalid BPMN XML: Missing definitions");

    const process = definitions["bpmn:process"] || definitions["process"];
    if (!process) throw new Error("Invalid BPMN XML: Missing process");

    const processes = Array.isArray(process) ? process : [process];

    for (const proc of processes) {
      // Index flows
      const sequenceFlows = proc["bpmn:sequenceFlow"] || [];
      for (const flow of sequenceFlows) {
        this.flows.set(flow["@_id"], flow);
      }

      // Helper to process nodes
      const processNodes = (elements: any[], type: BPMNNodeType) => {
        if (!elements) return;
        for (const el of elements) {
          const id = el["@_id"];
          const name = el["@_name"];
          let taskType = undefined;

          // Try to extract task definition from camunda or zeebe extensions
          const extensionElements = el["bpmn:extensionElements"];
          if (extensionElements) {
            const taskDef = extensionElements["zeebe:taskDefinition"]?.[0];
            if (taskDef) {
              taskType = taskDef["@_type"];
            }
          }

          // Fallback to older camunda:type or similar if needed
          if (!taskType && el["@_camunda:type"])
            taskType = el["@_camunda:type"];
          // Or from zeebe attribute directly
          if (!taskType && el["@_zeebe:taskDefinition:type"])
            taskType = el["@_zeebe:taskDefinition:type"];

          const incoming = el["bpmn:incoming"] || [];
          const outgoing = el["bpmn:outgoing"] || [];

          this.nodes.set(id, {
            id,
            type,
            name,
            taskType,
            // Ensure they are arrays. If it's a string, wrap it. Fast-xml-parser might already array-ify due to isArray config, but just in case:
            incoming: typeof incoming === "string" ? [incoming] : incoming,
            outgoing: typeof outgoing === "string" ? [outgoing] : outgoing,
            rawElement: el,
          });
        }
      };

      processNodes(proc["bpmn:startEvent"], "startEvent");
      processNodes(proc["bpmn:endEvent"], "endEvent");
      processNodes(proc["bpmn:serviceTask"], "serviceTask");
      processNodes(proc["bpmn:userTask"], "userTask");
      processNodes(proc["bpmn:exclusiveGateway"], "exclusiveGateway");
      processNodes(proc["bpmn:parallelGateway"], "parallelGateway");
    }
  }

  public getStartEvent(): BPMNNode | undefined {
    for (const node of this.nodes.values()) {
      if (node.type === "startEvent") return node;
    }
    return undefined;
  }

  public getNode(id: string): BPMNNode | undefined {
    return this.nodes.get(id);
  }

  public getNextNodes(nodeId: string): BPMNNode[] {
    const node = this.nodes.get(nodeId);
    if (!node) return [];

    const nextNodes: BPMNNode[] = [];
    for (const flowId of node.outgoing) {
      const flow = this.flows.get(flowId);
      if (flow && flow["@_targetRef"]) {
        const targetNode = this.nodes.get(flow["@_targetRef"]);
        if (targetNode) {
          nextNodes.push(targetNode);
        }
      }
    }
    return nextNodes;
  }
}
