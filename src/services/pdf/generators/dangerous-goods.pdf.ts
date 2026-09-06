import PDFDocument from "pdfkit";

export class DangerousGoodsPdfGenerator {
  /**
   * 1. Generates an Official Multimodal Dangerous Goods Declaration Form PDF (IMO IMDG / UNECE ADR).
   */
  public static async generateMultimodalDangerousGoodsDeclarationPdf(
    shipment: any,
    items: any[],
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 36, size: "A4" });
        const buffers: Buffer[] = [];
        doc.on("data", (chunk: Buffer) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        // Header Banner
        doc.rect(36, 36, 523, 50).fill("#c2410c"); // Industrial Danger Orange
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(12);
        doc.text("MULTIMODAL DANGEROUS GOODS FORM (IMO DGD / ADR)", 44, 46);
        doc.font("Helvetica").fontSize(7.5).fillColor("#ffedd5");
        doc.text(
          "DECLARACIÓN MULTIMODAL DE MERCANCÍAS PELIGROSAS — IMDG / ADR / RID",
          44,
          63,
        );
        doc.text(
          `DGD REF: ${shipment?.shipmentReference || "DGD-2026-001"}`,
          340,
          46,
          {
            align: "right",
            width: 210,
          },
        );
        doc.text(
          `MODO: ${shipment?.transportMode?.replace(/_/g, " ") || "MULTIMODAL"}`,
          340,
          63,
          {
            align: "right",
            width: 210,
          },
        );

        let curY = 94;

        // Shipper & Consignee Row Box
        doc
          .rect(36, curY, 256, 70)
          .fill("#f8fafc")
          .strokeColor("#cbd5e1")
          .stroke();
        doc
          .rect(302, curY, 257, 70)
          .fill("#f8fafc")
          .strokeColor("#cbd5e1")
          .stroke();

        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(7.5);
        doc.text("1. EXPEDIDOR / SHIPPER:", 42, curY + 6);
        doc.font("Helvetica").fontSize(7).fillColor("#334155");
        doc.text(
          `${shipment?.shipperName || "Iberica Chemical Solutions SL"}`,
          42,
          curY + 18,
        );
        doc.text(
          `${shipment?.shipperAddress || "Avda. del Puerto 120, 46024 Valencia"}`,
          42,
          curY + 28,
          { width: 245 },
        );

        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(7.5);
        doc.text("2. DESTINATARIO / CONSIGNEE:", 308, curY + 6);
        doc.font("Helvetica").fontSize(7).fillColor("#334155");
        doc.text(
          `${shipment?.consigneeName || "Asia Pacific Polymers Ltd"}`,
          308,
          curY + 18,
        );
        doc.text(
          `${shipment?.consigneeAddress || "Jurong Island Industrial Zone, Singapore"}`,
          308,
          curY + 28,
          { width: 245 },
        );

        curY += 76;

        // Transport Particulars Box
        doc
          .rect(36, curY, 523, 44)
          .fill("#ffffff")
          .strokeColor("#e2e8f0")
          .stroke();
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(7.5);
        doc.text(
          "3. TRANSPORTE, PUERTOS & CONTACTO DE EMERGENCIA 24/7",
          44,
          curY + 6,
        );

        doc.font("Helvetica").fontSize(7).fillColor("#334155");
        doc.text(
          `Transportista / Naviera: ${shipment?.carrierName || "Ocean Carrier"}`,
          44,
          curY + 18,
        );
        doc.text(
          `Buque / Vuelo / Matrícula: ${shipment?.vesselOrFlightOrVehiclePlate || "MV Vessel"}`,
          220,
          curY + 18,
        );
        doc.text(
          `Viaje: ${shipment?.voyageOrFlightNumber || "V.2608"}`,
          420,
          curY + 18,
        );
        doc.text(
          `Origen: ${shipment?.originPortOrLocation || "ESVLC"} ➔ Destino: ${shipment?.destinationPortOrLocation || "SGSIN"}`,
          44,
          curY + 30,
        );
        doc.font("Helvetica-Bold").fillColor("#c2410c");
        doc.text(
          `TEL. EMERGENCIA 24H: ${shipment?.emergencyContactPhone || "+34 91 562 04 20"} (${shipment?.emergencyContactName || "CHEMTREC"})`,
          260,
          curY + 30,
        );

        curY += 50;

        // Dangerous Goods Table
        doc.rect(36, curY, 523, 16).fill("#334155");
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(6.5);
        doc.text("Nº ONU / PSN & Descripción Oficial", 44, curY + 4);
        doc.text("Clase (Sub)", 235, curY + 4);
        doc.text("GE / PG", 290, curY + 4);
        doc.text("Flashpoint", 335, curY + 4);
        doc.text("Bultos / Envase", 390, curY + 4);
        doc.text("Cantidad Neta", 460, curY + 4);
        doc.text("M. Bruta (kg)", 510, curY + 4);

        curY += 16;

        for (const item of items || []) {
          doc.rect(36, curY, 523, 22).strokeColor("#e2e8f0").stroke();
          doc.font("Helvetica-Bold").fontSize(7).fillColor("#0f172a");
          doc.text(
            `${item.unNumber} - ${item.properShippingName}`,
            44,
            curY + 3,
            { width: 185 },
          );
          doc.font("Helvetica").fontSize(6).fillColor("#64748b");
          if (item.technicalChemicalName) {
            doc.text(`(${item.technicalChemicalName})`, 44, curY + 12, {
              width: 185,
            });
          }

          doc.font("Helvetica-Bold").fontSize(7).fillColor("#c2410c");
          doc.text(
            `${item.primaryHazardClass}${item.subsidiaryHazardClasses ? ` (${item.subsidiaryHazardClasses})` : ""}`,
            235,
            curY + 4,
          );

          doc.font("Helvetica").fontSize(6.5).fillColor("#334155");
          doc.text(
            item.packingGroup ? item.packingGroup.replace("PG_", "") : "-",
            290,
            curY + 4,
          );
          doc.text(
            item.flashPointCelsius !== null &&
              item.flashPointCelsius !== undefined
              ? `${item.flashPointCelsius} °C`
              : "-",
            335,
            curY + 4,
          );
          doc.text(
            `${item.packageCount}x ${item.packageUnCode || "4G"}`,
            390,
            curY + 4,
          );
          doc.text(
            `${item.totalNetQuantity} ${item.unitOfMeasure?.substring(0, 1) || "L"}`,
            460,
            curY + 4,
          );
          doc.text(`${item.totalGrossMassKg} kg`, 510, curY + 4);

          curY += 22;
        }

        curY += 10;

        // Container Packing & Segregation Certificate Box
        doc
          .rect(36, curY, 523, 50)
          .fill("#fff7ed")
          .strokeColor("#fed7aa")
          .stroke();
        doc.fillColor("#9a3412").font("Helvetica-Bold").fontSize(7.5);
        doc.text(
          "4. DECLARACIÓN DE ESTIBA, SEGREGACIÓN Y CONTENEDOR (IMDG 5.4.2 / ADR)",
          44,
          curY + 6,
        );
        doc.font("Helvetica").fontSize(6.5).fillColor("#7c2d12");
        doc.text(
          "Se certifica que la unidad de transporte ha sido inspeccionada, se encuentra limpia y seca, " +
            "los bultos están debidamente trincados y no presentan fugas ni daños, cumpliéndose estrictamente las normas de segregación química del Código IMDG (Cap. 7.2).",
          44,
          curY + 18,
          { width: 505, lineGap: 2 },
        );

        curY += 58;

        // Shipper Declaration & Signatures
        doc.rect(36, curY, 256, 75).strokeColor("#cbd5e1").stroke();
        doc.rect(302, curY, 257, 75).strokeColor("#cbd5e1").stroke();

        doc.font("Helvetica-Bold").fontSize(7).fillColor("#0f172a");
        doc.text("5. FIRMA DEL EXPEDIDOR / DECLARANTE", 42, curY + 6);
        doc.text("6. RECIBO DEL TRANSPORTISTA / CONFORME", 308, curY + 6);

        doc.font("Helvetica").fontSize(6).fillColor("#64748b");
        doc.text(
          "Declaro que las mercancías están clasificadas y embaladas reglamentariamente.",
          42,
          curY + 18,
          { width: 245 },
        );
        doc.text(
          "Fecha: " + new Date().toISOString().substring(0, 10),
          42,
          curY + 58,
        );

        doc.text(
          "Recibido conforme para transporte internacional de mercancías peligrosas.",
          308,
          curY + 18,
          { width: 245 },
        );
        doc.text("Firma y Sello del Conductor / Agente", 308, curY + 58);

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * 2. Generates an Official IATA Shipper's Declaration for Dangerous Goods PDF (Air Cargo DGR).
   */
  public static async generateIataShippersDeclarationPdf(
    shipment: any,
    items: any[],
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 36, size: "A4" });
        const buffers: Buffer[] = [];
        doc.on("data", (chunk: Buffer) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        // Outer Border Hash Marks (Standard IATA Red Candy Stripe Header/Footer)
        doc.rect(36, 36, 523, 40).fill("#dc2626"); // IATA Red
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(12);
        doc.text(
          "SHIPPER'S DECLARATION FOR DANGEROUS GOODS (IATA DGR)",
          44,
          46,
        );
        doc.font("Helvetica").fontSize(8).fillColor("#fee2e2");
        doc.text(
          "ICAO TECHNICAL INSTRUCTIONS / IATA DANGEROUS GOODS REGULATIONS 66th ED.",
          44,
          60,
        );

        let curY = 84;

        // Aircraft Limitation Box
        doc
          .rect(36, curY, 523, 36)
          .fill("#fef2f2")
          .strokeColor("#fecaca")
          .stroke();
        doc.fillColor("#991b1b").font("Helvetica-Bold").fontSize(8);
        const isCao =
          shipment?.aircraftType === "CARGO_AIRCRAFT_ONLY_CAO" ||
          items.some(
            (i) =>
              i.iataPackingInstruction === "364" ||
              i.primaryHazardClass === "1.1D" ||
              i.unNumber === "UN 3480",
          );
        doc.text(
          `AIRCRAFT LIMITATION: ${isCao ? "CARGO AIRCRAFT ONLY (CAO) — FORBIDDEN ON PASSENGER" : "PASSENGER AND CARGO AIRCRAFT"}`,
          44,
          curY + 8,
        );
        doc.font("Helvetica").fontSize(7).fillColor("#7f1d1d");
        doc.text(
          `Radioactive Materials: ${shipment?.hasRadioactiveMaterials ? "YES - CLASS 7" : "NO - NON-RADIOACTIVE"} | Ref: ${shipment?.shipmentReference}`,
          44,
          curY + 22,
        );

        curY += 44;

        // Shipper and Consignee
        doc.rect(36, curY, 256, 55).strokeColor("#cbd5e1").stroke();
        doc.rect(302, curY, 256, 55).strokeColor("#cbd5e1").stroke();

        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(7.5);
        doc.text("SHIPPER:", 42, curY + 6);
        doc.font("Helvetica").fontSize(7).fillColor("#334155");
        doc.text(
          shipment?.shipperName || "Iberica Chemical Solutions SL",
          42,
          curY + 18,
        );
        doc.text(shipment?.shipperAddress || "Valencia, Spain", 42, curY + 28);

        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(7.5);
        doc.text("CONSIGNEE:", 308, curY + 6);
        doc.font("Helvetica").fontSize(7).fillColor("#334155");
        doc.text(
          shipment?.consigneeName || "Asia Pacific Polymers Ltd",
          308,
          curY + 18,
        );
        doc.text(shipment?.consigneeAddress || "Singapore", 308, curY + 28);

        curY += 62;

        // Nature and Quantity of Dangerous Goods Table
        doc.rect(36, curY, 523, 16).fill("#1e293b");
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(6.5);
        doc.text("UN No.", 42, curY + 4);
        doc.text("Proper Shipping Name", 90, curY + 4);
        doc.text("Class", 240, curY + 4);
        doc.text("PG", 280, curY + 4);
        doc.text("Quantity & Packing", 315, curY + 4);
        doc.text("Pack Inst.", 430, curY + 4);
        doc.text("Auth.", 495, curY + 4);

        curY += 16;

        for (const item of items || []) {
          doc.rect(36, curY, 523, 22).strokeColor("#e2e8f0").stroke();
          doc.font("Helvetica-Bold").fontSize(7).fillColor("#0f172a");
          doc.text(item.unNumber, 42, curY + 4);
          doc.text(item.properShippingName, 90, curY + 4, { width: 145 });

          doc.font("Helvetica-Bold").fillColor("#dc2626");
          doc.text(item.primaryHazardClass, 240, curY + 4);

          doc.font("Helvetica").fillColor("#334155");
          doc.text(
            item.packingGroup ? item.packingGroup.replace("PG_", "") : "-",
            280,
            curY + 4,
          );
          doc.text(
            `${item.packageCount} x ${item.netQuantityPerPackage} ${item.unitOfMeasure?.substring(0, 1) || "L"} (${item.packageUnCode || "4G"})`,
            315,
            curY + 4,
            { width: 110 },
          );
          doc.text(item.iataPackingInstruction || "353", 430, curY + 4);
          doc.text(isCao ? "CAO" : "Pax", 495, curY + 4);

          curY += 22;
        }

        curY += 15;

        // Emergency Response Contact & Lithium Info Box
        doc
          .rect(36, curY, 523, 48)
          .fill("#f8fafc")
          .strokeColor("#cbd5e1")
          .stroke();
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(7.5);
        doc.text(
          "ADDITIONAL HANDLING INFORMATION & 24-HOUR EMERGENCY CONTACT",
          44,
          curY + 6,
        );
        doc.font("Helvetica").fontSize(7).fillColor("#334155");
        doc.text(
          `24-Hour Emergency Assistance: ${shipment?.emergencyContactPhone || "+34 91 562 04 20"} (${shipment?.emergencyContactName || "CHEMTREC"})`,
          44,
          curY + 20,
        );
        doc.text(
          "Emergency Response Guide (ERG) Protocol / EmS Sheets available for all flight crew and ground handlers.",
          44,
          curY + 32,
        );

        curY += 56;

        // Signatures
        doc.rect(36, curY, 523, 60).strokeColor("#cbd5e1").stroke();
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(7);
        doc.text(
          "SHIPPER'S CERTIFICATION STATEMENT (IATA DGR 8.1.6.12)",
          44,
          curY + 6,
        );
        doc.font("Helvetica").fontSize(6.5).fillColor("#334155");
        doc.text(
          "I hereby declare that the contents of this consignment are fully and accurately described above by the proper shipping name, " +
            "and are classified, packaged, marked and labelled/placarded, and are in all respects in proper condition for transport by air according to the applicable International and National Governmental Regulations.",
          44,
          curY + 18,
          { width: 505, lineGap: 2 },
        );

        doc.text(
          "Name of Signatory: Javier Navarro (DG Certified Signatory)",
          44,
          curY + 46,
        );
        doc.text(
          "Date: " + new Date().toISOString().substring(0, 10),
          340,
          curY + 46,
        );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * 3. Generates an Official Dangerous Goods Emergency Response Card & Instructions in Writing PDF.
   */
  public static async generateDangerousGoodsEmergencyCardPdf(
    emergencyCard: any,
    shipment: any,
    items: any[],
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 36, size: "A4" });
        const buffers: Buffer[] = [];
        doc.on("data", (chunk: Buffer) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        // Header
        doc.rect(36, 36, 523, 50).fill("#b91c1c"); // Crimson Emergency
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(12);
        doc.text("INSTRUCCIONES ESCRITAS DE EMERGENCIA / FICHA EmS", 44, 46);
        doc.font("Helvetica").fontSize(8).fillColor("#fecaca");
        doc.text(
          "EMERGENCY RESPONSE PROCEDURE & DANGEROUS GOODS INTERVENTION GUIDE",
          44,
          63,
        );
        doc.text(
          `REF: ${emergencyCard?.cardReference || "EMC-2026-001"}`,
          340,
          46,
          {
            align: "right",
            width: 210,
          },
        );

        let curY = 94;

        // Shipment Identification Box
        doc
          .rect(36, curY, 523, 45)
          .fill("#f8fafc")
          .strokeColor("#cbd5e1")
          .stroke();
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(7.5);
        doc.text(
          "DATOS DE LA EXPEDICIÓN & CONTACTO DE EMERGENCIA 24H",
          44,
          curY + 6,
        );
        doc.font("Helvetica").fontSize(7).fillColor("#334155");
        doc.text(
          `Expediente DGD: ${shipment?.shipmentReference || "N/A"}`,
          44,
          curY + 18,
        );
        doc.text(
          `Transporte: ${shipment?.vesselOrFlightOrVehiclePlate || "N/A"} (${shipment?.carrierName || "Carrier"})`,
          200,
          curY + 18,
        );
        doc.font("Helvetica-Bold").fillColor("#b91c1c");
        doc.text(
          `TELÉFONO 24H: ${emergencyCard?.emergencyPhone24h || "+34 91 562 04 20"}`,
          380,
          curY + 18,
        );
        doc.font("Helvetica").fillColor("#334155");
        doc.text(
          `Sustancias Transportadas: ${emergencyCard?.unNumbersSummary || items.map((i: any) => i.unNumber).join(", ")}`,
          44,
          curY + 30,
        );

        curY += 52;

        // Protocol 1: Fire
        doc
          .rect(36, curY, 523, 62)
          .fill("#fef2f2")
          .strokeColor("#fecaca")
          .stroke();
        doc.fillColor("#991b1b").font("Helvetica-Bold").fontSize(8);
        doc.text(
          "1. PROTOCOLO DE INTERVENCIÓN EN CASO DE INCENDIO (EmS Fuego)",
          44,
          curY + 6,
        );
        doc.font("Helvetica").fontSize(7).fillColor("#7f1d1d");
        doc.text(
          emergencyCard?.fireInterventionProtocol ||
            "Usar espuma resistente al alcohol, polvo químico seco o CO2. Enfriar envases expuestos desde distancia de seguridad con agua pulverizada.",
          44,
          curY + 20,
          { width: 505, lineGap: 2.5 },
        );

        curY += 70;

        // Protocol 2: Spillage
        doc
          .rect(36, curY, 523, 62)
          .fill("#fffbeb")
          .strokeColor("#fde68a")
          .stroke();
        doc.fillColor("#92400e").font("Helvetica-Bold").fontSize(8);
        doc.text(
          "2. PROTOCOLO EN CASO DE FUGA O DERRAME (EmS Derrame)",
          44,
          curY + 6,
        );
        doc.font("Helvetica").fontSize(7).fillColor("#78350f");
        doc.text(
          emergencyCard?.spillageContainmentProtocol ||
            "Eliminar todas las fuentes de ignición. Confinar el derrame con barreras absorbentes inertes. Evitar vertido a desagües o al medio marino.",
          44,
          curY + 20,
          { width: 505, lineGap: 2.5 },
        );

        curY += 70;

        // Protocol 3: First Aid & PPE
        doc
          .rect(36, curY, 523, 62)
          .fill("#f0fdf4")
          .strokeColor("#bbf7d0")
          .stroke();
        doc.fillColor("#166534").font("Helvetica-Bold").fontSize(8);
        doc.text(
          "3. PRIMEROS AUXILIOS Y EQUIPOS DE PROTECCIÓN INDIVIDUAL (EPI)",
          44,
          curY + 6,
        );
        doc.font("Helvetica").fontSize(7).fillColor("#14532d");
        doc.text(
          `EPIs Requeridos: ${emergencyCard?.requiredPpeEquipment || "Gafas estancas, guantes de nitrilo, máscara autónoma SCBA."}`,
          44,
          curY + 20,
        );
        doc.text(
          `Primeros Auxilios: ${emergencyCard?.firstAidProtocol || "Retirar a la víctima al aire fresco. En caso de contacto con la piel/ojos, lavar con agua abundante durante 15 min."}`,
          44,
          curY + 34,
          { width: 505, lineGap: 2 },
        );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * 4. Generates an Official Container/Vehicle Packing Certificate PDF (IMDG 5.4.2 / ADR 5.4.2).
   */
  public static async generateContainerPackingCertificatePdf(
    packingCert: any,
    shipment: any,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 36, size: "A4" });
        const buffers: Buffer[] = [];
        doc.on("data", (chunk: Buffer) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        // Header
        doc.rect(36, 36, 523, 50).fill("#0f172a");
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(12);
        doc.text("CONTAINER / VEHICLE PACKING CERTIFICATE", 44, 46);
        doc.font("Helvetica").fontSize(8).fillColor("#94a3b8");
        doc.text(
          "CERTIFICADO OFICIAL DE EMBALAJE Y ESTIBA — IMO IMDG 5.4.2 / ADR 5.4.2",
          44,
          63,
        );
        doc.text(
          `CERT REF: ${packingCert?.certificateReference || "CPC-2026-001"}`,
          340,
          46,
          {
            align: "right",
            width: 210,
          },
        );

        let curY = 94;

        // Container & Facility Particulars
        doc
          .rect(36, curY, 523, 60)
          .fill("#f8fafc")
          .strokeColor("#cbd5e1")
          .stroke();
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(8);
        doc.text(
          "DATOS DE LA UNIDAD DE TRANSPORTE Y TERMINAL DE LLENADO",
          44,
          curY + 6,
        );
        doc.font("Helvetica").fontSize(7.5).fillColor("#334155");
        doc.text(
          `Contenedor / Vehículo N°: ${packingCert?.containerOrVehicleNumber || "MSKU-891024-3"}`,
          44,
          curY + 22,
        );
        doc.text(
          `Precinto ISO 17712 (Clase H): ${packingCert?.sealNumberIso17712 || "ES-VAL-H-992104"}`,
          300,
          curY + 22,
        );
        doc.text(
          `Terminal / Instalación: ${packingCert?.packingFacilityName || "Terminal Portuaria"}`,
          44,
          curY + 36,
        );
        doc.text(
          `Expediente DGD: ${shipment?.shipmentReference || "DGD-2026"}`,
          300,
          curY + 36,
        );

        curY += 68;

        // Statutory Checklist Box
        doc
          .rect(36, curY, 523, 110)
          .fill("#ffffff")
          .strokeColor("#e2e8f0")
          .stroke();
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(8);
        doc.text(
          "DECLARACIONES DE CONFORMIDAD NORMATIVA (CHECKLIST IMDG 5.4.2)",
          44,
          curY + 6,
        );

        const checklist = [
          "1. El contenedor/vehículo estaba limpio, seco y aparentemente apto para recibir las mercancías.",
          "2. Los bultos que requerían segregación han sido estibados conforme al Capítulo 7.2 del Código IMDG.",
          "3. Todos los bultos han sido examinados visualmente y no presentan roturas, daños o fugas.",
          "4. El cargamento ha sido adecuadamente distribuido, trincado y asegurado para evitar desplazamientos.",
          "5. El contenedor ha sido debidamente señalizado con placas-etiquetas de riesgo en sus 4 costados.",
        ];

        let checkY = curY + 22;
        doc.font("Helvetica").fontSize(7).fillColor("#1e293b");
        for (const line of checklist) {
          doc.text(`[X] ${line}`, 44, checkY);
          checkY += 16;
        }

        curY += 120;

        // Declarant Signatures
        doc.rect(36, curY, 523, 75).strokeColor("#cbd5e1").stroke();
        doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(7.5);
        doc.text("FIRMA DEL RESPONSABLE DE LA CARGA Y ESTIBA", 44, curY + 6);
        doc.font("Helvetica").fontSize(7).fillColor("#334155");
        doc.text(
          `Declarante: ${packingCert?.declarantName || "Javier Navarro"}`,
          44,
          curY + 22,
        );
        doc.text(
          `Empresa / Cargo: ${packingCert?.declarantCompany || "Atlas Logistics"} — ${packingCert?.declarantPosition || "DG Loader"}`,
          44,
          curY + 36,
        );
        doc.text(
          `Fecha de Certificación: ${packingCert?.signDate || new Date().toISOString().substring(0, 10)}`,
          44,
          curY + 50,
        );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
