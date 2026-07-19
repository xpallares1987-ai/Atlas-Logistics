import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { encryptData } from "../core/crypto.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface RawRate {
  carrierCode: string;
  originPort: string;
  destinationPort: string;
  currency: string;
  baseRate: string;
}

const run = async () => {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error(
      "Error: Ruta del archivo JSON temporal no proporcionada por PowerShell.",
    );
    process.exit(1);
  }

  const tempJsonPath = args[0];
  const outputDir = join(__dirname, "../../dist/data");
  const outputPath = join(outputDir, "rates-encrypted.js");

  try {
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    const rawData = readFileSync(tempJsonPath, "utf-8");
    const rates: RawRate[] = JSON.parse(rawData);

    console.log(
      `Encriptando ${rates.length} tarifas para análisis logístico...`,
    );

    const encryptedPayload = encryptData(JSON.stringify(rates));

    const jsContent = `export const encryptedRatesPayload = "${encryptedPayload}";\n`;

    writeFileSync(outputPath, jsContent, "utf-8");

    console.log(`Archivo JS seguro generado exitosamente en: ${outputPath}`);
    process.exit(0);
  } catch (error) {
    console.error("Error en la generación segura:", error);
    process.exit(1);
  }
};

run();
