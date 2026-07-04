// scripts/Encrypt-Data.cjs
// Node.js script to encrypt rate data using Web Crypto compatible AES-256-GCM + PBKDF2

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Target encrypted output path
const OUTPUT_JS = path.resolve(__dirname, '..', 'assets', 'datos_encrypted.js');

// Password comes from environment variable ENCRYPTED_DATA
const password = process.env.ENCRYPTED_DATA;
if (!password) {
  console.error('❌ ENCRYPTED_DATA environment variable not set');
  process.exit(1);
}

// 1. Locate and read the unencrypted source data
let rawContent = '';
let dataSourcePath = '';

const jsonSource = path.resolve(__dirname, '..', 'assets', 'Tablas_Comparativas_Datos.json');
const tsSource = path.resolve(__dirname, '..', 'src', 'data', 'datos.ts');
const fallbackSource = path.resolve(__dirname, '..', 'datos.js');

if (fs.existsSync(jsonSource)) {
  dataSourcePath = jsonSource;
  rawContent = fs.readFileSync(jsonSource, 'utf8');
} else if (fs.existsSync(tsSource)) {
  dataSourcePath = tsSource;
  rawContent = fs.readFileSync(tsSource, 'utf8');
} else if (fs.existsSync(fallbackSource)) {
  dataSourcePath = fallbackSource;
  rawContent = fs.readFileSync(fallbackSource, 'utf8');
} else {
  console.error('❌ Could not locate unencrypted data source (checked json, ts, fallback)');
  process.exit(1);
}

console.log('🔍 Using data source:', dataSourcePath);

// 2. Clean and parse the input data to ensure a valid JSON array
let rateArray = null;

try {
  // If JSON, clean invalid NaN properties
  if (dataSourcePath.endsWith('.json')) {
    const cleaned = rawContent.replace(/:\s*NaN/g, ': null');
    rateArray = JSON.parse(cleaned);
  } else {
    // If JS/TS file, extract array between first '[' and last ']'
    const startIdx = rawContent.indexOf('[');
    const endIdx = rawContent.lastIndexOf(']');
    if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
      throw new Error('Could not find array delimiters [ ] in JS/TS source');
    }
    const arrayStr = rawContent.substring(startIdx, endIdx + 1);
    // Replace NaN in JS representation if any
    const cleaned = arrayStr.replace(/:\s*NaN/g, ': null');
    try {
      rateArray = JSON.parse(cleaned);
    } catch {
      rateArray = new Function(`return ${cleaned}`)();
    }
  }

  if (!Array.isArray(rateArray)) {
    throw new Error('Data is not a JSON Array');
  }

  console.log(`✅ Loaded ${rateArray.length} records from source.`);
} catch (err) {
  console.error('❌ Failed to parse source data:', err);
  process.exit(1);
}

// 3. Minify the parsed JSON object
const minifiedData = JSON.stringify(rateArray);

// 4. Encrypt using AES-256-GCM + PBKDF2 key derivation
try {
  // Generate a random 16-byte salt
  const salt = crypto.randomBytes(16);

  // Derive a 256-bit AES key (32 bytes) using PBKDF2 (150,000 iterations, SHA-256)
  const key = crypto.pbkdf2Sync(password, salt, 150000, 32, 'sha256');

  // Generate a random 12-byte IV for AES-GCM
  const iv = crypto.randomBytes(12);

  // Encrypt the minified JSON string
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(minifiedData, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag(); // 16-byte authentication tag

  // Web Crypto API AES-GCM expects the auth tag appended to the ciphertext
  const finalCiphertext = Buffer.concat([encrypted, authTag]);

  // Construct the Web Crypto GCM-compatible payload
  const payload = {
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    data: finalCiphertext.toString('base64')
  };

  // Format the output file as a browser-loadable script setting window.DATA_ENCRYPTED
  const outputScript = `window.DATA_ENCRYPTED = ${JSON.stringify(payload)};\n`;

  // Write the file
  fs.mkdirSync(path.dirname(OUTPUT_JS), { recursive: true });
  fs.writeFileSync(OUTPUT_JS, outputScript, 'utf8');

  console.log('🎉 Encrypted file written successfully to', OUTPUT_JS);
  console.log(`   Final file size: ${(outputScript.length / 1024).toFixed(2)} KB`);
} catch (err) {
  console.error('❌ Error during encryption:', err);
  process.exit(1);
}
