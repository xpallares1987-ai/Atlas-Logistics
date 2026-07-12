"use server";

import * as fs from "fs";
import * as path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

export async function fetchDataFile(fileName: string) {
  const safeFileName = path.basename(fileName);
  const filePaths = [
    path.join(DATA_DIR, safeFileName),
    path.join(DATA_DIR, `Get${safeFileName}`),
  ];

  for (const filePath of filePaths) {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      if (raw && !raw.trim().startsWith("<")) {
        try {
          const { decryptToken } = await import("@/components");
          const pin =
            process.env.XML_ENCRYPTION_PIN ||
            process.env.WAREHOUSE_SYNC_PASSWORD ||
            "ControlTowerSecretPIN";
          return await decryptToken(raw, pin);
        } catch (decError) {
          console.warn(
            "Failed to decrypt local XML file in server action:",
            decError,
          );
          return raw;
        }
      }
      return raw;
    }
  }

  return null;
}
