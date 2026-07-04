import React, { useEffect, useRef, useState } from 'react';
import { mountBPMNModeler } from '@atlas/bpmn-modeler/src/main';

export default function WorkflowsPage() {
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only mount once
    if (!mounted) {
      setMounted(true);
      // We wrap it in a setTimeout to ensure the DOM is fully painted
      setTimeout(() => {
        try {
          mountBPMNModeler();
        } catch (error) {
          console.error("Error mounting BPMN Modeler:", error);
        }
      }, 100);
    }
  }, [mounted]);

  // Provide the exact DOM structure that BPMN Modeler expects from its legacy index.html
  return (
    <div className="w-full h-full relative" ref={containerRef}>
      <div id="auth-root" style={{ display: 'none' }}></div>
      <div className="workspace">
        <div id="js-canvas" className="canvas" style={{ width: '100%', height: 'calc(100vh - 64px)' }}></div>
        <div id="js-properties-panel" className="properties-panel"></div>
        
        {/* Toggle Properties Button */}
        <button id="btn-toggle-properties" className="btn-toggle-properties bg-blue-600 text-white p-2 rounded absolute bottom-4 right-4 z-50">
          Propiedades
        </button>
      </div>

      {/* Hidden elements expected by BPMN Modeler vanilla JS */}
      <div id="toast-container" className="toast-container absolute top-4 right-4 z-50 flex flex-col gap-2"></div>
      
      <button id="btn-add-tab" className="hidden"></button>
      <div id="tabs-container" className="hidden"></div>
      
      <dialog id="logistics-templates-modal" className="hidden"></dialog>
      <dialog id="shortcuts-modal" className="hidden"></dialog>
      <dialog id="cloud-sync-modal" className="hidden"></dialog>
      
      <button id="btn-close-logistics" className="hidden"></button>
      <button id="btn-close-shortcuts" className="hidden"></button>
      <button id="btn-close-cloud" className="hidden"></button>
      
      <form id="cloudForm" className="hidden"></form>
      <input type="text" id="diagramSearch" className="hidden" />
    </div>
  );
}
