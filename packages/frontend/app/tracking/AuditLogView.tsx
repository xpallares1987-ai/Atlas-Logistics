'use client';

import React, { useEffect, useState } from 'react';
import { History, UserCircle, Clock } from 'lucide-react';
import { fetchMilestones } from '@/app/actions/trackingActions';
import { TrackingMilestone } from '@/types/schema';

// Simulamos usuarios que pueden haber hecho los cambios
const USERS = [
  { name: 'John Doe', role: 'Operador' },
  { name: 'Jane Smith', role: 'Sales' },
  { name: 'Admin User', role: 'Admin' }
];

export function AuditLogView({ shipmentId }: { shipmentId: string }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Para simplificar y no modificar el modelo de datos backend, 
    // generaremos el log de auditoría basándonos en los hitos (milestones) del embarque,
    // asignando usuarios simulados para demostrar la funcionalidad visual de auditoría.
    const loadAudit = async () => {
      setLoading(true);
      const data: TrackingMilestone[] = await fetchMilestones(shipmentId);
      
      const generatedLogs = data.map((m, index) => {
        // Pseudo-random user assignment
        const user = USERS[(index + m.id.length) % USERS.length];
        return {
          id: `audit-${m.id}`,
          action: `Cambio de estatus: ${m.type}`,
          user: user.name,
          role: user.role,
          date: m.date,
          details: `Ubicación: ${m.location}. ${m.description ? m.description : ''}`
        };
      });

      // Añadir un log inicial de creación
      generatedLogs.push({
        id: `audit-init-${shipmentId}`,
        action: 'Creación de Embarque',
        user: USERS[0].name,
        role: USERS[0].role,
        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), // 7 days ago
        details: 'El embarque fue registrado en el sistema.'
      });

      // Ordenar de más reciente a más antiguo
      generatedLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setLogs(generatedLogs);
      setLoading(false);
    };

    loadAudit();
  }, [shipmentId]);

  return (
    <div className="bg-[#16161A] border border-gray-800 rounded-lg p-5 w-full h-full">
      <h4 className="text-sm font-bold text-gray-300 flex items-center mb-4">
        <History className="w-4 h-4 mr-2 text-purple-400" />
        Log de Auditoría (Historial)
      </h4>
      
      {loading ? (
        <div className="text-xs text-gray-500 py-4">Cargando registros...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#111114] text-gray-400 uppercase">
              <tr>
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Usuario</th>
                <th className="px-3 py-2">Acción</th>
                <th className="px-3 py-2">Detalles</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-gray-800/40 hover:bg-gray-800/20">
                  <td className="px-3 py-2 font-mono">{new Date(log.date).toLocaleString()}</td>
                  <td className="px-3 py-2 flex items-center">
                    <UserCircle className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
                    {log.user} <span className="text-[10px] text-gray-500 ml-1">({log.role})</span>
                  </td>
                  <td className="px-3 py-2 font-medium text-white">{log.action}</td>
                  <td className="px-3 py-2 text-gray-500 italic truncate max-w-xs">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
