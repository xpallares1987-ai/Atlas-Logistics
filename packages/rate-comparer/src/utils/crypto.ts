// @ts-nocheck
// Helper para convertir Base64 a Uint8Array
function base64ToUint8Array(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

// @ts-nocheck
/**
 * Función para desencriptar los datos usando Web Crypto API.
 * @param password La contraseña introducida por el usuario.
 * @param payload El objeto encriptado con salt, iv y data.
 */
export async function decryptData(
  password: string,
  payload: { salt: string; iv: string; data: string },
) {
  const enc = new TextEncoder();

  const salt = base64ToUint8Array(payload.salt);
  const iv = base64ToUint8Array(payload.iv);
  const cipher = base64ToUint8Array(payload.data);

  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  const aesKey = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt, iterations: 150000, hash: "SHA-256" } as any,
    baseKey,
    { name: "AES-GCM", length: 256 } as any,
    false,
    ["decrypt"],
  );

  const plainBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv } as any,
    aesKey,
    cipher as any,
  );

  return JSON.parse(new TextDecoder().decode(plainBuf));
}

// Extensión del objeto global para TypeScript
declare global {
  interface Window {
    DATA_ENCRYPTED?: { salt: string; iv: string; data: string };
    DECRYPTED_DATA?: unknown;
  }
}

