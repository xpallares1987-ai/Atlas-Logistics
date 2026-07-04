'use client';

import { useCallback } from 'react';
import { ArrowRight, Check, AlertTriangle, ChevronDown } from 'lucide-react';
import type { MappingState, ColumnMapping, ReportType } from '../types/dashboard';
import { TEMPLATE_FIELDS } from '../types/dashboard';
import { getMissingRequired, isMappingComplete } from '../services/column-mapper';

interface ColumnMapperProps {
  state: MappingState;
  onChange: (mappings: ColumnMapping[]) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ColumnMapper({ state, onChange, onConfirm, onCancel }: ColumnMapperProps) {
  const { reportType, availableColumns, mappings } = state;
  const fields = TEMPLATE_FIELDS[reportType];
  const missing = getMissingRequired(mappings, reportType);
  const complete = isMappingComplete(mappings, reportType);

  const getSourceFor = (targetField: string): string =>
    mappings.find((m) => m.targetField === targetField)?.sourceColumn ?? '';

  const handleChange = useCallback(
    (targetField: string, sourceColumn: string) => {
      // Remove any existing mapping to this target and any mapping from the same source
      const filtered = mappings.filter(
        (m) => m.targetField !== targetField && m.sourceColumn !== sourceColumn,
      );
      const updated: ColumnMapping[] = sourceColumn
        ? [...filtered, { sourceColumn, targetField }]
        : filtered;
      onChange(updated);
    },
    [mappings, onChange],
  );

  const REPORT_LABELS: Record<ReportType, string> = {
    operational: 'Operational',
    financial: 'Financial',
    exception: 'Exception',
  };

  return (
    <div className="column-mapper">
      <div className="column-mapper__header">
        <div>
          <h3 className="column-mapper__title">Map Columns</h3>
          <p className="column-mapper__subtitle">
            Assign columns from <strong>{state.fileName}</strong> to the{' '}
            <span className={`badge badge--${reportType}`}>{REPORT_LABELS[reportType]}</span> report fields
          </p>
        </div>
        <div className="column-mapper__stats">
          <span className="stat-badge stat-badge--info">{state.rawData.length} rows</span>
          <span className="stat-badge stat-badge--muted">{availableColumns.length} columns detected</span>
        </div>
      </div>

      <div className="mapper-grid">
        {fields.map((field) => {
          const src = getSourceFor(field.key);
          const isMapped = !!src;
          const isRequired = field.required;
          const isMissingRequired = isRequired && !isMapped;

          return (
            <div
              key={field.key}
              className={`mapper-row ${isMapped ? 'mapper-row--mapped' : ''} ${isMissingRequired ? 'mapper-row--error' : ''}`}
            >
              {/* Target field */}
              <div className="mapper-row__target">
                <span className="mapper-row__field-name">{field.label}</span>
                {isRequired && <span className="required-badge">required</span>}
                <span className="mapper-row__example">e.g. {field.example}</span>
              </div>

              {/* Arrow */}
              <ArrowRight size={14} className="mapper-row__arrow" />

              {/* Source column dropdown */}
              <div className="mapper-row__source">
                <div className="select-wrapper">
                  <select
                    value={src}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    className={`mapper-select ${isMissingRequired ? 'mapper-select--error' : ''}`}
                  >
                    <option value="">— not mapped —</option>
                    {availableColumns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="select-icon" />
                </div>
                {isMapped && <Check size={12} className="mapped-icon" />}
              </div>
            </div>
          );
        })}
      </div>

      {!complete && (
        <div className="mapper-warning">
          <AlertTriangle size={14} />
          <span>Required fields not mapped: {missing.join(', ')}</span>
        </div>
      )}

      <div className="mapper-actions">
        <button onClick={onCancel} className="btn btn--ghost">
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={!complete}
          className="btn btn--primary"
        >
          Import {state.rawData.length} rows
        </button>
      </div>
    </div>
  );
}
