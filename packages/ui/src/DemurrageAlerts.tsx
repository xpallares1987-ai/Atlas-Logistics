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
    <div className="demurrage-dashboard">
      {/* 1. Header & Quick Analytics Cards */}
      <div className="report-kpi-grid" style={{ marginBottom: "2rem" }}>
        <div
          className="kpi-panel-card"
          style={{ borderLeft: "4px solid #ef4444" }}
        >
          <span className="kpi-label">Riesgo Total de Demoras</span>
          <h2 className="kpi-value text-accent" style={{ color: "#ef4444" }}>
            USD {metrics.totalExposure.toLocaleString("es-ES")}
          </h2>
          <span className="kpi-detail">Cargos devengados acumulados</span>
        </div>

        <div
          className="kpi-panel-card"
          style={{ borderLeft: "4px solid #f59e0b" }}
        >
          <span className="kpi-label">Equipos en Sobrecoste</span>
          <h2 className="kpi-value text-warning">
            {metrics.criticalCount} / {metrics.totalContainers}
          </h2>
          <span className="kpi-detail">Contenedores con free-time agotado</span>
        </div>

        <div
          className="kpi-panel-card"
          style={{ borderLeft: "4px solid #3b82f6" }}
        >
          <span className="kpi-label">Próximos a Vencer (≤48h)</span>
          <h2 className="kpi-value" style={{ color: "#3b82f6" }}>
            {metrics.warningCount}
          </h2>
          <span className="kpi-detail">Contenedores en zona de alerta</span>
        </div>

        <div
          className="kpi-panel-card"
          style={{ borderLeft: "4px solid #10b981" }}
        >
          <span className="kpi-label">Dwell Time Promedio</span>
          <h2 className="kpi-value" style={{ color: "#10b981" }}>
            {metrics.avgDwell} días
          </h2>
          <span className="kpi-detail">
            Estancia media en terminal portuaria
          </span>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 380px",
          gap: "2rem",
        }}
      >
        {/* 2. Primary Warning Log Table */}
        <div className="card table-card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
            >
              <ShieldAlert
                className="text-accent"
                style={{ color: "#ef4444" }}
              />
              <h3>Registro de Penalizaciones Portuarias</h3>
            </div>

            {/* Search Input */}
            <div className="search-wrapper" style={{ maxWidth: "250px" }}>
              <Search className="search-icon" size={16} />
              <input
                type="text"
                placeholder="Buscar contenedor, naviera..."
                className="search-input"
                style={{
                  padding: "0.5rem 0.5rem 0.5rem 2.2rem",
                  fontSize: "0.85rem",
                }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="table-responsive">
            <table className="custom-report-table">
              <thead>
                <tr>
                  <th>Contenedor</th>
                  <th>Naviera</th>
                  <th>Ruta (POD)</th>
                  <th>Fecha Arribo</th>
                  <th>Estancia</th>
                  <th>Plazo Libre</th>
                  <th>Plazo Restante</th>
                  <th>Tarifa/Día</th>
                  <th>Penalización</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredContainers.map((c) => {
                  const remaining = c.freeTimeDays - c.dwellDays;
                  const exposure =
                    remaining < 0 ? Math.abs(remaining) * c.ratePerDay : 0;

                  return (
                    <tr key={c.id}>
                      <td className="bold" style={{ fontFamily: "monospace" }}>
                        {c.container}
                      </td>
                      <td>{c.carrier}</td>
                      <td>{c.pod}</td>
                      <td>{c.portArrivalDate}</td>
                      <td>
                        <strong>{c.dwellDays} días</strong>
                      </td>
                      <td>{c.freeTimeDays} días</td>
                      <td>
                        {remaining < 0 ? (
                          <span
                            style={{ color: "#ef4444", fontWeight: "bold" }}
                          >
                            Agotado ({Math.abs(remaining)}d)
                          </span>
                        ) : remaining === 0 ? (
                          <span
                            style={{ color: "#f59e0b", fontWeight: "bold" }}
                          >
                            Vence Hoy
                          </span>
                        ) : (
                          <span
                            style={{ color: "#10b981", fontWeight: "bold" }}
                          >
                            {remaining} días libres
                          </span>
                        )}
                      </td>
                      <td>USD {c.ratePerDay}</td>
                      <td>
                        {exposure > 0 ? (
                          <strong style={{ color: "#ef4444" }}>
                            USD {exposure.toLocaleString("es-ES")}
                          </strong>
                        ) : (
                          <span
                            className="text-success"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.25rem",
                              fontSize: "0.85rem",
                            }}
                          >
                            <CheckCircle size={14} /> Sin recargos
                          </span>
                        )}
                      </td>
                      <td>
                        {exposure > 0 ? (
                          <button
                            className="btn-primary"
                            style={{
                              padding: "0.4rem 0.75rem",
                              fontSize: "0.75rem",
                              background: "#ef4444",
                              boxShadow: "none",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.25rem",
                            }}
                            onClick={() => openEmailDraft(c)}
                          >
                            <Mail size={12} /> Exención
                          </button>
                        ) : (
                          <button
                            className="btn-secondary"
                            style={{
                              padding: "0.4rem 0.75rem",
                              fontSize: "0.75rem",
                            }}
                            disabled
                          >
                            A Salvo
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
        <div
          className="card"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
            marginBottom: 0,
          }}
        >
          <div
            className="card-header"
            style={{
              padding: 0,
              paddingBottom: "1rem",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <h3>Exposición de Riesgo por Naviera</h3>
          </div>

          <div
            className="carrier-bar-chart-list"
            style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
          >
            {carrierRiskData.map((carrier, idx) => {
              // Calculate percent width of progress bar based on highest exposure
              const maxExposure = Math.max(
                ...carrierRiskData.map((d) => d.exposure),
                1,
              );
              const percent = (carrier.exposure / maxExposure) * 100;

              return (
                <div
                  key={idx}
                  className="carrier-chart-row"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.4rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.9rem",
                      fontWeight: 600,
                    }}
                  >
                    <span>
                      {carrier.name} ({carrier.count} cont.)
                    </span>
                    <strong
                      style={{
                        color:
                          carrier.exposure > 0
                            ? "#ef4444"
                            : "var(--text-muted)",
                      }}
                    >
                      USD {carrier.exposure.toLocaleString("es-ES")}
                    </strong>
                  </div>
                  <div
                    className="custom-progress-bar-bg"
                    style={{
                      width: "100%",
                      height: "10px",
                      background: "var(--bg-tertiary)",
                      borderRadius: "999px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      className="custom-progress-bar-fill"
                      style={{
                        width: `${percent}%`,
                        height: "100%",
                        background:
                          carrier.exposure > 1000
                            ? "linear-gradient(90deg, #f59e0b 0%, #ef4444 100%)"
                            : carrier.exposure > 0
                              ? "#f59e0b"
                              : "#10b981",
                        borderRadius: "999px",
                        transition: "width 0.5s ease-out",
                      }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>

          <div
            className="card-notes-panel"
            style={{
              background:
                "linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, rgba(239, 68, 68, 0.05) 100%)",
              border: "1px solid rgba(245, 158, 11, 0.2)",
              padding: "1rem",
              borderRadius: "12px",
              display: "flex",
              gap: "0.75rem",
              alignItems: "flex-start",
            }}
          >
            <AlertTriangle
              className="text-warning"
              size={24}
              style={{ flexShrink: 0, marginTop: "0.1rem", color: "#f59e0b" }}
            />
            <div style={{ fontSize: "0.85rem", lineHeight: "1.4" }}>
              <h4
                style={{
                  fontWeight: "bold",
                  marginBottom: "0.25rem",
                  color: "#f59e0b",
                }}
              >
                Protocolo de Retención D&D
              </h4>
              <p className="text-muted">
                Las navieras aplican recargos exponenciales tras agotar el plazo
                libre. Priorice la retirada del contenedor de{" "}
                <strong>
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
        <div className="sheet-picker-modal-backdrop">
          <div
            className="sheet-picker-modal"
            style={{ maxWidth: "650px", width: "95%" }}
          >
            <div
              className="modal-header"
              style={{ justifyContent: "space-between" }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <Mail
                  size={24}
                  className="text-accent"
                  style={{ color: "#ef4444" }}
                />
                <h3>Redactar Carta de Mitigación / Exención</h3>
              </div>
              <button
                onClick={() => setEmailModalOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div
              className="email-form-fields"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
                marginTop: "0.5rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.25rem",
                }}
              >
                <label
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: "bold",
                    color: "var(--text-muted)",
                  }}
                >
                  Destinatario:
                </label>
                <input
                  type="text"
                  className="search-input"
                  style={{ padding: "0.6rem 1rem" }}
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.25rem",
                }}
              >
                <label
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: "bold",
                    color: "var(--text-muted)",
                  }}
                >
                  Asunto del Email:
                </label>
                <input
                  type="text"
                  className="search-input"
                  style={{ padding: "0.6rem 1rem" }}
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.25rem",
                }}
              >
                <label
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: "bold",
                    color: "var(--text-muted)",
                  }}
                >
                  Cuerpo de la Solicitud:
                </label>
                <textarea
                  className="search-input"
                  style={{
                    padding: "1rem",
                    height: "240px",
                    resize: "none",
                    fontSize: "0.85rem",
                    lineHeight: "1.5",
                    fontFamily: "inherit",
                  }}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                />
              </div>
            </div>

            <div
              className="modal-footer"
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.75rem",
                marginTop: "1rem",
                paddingTop: "1rem",
                borderTop: "1px solid var(--border)",
              }}
            >
              <button
                className="btn-secondary"
                onClick={() => setEmailModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                className="btn-primary"
                style={{
                  background: "#ef4444",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
                onClick={handleSendEmail}
              >
                <Send size={16} /> <span>Enviar Solicitud</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
