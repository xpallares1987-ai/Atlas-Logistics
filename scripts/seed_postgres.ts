import { initializeApp } from "firebase/app";
import { connectDataConnectEmulator, getDataConnect } from "firebase/data-connect";
import { createShipment, connectorConfig } from "../src/dataconnect-generated/js/default-connector/index.cjs.js";
import { v4 as uuidv4 } from "uuid";

// Note: To run this against the emulator:
// export FIREBASE_DATA_CONNECT_EMULATOR_HOST="127.0.0.1:9399"
// And have the local emulator running

const app = initializeApp({
  projectId: "gen-lang-client-0393063451", // the project ID used in .firebaserc
});

const dc = getDataConnect(app, connectorConfig);

// For emulator:
// connectDataConnectEmulator(dc, "127.0.0.1", 9399);

async function seed() {
  if (process.env.NODE_ENV === "production") {
    console.error("❌ ERROR: Cannot run seeding script in production environment. Aborting to prevent data loss.");
    process.exit(1);
  }

  console.log("Seeding PostgreSQL via Firebase Data Connect...");

  try {
    const shipperId = uuidv4();
    const consigneeId = uuidv4();

    // In a real seeder, we would create the Companies first.
    // Assuming the companies exist or we don't strictly enforce foreign keys in the mock for now.
    // Data Connect might enforce them. If so, we need to add a `CreateCompany` mutation.

    console.log("Creating shipments...");
    const res1 = await createShipment(dc, {
      trackingNumber: "TRK-900123",
      status: "IN_TRANSIT",
      movementType: "FCL",
      direction: "IMPORT",
      incoterm: "FOB",
      origin: "Shanghai, CN",
      pol: "CNSHA",
      pod: "NLRTM",
      destination: "Rotterdam, NL",
      shipperId,
      consigneeId,
    });
    console.log("Created shipment:", res1);

    const res2 = await createShipment(dc, {
      trackingNumber: "TRK-800456",
      status: "CUSTOMS",
      movementType: "LCL",
      direction: "EXPORT",
      incoterm: "EXW",
      origin: "Hamburg, DE",
      pol: "DEHAM",
      pod: "USNYC",
      destination: "New York, US",
      shipperId,
      consigneeId,
    });
    console.log("Created shipment:", res2);

    console.log("✅ Seeding complete.");
  } catch (error) {
    console.error("Error seeding data:", error);
  }
}

seed();
