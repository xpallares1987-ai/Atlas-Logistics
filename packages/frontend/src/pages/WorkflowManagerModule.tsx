import { useEffect, useRef, useState } from "react";
import BpmnModeler from "bpmn-js/lib/Modeler";
import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn.css";
import { Settings, Save, FileText, CheckCircle } from "lucide-react";

const INITIAL_XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:task id="Task_1" name="Automation Task">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:task>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_1" />
    <bpmn:endEvent id="EndEvent_1">
      <bpmn:incoming>Flow_2</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="EndEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds x="152" y="102" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_1_di" bpmnElement="Task_1">
        <dc:Bounds x="240" y="80" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="188" y="120" />
        <di:waypoint x="240" y="120" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1">
        <dc:Bounds x="392" y="102" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="340" y="120" />
        <di:waypoint x="392" y="120" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

export default function WorkflowManagerModule() {
  const containerRef = useRef<HTMLDivElement>(null);
  const modelerRef = useRef<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [workflowName, setWorkflowName] = useState("New Automation Workflow");
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (containerRef.current) {
      modelerRef.current = new BpmnModeler({
        container: containerRef.current,
        keyboard: {
          bindTo: window,
        },
      });

      modelerRef.current.importXML(INITIAL_XML).catch((err: any) => {
        console.error("Failed to render BPMN diagram", err);
      });

      // Fit viewport to diagram
      modelerRef.current.on("import.done", () => {
        const canvas = modelerRef.current.get("canvas");
        canvas.zoom("fit-viewport", "auto");
      });
    }

    return () => {
      if (modelerRef.current) {
        modelerRef.current.destroy();
      }
    };
  }, []);

  const handleSave = async () => {
    if (!modelerRef.current) return;
    setIsSaving(true);
    try {
      const { xml } = await modelerRef.current.saveXML({ format: true });

      const res = await fetch("/api/bpmn/diagrams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: workflowName,
          description: "Visual automation workflow",
          xmlContent: xml,
        }),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert("Failed to save workflow");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving workflow.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 p-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3 tracking-widest">
            <Settings className="text-indigo-500" />
            WORKFLOWS MODELER
          </h1>
          <p className="text-slate-400 mt-1">
            Design and automate your logistics processes
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
            <FileText className="text-slate-400" size={16} />
            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="bg-transparent text-white outline-none w-48 text-sm"
              placeholder="Workflow Name"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all duration-300 shadow-xl ${
              saveSuccess
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-emerald-500/20"
                : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20"
            }`}
          >
            {saveSuccess ? (
              <>
                <CheckCircle size={18} />
                Saved!
              </>
            ) : isSaving ? (
              "Saving..."
            ) : (
              <>
                <Save size={18} />
                Deploy Workflow
              </>
            )}
          </button>
        </div>
      </div>

      {/* BPMN Canvas Container */}
      <div className="flex-1 bg-white rounded-xl overflow-hidden shadow-2xl relative border-2 border-slate-800">
        {/* We need to apply a tiny CSS fix since bpmn-js defaults to a white background, but the parent has dark theme */}
        <div
          ref={containerRef}
          className="w-full h-full"
          style={{ background: "#ffffff" }}
        />
      </div>

      <style>{`
        /* Minimal overrides to make bpmn-js look a bit more integrated */
        .bjs-powered-by {
          display: none !important;
        }
        .djs-palette {
          background: #f8fafc !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 8px !important;
          box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1) !important;
        }
      `}</style>
    </div>
  );
}
