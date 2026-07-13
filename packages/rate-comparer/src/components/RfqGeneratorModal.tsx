// @ts-nocheck
import React, { useState } from "react";
import {
  X,
  FileText,
  Send,
  DollarSign,
  User,
  Building,
  Calendar,
  Percent,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { FreightRateMock } from "../data/mockRates";
import { useAppStore } from "@/shared/store";

interface RfqGeneratorModalProps {
  rate: FreightRateMock | null;
  onClose: () => void;
}

export default function RfqGeneratorModal({
  rate,
  onClose,
}: RfqGeneratorModalProps) {
  const activeCurrency = useAppStore((state) => state.currency);
  const exchangeRates = { EUR: 0.92, USD: 1.0 };

  const [clientName, setClientName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [validityDays, setValidityDays] = useState(7);
  const [markupType, setMarkupType] = useState<"percentage" | "fixed">(
    "percentage",
  );
  const [markupValue, setMarkupValue] = useState(15);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!rate) return null;

  const convertAmount = (amount: number, baseCurrency: string) => {
    if (baseCurrency === activeCurrency) return amount;
    const exRate =
      activeCurrency === "EUR" ? exchangeRates.EUR : 1 / exchangeRates.EUR;
    return Math.round(amount * exRate);
  };

  const calculateTotalWithMarkup = () => {
    const baseTotal = convertAmount(rate.total, rate.currency);
    if (markupType === "percentage") {
      return baseTotal * (1 + markupValue / 100);
    }
    return baseTotal + markupValue;
  };

  const calculateMarkupAmount = () => {
    const baseTotal = convertAmount(rate.total, rate.currency);
    if (markupType === "percentage") {
      return baseTotal * (markupValue / 100);
    }
    return markupValue;
  };

  const generateQuote = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      const finalTotal = calculateTotalWithMarkup();
      const markupAmount = calculateMarkupAmount();
      const baseTotal = convertAmount(rate.total, rate.currency);
      const validUntilDate = new Date();
      validUntilDate.setDate(validUntilDate.getDate() + validityDays);

      // Header
      doc.setFillColor(30, 27, 75); // Indigo 950
      doc.rect(0, 0, 210, 40, "F");

      doc.setFontSize(24);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text("ATLAS LOGISTICS", 14, 25);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("OFFICIAL FREIGHT QUOTATION", 130, 25);

      // Client Info
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Prepared For:", 14, 55);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Company: ${companyName || "Not Specified"}`, 14, 62);
      doc.text(`Attention: ${clientName || "Not Specified"}`, 14, 68);

      // Quote Details
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Quote Details:", 130, 55);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Reference: RFQ-${rate.id.substring(0, 6)}`, 130, 62);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 130, 68);
      doc.text(`Valid Until: ${validUntilDate.toLocaleDateString()}`, 130, 74);

      // Routing
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Routing Summary", 14, 90);

      (doc as any).autoTable({
        startY: 95,
        head: [
          [
            "Origin (POL)",
            "Destination (POD)",
            "Carrier",
            "Transit Time",
            "Type",
          ],
        ],
        body: [
          [
            rate.pol,
            rate.pod,
            rate.carrier,
            `${rate.transitTimeDays} days`,
            rate.isDirect ? "Direct" : "Transshipment",
          ],
        ],
        theme: "grid",
        headStyles: { fillColor: [67, 56, 202], textColor: 255 }, // Indigo 600
        styles: { fontSize: 10, cellPadding: 4 },
      });

      // Pricing
      const finalY = (doc as any).lastAutoTable.finalY || 95;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Pricing Breakdown", 14, finalY + 15);

      const pricingBody = [
        [
          "Base Ocean Freight",
          `${activeCurrency} ${convertAmount(rate.baseRate, rate.currency).toLocaleString()}`,
        ],
        ...rate.surcharges.map((s) => [
          s.name,
          `+ ${activeCurrency} ${convertAmount(s.amount, rate.currency).toLocaleString()}`,
        ]),
        [
          "Logistics Management & Handling",
          `+ ${activeCurrency} ${markupAmount.toLocaleString()}`,
        ],
      ];

      (doc as any).autoTable({
        startY: finalY + 20,
        head: [["Description", "Amount"]],
        body: pricingBody,
        theme: "striped",
        headStyles: { fillColor: [51, 65, 85], textColor: 255 },
        styles: { fontSize: 10 },
        foot: [
          ["TOTAL DUE", `${activeCurrency} ${finalTotal.toLocaleString()}`],
        ],
        footStyles: {
          fillColor: [241, 245, 249],
          textColor: [67, 56, 202],
          fontStyle: "bold",
          fontSize: 12,
        },
      });

      // Terms
      const termsY = (doc as any).lastAutoTable.finalY + 20;
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text("Terms & Conditions:", 14, termsY);
      doc.setFontSize(8);
      doc.text(
        "1. Rates are subject to space and equipment availability.",
        14,
        termsY + 6,
      );
      doc.text(
        "2. Peak Season Surcharges (PSS) and Bunker Adjustment Factors (BAF) may vary at time of sailing.",
        14,
        termsY + 11,
      );
      doc.text(
        "3. Excludes customs duties, taxes, and local destination charges unless specified.",
        14,
        termsY + 16,
      );

      doc.save(
        `RFQ_${companyName.replace(/\s+/g, "_") || "Quote"}_${rate.id.substring(0, 6)}.pdf`,
      );
    } finally {
      setIsGenerating(false);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-2xl flex flex-col"
        >
          {/* Header */}
          <div className="bg-indigo-950 px-6 py-4 flex justify-between items-center text-white">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-900/50 p-2 rounded-lg">
                <FileText className="w-5 h-5 text-indigo-300" />
              </div>
              <div>
                <h2 className="font-bold text-lg leading-tight">
                  RFQ Generator
                </h2>
                <p className="text-indigo-300 text-xs font-medium">
                  Create formal quotation
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Form Section */}
            <div className="space-y-5">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest border-b pb-2">
                Client Details
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-1.5">
                    <Building className="w-3 h-3" /> Company Name
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Acme Corp"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-1.5">
                    <User className="w-3 h-3" /> Attention To
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g. Jane Doe"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-1.5">
                    <Calendar className="w-3 h-3" /> Validity (Days)
                  </label>
                  <input
                    type="number"
                    value={validityDays}
                    onChange={(e) => setValidityDays(Number(e.target.value))}
                    min="1"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest border-b pb-2 pt-2">
                Pricing Strategy
              </h3>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => setMarkupType("percentage")}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors flex justify-center items-center gap-1.5 ${markupType === "percentage" ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-white border-slate-200 text-slate-500"}`}
                  >
                    <Percent className="w-3 h-3" /> Percentage
                  </button>
                  <button
                    onClick={() => setMarkupType("fixed")}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors flex justify-center items-center gap-1.5 ${markupType === "fixed" ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-white border-slate-200 text-slate-500"}`}
                  >
                    <DollarSign className="w-3 h-3" /> Fixed
                  </button>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-1.5">
                    Markup Value
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">
                      {markupType === "percentage" ? "%" : activeCurrency}
                    </span>
                    <input
                      type="number"
                      value={markupValue}
                      onChange={(e) => setMarkupValue(Number(e.target.value))}
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Preview Section */}
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 flex flex-col">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4">
                Live Preview
              </h3>

              <div className="flex-1 space-y-4">
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                    Route
                  </p>
                  <p className="text-sm font-semibold text-slate-800">
                    {rate.pol} → {rate.pod}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {rate.carrier} • {rate.transitTimeDays} days
                  </p>
                </div>

                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-2">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">
                    Cost Breakdown
                  </p>

                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Base Freight & Surcharges</span>
                    <span>
                      {activeCurrency}{" "}
                      {convertAmount(
                        rate.total,
                        rate.currency,
                      ).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between text-xs font-semibold text-indigo-600">
                    <span>Forwarder Margin</span>
                    <span>
                      + {activeCurrency}{" "}
                      {calculateMarkupAmount().toLocaleString()}
                    </span>
                  </div>

                  <div className="pt-2 mt-2 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-800">
                      Final Quote Amount
                    </span>
                    <span className="text-lg font-black text-slate-900">
                      {activeCurrency}{" "}
                      {calculateTotalWithMarkup().toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={generateQuote}
                disabled={isGenerating}
                className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex justify-center items-center gap-2"
              >
                {isGenerating ? (
                  <span className="animate-pulse">Generating PDF...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Download Official Quote
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

