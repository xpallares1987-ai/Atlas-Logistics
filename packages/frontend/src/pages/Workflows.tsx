import React, { useEffect, useRef, useState } from "react";
import { bpmnHtml } from "./bpmn-template";

export default function WorkflowsPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Use a small timeout to let React completely paint the dangerouslySetInnerHTML content
    const timer = setTimeout(() => {
      // Check if the DOM is actually present to prevent Strict Mode errors
      if (document.querySelector("#canvas")) {
        import("@atlas/bpmn-modeler/src/main")
          .then((m) => {
            m.mountBPMNModeler();
          })
          .catch((err) => console.error("Failed to import BPMN Modeler", err));
      }
    }, 150);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  return (
    <div
      className="w-full h-[calc(100vh-120px)] relative bpmn-modeler-wrapper bg-white shadow-sm rounded-xl overflow-hidden"
      ref={containerRef}
      dangerouslySetInnerHTML={{ __html: bpmnHtml }}
    />
  );
}
