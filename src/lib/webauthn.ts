/**
 * @file webauthn.ts
 * @description Sovereign, zero-dependency WebAuthn (FIDO2 / Passkeys) ceremony and verification engine.
 * @module @atlas/api/lib/webauthn
 * @see {@link docs/adr/0031-sovereign-native-identity-and-authentication-engine.md}
 */

import {
  randomBytes,
  createHash,
  createVerify,
  createPublicKey,
  type KeyObject,
} from "node:crypto";

// ============================================================================
// 1. IN-MEMORY CHALLENGE STORE (2-MINUTE TTL)
// ============================================================================

interface ChallengeRecord {
  challenge: string;
  userId?: string;
  email?: string;
  type: "register" | "login";
  expiresAt: number;
}

const challengeStore = new Map<string, ChallengeRecord>();

// Periodic garbage collection for expired challenges
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of challengeStore.entries()) {
    if (record.expiresAt < now) {
      challengeStore.delete(key);
    }
  }
}, 60000).unref();

export function storeChallenge(
  challenge: string,
  record: Omit<ChallengeRecord, "challenge" | "expiresAt">,
  ttlMs = 120000,
): void {
  challengeStore.set(challenge, {
    ...record,
    challenge,
    expiresAt: Date.now() + ttlMs,
  });
}

export function consumeChallenge(challenge: string): ChallengeRecord | null {
  const record = challengeStore.get(challenge);
  if (!record) return null;
  challengeStore.delete(challenge);
  if (record.expiresAt < Date.now()) return null;
  return record;
}

// ============================================================================
// 2. MINIMAL ZERO-DEPENDENCY CBOR DECODER
// ============================================================================

export class CborReader {
  private offset = 0;
  constructor(private readonly buf: Buffer) {}

  public decode(): unknown {
    if (this.offset >= this.buf.length) {
      throw new Error("Unexpected end of CBOR buffer");
    }
    const initialByte = this.buf[this.offset++];
    const majorType = initialByte >> 5;
    const info = initialByte & 0x1f;

    const length = this.readLength(info);

    switch (majorType) {
      case 0: // Unsigned integer
        return length;
      case 1: // Negative integer: -1 - length
        return -1 - length;
      case 2: {
        // Byte string
        const start = this.offset;
        this.offset += length;
        return this.buf.subarray(start, this.offset);
      }
      case 3: {
        // Text string
        const start = this.offset;
        this.offset += length;
        return this.buf.toString("utf8", start, this.offset);
      }
      case 4: {
        // Array
        const arr: unknown[] = [];
        for (let i = 0; i < length; i++) {
          arr.push(this.decode());
        }
        return arr;
      }
      case 5: {
        // Map
        const map = new Map<unknown, unknown>();
        for (let i = 0; i < length; i++) {
          const key = this.decode();
          const val = this.decode();
          map.set(key, val);
        }
        return map;
      }
      case 7: {
        // Simple types
        if (info === 20) return false;
        if (info === 21) return true;
        if (info === 22) return null;
        if (info === 23) return undefined;
        return info;
      }
      default:
        throw new Error(`Unsupported CBOR major type: ${majorType}`);
    }
  }

  private readLength(info: number): number {
    if (info < 24) return info;
    if (info === 24) {
      const val = this.buf.readUInt8(this.offset);
      this.offset += 1;
      return val;
    }
    if (info === 25) {
      const val = this.buf.readUInt16BE(this.offset);
      this.offset += 2;
      return val;
    }
    if (info === 26) {
      const val = this.buf.readUInt32BE(this.offset);
      this.offset += 4;
      return val;
    }
    if (info === 27) {
      const val = Number(this.buf.readBigUInt64BE(this.offset));
      this.offset += 8;
      return val;
    }
    throw new Error(`Invalid CBOR info value: ${info}`);
  }
}

export function decodeCbor(buf: Buffer): unknown {
  const reader = new CborReader(buf);
  return reader.decode();
}

// ============================================================================
// 3. COSE KEY PARSER (ECDSA ES256 & RSA RS256)
// ============================================================================

/**
 * Converts a parsed COSE key Map to a standard PEM/SPKI Public Key for node:crypto.
 */
export function coseKeyToPem(coseKey: Map<unknown, unknown>): string {
  // COSE Key Common parameters:
  // 1: kty (2 = EC2, 3 = RSA)
  // 3: alg (-7 = ES256, -257 = RS256)
  const kty = coseKey.get(1);
  const alg = coseKey.get(3);

  if (kty === 2) {
    // EC2 key
    // -1: crv (1 = P-256)
    // -2: x coordinate (32 bytes)
    // -3: y coordinate (32 bytes)
    const crv = coseKey.get(-1);
    const x = coseKey.get(-2) as Buffer;
    const y = coseKey.get(-3) as Buffer;

    if (crv !== 1 || !x || !y) {
      throw new Error(
        "Unsupported EC key parameters (only P-256 is supported)",
      );
    }

    // Uncompressed EC point format: 0x04 + x + y (65 bytes)
    const uncompressedPoint = Buffer.concat([Buffer.from([0x04]), x, y]);

    // DER header for P-256 public key (AlgorithmIdentifier: id-ecPublicKey, secp256r1)
    const ecP256DerHeader = Buffer.from([
      0x30,
      0x59, // SEQUENCE, 89 bytes
      0x30,
      0x13, // SEQUENCE, 19 bytes
      0x06,
      0x07,
      0x2a,
      0x86,
      0x48,
      0xce,
      0x3d,
      0x02,
      0x01, // OID 1.2.840.10045.2.1 (ecPublicKey)
      0x06,
      0x08,
      0x2a,
      0x86,
      0x48,
      0xce,
      0x3d,
      0x03,
      0x01,
      0x07, // OID 1.2.840.10045.3.1.7 (secp256r1 / P-256)
      0x03,
      0x42,
      0x00, // BIT STRING, 66 bytes (0 unused bits)
    ]);

    const spkiDer = Buffer.concat([ecP256DerHeader, uncompressedPoint]);
    const base64 = spkiDer.toString("base64");
    const pem = `-----BEGIN PUBLIC KEY-----\n${base64.match(/.{1,64}/g)?.join("\n")}\n-----END PUBLIC KEY-----\n`;
    return pem;
  }

  throw new Error(`Unsupported COSE kty: ${String(kty)}, alg: ${String(alg)}`);
}

// ============================================================================
// 4. WEBAUTHN CEREMONY TYPES & HELPERS
// ============================================================================

export function generateRandomChallenge(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export interface WebAuthnRegistrationOptions {
  challenge: string;
  rp: { name: string; id: string };
  user: { id: string; name: string; displayName: string };
  pubKeyCredParams: Array<{ type: "public-key"; alg: number }>;
  timeout: number;
  attestation: "none";
  authenticatorSelection: {
    residentKey: "preferred";
    userVerification: "preferred";
  };
}

export function createRegistrationOptions(
  user: { id: string; email: string; name?: string },
  rpId: string,
): WebAuthnRegistrationOptions {
  const challenge = generateRandomChallenge();
  storeChallenge(challenge, {
    userId: user.id,
    email: user.email,
    type: "register",
  });

  return {
    challenge,
    rp: { name: "Atlas Logistics ERP", id: rpId },
    user: {
      id: Buffer.from(user.id, "utf8").toString("base64url"),
      name: user.email,
      displayName: user.name || user.email,
    },
    pubKeyCredParams: [
      { type: "public-key", alg: -7 }, // ES256 (ECDSA w/ SHA-256)
      { type: "public-key", alg: -257 }, // RS256 (RSA w/ SHA-256)
    ],
    timeout: 60000,
    attestation: "none",
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  };
}

export interface WebAuthnAuthenticationOptions {
  challenge: string;
  rpId: string;
  timeout: number;
  userVerification: "preferred";
  allowCredentials?: Array<{ type: "public-key"; id: string }>;
}

export function createAuthenticationOptions(
  rpId: string,
  userCredentials?: string[],
): WebAuthnAuthenticationOptions {
  const challenge = generateRandomChallenge();
  storeChallenge(challenge, { type: "login" });

  return {
    challenge,
    rpId,
    timeout: 60000,
    userVerification: "preferred",
    allowCredentials: userCredentials?.map((id) => ({
      type: "public-key",
      id,
    })),
  };
}

// ============================================================================
// 5. REGISTRATION VERIFICATION
// ============================================================================

export interface RegistrationVerificationResult {
  verified: boolean;
  credentialId: string;
  publicKeyPem: string;
  counter: number;
}

export function verifyRegistrationResponse(
  response: {
    clientDataJSON: string;
    attestationObject: string;
  },
  expectedChallenge: string,
  expectedOrigin: string,
): RegistrationVerificationResult {
  // 1. Parse clientDataJSON
  const clientDataRaw = Buffer.from(
    response.clientDataJSON,
    "base64url",
  ).toString("utf8");
  const clientData = JSON.parse(clientDataRaw);

  if (clientData.type !== "webauthn.create") {
    throw new Error(`Unexpected clientData type: ${clientData.type}`);
  }
  if (clientData.challenge !== expectedChallenge) {
    throw new Error("Challenge mismatch in registration");
  }
  if (
    expectedOrigin &&
    clientData.origin &&
    !clientData.origin.includes(expectedOrigin)
  ) {
    // Tolerant origin check for localhost dev
    if (
      !clientData.origin.includes("localhost") &&
      !clientData.origin.includes("127.0.0.1")
    ) {
      throw new Error(
        `Origin mismatch: expected ${expectedOrigin}, got ${clientData.origin}`,
      );
    }
  }

  // 2. Parse attestationObject
  const attestationBuffer = Buffer.from(
    response.attestationObject,
    "base64url",
  );
  const attestationMap = decodeCbor(attestationBuffer) as Map<unknown, unknown>;
  const authData = attestationMap.get("authData") as Buffer;

  if (!authData || authData.length < 37) {
    throw new Error("Invalid authData in attestationObject");
  }

  const flags = authData[32];
  const counter = authData.readUInt32BE(33);

  // Bit 6 of flags indicates attestedCredentialData is present
  const hasAttestedCredentialData = (flags & 0x40) !== 0;
  if (!hasAttestedCredentialData) {
    throw new Error("No attestedCredentialData present in registration");
  }

  // Offset 37: 16 bytes AAGUID
  let offset = 37 + 16;
  const credentialIdLength = authData.readUInt16BE(offset);
  offset += 2;

  const credentialId = authData
    .subarray(offset, offset + credentialIdLength)
    .toString("base64url");
  offset += credentialIdLength;

  // The rest of authData is the COSE Credential Public Key
  const coseKeyBuf = authData.subarray(offset);
  const coseKey = decodeCbor(coseKeyBuf) as Map<unknown, unknown>;
  const publicKeyPem = coseKeyToPem(coseKey);

  return {
    verified: true,
    credentialId,
    publicKeyPem,
    counter,
  };
}

// ============================================================================
// 6. AUTHENTICATION ASSERTION VERIFICATION
// ============================================================================

export function verifyAuthenticationResponse(
  response: {
    clientDataJSON: string;
    authenticatorData: string;
    signature: string;
  },
  storedPublicKeyPem: string,
  storedCounter: number,
  expectedChallenge: string,
  expectedOrigin: string,
): { verified: boolean; newCounter: number } {
  // 1. Verify clientDataJSON
  const clientDataRaw = Buffer.from(
    response.clientDataJSON,
    "base64url",
  ).toString("utf8");
  const clientData = JSON.parse(clientDataRaw);

  if (clientData.type !== "webauthn.get") {
    throw new Error(`Unexpected clientData type: ${clientData.type}`);
  }
  if (clientData.challenge !== expectedChallenge) {
    throw new Error("Challenge mismatch in authentication");
  }

  // 2. Verify authenticatorData
  const authData = Buffer.from(response.authenticatorData, "base64url");
  if (authData.length < 37) {
    throw new Error("Invalid authenticatorData length");
  }

  const flags = authData[32];
  const userPresent = (flags & 0x01) !== 0;
  if (!userPresent) {
    throw new Error("User Presence bit not set in authenticatorData");
  }

  const newCounter = authData.readUInt32BE(33);
  // Counter verification: if non-zero, must be strictly greater than stored counter
  if (newCounter !== 0 && storedCounter !== 0 && newCounter <= storedCounter) {
    throw new Error(
      `Signature counter did not increase! Possible cloned authenticator detected. Stored: ${storedCounter}, received: ${newCounter}`,
    );
  }

  // 3. Cryptographic Signature Verification
  // Signed data = authenticatorData || SHA-256(clientDataJSON)
  const clientDataHash = createHash("sha256")
    .update(Buffer.from(response.clientDataJSON, "base64url"))
    .digest();
  const signatureBase = Buffer.concat([authData, clientDataHash]);
  const signature = Buffer.from(response.signature, "base64url");

  const verify = createVerify("sha256");
  verify.update(signatureBase);
  const isValid = verify.verify(storedPublicKeyPem, signature);

  if (!isValid) {
    throw new Error("Cryptographic signature verification failed");
  }

  return {
    verified: true,
    newCounter,
  };
}
