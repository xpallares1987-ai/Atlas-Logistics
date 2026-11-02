import { useState, useRef } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Database,
  RefreshCw,
  X,
  Sparkles,
  Check,
} from "lucide-react";
import { motion } from "framer-motion";

export interface RateIngestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (result: any) => void;
  defaultCarrier?: string;
  apiUrl?: string;
}

interface ParsedRow {
  rowNumber: number;
  originRaw: string;
  destinationRaw: string;
  originLocode?: string;
  destinationLocode?: string;
  carrier: string;
  containerType: string;
  baseOceanFreight: number;
  baf: number;
  pss: number;
  thc: number;
  currency: string;
  serviceLine: string;
  transitDays: number;
  validFrom: string;
  validTo: string;
  status?: "NEW" | "UPDATE" | "SAME" | "INVALID";
  validationError?: string;
}

export function RateIngestionModal({
  isOpen,
  onClose,
  onSuccess,
  defaultCarrier = "Maersk",
  apiUrl = "/api/rates",
}: RateIngestionModalProps) {
  const [step, setStep] = useState<
    "UPLOAD" | "MAPPING" | "RESOLVE_PORTS" | "PREVIEW" | "RESULT"
  >("UPLOAD");
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState("");
  const [carrier, setCarrier] = useState(defaultCarrier);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({
    origin: "",
    destination: "",
    carrier: "",
    containerType: "",
    oceanFreight: "",
    baf: "",
    pss: "",
    thc: "",
    transitDays: "",
    validTo: "",
  });

  const [ambiguousPorts, setAmbiguousPorts] = useState<
    { original: string; occurrences: number }[]
  >([]);
  const [portAliasesToSave, setPortAliasesToSave] = useState<
    Record<string, string>
  >({});
  const [previewRows, setPreviewRows] = useState<ParsedRow[]>([]);
  const [previewSummary, setPreviewSummary] = useState({
    newCount: 0,
    updateCount: 0,
    sameCount: 0,
    invalidCount: 0,
  });
  const [importResult, setImportResult] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Simple CSV / TSV text parser
  const parseCSVText = (text: string) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2)
      throw new Error("El archivo no contiene suficientes filas de datos.");

    // Detect delimiter (, or ; or \t)
    const firstLine = lines[0];
    const delimiter = firstLine.includes(";")
      ? ";"
      : firstLine.includes("\t")
        ? "\t"
        : ",";

    const splitLine = (line: string) => {
      const result: string[] = [];
      let cur = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
          inQuotes = !inQuotes;
        } else if (c === delimiter && !inQuotes) {
          result.push(cur.trim().replace(/^"|"$/g, ""));
          cur = "";
        } else {
          cur += c;
        }
      }
      result.push(cur.trim().replace(/^"|"$/g, ""));
      return result;
    };

    const headers = splitLine(lines[0]);
    const rows = lines.slice(1).map((line) => {
      const values = splitLine(line);
      const rowObj: Record<string, string> = {};
      headers.forEach((h, i) => {
        rowObj[h] = values[i] || "";
      });
      return rowObj;
    });

    return { headers, rows };
  };

  const handleFile = (file: File) => {
    setErrorMsg("");
    setFileName(file.name);
    setLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const { headers, rows } = parseCSVText(content);

        setRawHeaders(headers);
        setParsedRows(rows);

        // Auto-detect columns
        const mapping: Record<string, string> = { ...columnMapping };
        headers.forEach((h) => {
          const cleanH = h.toLowerCase().replace(/[\s\-_]+/g, "");
          if (
            ["pol", "origin", "puertoorigen", "origen", "loadingport"].some(
              (s) => cleanH.includes(s),
            ) &&
            !mapping.origin
          ) {
            mapping.origin = h;
          }
          if (
            [
              "pod",
              "destination",
              "puertodestino",
              "destino",
              "dischargeport",
            ].some((s) => cleanH.includes(s)) &&
            !mapping.destination
          ) {
            mapping.destination = h;
          }
          if (
            ["carrier", "naviera", "linea", "shippingline"].some((s) =>
              cleanH.includes(s),
            ) &&
            !mapping.carrier
          ) {
            mapping.carrier = h;
          }
          if (
            ["containertype", "equipo", "type", "size", "cntr"].some((s) =>
              cleanH.includes(s),
            ) &&
            !mapping.containerType
          ) {
            mapping.containerType = h;
          }
          if (
            ["oceanfreight", "baserate", "flete", "fletebase", "ocean"].some(
              (s) => cleanH.includes(s),
            ) &&
            !mapping.oceanFreight
          ) {
            mapping.oceanFreight = h;
          }
          if (
            ["baf", "fuel", "bunker"].some((s) => cleanH.includes(s)) &&
            !mapping.baf
          ) {
            mapping.baf = h;
          }
          if (
            ["pss", "peaksurcharge", "peakseason"].some((s) =>
              cleanH.includes(s),
            ) &&
            !mapping.pss
          ) {
            mapping.pss = h;
          }
          if (
            ["thc", "terminal", "handling"].some((s) => cleanH.includes(s)) &&
            !mapping.thc
          ) {
            mapping.thc = h;
          }
          if (
            ["transittime", "transitdays", "tt", "dias"].some((s) =>
              cleanH.includes(s),
            ) &&
            !mapping.transitDays
          ) {
            mapping.transitDays = h;
          }
          if (
            ["validuntil", "validto", "validity", "vigencia"].some((s) =>
              cleanH.includes(s),
            ) &&
            !mapping.validTo
          ) {
            mapping.validTo = h;
          }
        });

        setColumnMapping(mapping);
        setStep("MAPPING");
      } catch (err: any) {
        setErrorMsg(
          err?.message ||
            "Error al leer el archivo. Asegúrate de que sea un CSV válido.",
        );
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = () => {
      setErrorMsg("Error al leer el archivo físico.");
      setLoading(false);
    };
    reader.readAsText(file, "UTF-8");
  };

  const handlePreviewRequest = async () => {
    setLoading(true);
    setErrorMsg("");

    try {
      // Map rows using columnMapping
      const mappedRows = parsedRows.map((row) => ({
        origin: row[columnMapping.origin] || "",
        destination: row[columnMapping.destination] || "",
        carrier: row[columnMapping.carrier] || carrier,
        containerType: row[columnMapping.containerType] || "40HC",
        oceanFreight: row[columnMapping.oceanFreight] || "0",
        baf: row[columnMapping.baf] || "0",
        pss: row[columnMapping.pss] || "0",
        thc: row[columnMapping.thc] || "0",
        transitDays: row[columnMapping.transitDays] || "25",
        validTo: row[columnMapping.validTo] || "",
      }));

      const res = await fetch(`${apiUrl}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: mappedRows, defaultCarrier: carrier }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Error HTTP ${res.status}`);
      }

      const previewData = await res.json();
      setPreviewRows(previewData.previewRows || []);
      setAmbiguousPorts(previewData.ambiguousPorts || []);
      setPreviewSummary(
        previewData.summary || {
          newCount: 0,
          updateCount: 0,
          sameCount: 0,
          invalidCount: 0,
        },
      );

      if (previewData.ambiguousPorts && previewData.ambiguousPorts.length > 0) {
        setStep("RESOLVE_PORTS");
      } else {
        setStep("PREVIEW");
      }
    } catch (err: any) {
      setErrorMsg(
        err.message || "Error al previsualizar tarifas en el backend.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBulkImportExecute = async () => {
    setLoading(true);
    setErrorMsg("");

    try {
      // Prepare new aliases
      const newAliases = Object.entries(portAliasesToSave).map(
        ([alias, locationId]) => ({
          alias,
          locationId,
        }),
      );

      // Apply assigned aliases to preview rows before commit
      const finalRates = previewRows.map((r) => ({
        ...r,
        originLocode: portAliasesToSave[r.originRaw] || r.originLocode,
        destinationLocode:
          portAliasesToSave[r.destinationRaw] || r.destinationLocode,
      }));

      const res = await fetch(`${apiUrl}/bulk-import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName,
          rates: finalRates,
          newAliases,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Error HTTP ${res.status}`);
      }

      const result = await res.json();
      setImportResult(result);
      setStep("RESULT");
      if (onSuccess) onSuccess(result);
    } catch (err: any) {
      setErrorMsg(
        err.message || "Error al ejecutar la importación en base de datos.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/30 rounded-lg border border-indigo-400/30">
              <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                Importador de Tarifarios Masivos
              </h2>
              <p className="text-xs text-slate-400">
                Normalización automática UN/LOCODE, recargos y upsert temporal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Wizard Indicator */}
        <div className="flex items-center justify-between px-6 py-2 bg-slate-50 border-b border-slate-200 text-xs">
          <div
            className={`flex items-center gap-1.5 ${step === "UPLOAD" ? "text-indigo-600 font-bold" : "text-slate-500"}`}
          >
            <span className="w-5 h-5 rounded-full flex items-center justify-center bg-indigo-100 text-indigo-700">
              1
            </span>
            Subida
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
          <div
            className={`flex items-center gap-1.5 ${step === "MAPPING" ? "text-indigo-600 font-bold" : "text-slate-500"}`}
          >
            <span className="w-5 h-5 rounded-full flex items-center justify-center bg-slate-200 text-slate-700">
              2
            </span>
            Mapeo
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
          <div
            className={`flex items-center gap-1.5 ${step === "RESOLVE_PORTS" ? "text-amber-600 font-bold" : "text-slate-500"}`}
          >
            <span className="w-5 h-5 rounded-full flex items-center justify-center bg-slate-200 text-slate-700">
              3
            </span>
            Puertos UN/LOCODE
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
          <div
            className={`flex items-center gap-1.5 ${step === "PREVIEW" ? "text-indigo-600 font-bold" : "text-slate-500"}`}
          >
            <span className="w-5 h-5 rounded-full flex items-center justify-center bg-slate-200 text-slate-700">
              4
            </span>
            Previsualización
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: UPLOAD */}
          {step === "UPLOAD" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="defaultCarrierSelect"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Naviera / Carrier Predeterminado
                  </label>
                  <select
                    id="defaultCarrierSelect"
                    name="carrier"
                    aria-label="Naviera o Carrier Predeterminado"
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    className="w-full text-sm p-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Maersk">Maersk Line</option>
                    <option value="MSC">MSC (Mediterranean Shipping Co)</option>
                    <option value="CMA CGM">CMA CGM</option>
                    <option value="Hapag-Lloyd">Hapag-Lloyd</option>
                    <option value="ONE">Ocean Network Express (ONE)</option>
                    <option value="Cosco">Cosco Shipping</option>
                    <option value="Evergreen">Evergreen Marine</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Formato de Archivo Admitido
                  </label>
                  <p className="text-xs text-slate-500 pt-2">
                    Archivos CSV UTF-8, TSV o Excel exportados con encabezados
                    en la primera fila.
                  </p>
                </div>
              </div>

              <div
                onDragEnter={() => setDragActive(true)}
                onDragLeave={() => setDragActive(false)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFile(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl cursor-pointer transition ${
                  dragActive
                    ? "border-indigo-500 bg-indigo-50/50"
                    : "border-slate-300 bg-slate-50 hover:bg-slate-100"
                }`}
              >
                <input
                  id="rateFileInput"
                  name="rateFile"
                  aria-label="Archivo de tarifas CSV, TSV o texto"
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.tsv,.txt"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFile(e.target.files[0]);
                    }
                  }}
                />
                <div className="p-4 bg-white rounded-full shadow-sm border border-slate-200 mb-3">
                  <UploadCloud className="w-8 h-8 text-indigo-600" />
                </div>
                <p className="text-sm font-semibold text-slate-800">
                  Arrastra tu tarifario aquí o haz clic para buscar
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Soporta tarifas de Flete Marítimo (POL, POD, Flete Base, BAF,
                  THC, etc.)
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: MAPPING */}
          {step === "MAPPING" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-sm font-medium text-slate-700">
                  Archivo:{" "}
                  <strong className="text-slate-900">{fileName}</strong> (
                  {parsedRows.length} filas detectadas)
                </span>
                <span className="text-xs text-indigo-600 flex items-center gap-1 font-semibold">
                  <Sparkles className="w-3.5 h-3.5" /> Columnas auto-emparejadas
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 max-h-72 overflow-y-auto p-1">
                {[
                  {
                    key: "origin",
                    label: "Puerto de Carga (POL / Origen) *",
                    required: true,
                  },
                  {
                    key: "destination",
                    label: "Puerto de Descarga (POD / Destino) *",
                    required: true,
                  },
                  {
                    key: "oceanFreight",
                    label: "Flete Básico Marítimo (Base Rate) *",
                    required: true,
                  },
                  {
                    key: "containerType",
                    label: "Tipo de Contenedor (20GP, 40HC)",
                    required: false,
                  },
                  {
                    key: "carrier",
                    label: "Carrier / Naviera",
                    required: false,
                  },
                  {
                    key: "baf",
                    label: "BAF (Bunker Surcharge)",
                    required: false,
                  },
                  { key: "pss", label: "PSS (Peak Season)", required: false },
                  {
                    key: "thc",
                    label: "THC (Gastos Terminales)",
                    required: false,
                  },
                  {
                    key: "transitDays",
                    label: "Transit Time (Días)",
                    required: false,
                  },
                  {
                    key: "validTo",
                    label: "Fecha de Vigencia / Validez",
                    required: false,
                  },
                ].map((field) => (
                  <div
                    key={field.key}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <label
                      htmlFor={`mapping_field_${field.key}`}
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      {field.label}
                    </label>
                    <select
                      id={`mapping_field_${field.key}`}
                      name={`mapping_${field.key}`}
                      aria-label={`Mapeo para ${field.label}`}
                      value={columnMapping[field.key] || ""}
                      onChange={(e) =>
                        setColumnMapping({
                          ...columnMapping,
                          [field.key]: e.target.value,
                        })
                      }
                      className="w-full text-xs p-1.5 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="">-- No mapeado --</option>
                      {rawHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: RESOLVE PORTS */}
          {step === "RESOLVE_PORTS" && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900">
                  <p className="font-semibold">
                    Se detectaron nombres de puerto no homologados con
                    UN/LOCODE.
                  </p>
                  <p>
                    Asigna el puerto oficial canónico correspondiente. El
                    sistema memorizará este alias para futuras importaciones.
                  </p>
                </div>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {ambiguousPorts.map((item) => (
                  <div
                    key={item.original}
                    className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {item.original}
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.occurrences} apariciones en el archivo
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        id={`port_alias_${item.original.replace(/\s+/g, "_")}`}
                        name={`port_alias_${item.original.replace(/\s+/g, "_")}`}
                        aria-label={`Homologar puerto ${item.original}`}
                        value={portAliasesToSave[item.original] || ""}
                        onChange={(e) =>
                          setPortAliasesToSave({
                            ...portAliasesToSave,
                            [item.original]: e.target.value,
                          })
                        }
                        className="text-xs p-2 border border-slate-300 rounded-lg bg-white font-medium"
                      >
                        <option value="">Seleccionar UN/LOCODE...</option>
                        <option value="ESBCN">ESBCN - Barcelona, España</option>
                        <option value="ESVLC">ESVLC - Valencia, España</option>
                        <option value="ESALG">ESALG - Algeciras, España</option>
                        <option value="CNSHA">CNSHA - Shanghai, China</option>
                        <option value="CNNGB">CNNGB - Ningbo, China</option>
                        <option value="CNSZX">
                          CNSZX - Shenzhen (Yantian), China
                        </option>
                        <option value="NLRTM">
                          NLRTM - Rotterdam, Países Bajos
                        </option>
                        <option value="BEANR">BEANR - Amberes, Bélgica</option>
                        <option value="DEHAM">
                          DEHAM - Hamburgo, Alemania
                        </option>
                        <option value="SGSIN">SGSIN - Singapur</option>
                        <option value="USNYC">
                          USNYC - Nueva York, EE.UU.
                        </option>
                        <option value="USLAX">
                          USLAX - Los Ángeles, EE.UU.
                        </option>
                        <option value="AEDXB">
                          AEDXB - Dubai / Jebel Ali, EAU
                        </option>
                      </select>
                      {portAliasesToSave[item.original] && (
                        <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                          <Check className="w-4 h-4" />
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: PREVIEW */}
          {step === "PREVIEW" && (
            <div className="space-y-3">
              {/* Metrics cards */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2.5 bg-slate-100 rounded-xl">
                  <span className="text-slate-500">Total Filas</span>
                  <p className="text-lg font-bold text-slate-800">
                    {previewRows.length}
                  </p>
                </div>
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <span className="text-emerald-700 font-semibold">
                    Nuevas Tarifas
                  </span>
                  <p className="text-lg font-bold text-emerald-800">
                    {previewSummary.newCount}
                  </p>
                </div>
                <div className="p-2.5 bg-sky-50 border border-sky-200 rounded-xl">
                  <span className="text-sky-700 font-semibold">
                    Actualizaciones
                  </span>
                  <p className="text-lg font-bold text-sky-800">
                    {previewSummary.updateCount}
                  </p>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-slate-500">Sin Cambios</span>
                  <p className="text-lg font-bold text-slate-700">
                    {previewSummary.sameCount}
                  </p>
                </div>
              </div>

              {/* Data table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0">
                    <tr>
                      <th className="p-2">#</th>
                      <th className="p-2">Ruta (POL &gt; POD)</th>
                      <th className="p-2">Carrier</th>
                      <th className="p-2">Equipo</th>
                      <th className="p-2 text-right">Flete Base</th>
                      <th className="p-2 text-right">BAF</th>
                      <th className="p-2 text-right">THC</th>
                      <th className="p-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewRows.map((r) => (
                      <tr key={r.rowNumber} className="hover:bg-slate-50">
                        <td className="p-2 text-slate-400 font-mono">
                          {r.rowNumber}
                        </td>
                        <td className="p-2 font-medium">
                          <span className="text-indigo-600">
                            {r.originLocode || r.originRaw}
                          </span>{" "}
                          &rarr;{" "}
                          <span className="text-emerald-600">
                            {r.destinationLocode || r.destinationRaw}
                          </span>
                        </td>
                        <td className="p-2">{r.carrier}</td>
                        <td className="p-2">{r.containerType}</td>
                        <td className="p-2 text-right font-mono">
                          ${r.baseOceanFreight}
                        </td>
                        <td className="p-2 text-right font-mono">${r.baf}</td>
                        <td className="p-2 text-right font-mono">${r.thc}</td>
                        <td className="p-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              r.status === "NEW"
                                ? "bg-emerald-100 text-emerald-800"
                                : r.status === "UPDATE"
                                  ? "bg-sky-100 text-sky-800"
                                  : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {r.status === "NEW"
                              ? "NUEVA"
                              : r.status === "UPDATE"
                                ? "ACTUALIZAR"
                                : "IDÉNTICA"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 5: RESULT */}
          {step === "RESULT" && importResult && (
            <div className="py-6 flex flex-col items-center text-center space-y-3">
              <div className="p-4 bg-emerald-100 text-emerald-700 rounded-full">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                ¡Tarifario Sincronizado Exitosamente!
              </h3>
              <p className="text-xs text-slate-500 max-w-md">
                El lote{" "}
                <strong className="font-mono text-slate-800">
                  {importResult.batchId}
                </strong>{" "}
                se ha procesado de forma transaccional y la caché de Redis se ha
                purgado.
              </p>
              <div className="flex gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm">
                <div>
                  <span className="text-xs text-slate-500">Insertadas</span>
                  <p className="text-xl font-bold text-emerald-600">
                    {importResult.insertedCount}
                  </p>
                </div>
                <div className="border-r border-slate-200" />
                <div>
                  <span className="text-xs text-slate-500">Actualizadas</span>
                  <p className="text-xl font-bold text-sky-600">
                    {importResult.updatedCount}
                  </p>
                </div>
                <div className="border-r border-slate-200" />
                <div>
                  <span className="text-xs text-slate-500">Fallidas</span>
                  <p className="text-xl font-bold text-slate-600">
                    {importResult.failedCount}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-200/60 transition"
          >
            {step === "RESULT" ? "Cerrar" : "Cancelar"}
          </button>

          <div className="flex items-center gap-2">
            {step === "MAPPING" && (
              <button
                onClick={handlePreviewRequest}
                disabled={
                  loading ||
                  !columnMapping.origin ||
                  !columnMapping.destination ||
                  !columnMapping.oceanFreight
                }
                className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50 transition"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                Continuar a Previsualización
              </button>
            )}

            {step === "RESOLVE_PORTS" && (
              <button
                onClick={() => setStep("PREVIEW")}
                className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition"
              >
                <Check className="w-4 h-4" />
                Confirmar Puertos y Previsualizar
              </button>
            )}

            {step === "PREVIEW" && (
              <button
                onClick={handleBulkImportExecute}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 transition"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Database className="w-4 h-4" />
                )}
                Confirmar e Importar Tarifas
              </button>
            )}

            {step === "RESULT" && (
              <button
                onClick={onClose}
                className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition"
              >
                Finalizar
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
