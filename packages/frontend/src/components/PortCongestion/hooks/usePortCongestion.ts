/**
 * @file usePortCongestion.ts
 * @description Custom domain hook and PDF generator for Predictive Port Congestion & AIS Berth Delay Engine.
 * @module @atlas/frontend/components/PortCongestion/hooks
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { useMemo, useState } from "react";
import {
  IBERIAN_PORT_HUBS,
  SEED_AIS_VESSELS,
  SEED_BERTH_CALLS,
  SEED_DRAYAGE_APPOINTMENTS,
  detectBerthWindowCollisions,
  recalculateDrayageAppointments,
  generateDDSuspensionCertificate,
  type VesselAisPosition,
  type ScheduledBerthCall,
  type DrayageAppointment,
  type DDSuspensionCertificate,
} from "@atlas/shared";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type {
  CertFormState,
  PortCongestionTab,
} from "../../../types/port-congestion.types";

export function filterActiveVessels(
  vessels: VesselAisPosition[],
  portCode: string,
  searchTerm: string,
): VesselAisPosition[] {
  const q = searchTerm.toLowerCase();
  return vessels
    .filter((v) => v.destinationPortCode === portCode)
    .filter(
      (v) =>
        v.vesselName.toLowerCase().includes(q) ||
        v.imo.includes(searchTerm) ||
        v.carrier.toLowerCase().includes(q),
    );
}

export function usePortCongestion() {
  const [activeTab, setActiveTab] =
    useState<PortCongestionTab>("GEOSPATIAL_MAP");
  const [selectedPortCode, setSelectedPortCode] = useState<string>("ESBCN");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedVessel, setSelectedVessel] =
    useState<VesselAisPosition | null>(null);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);

  const [berthCalls, setBerthCalls] =
    useState<ScheduledBerthCall[]>(SEED_BERTH_CALLS);
  const [drayageAppointments, setDrayageAppointments] = useState<
    DrayageAppointment[]
  >(SEED_DRAYAGE_APPOINTMENTS);
  const [certificates, setCertificates] = useState<DDSuspensionCertificate[]>([
    generateDDSuspensionCertificate({
      portCode: "ESBCN",
      terminalName: "BEST",
      vesselName: "MSC ISABELLA",
      containerNo: "MSCU7821903",
      reason: "PORT_CONGESTION_ANCHORAGE_DWELL",
      dwellOrDelayHours: 52.0,
      issuer: "ADMIN (SuperAdmin / Systems Lead)",
    }),
  ]);

  const [certForm, setCertForm] = useState<CertFormState>({
    portCode: "ESBCN",
    terminalName: "BEST",
    vesselName: "MADRID MAERSK",
    containerNo: "TCLU9283710",
    reason: "PORT_CONGESTION_ANCHORAGE_DWELL",
    dwellOrDelayHours: 36.5,
    issuer: "ADMIN (SuperAdmin / Systems Lead)",
  });

  const activeHub = useMemo(
    () =>
      IBERIAN_PORT_HUBS.find((h) => h.portCode === selectedPortCode) ||
      IBERIAN_PORT_HUBS[0],
    [selectedPortCode],
  );

  const activeVessels = useMemo(
    () => filterActiveVessels(SEED_AIS_VESSELS, selectedPortCode, searchTerm),
    [selectedPortCode, searchTerm],
  );

  const activeCollisions = useMemo(
    () =>
      detectBerthWindowCollisions(berthCalls, 120).filter(
        (c) => c.portCode === selectedPortCode,
      ),
    [berthCalls, selectedPortCode],
  );

  const activeDrayage = useMemo(
    () =>
      drayageAppointments.filter((a) => a.targetPortCode === selectedPortCode),
    [drayageAppointments, selectedPortCode],
  );

  const handleSelectPort = (portCode: string) => {
    setSelectedPortCode(portCode);
    setSelectedVessel(null);
  };

  const handleResolveCollision = (colId: string) => {
    const col = activeCollisions.find((c) => c.collisionId === colId);
    if (!col) return;

    setBerthCalls((prev) =>
      prev.map((c) => {
        if (c.callId === col.vesselB.callId) {
          const delayMs = col.projectedDelayHours * 60 * 60 * 1000;
          return {
            ...c,
            etaPlanned: new Date(
              new Date(c.etaPlanned).getTime() + delayMs,
            ).toISOString(),
            etdPlanned: new Date(
              new Date(c.etdPlanned).getTime() + delayMs,
            ).toISOString(),
          };
        }
        return c;
      }),
    );
  };

  const handleRebalanceDrayage = () => {
    const collisions = detectBerthWindowCollisions(berthCalls, 120);
    const updated = recalculateDrayageAppointments(
      drayageAppointments,
      collisions,
    );
    setDrayageAppointments(updated);
  };

  const handleGenerateCertificate = (e: React.FormEvent) => {
    e.preventDefault();
    const newCert = generateDDSuspensionCertificate(certForm);
    setCertificates((prev) => [newCert, ...prev]);
  };

  const handleInitiateSuspensionFromVessel = (vessel: VesselAisPosition) => {
    setCertForm({
      portCode: vessel.destinationPortCode,
      terminalName: vessel.assignedTerminal || "BEST",
      vesselName: vessel.vesselName,
      containerNo: "MSCU7821903",
      reason: "PORT_CONGESTION_ANCHORAGE_DWELL",
      dwellOrDelayHours: vessel.dwellHours,
      issuer: "ADMIN (SuperAdmin / Systems Lead)",
    });
    setActiveTab("DD_SUSPENSION");
  };

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleDownloadPDF = (cert: DDSuspensionCertificate) => {
    const doc = new jsPDF();

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 40, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("ATLAS LOGISTICS · CERTIFICACIÓN FMC / OSRA", 14, 20);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(
      "D&D Free-Time Tolling & Port Congestion Unavailability Certificate",
      14,
      28,
    );

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Certificado N°: ${cert.certificateId}`, 14, 52);

    autoTable(doc, {
      startY: 58,
      theme: "grid",
      headStyles: { fillColor: [30, 58, 138], textColor: 255 },
      body: [
        ["Puerto Marítimo", `${cert.portName} (${cert.portCode})`],
        ["Terminal de Atraque", cert.terminalName],
        ["Buque Portacontenedores", cert.vesselName],
        ["Contenedor Afectado", cert.containerNo],
        ["Causa de Congestión", cert.reason],
        ["Tiempo de Paralización", `${cert.dwellOrDelayHours} horas`],
        ["Estatus Reloj D&D", "TOLLED / SUSPENDED (Plazo Congelado)"],
        ["Base Regulatoria", cert.regulatoryBasis],
        ["Autoridad Emisora", cert.issuer],
        [
          "Fecha / Hora Certificación",
          new Date(cert.timestamp).toLocaleString("es-ES"),
        ],
        ["Firma Digital (SHA-256)", cert.digitalSignatureHash],
      ],
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    const splitText = doc.splitTextToSize(cert.legalNoticeText, 180);
    doc.text(splitText, 14, finalY);

    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Código de Verificación QR: ${cert.qrCodeDigest}`,
      14,
      finalY + 35,
    );
    doc.text(
      "Atlas-Logistics Autonomous Maritime Control Platform · Book TEST01 Corredor Barcelona",
      14,
      finalY + 42,
    );

    doc.save(`Certificado_DD_${cert.containerNo}_${cert.portCode}.pdf`);
  };

  return {
    activeTab,
    setActiveTab,
    selectedPortCode,
    handleSelectPort,
    searchTerm,
    setSearchTerm,
    selectedVessel,
    setSelectedVessel,
    copiedHash,
    berthCalls,
    certificates,
    certForm,
    setCertForm,
    activeHub,
    activeVessels,
    activeCollisions,
    activeDrayage,
    handleResolveCollision,
    handleRebalanceDrayage,
    handleGenerateCertificate,
    handleInitiateSuspensionFromVessel,
    handleCopyHash,
    handleDownloadPDF,
  };
}
