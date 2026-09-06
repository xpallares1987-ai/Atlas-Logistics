import PDFDocument from "pdfkit";

export class ClaimsPdfGenerator {
  /**
   * Generates formal Notice of Claim & Carrier Protest Letter (Carta de Reserva al Porteador)
   */
  public static async generateCarrierProtestLetter(claim: {
    claimNumber: string;
    transportDocNumber: string;
    transportMode: string;
    governingConvention: string;
    incidentType: string;
    incidentDate: string | Date;
    noticeDate: string | Date;
    deliveryDate?: string | Date;
    claimantName: string;
    carrierName: string;
    packagesDamaged: number;
    damagedWeightKg: number;
    claimedAmount: number;
    claimedCurrency: string;
    statutoryLimitEur: number;
    incidentDescription: string;
    surveyorData?: any;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: "A4", margin: 36 });
        const buffers: Buffer[] = [];

        doc.on("data", (chunk: Buffer) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        // Header Background Banner
        doc.rect(36, 36, 523, 50).fill("#1e293b");
        doc
          .fillColor("#ffffff")
          .font("Helvetica-Bold")
          .fontSize(13)
          .text("ATLAS LOGISTICS LEGAL & CLAIMS DEPARTMENT", 48, 46);
        doc
          .fontSize(8)
          .font("Helvetica")
          .text("FORMAL NOTICE OF CARGO CLAIM & RESERVATION OF RIGHTS", 48, 62);
        doc
          .fontSize(8)
          .fillColor("#38bdf8")
          .text(
            `REF: ${claim.claimNumber} | ${claim.governingConvention}`,
            360,
            52,
            { align: "right" },
          );

        // Addressee / Carrier Box
        const carrierY = 96;
        doc.rect(36, carrierY, 523, 50).strokeColor("#cbd5e1").stroke();
        doc
          .fillColor("#0f172a")
          .font("Helvetica-Bold")
          .fontSize(8.5)
          .text(
            "TO / DESTINATARIO (CARRIER / OPERADOR DE TRANSPORTE):",
            44,
            carrierY + 6,
          );
        doc
          .font("Helvetica-Bold")
          .fontSize(10)
          .fillColor("#0284c7")
          .text(claim.carrierName, 44, carrierY + 20);
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor("#475569")
          .text(
            `Transport Document: ${claim.transportDocNumber} | Mode: ${claim.transportMode}`,
            44,
            carrierY + 34,
          );

        // Transport Particulars & Incident Grid
        const gridY = 154;
        doc.rect(36, gridY, 523, 85).strokeColor("#cbd5e1").stroke();
        doc.rect(36, gridY, 523, 16).fill("#f1f5f9");
        doc
          .fillColor("#1e293b")
          .font("Helvetica-Bold")
          .fontSize(7.5)
          .text(
            "1. TRANSPORT PARTICULARS & DAMAGE SPECIFICATION",
            44,
            gridY + 4,
          );

        doc.font("Helvetica").fontSize(7.5).fillColor("#475569");
        doc.text(`Claimant / Cargador: ${claim.claimantName}`, 44, gridY + 24);
        doc.text(
          `Incident Date: ${new Date(claim.incidentDate).toISOString().substring(0, 10)}`,
          300,
          gridY + 24,
        );
        doc.text(
          `Delivery Date: ${claim.deliveryDate ? new Date(claim.deliveryDate).toISOString().substring(0, 10) : "N/A"}`,
          300,
          gridY + 38,
        );
        doc.text(
          `Damaged Packages: ${claim.packagesDamaged} units`,
          44,
          gridY + 38,
        );
        doc.text(
          `Damaged Gross Weight: ${claim.damagedWeightKg} kg`,
          44,
          gridY + 52,
        );
        doc.text(
          `Claimed Amount: ${claim.claimedAmount.toFixed(2)} ${claim.claimedCurrency}`,
          300,
          gridY + 52,
        );
        doc.text(
          `Governing Convention: ${claim.governingConvention} (Statutory Limit: ${claim.statutoryLimitEur.toFixed(2)} EUR)`,
          44,
          gridY + 66,
        );

        // Incident Description Box
        const descY = 247;
        doc.rect(36, descY, 523, 55).strokeColor("#cbd5e1").stroke();
        doc.rect(36, descY, 523, 16).fill("#f1f5f9");
        doc
          .fillColor("#1e293b")
          .font("Helvetica-Bold")
          .fontSize(7.5)
          .text(
            "2. STATEMENT OF DAMAGE / DESCRIPCIÓN DEL SINIESTRO",
            44,
            descY + 4,
          );
        doc
          .font("Helvetica")
          .fontSize(7.5)
          .fillColor("#334155")
          .text(claim.incidentDescription, 44, descY + 22, { width: 505 });

        // Legal Notice & Reservation Clause
        const legalY = 310;
        doc
          .rect(36, legalY, 523, 90)
          .strokeColor("#dc2626")
          .lineWidth(1)
          .stroke();
        doc.rect(36, legalY, 523, 16).fill("#fef2f2");
        doc
          .fillColor("#991b1b")
          .font("Helvetica-Bold")
          .fontSize(8)
          .text(
            "3. FORMAL RESERVATION OF RIGHTS & LEGAL NOTICE (CARTA DE RESERVA FORMAL)",
            44,
            legalY + 4,
          );

        const legalText = `Por medio de la presente, ponemos en su conocimiento que las mercancías amparadas bajo el documento de transporte ${claim.transportDocNumber} fueron entregadas con graves daños / pérdidas consistentes en ${claim.incidentType}.
En cumplimiento estricto de los plazos de protesta establecidos en el Convenio aplicable (${claim.governingConvention}), formulamos formal y expresa RESERVA DE DERECHOS frente a su compañía como porteador contractual / efectivo, haciéndoles formalmente responsables de todos los daños, perjuicios, deméritos y gastos derivados.
Se les requiere para que procedan a la peritación conjunta de los daños y al inmediato abono de la cantidad reclamada de ${claim.claimedAmount.toFixed(2)} ${claim.claimedCurrency}.`;

        doc
          .font("Helvetica")
          .fontSize(7)
          .fillColor("#1e293b")
          .text(legalText, 44, legalY + 22, { width: 505, lineGap: 2 });

        // Signatures
        const signY = 410;
        doc.rect(36, signY, 523, 65).strokeColor("#cbd5e1").stroke();
        doc
          .font("Helvetica-Bold")
          .fontSize(7.5)
          .fillColor("#0f172a")
          .text(
            "ISSUED ON BEHALF OF CLAIMANT & CARGO INTERESTS / EN NOMBRE DE LOS INTERESES DE LA CARGA:",
            44,
            signY + 6,
          );
        doc
          .font("Helvetica")
          .fontSize(7)
          .fillColor("#475569")
          .text(
            `Atlas Logistics Claims Department | Date of Issue: ${new Date(claim.noticeDate).toISOString().substring(0, 10)}`,
            44,
            signY + 20,
          );
        doc
          .font("Helvetica-Bold")
          .fontSize(7)
          .fillColor("#0284c7")
          .text(
            "Digital Legal Signature & Corporate Seal Certified",
            44,
            signY + 48,
          );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Generates official Subrogation Receipt & Assignment of Rights (Recibo de Finiquito y Subrogación de Derechos)
   */
  public static async generateSubrogationReceipt(claim: {
    claimNumber: string;
    transportDocNumber: string;
    claimantName: string;
    carrierName: string;
    claimedAmount: number;
    claimedCurrency: string;
    insurancePayoutAmount: number;
    incidentDate: string | Date;
    governingConvention: string;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: "A4", margin: 36 });
        const buffers: Buffer[] = [];

        doc.on("data", (chunk: Buffer) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        // Header Background Banner
        doc.rect(36, 36, 523, 50).fill("#064e3b");
        doc
          .fillColor("#ffffff")
          .font("Helvetica-Bold")
          .fontSize(13)
          .text("ATLAS LOGISTICS CARGO INSURANCE DIVISION", 48, 46);
        doc
          .fontSize(8)
          .font("Helvetica")
          .text(
            "SUBROGATION RECEIPT & ASSIGNMENT OF RIGHTS (RECIBO DE FINIQUITO Y SUBROGACIÓN)",
            48,
            62,
          );
        doc
          .fontSize(8)
          .fillColor("#6ee7b7")
          .text(`REF: ${claim.claimNumber}`, 360, 52, { align: "right" });

        // Amount Box
        const amountY = 96;
        doc.rect(36, amountY, 523, 40).fill("#ecfdf5");
        doc
          .strokeColor("#10b981")
          .lineWidth(1)
          .rect(36, amountY, 523, 40)
          .stroke();
        doc
          .fillColor("#065f46")
          .font("Helvetica-Bold")
          .fontSize(8.5)
          .text(
            "INDEMNIFICATION SETTLEMENT AMOUNT (IMPORTE DE INDEMNIZACIÓN):",
            44,
            amountY + 6,
          );
        doc
          .font("Helvetica-Bold")
          .fontSize(14)
          .fillColor("#047857")
          .text(
            `${claim.insurancePayoutAmount.toFixed(2)} ${claim.claimedCurrency}`,
            44,
            amountY + 18,
          );

        // Subrogation Legal Terms
        const termsY = 146;
        doc.rect(36, termsY, 523, 200).strokeColor("#cbd5e1").stroke();
        doc.rect(36, termsY, 523, 16).fill("#f1f5f9");
        doc
          .fillColor("#1e293b")
          .font("Helvetica-Bold")
          .fontSize(7.5)
          .text(
            "LEGAL SUBROGATION CLAUSE & ASSIGNMENT OF RECOVERY RIGHTS (ART. 43 LCS / CAU)",
            44,
            termsY + 4,
          );

        const subrogationText = `RECIBIMOS de ATLAS LOGISTICS y sus Aseguradores la suma de ${claim.insurancePayoutAmount.toFixed(2)} ${claim.claimedCurrency} en concepto de indemnización total y definitiva por las pérdidas y/o daños sufridos por las mercancías transportadas bajo el documento de transporte ${claim.transportDocNumber} con fecha de siniestro ${new Date(claim.incidentDate).toISOString().substring(0, 10)}.
En consideración a dicho pago, por la presente nos declaramos totalmente indemnizados y:
1. SUBROGAMOS a ATLAS LOGISTICS y a sus Aseguradores en todos nuestros derechos, acciones, privilegios y pretensiones contra el porteador (${claim.carrierName}), armador, fletador, transportista efectivo y cualesquiera otros terceros responsables del daño, de conformidad con el Art. 43 de la Ley de Contrato de Seguro y la legislación mercantil aplicable.
2. AUTORIZAMOS irrevocablemente a los Aseguradores a entablar todas las acciones judiciales o extrajudiciales de recobro en nuestro nombre o en el suyo propio, obligándonos a facilitar cuanta documentación, pruebas periciales y testimonios sean precisos para la efectividad del recobro.
3. GARANTIZAMOS que no hemos otorgado renuncia ni descargo de responsabilidad a favor de los causantes del daño ni realizado acto alguno que perjudique el derecho de subrogación.`;

        doc
          .font("Helvetica")
          .fontSize(7.5)
          .fillColor("#334155")
          .text(subrogationText, 44, termsY + 24, { width: 505, lineGap: 3 });

        // Signatures 2-Boxes
        const signY = 360;
        doc.rect(36, signY, 255, 75).strokeColor("#cbd5e1").stroke();
        doc.rect(298, signY, 261, 75).strokeColor("#cbd5e1").stroke();

        doc
          .font("Helvetica-Bold")
          .fontSize(7.5)
          .fillColor("#1e293b")
          .text("THE CLAIMANT / EL ASEGURADO (CEDENTE):", 42, signY + 6)
          .text("THE INSURER / EL ASEGURADOR (SUBROGADO):", 304, signY + 6);

        doc
          .font("Helvetica")
          .fontSize(7)
          .fillColor("#475569")
          .text(claim.claimantName, 42, signY + 20)
          .text("Atlas Cargo Underwriting / Claims Dept.", 304, signY + 20)
          .text("Firma y Sello / Authorized Signature & Stamp", 42, signY + 56)
          .text(
            "Firma y Sello / Authorized Signature & Stamp",
            304,
            signY + 56,
          );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
