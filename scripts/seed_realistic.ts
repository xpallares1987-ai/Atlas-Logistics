import { v4 as uuidv4 } from "uuid";
import { faker } from "@faker-js/faker";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { initializeApp as initAdminApp } from "firebase-admin/app";
import { getDataConnect } from "firebase-admin/data-connect";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const EMULATOR_HOST = "127.0.0.1";
const EMULATOR_PORT = 9399;
const USE_EMULATOR = process.env.NODE_ENV !== "production";

let dcAdmin: ReturnType<typeof getDataConnect> | null = null;
const IMPERSONATE_OPTS = { impersonate: { authClaims: { tenantId: "atlas-default-tenant", sub: "admin-seed" } } };

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

// Helper: Generate Random Date between a range
function randomDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function seed() {
  if (!USE_EMULATOR && process.env.CONFIRM_PROD_SEED !== "true") {
    console.error("❌ ERROR: Estás a punto de correr el seed en PRODUCCIÓN.");
    console.error("Para continuar, ejecuta con la variable CONFIRM_PROD_SEED=true");
    process.exit(1);
  }

  await setupAdmin();

  console.log("🌱 Iniciando la generación de datos realistas...");

  try {
    // 1. Create Fake Companies (Customers, Suppliers) and merge with Real Carriers
    console.log("🏢 Cargando y Generando Empresas...");
    const carriersPath = path.resolve(__dirname, "../data/carriers.json");
    const realCarriers = JSON.parse(fs.readFileSync(carriersPath, "utf-8"));
    
    const companyIds: { customer: string[], carrier: string[], supplier: string[] } = {
      customer: [],
      carrier: realCarriers.map((c: any) => c.id), // Use real carriers
      supplier: [],
    };
    
    const companyShapes: Record<string, string> = {}; // to store their random address shapes

    for (let i = 0; i < 70; i++) {
      const type = i < 35 ? "CUSTOMER" : "SUPPLIER";
      const id = uuidv4();
      
      const cName = faker.company.name();
      const cAddress = faker.location.streetAddress();
      const cCity = faker.location.city();
      const cCountry = faker.location.countryCode();
      const cEmail = faker.internet.email();
      const cPhone = faker.phone.number();

      // Generar el bloque de texto para Shipping Instructions
      companyShapes[id] = `${cName}\n${cAddress}\n${cCity}, ${cCountry}\nTel: ${cPhone}\nEmail: ${cEmail}`;

      await dcAdmin!.executeMutation("CreateCompany", {
        id,
        tenantId: "atlas-default-tenant",
        name: cName,
        entityType: type,
        countryCode: cCountry,
        email: cEmail,
        phoneNumber: cPhone,
        address: cAddress,
        city: cCity
      }, IMPERSONATE_OPTS);
      companyIds[type.toLowerCase() as keyof typeof companyIds].push(id);
    }

    // 2. Load Real Locations (Ports/Airports)
    console.log("📍 Cargando Ubicaciones Logísticas Reales...");
    const unlocodesPath = path.resolve(__dirname, "../data/unlocodes.json");
    const locations = JSON.parse(fs.readFileSync(unlocodesPath, "utf-8"));

    // 3. Create Shipments
    console.log("🚢 Generando Envíos (Shipments)...");
    const movementTypes = ["FCL", "LCL", "AIR"];
    const statuses = ["BOOKED", "IN_TRANSIT", "CUSTOMS", "DELIVERED"];

    for (let i = 0; i < 300; i++) {
      const origin = faker.helpers.arrayElement(locations);
      let destination = faker.helpers.arrayElement(locations);
      while (destination.locode === origin.locode) destination = faker.helpers.arrayElement(locations);

      const customerId = faker.helpers.arrayElement(companyIds.customer);
      const supplierId = faker.helpers.arrayElement(companyIds.supplier);
      
      const trackingNumber = `TRK-${faker.string.alphanumeric({ length: 8, casing: 'upper' })}`;
      
      await dcAdmin!.executeMutation("CreateShipment", {
        trackingNumber,
        tenantId: "atlas-default-tenant",
        status: faker.helpers.arrayElement(statuses),
        movementType: faker.helpers.arrayElement(movementTypes),
        direction: faker.helpers.arrayElement(["IMPORT", "EXPORT"]),
        incoterm: faker.helpers.arrayElement(["FOB", "EXW", "CIF", "DAP"]),
        origin: `${origin.name}, ${origin.countryCode}`,
        pol: origin.locode,
        pod: destination.locode,
        destination: `${destination.name}, ${destination.countryCode}`,
        customerId,
        supplierId,
        shipperAddressShape: companyShapes[supplierId],
        consigneeAddressShape: companyShapes[customerId]
      }, IMPERSONATE_OPTS);
    }

    // 4. Create Quotes
    console.log("💰 Generando Cotizaciones...");
    const mockUid = "system-seed-user";

    
    for (let i = 0; i < 150; i++) {
      const origin = faker.helpers.arrayElement(locations);
      let destination = faker.helpers.arrayElement(locations);
      while (destination.locode === origin.locode) destination = faker.helpers.arrayElement(locations);
      
      const carrierId = faker.helpers.arrayElement(companyIds.carrier);
      const customerId = faker.helpers.arrayElement(companyIds.customer);
      const baseCost = faker.number.float({ min: 1000, max: 8000, fractionDigits: 2 });
      
      await dcAdmin!.executeMutation("CreateQuote", {
        quoteNumber: `QT-${faker.string.alphanumeric({ length: 6, casing: 'upper' })}`,
        tenantId: "atlas-default-tenant",
        status: faker.helpers.arrayElement(["SENT", "ACCEPTED", "EXPIRED", "DRAFT"]),
        movementType: faker.helpers.arrayElement(["FCL", "LCL", "AIR"]),
        origin: origin.locode,
        destination: destination.locode,
        baseFreightCost: baseCost,
        totalCost: baseCost * 1.2,
        currency: "USD",
        validityDate: faker.date.future().toISOString().split('T')[0],
        carrierId,
        customerId,
        createdByUid: mockUid
      }, IMPERSONATE_OPTS);
    }

    console.log("✅ ¡Generación de datos realistas completada con éxito!");
  } catch (error) {
    console.error("❌ Error generando datos:", error);
  }
}

seed();
