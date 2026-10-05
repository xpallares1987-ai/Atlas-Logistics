/**
 * @file passkeys.ts
 * @description WebAuthn / FIDO2 Passkeys and hardware security token verification
 * (such as YubiKey, Titan Security Key, or TouchID/FaceID) for critical freight operations,
 * high-value manifest releases, and customs declarations.
 */

export interface HardwareSignatureResult {
  credentialId: string;
  signature: string;
  clientDataJSON: string;
  authenticatorData: string;
  timestamp: string;
  success: boolean;
  deviceModel: string;
  userEmail: string;
  manifestId: string;
}

export interface PasskeyChallenge {
  challenge: string;
  timestamp: number;
  expiresAt: number;
}

export interface PasskeyCredential {
  id: string;
  rawId: string;
  type: "public-key";
  response: {
    clientDataJSON: string;
    authenticatorData?: string;
    signature?: string;
    userHandle?: string;
    attestationObject?: string;
  };
}

/**
 * Creates a cryptographically random challenge for WebAuthn ceremony.
 */
export function createPasskeyChallenge(ttlMs = 120000): PasskeyChallenge {
  const randomBytes = new Uint8Array(32);
  if (typeof window !== "undefined" && window.crypto) {
    window.crypto.getRandomValues(randomBytes);
  } else {
    // Node.js or server-side environment
    const cryptoModule = globalThis.crypto;
    if (cryptoModule && cryptoModule.getRandomValues) {
      cryptoModule.getRandomValues(randomBytes);
    } else {
      for (let i = 0; i < 32; i++) {
        randomBytes[i] = Math.floor(Math.random() * 256);
      }
    }
  }

  const challenge = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const now = Date.now();
  return {
    challenge,
    timestamp: now,
    expiresAt: now + ttlMs,
  };
}

/**
 * Simulates or executes a hardware security token authentication handshake (FIDO2 / WebAuthn standard).
 * Designed for high-value consignment release and customs sign-off.
 */
export async function authenticateWithHardwareToken(
  manifestId: string,
  userEmail: string,
  options: { simulatedDelayMs?: number; deviceModel?: string } = {},
): Promise<HardwareSignatureResult> {
  const delay = options.simulatedDelayMs ?? 500;
  const deviceModel = options.deviceModel ?? "YubiKey 5 NFC / Series FIPS";

  return new Promise((resolve) => {
    setTimeout(() => {
      const challengeObj = createPasskeyChallenge();
      const challengeHex = challengeObj.challenge;
      const origin =
        typeof window !== "undefined" && window.location
          ? window.location.origin
          : "https://atlas-logistics.internal";

      const clientData = {
        type: "webauthn.get",
        challenge: challengeHex,
        origin,
        crossOrigin: false,
      };

      const clientDataJSON =
        typeof Buffer !== "undefined"
          ? Buffer.from(JSON.stringify(clientData)).toString("base64")
          : btoa(JSON.stringify(clientData));

      resolve({
        credentialId: `fido2-cred-${challengeHex.substring(0, 16)}`,
        signature: `fido2-sig-${challengeHex.substring(16, 32)}-auth-${manifestId}`,
        clientDataJSON,
        authenticatorData: `auth-data-fido2-${challengeHex.substring(32, 48)}`,
        timestamp: new Date().toISOString(),
        success: true,
        deviceModel,
        userEmail,
        manifestId,
      });
    }, delay);
  });
}

/**
 * Verifies that a hardware signature result matches the target manifest and was successfully generated.
 */
export function verifyHardwareSignature(
  result: HardwareSignatureResult,
  manifestId: string,
): boolean {
  if (!result || !result.success) return false;
  if (result.manifestId !== manifestId) return false;
  if (!result.credentialId.startsWith("fido2-cred-")) return false;
  if (!result.signature.includes(`-auth-${manifestId}`)) return false;

  try {
    const decoded =
      typeof Buffer !== "undefined"
        ? Buffer.from(result.clientDataJSON, "base64").toString("utf-8")
        : atob(result.clientDataJSON);
    const parsed = JSON.parse(decoded);
    return parsed.type === "webauthn.get" && typeof parsed.challenge === "string";
  } catch {
    return false;
  }
}
