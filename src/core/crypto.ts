import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { env } from "./config.js";

const ALGORITHM = "aes-256-gcm";
const ENCRYPTION_KEY = Buffer.from(env.ENCRYPTION_KEY, "utf-8");

export const encryptData = (text: string): string => {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
};

export const decryptData = (encryptedData: string): string => {
  const parts = encryptedData.split(":");
  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encryptedText = parts[2];

  const decipher = createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
};
