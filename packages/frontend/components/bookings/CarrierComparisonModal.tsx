"use client";

import React from "react";
import { X, Ship, Clock, DollarSign, CheckCircle2 } from "lucide-react";

interface CarrierComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  pol: string;
  pod: string;
  onSelect: (carrier: string) => void;
}

export default function CarrierComparisonModal({
  isOpen,
  onClose,
  pol,
  pod,
  onSelect,
}: CarrierComparisonModalProps) {
  if (!isOpen) return null;

  const carriers = [
    {
      name: "MSC",
      transitTime: "21 días",
      price: 1850,
      validUntil: "2023-11-30",
      direct: true,
    },
    {
      name: "Maersk",
      transitTime: "24 días",
      price: 1750,
      validUntil: "2023-11-15",
      direct: false,
    },
    {
      name: "CMA CGM",
      transitTime: "20 días",
      price: 1900,
      validUntil: "2023-12-05",
      direct: true,
    },
    {
      name: "Hapag-Lloyd",
      transitTime: "28 días",
      price: 1600,
      validUntil: "2023-10-31",
      direct: false,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#111114] border border-gray-800 rounded-xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-5 border-b border-gray-800 bg-[#16161A]">
          <div>
            <h2 className="text-lg font-medium text-white flex items-center">
              <Ship className="w-5 h-5 mr-2 text-blue-500" />
              Comparativa de Fletes
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Mostrando opciones disponibles para la ruta{" "}
              <span className="font-mono text-gray-200">{pol || "POL"}</span> →{" "}
              <span className="font-mono text-gray-200">{pod || "POD"}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition bg-gray-800/50 hover:bg-gray-700 p-2 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          <div className="overflow-hidden border border-gray-800 rounded-lg">
            <table className="w-full text-left">
              <thead className="bg-[#16161A] border-b border-gray-800 text-xs uppercase font-medium text-gray-500">
                <tr>
                  <th className="p-3">Naviera</th>
                  <th className="p-3">T. Tránsito</th>
                  <th className="p-3">Ruta</th>
                  <th className="p-3">Validez (Válido hasta)</th>
                  <th className="p-3 text-right">Flete (USD)</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50 bg-[#0A0A0B]">
                {carriers.map((carrier, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-gray-800/20 transition-colors"
                  >
                    <td className="p-3 font-medium text-gray-200">
                      {carrier.name}
                    </td>
                    <td className="p-3 text-sm text-gray-400 flex items-center">
                      <Clock className="w-3.5 h-3.5 mr-1" />{" "}
                      {carrier.transitTime}
                    </td>
                    <td className="p-3 text-sm text-gray-400">
                      {carrier.direct ? (
                        <span className="text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded text-[10px] font-bold">
                          DIRECTO
                        </span>
                      ) : (
                        <span className="text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded text-[10px] font-bold">
                          TRANSBORDO
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-sm text-gray-400">
                      {carrier.validUntil}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-gray-200">
                      ${carrier.price.toLocaleString()}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => {
                          onSelect(carrier.name);
                          onClose();
                        }}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded text-xs transition"
                      >
                        Seleccionar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-4 border-t border-gray-800 bg-[#16161A] text-xs text-gray-500 flex justify-between items-center">
          <p className="flex items-center">
            <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-500" />
            Tarifas referenciales sujetas a disponibilidad de equipo (GRI
            aplicable).
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 hover:text-white transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
