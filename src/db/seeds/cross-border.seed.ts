import { db } from "../index.js";
import * as schema from "../schema/index.js";

export async function seedCrossBorder(): Promise<void> {
  console.log("🚛 [CROSS-BORDER] Sembrando declaraciones Carta Porte 3.1...");

  const cpRecord = {
    id: "cp_sh_demo_01",
    shipmentId: "sh_demo_01",
    idCcp: "CCC49E2D-39F2-4161-B9D6-70A5E2E20261",
    transporteTipo: "AUTOTRANSPORTE_FEDERAL",
    rfcEmisor: "TLM010101XYZ",
    rfcReceptor: "AME981012ABC",
    origenJson: JSON.stringify({
      nombre: "Planta Laredo Logistics Hub",
      direccion: "Av. de las Industrias 400",
      codigoPostal: "88275",
      ciudad: "Nuevo Laredo",
      estado: "TAMPS",
      fechaHora: "2026-11-05T08:00:00Z",
    }),
    destinoJson: JSON.stringify({
      nombre: "San Antonio Distribution Center",
      direccion: "1200 Logistics Pkwy",
      codigoPostal: "78219",
      ciudad: "San Antonio",
      estado: "TX",
      fechaHora: "2026-11-05T18:00:00Z",
    }),
    vehiculoJson: JSON.stringify({
      configVehicular: "T3S2",
      placa: "99-AA-1B",
      anioModelo: 2024,
      permisoSct: "TPAF01",
      numPermisoSct: "SCT-FED-481920",
      aseguradoraRespCivil: "Seguros Atlas S.A.",
      polizaRespCivil: "POL-RC-2026-99",
    }),
    operadorJson: JSON.stringify({
      rfc: "GARM800512HA1",
      nombre: "Manuel Garcia Ruiz",
      numLicencia: "LIC-FED-TAMPS-0091",
    }),
    mercanciasJson: JSON.stringify([
      {
        claveProdServ: "25174801",
        descripcion: "Arneses Automotrices para Sistemas de Transmision",
        cantidad: 520,
        claveUnidad: "H87",
        pesoKg: 28450,
        fraccionArancelaria: "8708.29.99",
        materialPeligroso: false,
        valorDeclaradoUsd: 145000,
      },
    ]),
    xmlTimbrado:
      '<?xml version="1.0" encoding="UTF-8"?><cfdi:Comprobante Version="4.0" Sello="sello_sat_demo_cp31_signed"><cfdi:Complemento><cartaporte31:CartaPorte Version="3.1" IdCCP="CCC49E2D-39F2-4161-B9D6-70A5E2E20261"/></cfdi:Complemento></cfdi:Comprobante>',
    qrCodeData:
      "https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id=CCC49E2D-39F2-4161-B9D6-70A5E2E20261&re=TLM010101XYZ&rr=AME981012ABC&tt=145000.00&fe=sello_base64",
    rvcPercentage: 78.5,
    immexPedimentoTipo: "AF",
    customsDwellHoursPredicted: 4.2,
    status: "STAMPED" as const,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await db
    .insert(schema.cartaPorteDeclarations)
    .values(cpRecord)
    .onConflictDoUpdate({
      target: schema.cartaPorteDeclarations.id,
      set: cpRecord,
    });

  // Mirror document entry into documents table
  const mirrorDoc = {
    id: "doc_cp_sh_demo_01",
    shipmentId: "sh_demo_01",
    name: "Carta de Porte CFDI 4.0 (CP-3.1-00921)",
    type: "CARTA_PORTE",
    documentReference: "CP-3.1-00921",
    sha256Hash:
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    status: "SIGNED",
    signedBy: "Manuel Garcia Ruiz",
    signerTitle: "Operador Certificado SCT",
    signerCertificate: "CERT-SAT-AUTOTRANSPORTE-2026",
    signedAt: new Date(),
    payloadData: {
      idCcp: "CCC49E2D-39F2-4161-B9D6-70A5E2E20261",
      carrierRfc: "TLM010101XYZ",
      driver: "Manuel Garcia Ruiz",
    },
    fileSize: 45200,
    url: "/api/documents/doc_cp_sh_demo_01/pdf",
  };

  await db.insert(schema.documents).values(mirrorDoc).onConflictDoUpdate({
    target: schema.documents.id,
    set: mirrorDoc,
  });

  console.log("✅ [CROSS-BORDER] Carta Porte 3.1 sembrada con éxito.");
}
