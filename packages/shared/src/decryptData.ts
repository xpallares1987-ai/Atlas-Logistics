export interface EncryptedData {
  salt: string;
  iv: string;
  data: string;
}

export async function decryptDashboardData<T = any>(password: string, encryptedConfig: EncryptedData): Promise<T> {
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  const saltBuffer = Uint8Array.from(atob(encryptedConfig.salt), c => c.charCodeAt(0));
  const ivBuffer = Uint8Array.from(atob(encryptedConfig.iv), c => c.charCodeAt(0));
  const dataBuffer = Uint8Array.from(atob(encryptedConfig.data), c => c.charCodeAt(0));

  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const aesKey = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: saltBuffer, iterations: 600000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBuffer },
    aesKey,
    dataBuffer
  );

  const decryptedString = dec.decode(decryptedBuffer);
  return JSON.parse(decryptedString) as T;
}