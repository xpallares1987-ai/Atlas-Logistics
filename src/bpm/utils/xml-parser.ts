import { XMLParser } from "fast-xml-parser";

export interface BpmnElement {
  id: string;
  name?: string;
  type:
    | "startEvent"
    | "serviceTask"
    | "userTask"
    | "endEvent"
    | "exclusiveGateway"
    | "parallelGateway";
  outgoing?: string[]; // sequence flow IDs going out
  incoming?: string[]; // sequence flow IDs coming in
  taskType?: string; // e.g. "atlas.invoice.match-ap"
}

export interface SequenceFlow {
  id: string;
  sourceRef: string;
  targetRef: string;
}

export class LightweightBpmnParser {
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "",
      isArray: (name) => {
        // ALWAYS return arrays for these tags to make mapping easier
        const arrayTags = [
          "bpmn:sequenceFlow",
          "bpmn:serviceTask",
          "bpmn:userTask",
          "bpmn:exclusiveGateway",
          "bpmn:parallelGateway",
          "bpmn:startEvent",
          "bpmn:endEvent",
        ];
        return arrayTags.includes(name);
      },
    });
  }

  parse(xmlStr: string) {
    const jsonObj = this.parser.parse(xmlStr);

    // Extract the process
    const process = jsonObj["bpmn:definitions"]?.["bpmn:process"];
    if (!process) {
      throw new Error("Invalid BPMN: Missing bpmn:process node.");
    }

    const elements = new Map<string, BpmnElement>();
    const sequences = new Map<string, SequenceFlow>();

    // Parse Sequence Flows
    if (process["bpmn:sequenceFlow"]) {
      for (const seq of process["bpmn:sequenceFlow"]) {
        sequences.set(seq.id, {
          id: seq.id,
          sourceRef: seq.sourceRef,
          targetRef: seq.targetRef,
        });
      }
    }

    // Helper to extract incoming/outgoing
    const getFlows = (
      obj: any,
      prop: "bpmn:incoming" | "bpmn:outgoing",
    ): string[] => {
      const val = obj[prop];
      if (!val) return [];
      return Array.isArray(val) ? val : [val];
    };

    // Helper to parse elements
    const parseElements = (typeKey: string, typeVal: BpmnElement["type"]) => {
      if (process[typeKey]) {
        for (const item of process[typeKey]) {
          let taskType: string | undefined = undefined;

          // Try to extract zeebe:taskDefinition type
          if (
            item["bpmn:extensionElements"] &&
            item["bpmn:extensionElements"]["zeebe:taskDefinition"]
          ) {
            taskType =
              item["bpmn:extensionElements"]["zeebe:taskDefinition"].type;
          }

          elements.set(item.id, {
            id: item.id,
            name: item.name,
            type: typeVal,
            incoming: getFlows(item, "bpmn:incoming"),
            outgoing: getFlows(item, "bpmn:outgoing"),
            taskType: taskType || item.id, // Fallback to id
          });
        }
      }
    };

    parseElements("bpmn:startEvent", "startEvent");
    parseElements("bpmn:endEvent", "endEvent");
    parseElements("bpmn:serviceTask", "serviceTask");
    parseElements("bpmn:userTask", "userTask");
    parseElements("bpmn:exclusiveGateway", "exclusiveGateway");
    parseElements("bpmn:parallelGateway", "parallelGateway");

    return { elements, sequences };
  }

  // Gets the next element(s) to execute after completing the current one
  getNextElements(xmlStr: string, currentElementId: string): BpmnElement[] {
    const { elements, sequences } = this.parse(xmlStr);
    const current = elements.get(currentElementId);

    if (!current) {
      throw new Error(
        `Element ${currentElementId} not found in workflow definition.`,
      );
    }

    const nextElements: BpmnElement[] = [];
    for (const outSeqId of current.outgoing || []) {
      const seq = sequences.get(outSeqId);
      if (seq && elements.has(seq.targetRef)) {
        nextElements.push(elements.get(seq.targetRef)!);
      }
    }

    return nextElements;
  }

  // Finds the start event
  getStartEvent(xmlStr: string): BpmnElement {
    const { elements } = this.parse(xmlStr);
    for (const [, el] of elements.entries()) {
      if (el.type === "startEvent") return el;
    }
    throw new Error("No Start Event found in workflow.");
  }
}
