import { db } from "../index.js";
import * as schema from "../schema/index.js";

export async function seedEFirma(): Promise<void> {
  console.log(
    "🔏 [EFIRMA] Sembrando sellos y registros de auditoria e.firma...",
  );

  const stampDua = {
    id: "aud_sat_dua_01",
    shipmentId: "sh_demo_01",
    documentId: "doc_dua_0412",
    cartaPorteId: null,
    documentType: "PEDIMENTO_ADUANAL" as const,
    certificateSerial: "30001000000508192011",
    rfcTitular: "AAN940112XX1",
    razonSocial: "Atlas Global Forwarding S.A. de C.V.",
    cadenaOriginal:
      "||26|24|3019|1002931|AAN940112XX1|145000.00|USD|2026-11-05T08:00:00Z||",
    cadenaOriginalSha256:
      "8f7a6c5b4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a",
    selloDigitalBase64: "c2VsbG9fZGlnaXRhbF9tb2NrX3Nhbl9yZXF1aXJlZF8wMDE=",
    rfc3161TimestampToken: "TSA-RFC3161-1793865600000-08192011",
    tamperSealHash:
      "a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0",
    status: "VALIDATED_AND_SEALED" as const,
    verifiedAt: new Date().toISOString(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const stampCp = {
    id: "aud_sat_cp_01",
    shipmentId: "sh_demo_01",
    documentId: "doc_cp_sh_demo_01",
    cartaPorteId: "cp_sh_demo_01",
    documentType: "CARTA_PORTE" as const,
    certificateSerial: "30001000000508192011",
    rfcTitular: "TLM010101XYZ",
    razonSocial: "Transportes Logísticos Mexicanos S.A.",
    cadenaOriginal:
      "||4.0|CP31|CCC49E2D-39F2-4161-B9D6-70A5E2E20261|TLM010101XYZ|145000.00||",
    cadenaOriginalSha256:
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    selloDigitalBase64: "c2VsbG9fY2FydGFfcG9ydGVfZGlnaXRhbF92YWxpZGF0ZWRfMDAy=",
    rfc3161TimestampToken: "TSA-RFC3161-1793865610000-08192012",
    tamperSealHash:
      "b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef01",
    status: "VALIDATED_AND_SEALED" as const,
    verifiedAt: new Date().toISOString(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await db
    .insert(schema.efirmaAuditStamps)
    .values(stampDua)
    .onConflictDoUpdate({
      target: schema.efirmaAuditStamps.id,
      set: stampDua,
    });

  await db.insert(schema.efirmaAuditStamps).values(stampCp).onConflictDoUpdate({
    target: schema.efirmaAuditStamps.id,
    set: stampCp,
  });

  console.log("✅ [EFIRMA] Sellos de auditoria e.firma sembrados con éxito.");
}
