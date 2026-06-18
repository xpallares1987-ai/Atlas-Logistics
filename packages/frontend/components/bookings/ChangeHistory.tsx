'use client';

import React from 'react';
import { History, Clock, UserCircle } from 'lucide-react';

interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
}

interface ChangeHistoryProps {
  logs: AuditLog[];
}

export default function ChangeHistory({ logs }: ChangeHistoryProps) {
  return (
    <div className="bg-[#16161A] border border-gray-800 rounded-xl p-5">
      <h4 className="text-sm font-bold text-gray-300 flex items-center mb-4">
        <History className="w-4 h-4 mr-2 text-purple-400" />
        Historial de Cambios
      </h4>
      <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
        {logs.length > 0 ? (
          logs.map((log) => (
            <div key={log.id} className="relative pl-6 pb-4 border-l border-gray-800 last:border-0 last:pb-0">
              <div className="absolute w-2 h-2 bg-purple-500 rounded-full -left-1 top-1.5 border border-[#111114] shadow-[0_0_8px_rgba(168,85,247,0.5)]"></div>
              
              <div className="flex flex-col mb-1">
                <span className="text-xs font-bold text-gray-200">{log.action}</span>
                <span className="flex items-center text-[10px] text-gray-500 font-mono mt-1">
                  <Clock className="w-3 h-3 mr-1" />
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
              
              <div className="flex items-center text-[11px] text-gray-400 mt-1">
                <UserCircle className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
                <span className="text-gray-300 font-medium">{log.user}</span>
              </div>
              
              {log.details && (
                <div className="mt-1.5 text-[11px] text-gray-500 bg-[#111114] rounded p-2 border border-gray-800/50 break-words">
                  {log.details}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-xs text-gray-600 text-center py-4 bg-[#0A0A0B] rounded-lg border border-gray-800/50">
            No hay modificaciones recientes registradas.
          </div>
        )}
      </div>
    </div>
  );
}
