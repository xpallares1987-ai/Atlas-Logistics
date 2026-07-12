import { fileURLToPath } from "url";
import fs from "fs";
import path from "path";
import { initializeApp as initAdminApp } from "firebase-admin/app";
import { getDataConnect } from "firebase-admin/data-connect";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const EMULATOR_HOST = "127.0.0.1";
const EMULATOR_PORT = 9399;
const USE_EMULATOR = process.env.NODE_ENV !== "production";

let dcAdmin: ReturnType<typeof getDataConnect> | null = null;
const IMPERSONATE_OPTS = { impersonate: { authClaims: { sub: "admin-seed" } } };

async function setupAdmin() {
  if (USE_EMULATOR) {
    console.log("⚠️ Ejecutando en Emulador. Use la versión anterior del script para el emulador.");
    process.exit(1);
  }
  
  console.log("🔐 Inicializando Admin SDK con credenciales GOOGLE_APPLICATION_CREDENTIALS...");
  const adminApp = initAdminApp({ projectId: "gen-lang-client-0393063451" });
  dcAdmin = getDataConnect({
    serviceId: "gen-lang-client-0393063451-service",
    location: "europe-west1",
    connector: "atlas"
  }, adminApp);
  console.log("✅ Admin SDK Inicializado.");
}

async function seedMasterData() {
  console.log("🌍 Iniciando la inyección de Master Data (Upsert) en Producción...");

  try {
    const unlocodesPath = path.resolve(__dirname, "../data/unlocodes_full.json");
    const carriersPath = path.resolve(__dirname, "../data/carriers.json");

    const locations = JSON.parse(fs.readFileSync(unlocodesPath, "utf-8"));
    const carriers = JSON.parse(fs.readFileSync(carriersPath, "utf-8"));

    // Commenting out locations so it doesn't take 5 minutes every time we seed.
    // They are already in the DB.
    console.log(`\n⏭️ Saltando sincronización de Locations (ya existen en BD)...`);

    console.log(`\n🚢 Sincronizando Navieras (Carriers)...`);
    let mscId = "";
    let maerskId = "";
    for (const carrier of carriers) {
      if (carrier.entityType === "CARRIER") {
         if (carrier.name.includes("MSC")) mscId = carrier.id;
         if (carrier.name.includes("Maersk")) maerskId = carrier.id;
      }
      await dcAdmin!.executeMutation("CreateCompany", {
        id: carrier.id,
        name: carrier.name,
        entityType: carrier.entityType,
        countryCode: carrier.countryCode,
        city: carrier.city
      }, IMPERSONATE_OPTS);
    }

    console.log("\n📜 Sincronizando Incoterms...");
    const incoterms = [
      { code: "FOB", desc: "Free On Board", f: "BUYER", o: "SELLER", d: "BUYER" },
      { code: "EXW", desc: "Ex Works", f: "BUYER", o: "BUYER", d: "BUYER" },
      { code: "CIF", desc: "Cost, Insurance and Freight", f: "SELLER", o: "SELLER", d: "BUYER" },
      { code: "DDP", desc: "Delivered Duty Paid", f: "SELLER", o: "SELLER", d: "SELLER" },
      { code: "DAP", desc: "Delivered at Place", f: "SELLER", o: "SELLER", d: "BUYER" }
    ];
    for (const inc of incoterms) {
      await dcAdmin!.executeMutation("CreateIncoterm", {
        code: inc.code,
        description: inc.desc,
        freightPayer: inc.f,
        originCustomsPayer: inc.o,
        destCustomsPayer: inc.d
      }, IMPERSONATE_OPTS);
    }

    console.log("\n📦 Sincronizando HS Codes comunes...");
    const hsCodes = [
      { code: "0901.11", desc: "Coffee, not roasted, not decaffeinated", duty: 0.0, haz: false },
      { code: "8517.12", desc: "Smartphones", duty: 0.0, haz: true }, // Lithium batteries
      { code: "8703.23", desc: "Motor cars", duty: 10.0, haz: false },
      { code: "6109.10", desc: "T-shirts, of cotton", duty: 12.0, haz: false }
    ];
    for (const hs of hsCodes) {
      await dcAdmin!.executeMutation("CreateHsCode", {
        code: hs.code,
        description: hs.desc,
        dutyRate: hs.duty,
        isHazardous: hs.haz
      }, IMPERSONATE_OPTS);
    }

    console.log("\n⚓ Sincronizando Vessels (Buques)...");
    const vessels = [
      { imo: "9839272", name: "MSC AMELIA", flag: "LR", carrierId: mscId || carriers[0].id, cap: 23756 },
      { imo: "9778806", name: "MADRID MAERSK", flag: "DK", carrierId: maerskId || carriers[0].id, cap: 20568 }
    ];
    for (const v of vessels) {
      await dcAdmin!.executeMutation("CreateVessel", {
        imoNumber: v.imo,
        name: v.name,
        flag: v.flag,
        carrierId: v.carrierId,
        capacityTeu: v.cap
      }, IMPERSONATE_OPTS);
    }

    console.log("\n✅ ¡Master Data extendida sincronizada con éxito!");
  } catch (error) {
    console.error("\n❌ Error sincronizando Master Data:", error);
  }
}

async function seed() {
  if (!USE_EMULATOR && process.env.CONFIRM_PROD_SEED !== "true") {
    console.error("❌ ERROR: Estás a punto de correr el seed en PRODUCCIÓN.");
    console.error("Para continuar, ejecuta con la variable CONFIRM_PROD_SEED=true");
    process.exit(1);
  }
  
  await setupAdmin();
  await seedMasterData();
}

seed();
