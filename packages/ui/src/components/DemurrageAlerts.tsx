"use client";

import { useState, useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle,
  ShieldAlert,
  Mail,
  Search,
  X,
  Send,
} from "lucide-react";
interface ContainerAlert {
  id: string;
  reference: string;
  container: string;
  carrier: string;
  pol: string;
  pod: string;
  eta: string;
  portArrivalDate: string;
  dwellDays: number;
  freeTimeDays: number;
  ratePerDay: number;
  status: "transit" | "customs" | "port" | "delivered";
}

const INITIAL_CONTAINERS: ContainerAlert[] = [
  {
    id: "c1",
    reference: "HAWB-9921",
    container: "MSCU1234567",
    carrier: "MSC",
    pol: "Shanghai",
    pod: "Barcelona",
    eta: "2026-05-10",
    portArrivalDate: "2026-05-18", // arrived in port
    dwellDays: 9, // 9 days in port
    freeTimeDays: 7, // 7 days free
    ratePerDay: 150,
    status: "port",
  },
  {
    id: "c2",
    reference: "HAWB-7710",
    container: "HLXU1122334",
    carrier: "Hapag-Lloyd",
    pol: "Ningbo",
    pod: "Barcelona",
    eta: "2026-05-12",
    portArrivalDate: "2026-05-14",
    dwellDays: 13, // 13 days in port
    freeTimeDays: 5, // 5 days free
    ratePerDay: 120,
    status: "customs",
  },
  {
    id: "c3",
    reference: "HAWB-1092",
    container: "MAEU9988776",
    carrier: "Maersk",
    pol: "Qingdao",
    pod: "Valencia",
    eta: "2026-05-20",
    portArrivalDate: "2026-05-22",
    dwellDays: 5, // 5 days in port
    freeTimeDays: 5, // 5 days free
    ratePerDay: 140,
    status: "port",
  },
  {
    id: "c4",
    reference: "HAWB-8812",
    container: "ONEY3344556",
    carrier: "ONE",
    pol: "Shenzhen",
    pod: "Valencia",
    eta: "2026-05-15",
    portArrivalDate: "2026-05-24",
    dwellDays: 3, // 3 days in port
    freeTimeDays: 7, // 7 days free
    ratePerDay: 160,
    status: "port",
  },
  {
    id: "c5",
    reference: "HAWB-0045",
    container: "CMAU7766554",
    carrier: "CMA CGM",
    pol: "Hong Kong",
    pod: "Bilbao",
    eta: "2026-05-08",
    portArrivalDate: "2026-05-10",
    dwellDays: 17, // 17 days in port
    freeTimeDays: 7, // 7 days free
    ratePerDay: 130,
    status: "port",
  },
  {
    id: "c6",
    reference: "HAWB-3341",
    container: "COSU4455667",
    carrier: "COSCO",
    pol: "Ningbo",
    pod: "Barcelona",
    eta: "2026-05-24",
    portArrivalDate: "2026-05-25",
    dwellDays: 2, // 2 days in port
    freeTimeDays: 5, // 5 days free
    ratePerDay: 110,
    status: "port",
  },
];

export function DemurrageAlerts() {
  const [searchTerm, setSearchTerm] = useState("");
  const containers = INITIAL_CONTAINERS;
  const [selectedContainer, setSelectedContainer] =
    useState<ContainerAlert | null>(null);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailTo, setEmailTo] = useState("");

  // 1. Calculations & Metrics
  const metrics = useMemo(() => {
    let totalExposure = 0;
    let criticalCount = 0;
    let warningCount = 0;
    let totalDwell = 0;
    let portCount = 0;

    containers.forEach((c) => {
      const remaining = c.freeTimeDays - c.dwellDays;
      const exposure = remaining < 0 ? Math.abs(remaining) * c.ratePerDay : 0;
      totalExposure += exposure;

      if (remaining < 0) {
        criticalCount++;
      } else if (remaining <= 2) {
        warningCount++;
      }

      if (c.dwellDays > 0) {
        totalDwell += c.dwellDays;
        portCount++;
      }
    });

    return {
      totalExposure,
      criticalCount,
      warningCount,
      avgDwell: portCount > 0 ? (totalDwell / portCount).toFixed(1) : "0",
      totalContainers: containers.length,
    };
  }, [containers]);

  // 2. Carrier Risk Aggregation
  const carrierRiskData = useMemo(() => {
    const records: Record<string, { exposure: number; count: number }> = {};
    containers.forEach((c) => {
      const remaining = c.freeTimeDays - c.dwellDays;
      const exposure = remaining < 0 ? Math.abs(remaining) * c.ratePerDay : 0;

      if (!records[c.carrier]) {
        records[c.carrier] = { exposure: 0, count: 0 };
      }
      records[c.carrier].exposure += exposure;
      records[c.carrier].count += 1;
    });

    return Object.entries(records)
      .map(([name, data]) => ({
        name,
        exposure: data.exposure,
        count: data.count,
      }))
      .sort((a, b) => b.exposure - a.exposure);
  }, [containers]);

  // 3. Filtering
  const filteredContainers = useMemo(() => {
    return containers.filter(
      (c) =>
        c.container.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.carrier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.reference.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [containers, searchTerm]);

  // 4. Draft Fee Mitigation Letter
  const openEmailDraft = (c: ContainerAlert) => {
    const remaining = c.freeTimeDays - c.dwellDays;
    const daysOver = Math.abs(remaining);
    const exposure = daysOver * c.ratePerDay;

    setSelectedContainer(c);
    setEmailTo(`import.ops@${c.carrier.toLowerCase().replace(" ", "")}.com`);
    setEmailSubject(
      `URGENT: Demurrage Free-Time Extension Request - ${c.container} / ${c.reference}`,
    );

    const body = `Estimado equipo de operaciones de ${c.carrier},

Nos ponemos en contacto con ustedes en relación al contenedor ${c.container} (Referencia: ${c.reference}), el cual arribó al puerto de ${c.pod} el pasado ${c.portArrivalDate} a bordo del servicio procedente de ${c.pol}.

Actualmente, el contenedor registra un tiempo de permanencia (dwell time) de ${c.dwellDays} días, habiendo superado el plazo libre (free-time) acordado de ${c.freeTimeDays} días por un total de ${daysOver} días de demora. Esto representa un recargo acumulado estimado de USD ${exposure.toLocaleString("es-ES")}.

Debido a retrasos operativos imprevistos en los despachos de aduana y congestión en las terminales de transporte terrestre ajenas a nuestro control, solicitamos formalmente una ampliación excepcional del tiempo de almacenamiento gratuito (free-time) por 5 días adicionales, o en su defecto, la aplicación de una tarifa de contingencia reducida.

Agradecemos de antemano su colaboración para agilizar el levante de esta carga y mitigar costes adicionales para nuestro cliente final.

Quedamos a la espera de su confirmación.

Atentamente,
Departamento de Operaciones
Control Tower Global Logistics`;

    setEmailBody(body);
    setEmailModalOpen(true);
  };

  const handleSendEmail = () => {
    // Mock send notification
    alert(`Email enviado exitosamente a: ${emailTo}\nAsunto: ${emailSubject}`);
    setEmailModalOpen(false);
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Demurrage Alerts
          </h1>
          <p className="text-slate-400 mt-1">
            Gestión de tiempos libres y riesgo de penalizaciones
          </p>
        </div>
      </div>

      {/* 1. Header & Quick Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-slate-900/50 backdrop-blur-md p-5 rounded-2xl border border-red-500/30 shadow-[0_4px_20px_rgba(239,68,68,0.15)] flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Riesgo Total de Demoras
          </span>
          <h2 className="text-3xl font-black text-red-500 my-2">
            USD {metrics.totalExposure.toLocaleString("es-ES")}
          </h2>
          <span className="text-xs text-red-400/80 font-medium">
            Cargos devengados acumulados
          </span>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-md p-5 rounded-2xl border border-amber-500/30 shadow-[0_4px_20px_rgba(245,158,11,0.15)] flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Equipos en Sobrecoste
          </span>
          <h2 className="text-3xl font-black text-amber-500 my-2">
            {metrics.criticalCount} / {metrics.totalContainers}
          </h2>
          <span className="text-xs text-amber-400/80 font-medium">
            Contenedores con free-time agotado
          </span>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-md p-5 rounded-2xl border border-blue-500/30 shadow-[0_4px_20px_rgba(59,130,246,0.15)] flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Próximos a Vencer (≤48h)
          </span>
          <h2 className="text-3xl font-black text-blue-500 my-2">
            {metrics.warningCount}
          </h2>
          <span className="text-xs text-blue-400/80 font-medium">
            Contenedores en zona de alerta
          </span>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-md p-5 rounded-2xl border border-emerald-500/30 shadow-[0_4px_20px_rgba(16,185,129,0.15)] flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Dwell Time Promedio
          </span>
          <h2 className="text-3xl font-black text-emerald-500 my-2">
            {metrics.avgDwell} días
          </h2>
          <span className="text-xs text-emerald-400/80 font-medium">
            Estancia media en terminal portuaria
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* 2. Primary Warning Log Table */}
        <div className="xl:col-span-2 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-800/30">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20">
                <ShieldAlert size={20} />
              </div>
              <h3 className="text-lg font-bold text-white">
                Registro de Penalizaciones Portuarias
              </h3>
            </div>

            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                size={16}
              />
              <input
                type="text"
                placeholder="Buscar contenedor, naviera..."
                className="w-64 bg-slate-950/50 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-950/80 text-xs uppercase text-slate-400 font-bold sticky top-0">
                <tr>
                  <th className="px-6 py-4">Contenedor</th>
                  <th className="px-6 py-4">Naviera</th>
                  <th className="px-6 py-4">Ruta (POD)</th>
                  <th className="px-6 py-4">Estancia</th>
                  <th className="px-6 py-4">Plazo Restante</th>
                  <th className="px-6 py-4">Tarifa/Día</th>
                  <th className="px-6 py-4">Penalización</th>
                  <th className="px-6 py-4">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {filteredContainers.map((c) => {
                  const remaining = c.freeTimeDays - c.dwellDays;
                  const exposure =
                    remaining < 0 ? Math.abs(remaining) * c.ratePerDay : 0;

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-slate-200">
                        {c.container}
                      </td>
                      <td className="px-6 py-4 text-slate-300 font-medium">
                        {c.carrier}
                      </td>
                      <td className="px-6 py-4 text-slate-400">{c.pod}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-slate-800/80 rounded-md text-slate-200 font-bold border border-white/5">
                          {c.dwellDays} d
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {remaining < 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500/10 text-red-400 font-bold border border-red-500/20 text-xs">
                            Agotado ({Math.abs(remaining)}d)
                          </span>
                        ) : remaining === 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20 text-xs">
                            Vence Hoy
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 text-xs">
                            {remaining} d libres
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-400 font-mono">
                        ${c.ratePerDay}
                      </td>
                      <td className="px-6 py-4">
                        {exposure > 0 ? (
                          <strong className="text-red-400 font-mono text-base">
                            ${exposure.toLocaleString("es-ES")}
                          </strong>
                        ) : (
                          <span className="flex items-center gap-1 text-emerald-500/80 text-xs font-bold uppercase tracking-wider">
                            <CheckCircle size={14} /> Safe
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {exposure > 0 ? (
                          <button
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all"
                            onClick={() => openEmailDraft(c)}
                          >
                            <Mail size={14} /> Exención
                          </button>
                        ) : (
                          <button
                            className="px-3 py-1.5 bg-slate-800 text-slate-500 text-xs font-bold rounded-lg cursor-not-allowed"
                            disabled
                          >
                            -
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. Carrier Risk Analytics Visualization Panel */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col gap-6">
          <h3 className="text-lg font-bold text-white border-b border-white/5 pb-4">
            Exposición de Riesgo por Naviera
          </h3>

          <div className="flex flex-col gap-5 flex-1">
            {carrierRiskData.map((carrier, idx) => {
              const maxExposure = Math.max(
                ...carrierRiskData.map((d) => d.exposure),
                1,
              );
              const percent = (carrier.exposure / maxExposure) * 100;

              return (
                <div key={idx} className="flex flex-col gap-2">
                  <div className="flex justify-between text-sm font-semibold">
                    <span className="text-slate-300">
                      {carrier.name}{" "}
                      <span className="text-slate-500 text-xs">
                        ({carrier.count} cont.)
                      </span>
                    </span>
                    <span
                      className={
                        carrier.exposure > 0
                          ? "text-red-400 font-mono font-bold"
                          : "text-slate-500"
                      }
                    >
                      ${carrier.exposure.toLocaleString("es-ES")}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-white/5 shadow-inner">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: `${percent}%`,
                        background:
                          carrier.exposure > 1000
                            ? "linear-gradient(90deg, #f59e0b 0%, #ef4444 100%)"
                            : carrier.exposure > 0
                              ? "#f59e0b"
                              : "#10b981",
                      }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-auto bg-gradient-to-br from-amber-500/10 to-red-500/10 border border-amber-500/20 p-4 rounded-2xl flex gap-3 items-start backdrop-blur-md">
            <AlertTriangle
              className="text-amber-500 shrink-0 mt-0.5"
              size={20}
            />
            <div>
              <h4 className="font-bold text-amber-500 text-sm mb-1">
                Protocolo de Retención D&D
              </h4>
              <p className="text-slate-400 text-xs leading-relaxed font-medium">
                Las navieras aplican recargos exponenciales tras agotar el plazo
                libre. Priorice la retirada del contenedor de{" "}
                <strong className="text-amber-400">
                  {carrierRiskData[0]?.name || "la naviera principal"}
                </strong>{" "}
                para frenar pérdidas diarias.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Custom Fee Mitigation Email Drawer / Modal */}
      {emailModalOpen && selectedContainer && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-800/30">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20">
                  <Mail size={20} />
                </div>
                <h3 className="text-lg font-bold text-white">
                  Redactar Carta de Mitigación / Exención
                </h3>
              </div>
              <button
                onClick={() => setEmailModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Destinatario
                </label>
                <input
                  type="text"
                  className="bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Asunto
                </label>
                <input
                  type="text"
                  className="bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Cuerpo del Mensaje
                </label>
                <textarea
                  className="bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50 h-64 resize-none leading-relaxed"
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                />
              </div>
            </div>

            <div className="p-6 border-t border-white/5 bg-slate-800/20 flex justify-end gap-3">
              <button
                className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                onClick={() => setEmailModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all"
                onClick={handleSendEmail}
              >
                <Send size={16} /> Enviar Solicitud
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
