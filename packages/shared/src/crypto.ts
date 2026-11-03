/**
 * Derives an AES-GCM key from a user PIN and random salt using PBKDF2.
 */
async function getEncryptionKey(pin: string, salt: Uint8Array) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(pin),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );
  const algorithm: Pbkdf2Params = {
    name: "PBKDF2",
    salt: salt as unknown as ArrayBuffer,
    iterations: 100000,
    hash: "SHA-256",
  };

  return crypto.subtle.deriveKey(
    algorithm,
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Encodes raw bytes as a base64 string for transport/storage.
 */
function uint8ArrayToBase64(arr: Uint8Array): string {
  let binary = "";
  const len = arr.byteLength;
  const chunkSize = 0xffff;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = arr.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

/**
 * Decodes a base64 payload back into raw bytes.
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function encryptToken(
  token: string,
  pin: string,
): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await getEncryptionKey(pin, salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedToken = new TextEncoder().encode(token);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encodedToken,
  );

  const combined = new Uint8Array(
    salt.length + iv.length + ciphertext.byteLength,
  );
  combined.set(salt);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

  return uint8ArrayToBase64(combined);
}

export async function decryptToken(
  encrypted: string,
  pin: string,
): Promise<string> {
  try {
    const combined = base64ToUint8Array(encrypted);
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const ciphertext = combined.slice(28);
    const key = await getEncryptionKey(pin, salt);

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext,
    );

    return new TextDecoder().decode(decrypted);
  } catch {
    throw new Error("Invalid PIN or corrupted data");
  }
}

/**
 * Generic AES-GCM encryption for JSON-serializable data.
 */
export async function encryptData(data: any, pin: string): Promise<string> {
  const jsonStr = JSON.stringify(data);
  return await encryptToken(jsonStr, pin);
}

/**
 * Generic AES-GCM decryption for JSON-serializable data.
 */
export async function decryptData<T>(
  encrypted: string,
  pin: string,
): Promise<T> {
  const jsonStr = await decryptToken(encrypted, pin);
  return JSON.parse(jsonStr) as T;
}

export const DEFAULT_TRANSPORT_SECRET =
  "AtlasLogistics#E2EE#EnterpriseTransport2026";

export interface EncryptedPayloadEnvelope {
  _encrypted: true;
  alg: "AES-GCM-256";
  iv: string;
  salt: string;
  ciphertext: string;
  timestamp: number;
}

export function isEncryptedEnvelope(
  obj: unknown,
): obj is EncryptedPayloadEnvelope {
  return (
    typeof obj === "object" &&
    obj !== null &&
    (obj as any)._encrypted === true &&
    typeof (obj as any).ciphertext === "string" &&
    typeof (obj as any).iv === "string" &&
    typeof (obj as any).salt === "string"
  );
}

/**
 * Derives an AES-GCM 256 key from a transport secret and salt using PBKDF2 (10,000 rounds).
 */
async function getTransportKey(secret: string, salt: Uint8Array) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as unknown as ArrayBuffer,
      iterations: 10000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Automatically encrypts any arbitrary transaction payload into a tamper-proof AES-256-GCM envelope.
 */
export async function encryptPayloadEnvelope(
  data: unknown,
  secret: string = DEFAULT_TRANSPORT_SECRET,
): Promise<EncryptedPayloadEnvelope> {
  const jsonStr = JSON.stringify(data);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await getTransportKey(secret, salt);
  const encoded = new TextEncoder().encode(jsonStr);

  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded,
  );

  return {
    _encrypted: true,
    alg: "AES-GCM-256",
    salt: uint8ArrayToBase64(salt),
    iv: uint8ArrayToBase64(iv),
    ciphertext: uint8ArrayToBase64(new Uint8Array(ciphertextBuffer)),
    timestamp: Date.now(),
  };
}

/**
 * Automatically decrypts an incoming AES-256-GCM envelope back into its typed object.
 */
export async function decryptPayloadEnvelope<T = any>(
  envelope: EncryptedPayloadEnvelope,
  secret: string = DEFAULT_TRANSPORT_SECRET,
): Promise<T> {
  const salt = base64ToUint8Array(envelope.salt);
  const iv = base64ToUint8Array(envelope.iv);
  const ciphertext = base64ToUint8Array(envelope.ciphertext);
  const key = await getTransportKey(secret, salt);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    key,
    ciphertext as unknown as BufferSource,
  );

  const jsonStr = new TextDecoder().decode(decrypted);
  return JSON.parse(jsonStr) as T;
}
