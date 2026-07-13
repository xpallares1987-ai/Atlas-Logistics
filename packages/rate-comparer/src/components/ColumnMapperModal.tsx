// @ts-nocheck
import React, { useState } from "react";
import {
  CheckCircle,
  X,
  Save,
  AlertTriangle,
  GripVertical,
} from "lucide-react";
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragEndEvent,
  rectIntersection,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

interface ColumnMapperModalProps {
  rawHeaders: string[];
  onSave: (mapping: Record<string, string>) => void;
  onCancel: () => void;
}

const REQUIRED_FIELDS = [
  { key: "mes", label: "Month / Period", required: true },
  { key: "pol", label: "Port of Loading (POL)", required: true },
  { key: "pod", label: "Port of Discharge (POD)", required: true },
  { key: "carrier", label: "Carrier / Line", required: true },
  { key: "oceanFreight", label: "Ocean Freight / Base Rate", required: true },
  { key: "gastosFob", label: "FOB Charges", required: false },
  { key: "gastosDestino", label: "Destination Charges", required: false },
  { key: "baf", label: "BAF Surcharge", required: false },
  { key: "transitTime", label: "Transit Time (Days)", required: false },
  { key: "validUntil", label: "Validity Date", required: false },
];

function DraggableHeader({ id, text }: { id: string; text: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: id,
      data: { title: text },
    });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-2 p-2 px-3 text-sm bg-white border rounded-md shadow-sm cursor-grab active:cursor-grabbing hover:border-indigo-400 ${
        isDragging
          ? "border-indigo-500 shadow-md ring-2 ring-indigo-200"
          : "border-slate-200"
      }`}
    >
      <GripVertical className="w-4 h-4 text-slate-400" />
      <span className="font-medium text-slate-700">{text}</span>
    </div>
  );
}

function DroppableField({
  field,
  mappedHeader,
  onRemove,
}: {
  field: (typeof REQUIRED_FIELDS)[0];
  mappedHeader: string | null;
  onRemove: () => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: field.key,
  });

  return (
    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-1">
          {field.label}
          {field.required && <span className="text-red-500">*</span>}
        </label>
        {mappedHeader && <CheckCircle className="w-4 h-4 text-emerald-500" />}
      </div>

      <div
        ref={setNodeRef}
        className={`min-h-[46px] flex items-center rounded-md border-2 border-dashed p-1 transition-colors ${
          isOver
            ? "border-indigo-500 bg-indigo-50"
            : mappedHeader
              ? "border-transparent bg-slate-50"
              : field.required
                ? "border-amber-300 bg-amber-50/50"
                : "border-slate-200 bg-slate-50"
        }`}
      >
        {mappedHeader ? (
          <div className="flex-1 flex items-center justify-between bg-indigo-100 text-indigo-800 p-2 rounded text-sm font-medium border border-indigo-200">
            <span>{mappedHeader}</span>
            <button
              onClick={onRemove}
              className="p-1 hover:bg-indigo-200 rounded text-indigo-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex-1 text-center text-xs text-slate-400 font-medium py-2 pointer-events-none">
            {isOver ? "Drop here..." : "Drag a column here"}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ColumnMapperModal({
  rawHeaders,
  onSave,
  onCancel,
}: ColumnMapperModalProps) {
  // Mapping state: key = internal field key, value = selected raw header
  const [mapping, setMapping] = useState<Record<string, string>>({});

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && over.id) {
      const fieldKey = over.id as string;
      const headerName = active.data.current?.title as string;

      if (headerName) {
        setMapping((prev) => {
          return {
            ...prev,
            [fieldKey]: headerName,
          };
        });
      }
    }
  };

  const removeMapping = (fieldKey: string) => {
    setMapping((prev) => {
      const newMap = { ...prev };
      delete newMap[fieldKey];
      return newMap;
    });
  };

  const isReady = REQUIRED_FIELDS.filter((f) => f.required).every(
    (f) => !!mapping[f.key],
  );

  // Available headers are those NOT currently mapped
  const mappedValues = Object.values(mapping);
  const availableHeaders = rawHeaders.filter((h) => !mappedValues.includes(h));

  return (
    <DndContext onDragEnd={handleDragEnd} collisionDetection={rectIntersection}>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Map Your Columns
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Drag and drop your spreadsheet columns to match our required
                fields.
              </p>
            </div>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-slate-200 rounded-full text-slate-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left Sidebar - Available Headers */}
            <div className="w-1/3 border-r border-slate-200 bg-slate-50 p-6 overflow-y-auto flex flex-col gap-4">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">
                Available Columns ({availableHeaders.length})
              </h3>
              {availableHeaders.length === 0 ? (
                <div className="text-center p-6 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-lg">
                  All columns have been mapped!
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {availableHeaders.map((header) => (
                    <DraggableHeader
                      key={`header-${header}`}
                      id={`drag-${header}`}
                      text={header}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Right Area - Mapping Target */}
            <div className="w-2/3 p-6 overflow-y-auto bg-slate-100/50 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {REQUIRED_FIELDS.map((field) => (
                  <DroppableField
                    key={field.key}
                    field={field}
                    mappedHeader={mapping[field.key] || null}
                    onRemove={() => removeMapping(field.key)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 bg-white rounded-b-xl flex justify-between items-center">
            <span className="text-xs text-slate-500">
              {isReady ? (
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" /> All required fields mapped
                </span>
              ) : (
                <span className="text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> Please map all required
                  fields (*)
                </span>
              )}
            </span>
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => onSave(mapping)}
                disabled={!isReady}
                className={`px-5 py-2 text-sm font-bold text-white rounded flex items-center gap-2 transition-colors ${
                  isReady
                    ? "bg-indigo-600 hover:bg-indigo-700 shadow-md"
                    : "bg-slate-300 cursor-not-allowed"
                }`}
              >
                <Save className="w-4 h-4" />
                Import Rates
              </button>
            </div>
          </div>
        </div>
      </div>
    </DndContext>
  );
}

