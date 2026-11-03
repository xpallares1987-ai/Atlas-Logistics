import { describe, it, expect } from "vitest";
import {
  encryptToken,
  decryptToken,
  encryptPayloadEnvelope,
  decryptPayloadEnvelope,
  isEncryptedEnvelope,
} from "./crypto";

describe("crypto utilities", () => {
  it("should encrypt and decrypt a token correctly", async () => {
    const token = "my-secret-token";
    const pin = "1234";
    const encrypted = await encryptToken(token, pin);
    const decrypted = await decryptToken(encrypted, pin);
    expect(decrypted).toBe(token);
  });

  it("should throw an error for an incorrect PIN", async () => {
    const token = "my-secret-token";
    const pin = "1234";
    const encrypted = await encryptToken(token, pin);
    await expect(decryptToken(encrypted, "0000")).rejects.toThrow(
      "Invalid PIN or corrupted data",
    );
  });

  it("should throw an error for corrupted data", async () => {
    const token = "my-secret-token";
    const pin = "1234";
    const encrypted = await encryptToken(token, pin);
    const corrupted = encrypted.slice(0, 10) + "invalid" + encrypted.slice(10);
    await expect(decryptToken(corrupted, pin)).rejects.toThrow(
      "Invalid PIN or corrupted data",
    );
  });

  it("should encrypt and decrypt an end-to-end transaction payload envelope", async () => {
    const sensitivePayload = {
      shipmentId: "shp-9921",
      carrier: "Maersk",
      freightCost: 4520.5,
      parties: {
        shipper: "Global Freight Solutions",
        consignee: "European Distribution Center",
      },
    };

    const envelope = await encryptPayloadEnvelope(sensitivePayload);
    expect(isEncryptedEnvelope(envelope)).toBe(true);
    expect(envelope._encrypted).toBe(true);
    expect(envelope.alg).toBe("AES-GCM-256");
    expect(typeof envelope.ciphertext).toBe("string");
    expect(typeof envelope.iv).toBe("string");
    expect(typeof envelope.salt).toBe("string");

    const decrypted =
      await decryptPayloadEnvelope<typeof sensitivePayload>(envelope);
    expect(decrypted).toEqual(sensitivePayload);
  });

  it("should reject decryption when ciphertext is tampered", async () => {
    const payload = { sensitive: "data" };
    const envelope = await encryptPayloadEnvelope(payload);
    envelope.ciphertext = envelope.ciphertext.slice(0, -4) + "AAAA";

    await expect(decryptPayloadEnvelope(envelope)).rejects.toThrow();
  });
});
