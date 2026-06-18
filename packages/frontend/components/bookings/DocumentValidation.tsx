'use client';

import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface DocumentValidationProps {
  fields: {
    label: string;
    value: string | number | null | undefined;
    isSubmittable?: boolean;
  }[];
}

export default function DocumentValidation({ fields }: DocumentValidationProps) {
  const missingFields = fields.filter(f => !f.value || f.value === '');
  const isValid = missingFields.length === 0;

  return (
    <div className={`p-4 rounded-lg border text-sm w-full mb-4 ${isValid ? 'bg-emerald-900/10 border-emerald-800/40' : 'bg-red-900/10 border-red-800/40'}`}>
      <div className="flex items-start">
        {isValid ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-500 mr-2 flex-shrink-0 mt-0.5" />
        ) : (
          <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
        )}
        
        <div>
          <h4 className={`font-medium mb-1 ${isValid ? 'text-emerald-400' : 'text-red-400'}`}>
            {isValid ? 'Validación Completada' : 'Faltan Campos Obligatorios'}
          </h4>
          
          {!isValid ? (
            <ul className="list-disc list-inside text-xs text-red-300/80 space-y-1">
              {missingFields.map((field, idx) => (
                <li key={idx}>El campo <strong>{field.label}</strong> es obligatorio.</li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-emerald-300/80">Todos los datos requeridos para el Draft HBL están completos.</p>
          )}
        </div>
      </div>
    </div>
  );
}
