/**
 * @file useIataOneRecord.ts
 * @description Custom React hook managing IATA ONE Record W3C JSON-LD waybills, Cargo iQ milestones, e-DGD validation, and jsPDF generation.
 * @module @atlas/frontend/components/IataOneRecord/hooks/useIataOneRecord
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import { useState, useMemo } from "react";
import {
  useApiQuery,
  useApiMutation,
  useQueryClient,
} from "../../../hooks/useApiQuery";
import {
  SEED_ONE_RECORD_WAYBILLS,
  SEED_CARGO_IQ_TIMELINE,
  SEED_DANGEROUS_GOODS,
  validateDangerousGoodsDeclaration,
  type OneRecordWaybill,
  type CargoIqMilestone,
  type DangerousGoodsItem,
  type CargoIqMilestoneCode,
  type EDgdValidationResult,
} from "@atlas/shared";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { IataOneRecordTabKey } from "../../../types/iata-one-record.types";

export function useIataOneRecord() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] =
    useState<IataOneRecordTabKey>("JSON_LD_EXPLORER");

  // Fetch live ONE Record waybills from Fastify SQLite backend
  const { data: waybillsData } = useApiQuery<{
    success: boolean;
    waybills: OneRecordWaybill[];
  }>(["one-record", "waybills"], "/one-record/waybills");

  const waybills = useMemo(() => {
    if (waybillsData?.waybills && waybillsData.waybills.length > 0) {
      return waybillsData.waybills;
    }
    return SEED_ONE_RECORD_WAYBILLS;
  }, [waybillsData]);

  const [selectedWaybillId, setSelectedWaybillId] =
    useState<string>("WBL-075-82910482");

  const selectedWaybill = useMemo(() => {
    return (
      waybills.find(
        (w) =>
          w.waybillId === selectedWaybillId ||
          w.fullAwbNumber === selectedWaybillId,
      ) ||
      waybills[0] ||
      SEED_ONE_RECORD_WAYBILLS[0]
    );
  }, [waybills, selectedWaybillId]);

  const awbNumberForMilestones =
    selectedWaybill?.fullAwbNumber || "075-82910482";

  // Fetch live Cargo iQ milestones from Fastify SQLite backend
  const { data: milestonesData } = useApiQuery<{
    success: boolean;
    milestones: CargoIqMilestone[];
  }>(
    ["one-record", "milestones", awbNumberForMilestones],
    `/one-record/milestones/${awbNumberForMilestones}`,
    { enabled: Boolean(awbNumberForMilestones) },
  );

  const milestones = useMemo(() => {
    if (milestonesData?.milestones && milestonesData.milestones.length > 0) {
      return milestonesData.milestones;
    }
    return SEED_CARGO_IQ_TIMELINE;
  }, [milestonesData]);

  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  // Milestone event recording state
  const [eventCode, setEventCode] = useState<CargoIqMilestoneCode>("DEP");
  const [eventRemarks, setEventRemarks] = useState<string>(
    "Embarque completado en bodega Airbus A350 en BCN",
  );
  const [milestoneFeedback, setMilestoneFeedback] = useState<string>("");

  // e-DGD Compliance Studio state
  const [dgItem, setDgItem] = useState<DangerousGoodsItem>(
    SEED_DANGEROUS_GOODS[0],
  );
  const [dgdFeedback, setDgdFeedback] = useState<string>("");

  // Mutation to record live Cargo iQ milestone in SQLite
  const milestoneMutation = useApiMutation<
    { success: boolean; updatedMilestone: CargoIqMilestone; message: string },
    {
      awbNumber: string;
      milestoneCode: CargoIqMilestoneCode;
      eventRemarks?: string;
    }
  >("/one-record/milestones/event", "POST", {
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["one-record", "milestones", awbNumberForMilestones],
      });
      setMilestoneFeedback(
        `Hito ${data.updatedMilestone?.milestoneCode || eventCode} actualizado exitosamente con marca de tiempo actual.`,
      );
      setTimeout(() => setMilestoneFeedback(""), 4000);
    },
    onError: (err) => {
      setMilestoneFeedback(`Error al registrar hito: ${err.message}`);
      setTimeout(() => setMilestoneFeedback(""), 4000);
    },
  });

  const liveDgValidation: EDgdValidationResult = useMemo(() => {
    return validateDangerousGoodsDeclaration(dgItem);
  }, [dgItem]);

  const copyJsonLd = () => {
    navigator.clipboard?.writeText(JSON.stringify(selectedWaybill, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2500);
  };

  const handleRecordMilestoneEvent = async () => {
    try {
      await milestoneMutation.mutateAsync({
        awbNumber: awbNumberForMilestones,
        milestoneCode: eventCode,
        eventRemarks: eventRemarks || "Registrado desde Control Tower Web",
      });
    } catch {
      // Handled in onError callback
    }
  };

  const handleDownloadEawbPDF = (wbl: OneRecordWaybill) => {
    const doc = new jsPDF();

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 30, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("IATA RESOLUTION 600b · ELECTRONIC AIR WAYBILL (e-AWB)", 14, 15);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(
      "IATA ONE Record Digital Cargo Hub · Atlas Logistics Platform",
      14,
      22,
    );

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`AWB NUMBER: ${wbl.fullAwbNumber}`, 14, 40);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(
      `Origin: ${wbl.originAirport}  |  Destination: ${wbl.destinationAirport}  |  Flight: ${wbl.transportMovement.flightNumber}`,
      14,
      46,
    );
    doc.text(
      `Carrier: ${wbl.carrier.name} (${wbl.carrier.iataCode})  |  Issuing Agent: ${wbl.issuingAgent.name}`,
      14,
      52,
    );
    doc.text(`Shipper: ${wbl.shipper.name} (${wbl.shipper.address})`, 14, 58);
    doc.text(
      `Consignee: ${wbl.consignee.name} (${wbl.consignee.address})`,
      14,
      64,
    );
    doc.text(
      `Nature and Quantity of Goods: ${wbl.natureAndQuantityOfGoods}`,
      14,
      70,
    );

    const pieceRows = wbl.pieces.map((p) => [
      p.pieceId,
      p.sequenceNumber.toString(),
      `${p.dimensionsCm.length}x${p.dimensionsCm.width}x${p.dimensionsCm.height} cm`,
      `${p.grossWeightKg} kg`,
      `${p.volumeCbm} m³`,
      p.specialHandlingCodes.join(", "),
    ]);

    autoTable(doc, {
      startY: 76,
      head: [
        [
          "Piece ID",
          "Seq",
          "Dimensions (LxWxH)",
          "Gross Wt",
          "Volume",
          "Special Handling",
        ],
      ],
      body: pieceRows,
      theme: "grid",
      headStyles: {
        fillColor: [30, 58, 138],
        textColor: 255,
        fontStyle: "bold",
      },
      styles: { fontSize: 8 },
    });

    const finalY = (doc as any).lastAutoTable
      ? (doc as any).lastAutoTable.finalY + 12
      : 160;
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`W3C JSON-LD Context: ${wbl["@context"]}`, 14, finalY);
    doc.text(`Digital Seal SHA-256: ${wbl.digitalSealHash}`, 14, finalY + 6);
    doc.text(
      "Generated by Atlas Logistics Platform · Corredor DEPT-TEST01",
      14,
      finalY + 12,
    );

    doc.save(`e-AWB-${wbl.fullAwbNumber}.pdf`);
  };

  const handleDownloadEdgdPDF = (
    item: DangerousGoodsItem,
    val: EDgdValidationResult,
  ) => {
    const doc = new jsPDF();

    doc.setFillColor(185, 28, 28);
    doc.rect(0, 0, 210, 32, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("SHIPPER'S DECLARATION FOR DANGEROUS GOODS (e-DGD)", 14, 16);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(
      "IATA DGR 65th Edition Certified Digital Compliance · W3C Linked Data Protocol",
      14,
      24,
    );

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(
      `STATUS: ${val.isCompliant ? "COMPLIANT / CARRIAGE APPROVED" : "NON-COMPLIANT / FLIGHT REJECTED"}`,
      14,
      44,
    );

    const dgRows = [
      ["UN Number", item.unNumber],
      ["Proper Shipping Name", item.properShippingName],
      ["Class / Division", item.hazardClass],
      ["Packing Instruction", item.packingInstruction],
      ["Aircraft Restriction", item.aircraftRestriction],
      [
        "Total Net Quantity",
        `${item.totalNetQuantityKg} kg (${item.packageQuantity} packages)`,
      ],
      ["Digital Seal Hash", val.validationSealHash],
    ];

    autoTable(doc, {
      startY: 50,
      head: [["Attribute", "Declared Value"]],
      body: dgRows,
      theme: "grid",
      headStyles: { fillColor: [185, 28, 28], textColor: 255 },
      styles: { fontSize: 9 },
    });

    const finalY = (doc as any).lastAutoTable
      ? (doc as any).lastAutoTable.finalY + 10
      : 130;

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("IATA DGR Handling Advisories:", 14, finalY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    let lineY = finalY + 6;
    val.handlingAdvisories.forEach((adv) => {
      doc.text(`• ${adv}`, 16, lineY);
      lineY += 5;
    });

    if (val.violations.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 38, 38);
      doc.text("Compliance Violations:", 14, lineY + 4);
      doc.setFont("helvetica", "normal");
      lineY += 10;
      val.violations.forEach((vio) => {
        doc.text(`• ${vio}`, 16, lineY);
        lineY += 5;
      });
    }

    doc.save(`e-DGD-${item.unNumber}.pdf`);
    setDgdFeedback("Certificado e-DGD generado y descargado.");
    setTimeout(() => setDgdFeedback(""), 3000);
  };

  return {
    activeTab,
    setActiveTab,
    waybills,
    selectedWaybillId,
    setSelectedWaybillId,
    selectedWaybill,
    milestones,
    copiedJson,
    eventCode,
    setEventCode,
    eventRemarks,
    setEventRemarks,
    milestoneFeedback,
    dgItem,
    setDgItem,
    dgdFeedback,
    liveDgValidation,
    copyJsonLd,
    handleRecordMilestoneEvent,
    handleDownloadEawbPDF,
    handleDownloadEdgdPDF,
  };
}
