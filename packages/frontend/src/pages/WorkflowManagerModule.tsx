import { useEffect, useRef, useState } from "react";
import BpmnModeler from "bpmn-js/lib/Modeler";
import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn.css";
import {
  Save,
  FileText,
  CheckCircle,
  Ship,
  ZoomIn,
  Download,
  FileCode,
  RotateCcw,
  Anchor,
  Calendar,
  Layers,
  X,
  Sparkles,
} from "lucide-react";
import { MARITIME_TEMPLATES, MaritimeTemplate } from "./maritime-templates";

export default function WorkflowManagerModule() {
  const containerRef = useRef<HTMLDivElement>(null);
  const modelerRef = useRef<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [workflowName, setWorkflowName] = useState("Exportación Marítima FCL - ESVLC");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<MaritimeTemplate>(MARITIME_TEMPLATES[0]);
  const [sopGenerated, setSopGenerated] = useState(false);

  useEffect(() => {
    if (containerRef.current) {
      modelerRef.current = new BpmnModeler({
        container: containerRef.current,
        keyboard: {
          bindTo: window,
        },
      });

      // Load initial FCL template by default
      modelerRef.current.importXML(MARITIME_TEMPLATES[0].xml).catch((err: any) => {
        console.error("Error al importar diagrama BPMN inicial:", err);
      });

      modelerRef.current.on("import.done", () => {
        const canvas = modelerRef.current?.get("canvas");
        if (canvas) {
          canvas.zoom("fit-viewport", "auto");
        }
      });
    }

    return () => {
      if (modelerRef.current) {
        modelerRef.current.destroy();
      }
    };
  }, []);

  const handleZoomFit = () => {
    if (!modelerRef.current) return;
    const canvas = modelerRef.current.get("canvas");
    canvas.zoom("fit-viewport", "auto");
  };

  const handleSelectTemplate = async (tmpl: MaritimeTemplate) => {
    if (!modelerRef.current) return;
    try {
      await modelerRef.current.importXML(tmpl.xml);
      setWorkflowName(tmpl.name);
      setActiveTemplate(tmpl);
      setIsTemplateModalOpen(false);
      handleZoomFit();
    } catch (err) {
      console.error("Error al cargar la plantilla:", err);
      alert("No se pudo cargar la plantilla seleccionada.");
    }
  };

  const handleResetDiagram = () => {
    if (window.confirm("¿Deseas reiniciar el diagrama a la plantilla FCL base?")) {
      handleSelectTemplate(MARITIME_TEMPLATES[0]);
    }
  };

  const handleExportXML = async () => {
    if (!modelerRef.current) return;
    try {
      const { xml } = await modelerRef.current.saveXML({ format: true });
      const blob = new Blob([xml], { type: "application/xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${workflowName.replace(/\s+/g, "_")}.bpmn`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error al exportar XML:", err);
    }
  };

  const handleExportSVG = async () => {
    if (!modelerRef.current) return;
    try {
      const { svg } = await modelerRef.current.saveSVG();
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${workflowName.replace(/\s+/g, "_")}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error al exportar SVG:", err);
    }
  };

  const handleGenerateSOP = () => {
    const mdContent = `# Procedimiento Operativo Estandarizado (SOP)
## ${activeTemplate.name}
**Atlas Logistics ERP - Módulo de Exportación Marítima**
*Fecha de generación:* ${new Date().toLocaleDateString("es-ES")}

---

### 1. Alcance y Aplicabilidad
- **Modalidad:** ${activeTemplate.category}
- **Puertos de Operación:** ${activeTemplate.ports.join(", ")}
- **Navieras / Consolidadores:** ${activeTemplate.carrierSupport.join(", ")}
- **Tiempo de Gestión Estimado:** ${activeTemplate.estimatedTransitTime}

---

### 2. Descripción Operativa
${activeTemplate.description}

---

### 3. Hitos Clave de Cumplimiento Normativo
${activeTemplate.milestones.map((m, i) => `${i + 1}. **${m}**`).join("\n")}

---

### 4. Directrices Aduaneras y Portuarias en España
1. **DUA de Exportación (AEAT):** Obligatorio obtener el LER (Levante de Exportación con MRN) antes de la entrada del contenedor al recinto aduanero portuario.
2. **Convenio SOLAS (VGM):** La masa bruta verificada debe transmitirse a la terminal vía EDI (VERMAS) antes del Cut-Off de peso de la escala.
3. **Control de Precinto:** Precinto de alta seguridad homologado según norma **ISO/PAS 17712**.
4. **Circuito Rojo/Naranja:** En caso de no concesión de Levante automático, solicitar posicionamiento urgente en el Puesto de Inspección Fronterizo (PIF).

---
*Documento generado automáticamente por Atlas Forwarding Modeler Engine.*
`;

    const blob = new Blob([mdContent], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SOP_${activeTemplate.id.toUpperCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);

    setSopGenerated(true);
    setTimeout(() => setSopGenerated(false), 3000);
  };

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
          description: activeTemplate.description,
          xmlContent: xml,
        }),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert("Error al guardar el flujo de trabajo en el servidor.");
      }
    } catch (err) {
      console.error(err);
      alert("Error al conectar con la API de BPMN.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 p-5 overflow-hidden text-slate-100">
      {/* Top Main Navigation / Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 shrink-0 border-b border-slate-800/80 pb-4">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-3 tracking-wider">
            <Anchor className="text-indigo-400" size={24} />
            BPMN MODELER - EXPORTACIÓN MARÍTIMA
          </h1>
          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
            <span>España: Valencia (VLC) · Algeciras (ALG) · Barcelona (BCN) · Bilbao (BIO)</span>
            <span className="w-1 h-1 rounded-full bg-slate-600" />
            <span className="text-emerald-400 font-medium">SOLAS VGM & DUA AEAT Compliance</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Template Selector Button */}
          <button
            onClick={() => setIsTemplateModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold transition-all shadow-md"
          >
            <Ship size={15} />
            Plantillas Marítimas
            <span className="px-1.5 py-0.2 bg-indigo-500/30 rounded text-[10px]">
              {MARITIME_TEMPLATES.length}
            </span>
          </button>

          {/* Workflow Name Input */}
          <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
            <FileText className="text-slate-400" size={14} />
            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="bg-transparent text-white outline-none w-56 text-xs"
              placeholder="Nombre del Workflow"
            />
          </div>

          {/* Save / Deploy */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 shadow-md ${
              saveSuccess
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50"
                : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20"
            }`}
          >
            {saveSuccess ? (
              <>
                <CheckCircle size={15} />
                Guardado!
              </>
            ) : isSaving ? (
              "Guardando..."
            ) : (
              <>
                <Save size={15} />
                Publicar Flujo
              </>
            )}
          </button>
        </div>
      </div>

      {/* Secondary Operational Quick Toolbar */}
      <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800/80 rounded-lg px-3 py-1.5 mb-3 shrink-0 text-xs">
        <div className="flex items-center gap-4 text-slate-300">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Plantilla Activa:</span>
            <span className="text-white font-bold">{activeTemplate.name}</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1 text-slate-400">
            <Layers size={13} className="text-indigo-400" />
            <span>Hitos: {activeTemplate.milestones.length} etapas</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomFit}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Ajustar al lienzo"
          >
            <ZoomIn size={13} />
            <span>Ajustar Vista</span>
          </button>

          <button
            onClick={handleGenerateSOP}
            className={`flex items-center gap-1 px-2.5 py-1 rounded border transition ${
              sopGenerated
                ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300"
            }`}
            title="Descargar Procedimiento Operativo Estandarizado en Markdown"
          >
            <Sparkles size={13} className="text-amber-400" />
            <span>{sopGenerated ? "¡SOP Generado!" : "Generar SOP (MD)"}</span>
          </button>

          <button
            onClick={handleExportXML}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Descargar BPMN 2.0 XML"
          >
            <FileCode size={13} />
            <span>BPMN XML</span>
          </button>

          <button
            onClick={handleExportSVG}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Exportar imagen vectorial SVG"
          >
            <Download size={13} />
            <span>SVG</span>
          </button>

          <button
            onClick={handleResetDiagram}
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition"
            title="Reiniciar diagrama"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* BPMN Canvas Container */}
      <div className="flex-1 bg-white rounded-xl overflow-hidden shadow-2xl relative border border-slate-800">
        <div
          ref={containerRef}
          className="w-full h-full"
          style={{ background: "#ffffff" }}
        />
      </div>

      {/* Maritime Master Templates Modal */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                  <Ship size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    Catálogo de Plantillas Marítimas Españolas
                  </h2>
                  <p className="text-xs text-slate-400">
                    Selecciona un flujo de trabajo preconfigurado para tu operativa de transitario
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content / Cards */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {MARITIME_TEMPLATES.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    activeTemplate.id === tmpl.id
                      ? "bg-indigo-950/40 border-indigo-500 shadow-lg shadow-indigo-950/50"
                      : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/40"
                  }`}
                  onClick={() => handleSelectTemplate(tmpl)}
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase ${
                            tmpl.category === "FCL"
                              ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                              : tmpl.category === "LCL"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                              : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                          }`}
                        >
                          {tmpl.category}
                        </span>
                        <h3 className="text-sm font-bold text-white">{tmpl.name}</h3>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {tmpl.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="shrink-0 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition"
                    >
                      Cargar en Lienzo
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Anchor size={12} className="text-indigo-400 shrink-0" />
                      <span>
                        <strong className="text-slate-300">Puertos:</strong>{" "}
                        {tmpl.ports.join(", ")}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar size={12} className="text-emerald-400 shrink-0" />
                      <span>
                        <strong className="text-slate-300">Tiempo:</strong>{" "}
                        {tmpl.estimatedTransitTime}
                      </span>
                    </div>
                  </div>

                  {/* Milestones pill list */}
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {tmpl.milestones.map((m, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] text-slate-300 flex items-center gap-1"
                      >
                        <span className="w-1 h-1 rounded-full bg-indigo-400" />
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Haga clic en cualquier plantilla para transferirla al modelador visual activo.</span>
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        /* Modeler visual overrides */
        .bjs-powered-by {
          display: none !important;
        }
        .djs-palette {
          background: #f8fafc !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 8px !important;
          box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1) !important;
        }
        .djs-context-pad {
          background: #f8fafc !important;
          border-radius: 6px !important;
        }
      `}</style>
    </div>
  );
}
