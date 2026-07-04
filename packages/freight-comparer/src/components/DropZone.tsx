/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { PlayCircle, AlertTriangle, CheckCircle2, FileSpreadsheet, Upload } from "lucide-react";
import { FreightDB } from "../services/db";
import { eventBus } from "../services/eventBus";
import { FreightRate, TranslationSet } from "../types";
import { parseRawSheetRows, parseDatosJsRows, parseSemicolonCSV, parseMappedSheetRows } from "../services/rateParser";
import { DATA_INJECTED } from "../data/datos";
import ExcelValidator, { ColumnStatus } from "./ExcelValidator";
import { downloadRateTemplate } from "../utils/excelTemplate";
import ColumnMapperModal from "./ColumnMapperModal";

interface DropZoneProps {
  t: TranslationSet;
}

export default function DropZone({ t }: DropZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validationData, setValidationData] = useState<{
    sheetName: string;
    columns: ColumnStatus[];
  } | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
    details?: string;
  } | null>(null);

  const [mapperState, setMapperState] = useState<{
    isOpen: boolean;
    rawHeaders: string[];
    rawRows: Record<string, unknown>[];
    sheetName: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files) as File[];
      for (const file of files) {
        await processFile(file);
      }
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files) as File[];
      for (const file of files) {
        await processFile(file);
      }
    }
  };

  const clickInput = () => {
    fileInputRef.current?.click();
  };

  const processFile = async (file: File) => {
    const nameLower = file.name.toLowerCase();
    const isCsv = nameLower.endsWith(".csv");
    const isExcel = nameLower.endsWith(".xlsx") || nameLower.endsWith(".xls") || nameLower.endsWith(".xlsb") || nameLower.endsWith(".xlsm");

    if (!isCsv && !isExcel) {
      setFeedback({
        type: "error",
        message: t.invalidExcel,
        details: "Expected file matching .xlsx, .xls, or .csv formats.",
      });
      return;
    }

    setLoading(true);
    setFeedback(null);
    setValidationData(null);
    const startParseTime = performance.now();

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          let parsedRates: FreightRate[] = [];

          if (isCsv) {
            const text = e.target?.result as string;
            parsedRates = parseSemicolonCSV(text, file.name);
            if (parsedRates.length === 0) {
              throw new Error("No rate records could be successfully parsed from this CSV file.");
            }
          } else {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: "array" });

            const sheetsToRead = ["DATOS", "MESES ANTERIORES", "Buscador"];
            let readAnySheet = false;

            for (const sheetName of workbook.SheetNames) {
              const matchedName = sheetsToRead.find(
                (s) => s.toLowerCase() === sheetName.toLowerCase()
              );

              if (!matchedName) {
                continue;
              }

              readAnySheet = true;
              const worksheet = workbook.Sheets[sheetName];
              const rawRows = XLSX.utils.sheet_to_json<Record<string, string | number>>(worksheet, { defval: "" });

              if (rawRows.length === 0) continue;

              const sheetRates = parseRawSheetRows(rawRows, matchedName);
              
              // Phase 3: Visual Validation feedback (Simple logic check)
              if (rawRows.length > 0) {
                const firstRow = rawRows[0];
                const columns: ColumnStatus[] = [
                  { name: "POL", required: true, found: !!(firstRow["POL"] || firstRow["Puerto Origen"]) },
                  { name: "POD", required: true, found: !!(firstRow["POD"] || firstRow["Puerto Destino"]) },
                  { name: "Carrier", required: true, found: !!(firstRow["Carrier"] || firstRow["Naviera"]) },
                  { name: "Total", required: true, found: !!(firstRow["Total"] || firstRow["Flete Total"]) },
                  { name: "BAF", required: false, found: !!(firstRow["BAF"] || firstRow["Recargo Combustible"]) },
                ];
                setValidationData({ sheetName: matchedName, columns });
              }

              parsedRates.push(...sheetRates);
            }

            // Fallback: If no sheets matched the template names, try to parse the first sheet
            if (parsedRates.length === 0 && workbook.SheetNames.length > 0) {
              const firstSheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[firstSheetName];
              const rawRows = XLSX.utils.sheet_to_json<Record<string, string | number>>(worksheet, { defval: "" });
              if (rawRows.length > 0) {
                const sheetRates = parseRawSheetRows(rawRows, firstSheetName);
                readAnySheet = true;
                
                // If we didn't get any parsed rates automatically, trigger the mapper modal
                if (sheetRates.length === 0) {
                  const headers = Object.keys(rawRows[0] || {});
                  setMapperState({
                    isOpen: true,
                    rawHeaders: headers,
                    rawRows: rawRows as Record<string, unknown>[],
                    sheetName: firstSheetName
                  });
                  setLoading(false);
                  return; // Wait for mapper
                } else {
                  parsedRates.push(...sheetRates);
                  const firstRow = rawRows[0];
                  const columns: ColumnStatus[] = [
                    { name: "POL", required: true, found: !!(firstRow["POL"] || firstRow["Puerto Origen"]) },
                    { name: "POD", required: true, found: !!(firstRow["POD"] || firstRow["Puerto Destino"]) },
                    { name: "Carrier", required: true, found: !!(firstRow["Carrier"] || firstRow["Naviera"]) },
                    { name: "Total", required: true, found: !!(firstRow["Total"] || firstRow["Flete Total"]) },
                  ];
                  setValidationData({ sheetName: firstSheetName, columns });
                }
              }
            }

            if (!readAnySheet || parsedRates.length === 0) {
              throw new Error("No matching spreadsheet records (sheets 'DATOS', 'MESES ANTERIORES' or 'Buscador' with corresponding columns) could be found.");
            }
          }

          await FreightDB.saveRates(parsedRates);

          const timeTaken = (performance.now() - startParseTime).toFixed(0);
          setFeedback({
            type: "success",
            message: `${t.uploadSuccess} (${parsedRates.length} records parsed in ${timeTaken}ms)`,
          });

          eventBus.emit("data_loaded");

        } catch (err: unknown) {
          console.error("[DropZone] Parsing error:", err);
          setFeedback({
            type: "error",
            message: t.uploadError,
            details: err instanceof Error ? err.message : "Spreadsheet columns could not be correlated properly.",
          });
        } finally {
          setLoading(false);
        }
      };

      if (isCsv) {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    } catch (e: unknown) {
      console.error("[DropZone] File read crashed:", e);
      setFeedback({
        type: "error",
        message: t.uploadError,
        details: e instanceof Error ? e.message : "File IO Error",
      });
      setLoading(false);
    }
  };

  const handleLoadSample = async () => {
    setLoading(true);
    setFeedback(null);
    setValidationData(null);
    const startParseTime = performance.now();

    try {
      const realRates = parseDatosJsRows(DATA_INJECTED);

      await FreightDB.clearAll();
      await FreightDB.saveRates(realRates);

      const timeTaken = (performance.now() - startParseTime).toFixed(0);
      setFeedback({
        type: "success",
        message: `Corporate seed data successfully loaded! (${realRates.length} records parsed in ${timeTaken}ms)`,
      });

      eventBus.emit("data_loaded");
    } catch (err: unknown) {
      console.error("[DropZone] Loading seed failed:", err);
      setFeedback({
        type: "error",
        message: "Failed to assemble seed corporate rates.",
        details: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMapperSave = async (mapping: Record<string, string>) => {
    if (!mapperState) return;
    setMapperState(null);
    setLoading(true);

    try {
      const parsedRates = parseMappedSheetRows(mapperState.rawRows, mapperState.sheetName, mapping);
      if (parsedRates.length === 0) {
        throw new Error("Mapped columns produced zero valid rate records.");
      }

      await FreightDB.saveRates(parsedRates);
      
      setFeedback({
        type: "success",
        message: "Custom mapping successful",
        details: `Imported ${parsedRates.length} rate configurations.`
      });

      eventBus.emit("data_loaded");
      eventBus.emit("system_log", {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        level: "info",
        message: `Custom Column Mapping imported ${parsedRates.length} records from ${mapperState.sheetName}`
      });
    } catch (err: any) {
      console.error(err);
      setFeedback({
        type: "error",
        message: "Mapping failed",
        details: err.message || "Could not map columns to expected standard."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="file-uploader-section" className="bg-slate-800 rounded-xl border border-slate-700/80 p-4 shadow-md text-white relative mt-4">
      {mapperState?.isOpen && (
        <ColumnMapperModal
          rawHeaders={mapperState.rawHeaders}
          onSave={handleMapperSave}
          onCancel={() => setMapperState(null)}
        />
      )}
      
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Rate Source Manager
        </span>

        <button
          id="btn-load-sample"
          type="button"
          onClick={handleLoadSample}
          disabled={loading}
          className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-md transition duration-200"
        >
          <PlayCircle className="h-3 w-3" />
          Load Demo Rates
        </button>
      </div>

      <div
        id="drag-drop-area"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={clickInput}
        className={`w-full min-h-[95px] border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all duration-300 ${
          isDragActive
            ? "border-indigo-400 bg-slate-750 scale-[0.98]"
            : "border-slate-650 bg-slate-900 hover:border-slate-500 hover:bg-slate-850"
        }`}
      >
        <input
          id="xlsx-file-input"
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.xlsb,.xlsm,.csv"
          onChange={handleFileInput}
          className="hidden"
        />

        <div className="bg-slate-800 p-2 rounded-full mb-1 text-slate-350">
          <Upload className="h-4 w-4" />
        </div>

        <p className="text-xs font-semibold text-slate-200">
          Drag & Drop rates file (Excel or CSV) here
        </p>
        <p className="text-[9px] text-slate-450 mt-0.5">
          or click to select file locally
        </p>
      </div>

      {loading && (
        <div id="loader-indicator" className="w-full flex items-center justify-center p-2.5 mt-2 bg-slate-900 rounded-lg text-[10px] text-slate-350 gap-2 border border-slate-750">
          <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
          {t.loadingData}
        </div>
      )}

      {validationData && (
        <ExcelValidator 
          columns={validationData.columns} 
          sheetName={validationData.sheetName} 
        />
      )}
      
      <div className="mt-4 flex flex-col gap-2">
        <button
          onClick={downloadRateTemplate}
          className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold uppercase tracking-widest rounded border border-slate-700 transition-colors flex items-center justify-center gap-2"
        >
          <FileSpreadsheet className="w-3 h-3 text-emerald-400" />
          Download Template
        </button>
      </div>

      {feedback && (
        <div
          id="uploader-feedback-container"
          className={`mt-2 p-3 rounded-lg border flex items-start gap-2 animate-fade-in text-[10px] ${
            feedback.type === "success"
              ? "bg-slate-900 border-emerald-900/55 text-emerald-300"
              : "bg-slate-900 border-amber-900/55 text-amber-300"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 space-y-0.5 min-w-0">
            <p className="font-semibold truncate">{feedback.message}</p>
            {feedback.details && <p className="text-slate-450 font-mono text-[9px] truncate">{feedback.details}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
