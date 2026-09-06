import PDFDocument from "pdfkit";

export class CharteringPdfGenerator {
  /**
   * 1. Official Charter Party Fixture Recap PDF (BIMCO Gencon 2022 / NYPE 2015)
   */
  public static async generateCharterPartyPdf(charter: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 36, size: "A4" });
        const buffers: Buffer[] = [];
        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        // Header
        doc.rect(36, 36, 523, 44).fill("#0f172a");
        doc
          .fillColor("#38bdf8")
          .font("Helvetica-Bold")
          .fontSize(12)
          .text("ATLAS LOGISTICS — MARITIME CHARTERING & FIXTURES", 44, 46);
        doc
          .fillColor("#ffffff")
          .font("Helvetica")
          .fontSize(8)
          .text(
            `OFFICIAL CHARTER PARTY & FIXTURE RECAP | Standard Form: ${charter.contractForm || "BIMCO GENCON 2022"}`,
            44,
            62,
          );

        let curY = 88;

        // Key Metadata Grid
        doc.rect(36, curY, 523, 70).strokeColor("#cbd5e1").stroke();
        doc.rect(36, curY, 523, 16).fill("#f8fafc");
        doc
          .fillColor("#0f172a")
          .font("Helvetica-Bold")
          .fontSize(8)
          .text("1. CONTRACT PARTIES & VESSEL PARTICULARS", 44, curY + 4);

        doc.font("Helvetica").fontSize(7.5).fillColor("#334155");
        doc.text(`Fixture Ref: ${charter.fixtureReference}`, 44, curY + 22);
        doc.text(`Charter Type: ${charter.charterType}`, 300, curY + 22);
        doc.text(`Disponent Owner: ${charter.ownerName}`, 44, curY + 36);
        doc.text(`Charterer: ${charter.chartererName}`, 300, curY + 36);
        doc.text(
          `Vessel Name: ${charter.vesselName} (IMO: ${charter.imoNumber} / Flag: ${charter.flagState || "Malta"})`,
          44,
          curY + 50,
        );
        doc.text(
          `Summer DWT: ${charter.summerDwtMt || 45000} MT | Gross Tonnage: ${charter.grossTonnage || 28000} GT`,
          300,
          curY + 50,
        );

        curY += 78;

        // Voyage & Cargo Details
        doc.rect(36, curY, 523, 75).strokeColor("#cbd5e1").stroke();
        doc.rect(36, curY, 523, 16).fill("#f8fafc");
        doc
          .fillColor("#0f172a")
          .font("Helvetica-Bold")
          .fontSize(8)
          .text("2. COMMODITY, VOYAGE & PORTS (LAYCAN)", 44, curY + 4);

        doc.font("Helvetica").fontSize(7.5).fillColor("#334155");
        doc.text(`Cargo: ${charter.cargoDescription}`, 44, curY + 22);
        doc.text(
          `Quantity: ${charter.cargoQuantityMt?.toLocaleString("en-US")} MT (+/- ${charter.quantityMarginPercentage || 5}% MOLOO)`,
          300,
          curY + 22,
        );
        doc.text(`Loading Port: ${charter.loadingPort}`, 44, curY + 36);
        doc.text(
          `Discharging Port: ${charter.dischargingPort}`,
          300,
          curY + 36,
        );
        doc.text(
          `Laycan Window: ${charter.laycanStart} to ${charter.laycanEnd}`,
          44,
          curY + 50,
        );
        doc.text(
          `Contract Status: ${charter.status || "FIXED_ACTIVE"}`,
          300,
          curY + 50,
        );

        curY += 83;

        // Commercial Rates & Laytime Terms
        doc.rect(36, curY, 523, 85).strokeColor("#cbd5e1").stroke();
        doc.rect(36, curY, 523, 16).fill("#f8fafc");
        doc
          .fillColor("#0f172a")
          .font("Helvetica-Bold")
          .fontSize(8)
          .text(
            "3. COMMERCIAL FREIGHT, LAYTIME & DEMURRAGE TERMS",
            44,
            curY + 4,
          );

        doc.font("Helvetica").fontSize(7.5).fillColor("#334155");
        if (charter.charterType === "TIME_CHARTER") {
          doc.text(
            `Daily Hire Rate: $${charter.dailyHireRateUsd?.toLocaleString("en-US")} USD/day (pro rata)`,
            44,
            curY + 22,
          );
        } else {
          doc.text(
            `Freight Rate: $${charter.freightRateUsdPerMt?.toFixed(2)} USD per Metric Ton FIOST`,
            44,
            curY + 22,
          );
        }
        doc.text(
          `Demurrage Rate: $${charter.demurrageRateUsdPerDay?.toLocaleString("en-US")} USD/day`,
          300,
          curY + 22,
        );
        doc.text(
          `Despatch Rate: $${charter.despatchRateUsdPerDay?.toLocaleString("en-US")} USD/day (${charter.despatchCalculationBasis || "ATS"})`,
          44,
          curY + 36,
        );
        doc.text(
          `Laytime Basis: ${charter.laytimeTerms || "SHEX_EIU"}`,
          300,
          curY + 36,
        );
        doc.text(
          `Loading Rate: ${charter.loadRateMtPerDay || 5000} MT/WWD | Discharge Rate: ${charter.dischargeRateMtPerDay || 3500} MT/WWD`,
          44,
          curY + 50,
        );
        doc.text(
          `Turn Time: ${charter.turnTimeHours || 12} Hours`,
          300,
          curY + 50,
        );
        doc.text(
          `NOR Maritime Clauses: ${charter.norClausesJson || "WIPON / WIBON / WIFPON / WCCON"}`,
          44,
          curY + 64,
        );
        doc.text(
          `Laytime Reversibility: ${charter.laytimeReversibility || "NON_REVERSIBLE"}`,
          300,
          curY + 64,
        );

        curY += 93;

        // BIMCO Standard Governing Clauses
        doc.rect(36, curY, 523, 110).strokeColor("#cbd5e1").stroke();
        doc.rect(36, curY, 523, 16).fill("#f8fafc");
        doc
          .fillColor("#0f172a")
          .font("Helvetica-Bold")
          .fontSize(8)
          .text(
            "4. SPECIAL MARITIME STIPULATIONS & BIMCO STANDARD CLAUSES",
            44,
            curY + 4,
          );

        const clausesText = `• NOR Tendering: Notice of Readiness to be tendered during official office hours, whether in berth or not (WIBON), whether in port or not (WIPON), whether in free pratique or not (WIFPON), and whether customs cleared or not (WCCON).
• Laytime Computation: Laytime shall commence upon expiry of 12 hours turn time after NOR tendered, or upon commencement of loading/discharging if earlier. Time shall cease upon completion of cargo operations and disconnection of hoses/gangway.
• Demurrage & Despatch: Demurrage is payable day by day at the agreed rate. Despatch money is payable at 50% of demurrage rate for all time saved (ATS). Traditional maritime rule applies: 'Once on demurrage, always on demurrage'.
• Law & Arbitration: This contract shall be governed by and construed in accordance with English Law and BIMCO Standard Dispute Resolution Clause with arbitration in London (LMAA Rules).`;

        doc
          .font("Helvetica")
          .fontSize(7)
          .fillColor("#334155")
          .text(clausesText, 44, curY + 22, { width: 505, lineGap: 3 });

        curY += 118;

        // Signatures
        doc.rect(36, curY, 523, 50).strokeColor("#cbd5e1").stroke();
        doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#0f172a");
        doc.text("SIGNED FOR AND ON BEHALF OF OWNER:", 44, curY + 6);
        doc.text("SIGNED FOR AND ON BEHALF OF CHARTERER:", 300, curY + 6);
        doc.font("Helvetica").fontSize(7).fillColor("#64748b");
        doc.text("Authorized Signature & Seal", 44, curY + 34);
        doc.text("Authorized Signature & Seal", 300, curY + 34);

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * 2. Official Statement of Facts (SOF) PDF
   */
  public static async generateStatementOfFactsPdf(
    sof: any,
    events: any[],
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 36, size: "A4" });
        const buffers: Buffer[] = [];
        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        // Header
        doc.rect(36, 36, 523, 44).fill("#1e293b");
        doc
          .fillColor("#38bdf8")
          .font("Helvetica-Bold")
          .fontSize(12)
          .text("ATLAS LOGISTICS — STATEMENT OF FACTS (SOF)", 44, 46);
        doc
          .fillColor("#ffffff")
          .font("Helvetica")
          .fontSize(8)
          .text(
            `OFFICIAL PORT LOG & TIME SHEET | SOF Ref: ${sof.sofReference} | Port: ${sof.portName} (${sof.portCode})`,
            44,
            62,
          );

        let curY = 88;

        // Vessel & Port Call Summary
        doc.rect(36, curY, 523, 58).strokeColor("#cbd5e1").stroke();
        doc.rect(36, curY, 523, 16).fill("#f8fafc");
        doc
          .fillColor("#0f172a")
          .font("Helvetica-Bold")
          .fontSize(8)
          .text("PORT CALL PARTICULARS & KEY MILESTONES", 44, curY + 4);

        doc.font("Helvetica").fontSize(7.5).fillColor("#334155");
        doc.text(`Operation: ${sof.portOperation}`, 44, curY + 22);
        doc.text(
          `Terminal / Berth: ${sof.terminalBerth || "Muelle de Raos"}`,
          180,
          curY + 22,
        );
        doc.text(
          `Cargo Handled: ${sof.actualCargoHandledMt?.toLocaleString("en-US")} MT`,
          380,
          curY + 22,
        );

        doc.text(`NOR Tendered: ${sof.norTenderedTimestamp}`, 44, curY + 36);
        doc.text(`NOR Accepted: ${sof.norAcceptedTimestamp}`, 220, curY + 36);
        doc.text(
          `Turn Time Expiry: ${sof.turnTimeExpiryTimestamp || "N/A"}`,
          390,
          curY + 36,
        );

        curY += 66;

        // Chronological Events Table
        doc.rect(36, curY, 523, 16).fill("#0f172a");
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(7.5);
        doc.text("Inicio (Start)", 44, curY + 4);
        doc.text("Fin (End)", 140, curY + 4);
        doc.text("Duración", 235, curY + 4);
        doc.text("Tipo de Evento / Causa", 285, curY + 4);
        doc.text("% Plancha", 455, curY + 4);
        doc.text("Cómputo", 505, curY + 4);

        curY += 16;

        for (const ev of events) {
          doc.rect(36, curY, 523, 18).strokeColor("#e2e8f0").stroke();
          doc.font("Helvetica").fontSize(7).fillColor("#0f172a");
          doc.text(
            ev.eventStartTimestamp?.substring(0, 16).replace("T", " "),
            44,
            curY + 4,
          );
          doc.text(
            ev.eventEndTimestamp?.substring(0, 16).replace("T", " "),
            140,
            curY + 4,
          );
          doc.text(`${ev.durationMinutes || 0} min`, 235, curY + 4);
          doc.text(
            `${ev.eventType?.replace(/_/g, " ")}${ev.interruptionReason ? ` (${ev.interruptionReason})` : ""}`,
            285,
            curY + 4,
            { width: 165 },
          );
          doc
            .font("Helvetica-Bold")
            .fillColor(
              ev.laytimeCountingPercentage === 100 ? "#15803d" : "#b91c1c",
            );
          doc.text(`${ev.laytimeCountingPercentage ?? 100}%`, 455, curY + 4);
          doc.font("Helvetica").fillColor("#475569");
          doc.text(
            ev.isCountedAgainstLaytime !== false ? "Cuenta" : "Deduce",
            505,
            curY + 4,
          );
          curY += 18;
        }

        curY += 15;
        if (curY < 720) {
          // Signatures Box
          doc.rect(36, curY, 523, 50).strokeColor("#cbd5e1").stroke();
          doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#0f172a");
          doc.text("MASTER OF THE VESSEL:", 44, curY + 6);
          doc.text("PORT AGENT / STEVEDORES:", 200, curY + 6);
          doc.text("CHARTERER'S REPRESENTATIVE:", 380, curY + 6);
          doc.font("Helvetica").fontSize(7).fillColor("#64748b");
          doc.text(`${sof.masterName || "Capt. Master"}`, 44, curY + 34);
          doc.text(`${sof.vesselAgentName || "Port Agent"}`, 200, curY + 34);
          doc.text("Signature & Stamp", 380, curY + 34);
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * 3. Official Laytime Calculation Sheet & Demurrage/Despatch Settlement PDF
   */
  public static async generateLaytimeCalculationSheetPdf(
    calc: any,
    charter: any,
    breakdowns: any[],
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 36, size: "A4" });
        const buffers: Buffer[] = [];
        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        // Header
        doc.rect(36, 36, 523, 44).fill("#047857");
        doc
          .fillColor("#ffffff")
          .font("Helvetica-Bold")
          .fontSize(12)
          .text("ATLAS LOGISTICS — LAYTIME CALCULATION SHEET", 44, 46);
        doc
          .fillColor("#ecfdf5")
          .font("Helvetica")
          .fontSize(8)
          .text(
            `DEMURRAGE / DESPATCH STATEMENT OF ACCOUNT | Ref: ${calc.calculationReference} | Operation: ${calc.portOperation}`,
            44,
            62,
          );

        let curY = 88;

        // Summary Card Grid
        doc.rect(36, curY, 523, 75).strokeColor("#cbd5e1").stroke();
        doc.rect(36, curY, 523, 16).fill("#f8fafc");
        doc
          .fillColor("#0f172a")
          .font("Helvetica-Bold")
          .fontSize(8)
          .text("1. TIME ALLOWED VS TIME USED SUMMARY", 44, curY + 4);

        doc.font("Helvetica").fontSize(7.5).fillColor("#334155");
        doc.text(
          `Fixture Ref: ${charter?.fixtureReference || "CP-2026-001"}`,
          44,
          curY + 22,
        );
        doc.text(
          `Vessel: ${charter?.vesselName || "MV Northern Star"}`,
          300,
          curY + 22,
        );
        doc.text(
          `Laytime Commenced: ${calc.laytimeCommencedTimestamp}`,
          44,
          curY + 36,
        );
        doc.text(
          `Operations Completed: ${calc.laytimeCeasedTimestamp}`,
          300,
          curY + 36,
        );
        doc.text(
          `Allowed Laytime: ${calc.allowedLaytimeFormatted}`,
          44,
          curY + 50,
        );
        doc.text(
          `Net Laytime Used: ${calc.netLaytimeUsedFormatted}`,
          180,
          curY + 50,
        );
        doc
          .font("Helvetica-Bold")
          .fillColor(calc.isDemurrage ? "#dc2626" : "#059669");
        doc.text(
          `Difference: ${calc.isDemurrage ? "DEMURRAGE" : "DESPATCH"} (${calc.timeDifferenceFormatted})`,
          340,
          curY + 50,
        );

        curY += 83;

        // Settlement Banner
        const isDem = calc.isDemurrage;
        doc.rect(36, curY, 523, 38).fill(isDem ? "#fef2f2" : "#f0fdf4");
        doc
          .rect(36, curY, 523, 38)
          .strokeColor(isDem ? "#f87171" : "#4ade80")
          .stroke();

        doc
          .font("Helvetica-Bold")
          .fontSize(10)
          .fillColor(isDem ? "#991b1b" : "#166534")
          .text(
            isDem
              ? `TOTAL DEMURRAGE PAYABLE: $${calc.totalDemurrageAmountUsd?.toLocaleString("en-US", { minimumFractionDigits: 2 })} USD`
              : `TOTAL DESPATCH DUE: $${calc.totalDespatchAmountUsd?.toLocaleString("en-US", { minimumFractionDigits: 2 })} USD`,
            44,
            curY + 8,
          );
        doc
          .font("Helvetica")
          .fontSize(7.5)
          .fillColor("#334155")
          .text(
            isDem
              ? `Payable by Charterer (${charter?.chartererName || "Charterer"}) to Disponent Owner at rate of $${calc.demurrageRatePerDayUsd?.toLocaleString("en-US")} USD/day.`
              : `Payable by Owner (${charter?.ownerName || "Owner"}) to Charterer at agreed rate of $${calc.despatchRatePerDayUsd?.toLocaleString("en-US")} USD/day (${calc.calculationMethod || "ATS"}).`,
            44,
            curY + 22,
          );

        curY += 46;

        // Event Breakdowns Table
        doc.rect(36, curY, 523, 16).fill("#0f172a");
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(7.5);
        doc.text("Period Start / End", 44, curY + 4);
        doc.text("Event Description", 190, curY + 4);
        doc.text("Gross Mins", 340, curY + 4);
        doc.text("Deducted", 400, curY + 4);
        doc.text("Counted", 460, curY + 4);
        doc.text("Demurrage?", 510, curY + 4);

        curY += 16;

        for (const b of (breakdowns || []).slice(0, 18)) {
          doc.rect(36, curY, 523, 16).strokeColor("#e2e8f0").stroke();
          doc.font("Helvetica").fontSize(6.5).fillColor("#0f172a");
          doc.text(
            `${b.startTime?.substring(5, 16).replace("T", " ")} - ${b.endTime?.substring(5, 16).replace("T", " ")}`,
            44,
            curY + 4,
          );
          doc.text(b.reason || b.eventType, 190, curY + 4, { width: 145 });
          doc.text(`${b.durationMinutes}m`, 340, curY + 4);
          doc.text(`${b.deductedMinutes}m`, 400, curY + 4);
          doc
            .font("Helvetica-Bold")
            .text(`${b.countedMinutes}m`, 460, curY + 4);
          doc
            .font("Helvetica")
            .fillColor(b.isOnDemurrageDuringEvent ? "#b91c1c" : "#15803d");
          doc.text(b.isOnDemurrageDuringEvent ? "YES" : "No", 515, curY + 4);
          curY += 16;
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * 4. Official Time Charter Hire & Off-Hire Audit Statement PDF
   */
  public static async generateTimeCharterHireStatementPdf(
    charter: any,
    hireCalc: any,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 36, size: "A4" });
        const buffers: Buffer[] = [];
        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        // Header
        doc.rect(36, 36, 523, 44).fill("#312e81");
        doc
          .fillColor("#ffffff")
          .font("Helvetica-Bold")
          .fontSize(12)
          .text("ATLAS LOGISTICS — TIME CHARTER HIRE STATEMENT", 44, 46);
        doc
          .fillColor("#e0e7ff")
          .font("Helvetica")
          .fontSize(8)
          .text(
            `OFFICIAL HIRE & OFF-HIRE SETTLEMENT (BIMCO NYPE 2015) | Fixture Ref: ${charter?.fixtureReference || "TC-2026-001"}`,
            44,
            62,
          );

        let curY = 88;

        // Financial Summary Box
        doc.rect(36, curY, 523, 70).strokeColor("#cbd5e1").stroke();
        doc.rect(36, curY, 523, 16).fill("#f8fafc");
        doc
          .fillColor("#0f172a")
          .font("Helvetica-Bold")
          .fontSize(8)
          .text("TIME CHARTER FINANCIAL RECONCILIATION", 44, curY + 4);

        doc.font("Helvetica").fontSize(7.5).fillColor("#334155");
        doc.text(`Disponent Owner: ${charter?.ownerName}`, 44, curY + 22);
        doc.text(`Charterer: ${charter?.chartererName}`, 300, curY + 22);
        doc.text(
          `Daily Hire: $${charter?.dailyHireRateUsd?.toLocaleString("en-US")} USD/day`,
          44,
          curY + 36,
        );
        doc.text(
          `Gross Period: ${hireCalc?.grossPeriodDaysDecimal} Days ($${hireCalc?.grossHireAmountUsd?.toLocaleString("en-US")} USD)`,
          300,
          curY + 36,
        );
        doc.text(
          `Off-Hire Deductions: ${hireCalc?.totalOffHireDaysDecimal} Days ($${hireCalc?.totalOffHireClaimsUsd?.toLocaleString("en-US")} USD incl. bunker)`,
          44,
          curY + 50,
        );
        doc.font("Helvetica-Bold").fillColor("#4338ca");
        doc.text(
          `Net Payable to Owner: $${hireCalc?.netPayableToOwnerUsd?.toLocaleString("en-US", { minimumFractionDigits: 2 })} USD`,
          300,
          curY + 50,
        );

        curY += 78;

        // Off-Hire Incidents Table
        doc.rect(36, curY, 523, 16).fill("#1e1b4b");
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(7.5);
        doc.text("Ref", 44, curY + 4);
        doc.text("Motivo (Reason)", 100, curY + 4);
        doc.text("Periodo Off-Hire", 220, curY + 4);
        doc.text("Días", 350, curY + 4);
        doc.text("Deducción Flete", 400, curY + 4);
        doc.text("Búnker Offset", 480, curY + 4);

        curY += 16;

        for (const off of hireCalc?.offHires || []) {
          doc.rect(36, curY, 523, 18).strokeColor("#e2e8f0").stroke();
          doc.font("Helvetica").fontSize(7).fillColor("#0f172a");
          doc.text(off.offHireReference, 44, curY + 4);
          doc.text(off.offHireReason?.replace(/_/g, " "), 100, curY + 4, {
            width: 115,
          });
          doc.text(
            `${off.start?.substring(0, 10)} to ${off.end?.substring(0, 10)}`,
            220,
            curY + 4,
          );
          doc.text(`${off.durationDaysDecimal}d`, 350, curY + 4);
          doc.text(
            `$${off.hireDeductionUsd?.toLocaleString("en-US")}`,
            400,
            curY + 4,
          );
          doc.text(
            `$${off.bunkerCompensationUsd?.toLocaleString("en-US")}`,
            480,
            curY + 4,
          );
          curY += 18;
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
