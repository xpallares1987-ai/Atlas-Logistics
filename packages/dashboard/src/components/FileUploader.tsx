'use client';

import { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2, X } from 'lucide-react';
import type { ReportType } from '../types/dashboard';

interface FileUploaderProps {
  onFilesReady: (files: File[], detectedType?: ReportType) => void;
  isProcessing?: boolean;
}

const ACCEPTED = '.csv,.xlsx,.xls,.ods';

export function FileUploader({ onFilesReady, isProcessing = false }: FileUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState<string[]>([]);

  const validate = (files: File[]): File[] => {
    const validExts = ['csv', 'xlsx', 'xls', 'ods', 'txt'];
    return files.filter((f) => {
      const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
      return validExts.includes(ext);
    });
  };

  const handleFiles = useCallback(
    (raw: FileList | null) => {
      setError(null);
      if (!raw || raw.length === 0) return;
      const files = Array.from(raw);
      const valid = validate(files);
      if (valid.length === 0) {
        setError('No valid files found. Please upload CSV or Excel (.xlsx/.xls) files.');
        return;
      }
      if (valid.length < files.length) {
        setError(`${files.length - valid.length} file(s) were skipped (unsupported format).`);
      }
      setAccepted(valid.map((f) => f.name));
      onFilesReady(valid);
    },
    [onFilesReady],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => handleFiles(e.target.files),
    [handleFiles],
  );

  const clearAccepted = () => { setAccepted([]); setError(null); };

  return (
    <div className="file-uploader">
      {/* Drop zone */}
      <label
        className={`drop-zone ${isDragOver ? 'drop-zone--active' : ''} ${isProcessing ? 'drop-zone--processing' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={onDrop}
        aria-label="File upload drop zone"
      >
        <input
          type="file"
          accept={ACCEPTED}
          multiple
          onChange={onInputChange}
          className="sr-only"
          id="file-upload-input"
          disabled={isProcessing}
        />
        <div className="drop-zone__icon">
          {isProcessing ? (
            <div className="spinner" />
          ) : isDragOver ? (
            <CheckCircle2 size={40} className="text-blue-400" />
          ) : (
            <Upload size={40} />
          )}
        </div>
        <p className="drop-zone__title">
          {isProcessing ? 'Processing files…' : isDragOver ? 'Drop files here' : 'Drop files here or click to browse'}
        </p>
        <p className="drop-zone__hint">Accepts CSV, Excel (.xlsx, .xls) — multiple files supported</p>
      </label>

      {/* File list */}
      {accepted.length > 0 && (
        <div className="upload-file-list">
          <div className="upload-file-list__header">
            <span>{accepted.length} file{accepted.length !== 1 ? 's' : ''} queued</span>
            <button onClick={clearAccepted} className="btn-icon" title="Clear">
              <X size={14} />
            </button>
          </div>
          {accepted.map((name) => (
            <div key={name} className="upload-file-item">
              <FileText size={14} className="text-blue-400" />
              <span>{name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="upload-error">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
