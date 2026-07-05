import React, { useEffect, useRef, useState } from 'react';
import { mountBPMNModeler } from '@atlas/bpmn-modeler/src/main';
import { bpmnHtml } from './bpmn-template';

export default function WorkflowsPage() {
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Solo montar una vez
    if (!mounted) {
      setMounted(true);
      // Timeout para permitir que React adjunte el DOM con dangerouslySetInnerHTML antes de buscar los selectores
      setTimeout(() => {
        try {
          mountBPMNModeler();
        } catch (error) {
          console.error("Error mounting BPMN Modeler:", error);
        }
      }, 100);
    }
  }, [mounted]);

  return (
    <div 
      className="w-full h-[calc(100vh-120px)] relative bpmn-modeler-wrapper bg-white shadow-sm rounded-xl overflow-hidden" 
      ref={containerRef}
      dangerouslySetInnerHTML={{ __html: bpmnHtml }}
    />
  );
}
