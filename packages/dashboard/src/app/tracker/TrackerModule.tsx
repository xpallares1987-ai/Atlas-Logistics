"use client";

import { useEffect, useState, useRef } from "react";
import { ShipmentService } from "../../tracker-services/shipmentService";
import { AgentService } from "../../tracker-services/agentService";
import { Shipment, Agent } from "../../types";
import { Map, Truck, Plane, Ship, User, Phone, Mail } from "lucide-react";
import { MapService } from "../../tracker-services/mapService";
import Link from "next/link";

export default function TrackerModule() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInitialized, setMapInitialized] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const [shipmentData, agentData] = await Promise.all([
        ShipmentService.getShipments(),
        AgentService.getAgents(),
      ]);
      setShipments(shipmentData);
      setAgents(agentData);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (mapRef.current && !mapInitialized && typeof window !== "undefined") {
      MapService.init(mapRef.current.id);
      setMapInitialized(true);
    }
  }, [mapRef, mapInitialized]);

  useEffect(() => {
    if (mapInitialized && shipments.length > 0) {
      MapService.renderShipments(shipments);
    }
  }, [mapInitialized, shipments]);

  return (
    <div className="dashboard-container">
      <header className="header">
        <div className="brand">
          <div className="logo-area">
            <Map className="logo-icon" size={32} />
            <div>
              <h1>Live Shipment Tracker</h1>
              <p className="subtitle">Seguimiento Geoespacial en Tiempo Real</p>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <nav className="tabs">
            <Link
              href="/"
              className="tab-btn"
              style={{ textDecoration: "none" }}
              prefetch={false}
            >
              Volver al Dashboard
            </Link>
          </nav>
        </div>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "350px 1fr",
          gap: "2rem",
          height: "calc(100vh - 200px)",
          minHeight: "600px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
            overflowY: "auto",
            paddingRight: "0.5rem",
          }}
        >
          {/* Active Shipments Section */}
          <div className="card" style={{ marginBottom: 0 }}>
            <h3>Embarques Activos ({shipments.length})</h3>
            <div
              style={{
                marginTop: "1rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              {shipments.map((s) => (
                <div
                  key={s.id}
                  style={{
                    padding: "0.85rem",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    background: "var(--card-bg-alt)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <strong style={{ fontSize: "0.95rem" }}>
                      {s.reference}
                    </strong>
                    {s.mode === "sea" ? (
                      <Ship size={16} />
                    ) : s.mode === "air" ? (
                      <Plane size={16} />
                    ) : (
                      <Truck size={16} />
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--text-secondary)",
                      marginTop: "0.4rem",
                    }}
                  >
                    {s.origin} ➔ {s.destination}
                  </div>
                  <div
                    style={{
                      marginTop: "0.6rem",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        padding: "0.2rem 0.5rem",
                        background: "var(--accent-soft)",
                        color: "var(--accent)",
                        borderRadius: "4px",
                        fontSize: "0.7rem",
                        fontWeight: "bold",
                      }}
                    >
                      {s.status.toUpperCase()}
                    </span>
                    <span
                      style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}
                    >
                      ETA: {s.eta}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Logistics Agents Section */}
          <div className="card" style={{ marginBottom: 0 }}>
            <h3>Agentes Logísticos ({agents.length})</h3>
            <div
              style={{
                marginTop: "1rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              {agents.map((a) => (
                <div
                  key={a.id}
                  style={{
                    padding: "0.85rem",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    borderLeft: `4px solid ${a.status === "active" ? "#10b981" : a.status === "away" ? "#f59e0b" : "#64748b"}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                    }}
                  >
                    <div
                      style={{
                        background: "var(--bg-soft)",
                        padding: "0.4rem",
                        borderRadius: "50%",
                      }}
                    >
                      <User size={16} />
                    </div>
                    <div>
                      <div style={{ fontWeight: "bold", fontSize: "0.9rem" }}>
                        {a.name}
                      </div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        {a.role} • {a.region}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      marginTop: "0.75rem",
                      display: "flex",
                      gap: "0.75rem",
                    }}
                  >
                    <a
                      href={`mailto:${a.email}`}
                      title={a.email}
                      style={{ color: "var(--text-secondary)" }}
                    >
                      <Mail size={14} />
                    </a>
                    <a
                      href={`tel:${a.phone}`}
                      title={a.phone}
                      style={{ color: "var(--text-secondary)" }}
                    >
                      <Phone size={14} />
                    </a>
                    <div
                      style={{
                        marginLeft: "auto",
                        fontSize: "0.7rem",
                        color: "var(--text-muted)",
                        fontStyle: "italic",
                      }}
                    >
                      {a.specialties.slice(0, 2).join(", ")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          className="card"
          style={{ padding: 0, overflow: "hidden", marginBottom: 0 }}
        >
          <div
            id="shipment-map"
            ref={mapRef}
            style={{
              width: "100%",
              height: "100%",
              minHeight: "500px",
              zIndex: 1,
            }}
          ></div>
        </div>
      </div>
    </div>
  );
}
