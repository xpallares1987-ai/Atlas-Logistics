// scripts/Verify-Encryption.cjs
// Node.js script to verify that assets/datos_encrypted.js can be successfully decrypted and parsed

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ENCRYPTED_JS_PATH = path.resolve(
  __dirname,
  "..",
  "assets",
  "datos_encrypted.js",
);

// Password comes from environment variable ENCRYPTED_DATA
const password = process.env.ENCRYPTED_DATA;
if (!password) {
  console.error("❌ ENCRYPTED_DATA environment variable not set");
  process.exit(1);
}

try {
  if (!fs.existsSync(ENCRYPTED_JS_PATH)) {
    console.error("❌ Encrypted file not found:", ENCRYPTED_JS_PATH);
    process.exit(1);
  }

  // 1. Read and parse the window.DATA_ENCRYPTED object from the script file
  const fileContent = fs.readFileSync(ENCRYPTED_JS_PATH, "utf8");

  // Extract JSON payload
  const match = fileContent.match(/window\.DATA_ENCRYPTED\s*=\s*({[\s\S]*?});/);
  if (!match) {
    console.error(
      "❌ Could not parse window.DATA_ENCRYPTED from",
      ENCRYPTED_JS_PATH,
    );
    process.exit(1);
  }

  const payload = JSON.parse(match[1]);
  if (!payload.salt || !payload.iv || !payload.data) {
    console.error(
      "❌ Encrypted payload is missing required fields (salt, iv, or data)",
    );
    process.exit(1);
  }

  // 2. Decode base64 components
  const salt = Buffer.from(payload.salt, "base64");
  const iv = Buffer.from(payload.iv, "base64");
  const rawData = Buffer.from(payload.data, "base64");

  // 3. Derive key via PBKDF2 (matching frontend parameters)
  const key = crypto.pbkdf2Sync(password, salt, 150000, 32, "sha256");

  // 4. Split rawData into ciphertext and GCM authentication tag (last 16 bytes)
  if (rawData.length < 16) {
    console.error(
      "❌ Encrypted data is too short to contain authentication tag",
    );
    process.exit(1);
  }
  const encryptedText = rawData.subarray(0, rawData.length - 16);
  const authTag = rawData.subarray(rawData.length - 16);

  // 5. Decrypt using AES-256-GCM
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encryptedText),
    decipher.final(),
  ]).toString("utf8");

  // 6. Validate parsed result
  const rateArray = JSON.parse(decrypted);

  if (!Array.isArray(rateArray)) {
    throw new Error("Decrypted content is not a JSON Array");
  }

  console.log("✅ Decryption Verification Passed!");
  console.log(`   Successfully decrypted ${rateArray.length} rate records.`);
  process.exit(0);
} catch (err) {
  console.error("❌ Verification Failed:", err.message || err);
  process.exit(1);
}
