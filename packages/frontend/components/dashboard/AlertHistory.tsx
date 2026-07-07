"use client";

import React from "react";
import { AlertTriangle, Clock, ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";

interface Alert {
  id: string;
  type: string;
  message: string;
  shipmentId: string;
  timestamp: string;
}

const MOCK_ALERTS: Alert[] = [
  {
    id: "a1",
    type: "Delay",
    message: "Retraso de 3 días detectado",
    shipmentId: "SHP-001",
    timestamp: "2026-06-17 10:00",
  },
  {
    id: "a2",
    type: "Customs",
    message: "Retención aduanera en puerto",
    shipmentId: "SHP-005",
    timestamp: "2026-06-17 09:30",
  },
  {
    id: "a3",
    type: "Arrival",
    message: "Arribo a puerto Barcelona",
    shipmentId: "SHP-012",
    timestamp: "2026-06-17 08:45",
  },
];

export const AlertHistory = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#16161A] border border-gray-800 rounded-xl p-6 space-y-4"
    >
      <h3 className="text-lg font-bold text-white flex items-center">
        <AlertTriangle className="w-5 h-5 mr-2 text-amber-500" />
        Historial de Alertas
      </h3>
      <div className="space-y-3">
        {MOCK_ALERTS.map((alert) => (
          <div
            key={alert.id}
            className="p-3 bg-[#111114] border border-gray-800 rounded-lg flex items-center justify-between hover:border-gray-700 transition-colors"
          >
            <div>
              <p className="text-xs font-bold text-gray-300">{alert.type}</p>
              <p className="text-xs text-gray-500">{alert.message}</p>
              <p className="text-[10px] text-gray-600 mt-1 flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                {alert.timestamp}
              </p>
            </div>
            <Link
              to={`/tracking?id=${alert.shipmentId}`}
              className="text-blue-500 hover:text-blue-400 text-xs font-bold flex items-center bg-blue-500/10 px-2 py-1 rounded"
            >
              {alert.shipmentId} <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
