import PDFDocument from "pdfkit";

export class FuelEuPdfGenerator {
  /**
   * Generates Official FuelEU Maritime Compliance & EU ETS Settlement Certificate (PDF)
   */
  static generateFuelEuComplianceCertificatePdf(
    account: any,
    vessel: any,
    pool?: any,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 36, size: "A4" });
        const buffers: Buffer[] = [];

        doc.on("data", (chunk: Buffer) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        // Header Background
        doc.rect(36, 36, 523, 60).fill("#0284c7");
        doc
          .fillColor("#ffffff")
          .font("Helvetica-Bold")
          .fontSize(14)
          .text("FUELEU MARITIME & EU ETS COMPLIANCE CERTIFICATE", 46, 48);
        doc
          .font("Helvetica")
          .fontSize(8)
          .text(
            "CERTIFICADO OFICIAL DE CUMPLIMIENTO REGULATORIO Y DESCARBONIZACIÓN MARÍTIMA",
            46,
            68,
          );
        doc.text(
          "Regulation (EU) 2023/1805 & Directive (EU) 2023/959 — Verification Document",
          46,
          80,
        );

        // Metadata box
        const metaY = 104;
        doc.rect(36, metaY, 523, 62).strokeColor("#cbd5e1").stroke();
        doc.rect(36, metaY, 523, 16).fill("#f1f5f9");
        doc
          .fillColor("#0f172a")
          .font("Helvetica-Bold")
          .fontSize(8)
          .text(
            "1. VESSEL IDENTIFICATION & STATUTORY REGISTRATION",
            44,
            metaY + 4,
          );

        doc.font("Helvetica").fontSize(7.5).fillColor("#334155");
        doc.text(`Vessel Name: ${vessel.vesselName}`, 44, metaY + 22);
        doc.text(`IMO Number: ${vessel.imoNumber}`, 220, metaY + 22);
        doc.text(`Flag State: ${vessel.flagState}`, 380, metaY + 22);

        doc.text(
          `Gross Tonnage: ${vessel.grossTonnageGt.toLocaleString()} GT`,
          44,
          metaY + 36,
        );
        doc.text(`Engine Type: ${vessel.mainEngineType}`, 220, metaY + 36);
        doc.text(
          `Operating Line: ${vessel.operatingShippingLine}`,
          380,
          metaY + 36,
        );

        doc.text(
          `Classification Society: ${vessel.classificationSociety}`,
          44,
          metaY + 50,
        );
        doc.text(
          `OPS Connection: ${vessel.hasOpsConnectionInstalled ? "EQUIPPED" : "NONE"}`,
          220,
          metaY + 50,
        );
        doc.text(`Reporting Year: ${account.reportingYear}`, 380, metaY + 50);

        // FuelEU Performance Box
        const perfY = 174;
        doc.rect(36, perfY, 523, 85).strokeColor("#cbd5e1").stroke();
        doc.rect(36, perfY, 523, 16).fill("#f1f5f9");
        doc
          .fillColor("#0f172a")
          .font("Helvetica-Bold")
          .fontSize(8)
          .text(
            "2. FUELEU GREENHOUSE GAS (GHG) INTENSITY ACCOUNTING",
            44,
            perfY + 4,
          );

        doc.font("Helvetica").fontSize(8).fillColor("#334155");
        doc.text(
          `Regulatory Target (Art. 4(2)): ${account.targetGhgIntensityGco2eqPerMj.toFixed(4)} gCO2eq/MJ`,
          44,
          perfY + 24,
        );
        doc.text(
          `Actual Attained Intensity: ${account.actualAttainedGhgIntensityGco2eqPerMj.toFixed(4)} gCO2eq/MJ`,
          300,
          perfY + 24,
        );

        doc.text(
          `Total Energy Consumed: ${(account.totalAnnualEnergyMj / 1_000_000).toFixed(2)} GJ (${account.totalAnnualEnergyMj.toLocaleString()} MJ)`,
          44,
          perfY + 40,
        );
        doc.text(
          `Compliance Status: ${account.complianceStatus}`,
          300,
          perfY + 40,
        );

        const cbTonnes = (account.complianceBalanceGco2eq / 1_000_000).toFixed(
          2,
        );
        doc.text(
          `Compliance Balance (CB): ${cbTonnes} t CO2eq (${account.complianceBalanceGco2eq >= 0 ? "SURPLUS" : "DEFICIT"})`,
          44,
          perfY + 56,
        );
        doc.text(
          `FuelEU Penalty Calculated: ${account.calculatedFuelEuPenaltyEur.toLocaleString("es-ES", { minimumFractionDigits: 2 })} EUR`,
          300,
          perfY + 56,
        );

        doc.text(
          `Verifier Accreditation Ref: ${account.verifierAccreditationNumber}`,
          44,
          perfY + 70,
        );

        // Pooling Box (if present)
        const poolY = 267;
        doc.rect(36, poolY, 523, 58).strokeColor("#cbd5e1").stroke();
        doc.rect(36, poolY, 523, 16).fill("#f1f5f9");
        doc
          .fillColor("#0f172a")
          .font("Helvetica-Bold")
          .fontSize(8)
          .text(
            "3. FLEET COMPLIANCE POOLING MECHANISM (ARTICLE 21)",
            44,
            poolY + 4,
          );

        doc.font("Helvetica").fontSize(7.5).fillColor("#334155");
        if (pool) {
          doc.text(`Pool Code: ${pool.poolCode}`, 44, poolY + 22);
          doc.text(`Pool Status: ${pool.status}`, 300, poolY + 22);
          doc.text(
            `Managing Operator: ${pool.managingOperatorName}`,
            44,
            poolY + 36,
          );
          doc.text(
            `Consolidated Net Balance: ${(pool.consolidatedNetComplianceBalanceGco2eq / 1_000_000).toFixed(2)} t CO2eq`,
            300,
            poolY + 36,
          );
          doc.text(
            `Surplus Reallocation Result: Compliant fleet pooling — residual individual penalty is 0.00 EUR.`,
            44,
            poolY + 48,
            { width: 505 },
          );
        } else {
          doc.text(
            "No fleet pool assigned. Individual compliance accounting applies.",
            44,
            poolY + 24,
          );
        }

        // Diligence and Certification Statement
        const certY = 333;
        doc.rect(36, certY, 523, 75).strokeColor("#0284c7").stroke();
        doc.rect(36, certY, 523, 16).fill("#e0f2fe");
        doc
          .fillColor("#0369a1")
          .font("Helvetica-Bold")
          .fontSize(8)
          .text(
            "4. ACCREDITED VERIFIER STATEMENT & EMSA CONFORMITY",
            44,
            certY + 4,
          );

        doc.font("Helvetica").fontSize(7).fillColor("#334155");
        doc.text(
          "We hereby certify that the GHG intensity of energy used on-board and the compliance balance reported for this vessel have been assessed and verified in accordance with Regulation (EU) 2023/1805 (FuelEU Maritime) and Directive 2003/87/EC as amended by Directive (EU) 2023/959 (EU ETS Maritime). Data has been submitted to the THETIS-MRV system.",
          44,
          certY + 22,
          { width: 505 },
        );

        // Signature Blocks
        const sigY = 416;
        doc.rect(36, sigY, 255, 60).strokeColor("#cbd5e1").stroke();
        doc.rect(304, sigY, 255, 60).strokeColor("#cbd5e1").stroke();

        doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#0f172a");
        doc.text("DOCUMENT OF COMPLIANCE (DOC) HOLDER", 44, sigY + 8);
        doc.text("ACCREDITED VERIFICATION BODY", 312, sigY + 8);

        doc.font("Helvetica").fontSize(7).fillColor("#64748b");
        doc.text(
          `Authorized Signatory: ${vessel.docHolderCompany}`,
          44,
          sigY + 42,
        );
        doc.text(
          `Lead Auditor / Verifier: ${account.verifierAccreditationNumber}`,
          312,
          sigY + 42,
        );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Generates Bunker Delivery Note & Voyage GHG Emissions Audit Sheet (PDF)
   */
  static generateBunkerDeliveryNoteAuditPdf(
    voyage: any,
    vessel: any,
    fuel: any,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 36, size: "A4" });
        const buffers: Buffer[] = [];

        doc.on("data", (chunk: Buffer) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        // Header Background
        doc.rect(36, 36, 523, 60).fill("#0f766e");
        doc
          .fillColor("#ffffff")
          .font("Helvetica-Bold")
          .fontSize(14)
          .text("BUNKER DELIVERY & VOYAGE GHG EMISSIONS AUDIT", 46, 48);
        doc
          .font("Helvetica")
          .fontSize(8)
          .text(
            "DECLARACIÓN OFICIAL DE SUMINISTRO DE COMBUSTIBLE Y EMISIONES DE TRAVESÍA",
            46,
            68,
          );
        doc.text(
          `Voyage Reference: ${voyage.voyageReferenceNumber} — EMSA THETIS-MRV Form`,
          46,
          80,
        );

        // Voyage Details Box
        const voyY = 104;
        doc.rect(36, voyY, 523, 68).strokeColor("#cbd5e1").stroke();
        doc.rect(36, voyY, 523, 16).fill("#f1f5f9");
        doc
          .fillColor("#0f172a")
          .font("Helvetica-Bold")
          .fontSize(8)
          .text("1. VOYAGE ROUTE & OPERATIONAL PARAMETERS", 44, voyY + 4);

        doc.font("Helvetica").fontSize(7.5).fillColor("#334155");
        doc.text(
          `Vessel: ${vessel.vesselName} (IMO: ${vessel.imoNumber})`,
          44,
          voyY + 22,
        );
        doc.text(`Scope: ${voyage.geographicScope}`, 300, voyY + 22);

        doc.text(
          `Departure: ${voyage.departurePortName} (${voyage.departurePortLocode})`,
          44,
          voyY + 36,
        );
        doc.text(
          `Arrival: ${voyage.arrivalPortName} (${voyage.arrivalPortLocode})`,
          300,
          voyY + 36,
        );

        doc.text(
          `Distance: ${voyage.distanceNauticalMiles} NM | Nav: ${voyage.navigationHours}h | Berth: ${voyage.berthHours}h`,
          44,
          voyY + 50,
        );
        doc.text(`Carried TEUs: ${voyage.carriedTeuCount}`, 300, voyY + 50);

        // Bunker Details Box
        const bnkY = 180;
        doc.rect(36, bnkY, 523, 76).strokeColor("#cbd5e1").stroke();
        doc.rect(36, bnkY, 523, 16).fill("#f1f5f9");
        doc
          .fillColor("#0f172a")
          .font("Helvetica-Bold")
          .fontSize(8)
          .text("2. FUEL CONSUMPTION & ENERGY RECONCILIATION", 44, bnkY + 4);

        doc.font("Helvetica").fontSize(7.5).fillColor("#334155");
        doc.text(
          `Fuel Grade: ${fuel.fuelName} (${fuel.fuelCode})`,
          44,
          bnkY + 22,
        );
        doc.text(`Category: ${fuel.fuelCategory}`, 300, bnkY + 22);

        doc.text(
          `Fuel Consumed: ${voyage.fuelConsumedTonnes.toFixed(3)} Tonnes`,
          44,
          bnkY + 36,
        );
        doc.text(
          `OPS Electricity: ${voyage.opsElectricityConsumedKwh.toFixed(2)} kWh`,
          300,
          bnkY + 36,
        );

        doc.text(
          `Total Energy Consumed: ${(voyage.totalEnergyConsumedMj / 1_000_000).toFixed(2)} GJ (${voyage.totalEnergyConsumedMj.toLocaleString()} MJ)`,
          44,
          bnkY + 50,
        );
        doc.text(
          `Attained GHG Intensity: ${voyage.calculatedGhgIntensityGco2eqPerMj.toFixed(4)} gCO2eq/MJ`,
          300,
          bnkY + 50,
        );

        doc.text(
          `LCV: ${(fuel.lowerCalorificValueMjPerGram * 1000).toFixed(1)} MJ/kg | WtW Factor: ${fuel.totalWtwFactorGco2eqPerMj} gCO2eq/MJ`,
          44,
          bnkY + 64,
        );

        // GHG Emissions Accounting Box
        const emsY = 264;
        doc.rect(36, emsY, 523, 68).strokeColor("#cbd5e1").stroke();
        doc.rect(36, emsY, 523, 16).fill("#f1f5f9");
        doc
          .fillColor("#0f172a")
          .font("Helvetica-Bold")
          .fontSize(8)
          .text(
            "3. GREENHOUSE GAS EMISSIONS ACCOUNTING (EU ETS & THETIS-MRV)",
            44,
            emsY + 4,
          );

        doc.font("Helvetica").fontSize(7.5).fillColor("#334155");
        doc.text(
          `CO2 Emissions: ${voyage.co2EmissionsTonnes.toFixed(3)} t`,
          44,
          emsY + 22,
        );
        doc.text(
          `CH4 (Methane): ${voyage.ch4EmissionsTonnes.toFixed(4)} t (GWP 28)`,
          220,
          emsY + 22,
        );
        doc.text(
          `N2O: ${voyage.n2oEmissionsTonnes.toFixed(4)} t (GWP 265)`,
          380,
          emsY + 22,
        );

        doc.text(
          `Total Gross Emissions: ${voyage.totalGhgEmissionsScopeTco2eq.toFixed(3)} tCO2eq`,
          44,
          emsY + 38,
        );
        doc.text(
          `EU ETS Applicable Emissions: ${voyage.etsApplicableScopeEmissionsTco2eq.toFixed(3)} tCO2eq`,
          300,
          emsY + 38,
        );

        doc.text(
          `Lead Auditor / Verifier: ${voyage.leadAuditorVerifier}`,
          44,
          emsY + 52,
        );

        // Verification Sign-off Box
        const authY = 340;
        doc.rect(36, authY, 523, 50).strokeColor("#0f766e").stroke();
        doc.rect(36, authY, 523, 16).fill("#f0fdfa");
        doc
          .fillColor("#115e59")
          .font("Helvetica-Bold")
          .fontSize(8)
          .text("4. MASTER & CHIEF ENGINEER VERIFICATION", 44, authY + 4);

        doc.font("Helvetica").fontSize(7).fillColor("#334155");
        doc.text(
          `Certified by Master and Chief Engineer of vessel ${vessel.vesselName}. Fuel quantities and operational figures match official engine room logs and Bunker Delivery Notes (BDN).`,
          44,
          authY + 24,
          { width: 505 },
        );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
