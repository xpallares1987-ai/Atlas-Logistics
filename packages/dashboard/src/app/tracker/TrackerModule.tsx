"use client";

import { useEffect, useState, useCallback } from "react";
import { AgentService } from "../../tracker-services/agentService";
import {
  LocationService,
  type Location,
} from "../../tracker-services/locationService";
import { Shipment, Agent } from "../../types";
import {
  Map,
  Truck,
  Plane,
  Ship,
  User,
  Phone,
  Mail,
  Anchor,
  Navigation,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import PortAutocomplete from "../../components/PortAutocomplete";
import { Link } from "react-router-dom";
import {
  ShippingMap,
  MilestoneStepper,
  getStandardOceanMilestones,
} from "@atlas/ui";
import { listShipments } from "@dataconnect/generated";

export default function TrackerModule() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [originPort, setOriginPort] = useState<Location | null>(null);
  const [destPort, setDestPort] = useState<Location | null>(null);
  const [filteredShipments, setFilteredShipments] = useState<Shipment[]>([]);
  const [expandedShipmentId, setExpandedShipmentId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const loadData = async () => {
      try {
        const [shipmentRes, agentData] = await Promise.all([
          listShipments(),
          AgentService.getAgents(),
          LocationService.getAll(), // pre-warm cache
        ]);

        // Map data connect response to expected Shipment format
        const shipmentData = (shipmentRes.data.shipments || []).map(
          (s: any) => ({
            ...s,
            id: s.id,
            reference: s.bookingReference,
            mode: s.mode || "sea",
            origin: s.pol,
            destination: s.pod,
            status: s.status,
            eta: s.eta,
            vesselLatitude: s.vesselLatitude,
            vesselLongitude: s.vesselLongitude,
            coordinatesLastUpdated: s.coordinatesLastUpdated,
            carrier: s.carrier,
          }),
        ) as Shipment[];

        setShipments(shipmentData);
        setFilteredShipments(shipmentData);
        setAgents(agentData);
      } catch (err) {
        console.error("Failed to load Data Connect shipments:", err);
      }
    };
    loadData();
  }, []);

  // Filter shipments when ports change
  useEffect(() => {
    let result = shipments;
    if (originPort) {
      result = result.filter(
        (s) =>
          s.origin?.toUpperCase().includes(originPort.locode) ||
          s.origin?.toLowerCase().includes(originPort.name.toLowerCase()),
      );
    }
    if (destPort) {
      result = result.filter(
        (s) =>
          s.destination?.toUpperCase().includes(destPort.locode) ||
          s.destination?.toLowerCase().includes(destPort.name.toLowerCase()),
      );
    }
    setFilteredShipments(result);
  }, [originPort, destPort, shipments]);

  const clearFilters = useCallback(() => {
    setOriginPort(null);
    setDestPort(null);
  }, []);

  const hasActiveFilters = originPort !== null || destPort !== null;

  return (
    <div className="dashboard-container">
      <header className="header">
        <div className="brand">
          <div className="logo-area">
            <Map className="logo-icon" size={32} />
            <div>
              <h1>Live Shipment Tracker</h1>
              <p className="subtitle">Real-Time Geospatial Tracking</p>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <nav className="tabs">
            <Link to="/" className="tab-btn" style={{ textDecoration: "none" }}>
              Back to Dashboard
            </Link>
          </nav>
        </div>
      </header>

      {/* ─── PORT SEARCH BAR ──────────────────────────────────────────── */}
      <div
        style={{
          background:
            "linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(139,92,246,0.08) 100%)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "1.25rem 1.5rem",
          marginBottom: "1.5rem",
          display: "flex",
          gap: "1rem",
          alignItems: "flex-end",
          flexWrap: "wrap",
        }}
      >
        {/* Label row */}
        <div
          style={{
            flex: "0 0 100%",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "0.25rem",
          }}
        >
          <Anchor size={16} style={{ color: "var(--accent)" }} />
          <span
            style={{
              fontSize: "0.8rem",
              fontWeight: "600",
              color: "var(--text-secondary)",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            Port Search — UN/LOCODE
          </span>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              style={{
                marginLeft: "auto",
                background: "rgba(239,68,68,0.12)",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: "6px",
                color: "#ef4444",
                fontSize: "0.72rem",
                fontWeight: "600",
                padding: "0.2rem 0.6rem",
                cursor: "pointer",
              }}
            >
              ✕ Clear filters
            </button>
          )}
        </div>

        {/* Origin autocomplete */}
        <div style={{ flex: "1", minWidth: "240px" }}>
          <PortAutocomplete
            label="Origin Port (POL)"
            placeholder="e.g. CNSHA — Shanghai..."
            value={originPort}
            onSelect={setOriginPort}
          />
        </div>

        {/* Arrow */}
        <div
          style={{ padding: "0 0.25rem 0.75rem", color: "var(--text-muted)" }}
        >
          <Navigation size={20} />
        </div>

        {/* Destination autocomplete */}
        <div style={{ flex: "1", minWidth: "240px" }}>
          <PortAutocomplete
            label="Destination Port (POD)"
            placeholder="e.g. NLRTM — Rotterdam..."
            value={destPort}
            onSelect={setDestPort}
          />
        </div>

        {/* Active filter summary chips */}
        {hasActiveFilters && (
          <div
            style={{
              flex: "0 0 100%",
              display: "flex",
              gap: "0.5rem",
              flexWrap: "wrap",
              marginTop: "0.5rem",
            }}
          >
            {originPort && (
              <span
                style={{
                  background: "rgba(59,130,246,0.15)",
                  border: "1px solid rgba(59,130,246,0.3)",
                  borderRadius: "999px",
                  padding: "0.2rem 0.75rem",
                  fontSize: "0.75rem",
                  color: "#93c5fd",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                }}
              >
                <span>📍 Origin:</span>
                <strong>{LocationService.format(originPort)}</strong>
              </span>
            )}
            {destPort && (
              <span
                style={{
                  background: "rgba(139,92,246,0.15)",
                  border: "1px solid rgba(139,92,246,0.3)",
                  borderRadius: "999px",
                  padding: "0.2rem 0.75rem",
                  fontSize: "0.75rem",
                  color: "#c4b5fd",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                }}
              >
                <span>🏁 Destination:</span>
                <strong>{LocationService.format(destPort)}</strong>
              </span>
            )}
            <span
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                alignSelf: "center",
                marginLeft: "0.25rem",
              }}
            >
              → {filteredShipments.length} shipment
              {filteredShipments.length !== 1 ? "s" : ""} found
            </span>
          </div>
        )}
      </div>

      {/* ─── SELECTED PORT DETAILS CARD ───────────────────────────────── */}
      {(originPort || destPort) && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: originPort && destPort ? "1fr 1fr" : "1fr",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          {[originPort, destPort].filter(Boolean).map(
            (loc, i) =>
              loc && (
                <div
                  key={loc.locode}
                  style={{
                    background: "var(--card-bg)",
                    border: `1px solid ${i === 0 ? "rgba(59,130,246,0.3)" : "rgba(139,92,246,0.3)"}`,
                    borderRadius: "12px",
                    padding: "1rem 1.25rem",
                    display: "flex",
                    gap: "1rem",
                    alignItems: "flex-start",
                  }}
                >
                  {/* Flag */}
                  <div style={{ fontSize: "2.5rem", lineHeight: "1" }}>
                    {LocationService.getFlag(loc.countryCode)}
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        marginBottom: "0.35rem",
                      }}
                    >
                      <strong
                        style={{ fontSize: "1rem", letterSpacing: "0.05em" }}
                      >
                        {loc.locode}
                      </strong>
                      <span
                        style={{
                          fontSize: "0.65rem",
                          fontWeight: "700",
                          padding: "0.1rem 0.45rem",
                          borderRadius: "4px",
                          background:
                            loc.type === "SEAPORT"
                              ? "rgba(59,130,246,0.15)"
                              : loc.type === "AIRPORT"
                                ? "rgba(139,92,246,0.15)"
                                : "rgba(16,185,129,0.15)",
                          color:
                            loc.type === "SEAPORT"
                              ? "#60a5fa"
                              : loc.type === "AIRPORT"
                                ? "#a78bfa"
                                : "#34d399",
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                        }}
                      >
                        {loc.type.replace("_", " ")}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "0.9rem",
                        fontWeight: "600",
                        marginBottom: "0.15rem",
                      }}
                    >
                      {loc.name}
                    </div>
                    <div
                      style={{
                        fontSize: "0.78rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {loc.countryName} — {loc.region}
                    </div>
                    {loc.latitude && (
                      <div
                        style={{
                          fontSize: "0.7rem",
                          color: "var(--text-muted)",
                          marginTop: "0.25rem",
                          fontFamily: "monospace",
                        }}
                      >
                        {loc.latitude.toFixed(4)}°N /{" "}
                        {loc.longitude?.toFixed(4)}°E
                      </div>
                    )}
                    {loc.timezone && (
                      <div
                        style={{
                          fontSize: "0.7rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        🕐 {loc.timezone}
                      </div>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: "600",
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                    }}
                  >
                    {i === 0 ? "ORIGIN" : "DEST"}
                  </span>
                </div>
              ),
          )}
        </div>
      )}

      {/* ─── MAIN GRID ────────────────────────────────────────────────── */}
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
          {/* Active Shipments */}
          <div className="card" style={{ marginBottom: 0 }}>
            <h3>
              Active Shipments
              <span
                style={{
                  marginLeft: "0.5rem",
                  background: hasActiveFilters
                    ? "rgba(59,130,246,0.15)"
                    : "var(--bg-soft)",
                  color: hasActiveFilters ? "#60a5fa" : "var(--text-muted)",
                  fontSize: "0.75rem",
                  padding: "0.1rem 0.5rem",
                  borderRadius: "999px",
                }}
              >
                {filteredShipments.length}/{shipments.length}
              </span>
            </h3>
            <div
              style={{
                marginTop: "1rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              {filteredShipments.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "2rem 0",
                    color: "var(--text-muted)",
                    fontSize: "0.85rem",
                  }}
                >
                  <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
                    🔍
                  </div>
                  No shipments match the selected ports.
                </div>
              ) : (
                filteredShipments.map((s) => {
                  const isExpanded = expandedShipmentId === s.id;
                  return (
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
                          cursor: "pointer",
                        }}
                        onClick={() =>
                          setExpandedShipmentId(isExpanded ? null : s.id)
                        }
                      >
                        <strong style={{ fontSize: "0.95rem" }}>
                          {s.reference}
                        </strong>
                        <div
                          style={{
                            display: "flex",
                            gap: "0.5rem",
                            alignItems: "center",
                          }}
                        >
                          {s.mode === "sea" ? (
                            <Ship size={16} />
                          ) : s.mode === "air" ? (
                            <Plane size={16} />
                          ) : (
                            <Truck size={16} />
                          )}
                          {isExpanded ? (
                            <ChevronUp size={16} />
                          ) : (
                            <ChevronDown size={16} />
                          )}
                        </div>
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
                          style={{
                            fontSize: "0.7rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          ETA: {s.eta}
                        </span>
                      </div>
                      {isExpanded && (
                        <div
                          style={{
                            marginTop: "1rem",
                            paddingTop: "1rem",
                            borderTop: "1px solid var(--border)",
                          }}
                        >
                          <MilestoneStepper
                            orientation="vertical"
                            milestones={getStandardOceanMilestones(
                              s.origin,
                              s.destination,
                              s.eta,
                            )}
                            currentStepIndex={
                              (s.status as string) === "IN_TRANSIT" ||
                              (s.status as string) === "in_transit"
                                ? 2
                                : (s.status as string) === "DELIVERED" ||
                                    (s.status as string) === "arrived"
                                  ? 4
                                  : 0
                            }
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Logistics Agents */}
          <div className="card" style={{ marginBottom: 0 }}>
            <h3>Logistics Agents ({agents.length})</h3>
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

        {/* Map */}
        <div
          className="card"
          style={{ padding: 0, overflow: "hidden", marginBottom: 0 }}
        >
          <ShippingMap shipments={filteredShipments} />
        </div>
      </div>
    </div>
  );
}
