import { initializeApp } from "firebase/app";
import { getDataConnect } from "firebase/data-connect";
import { upsertDictionaryTerm, connectorConfig } from "../apps/atlas-scm/src/dataconnect-generated/index.cjs.js";

const app = initializeApp({
  projectId: "gen-lang-client-0393063451", // the project ID used in .firebaserc
});

const dc = getDataConnect(app, connectorConfig);

const acronyms = [
  { acronym: "BL", meaning: "Bill of Lading", category: "SHIPPING", description: "Conocimiento de Embarque Marítimo", isActive: true },
  { acronym: "AWB", meaning: "Air Waybill", category: "AIR", description: "Conocimiento de Embarque Aéreo", isActive: true },
  { acronym: "HAWB", meaning: "House Air Waybill", category: "AIR", description: "AWB emitido por el forwarder", isActive: true },
  { acronym: "MAWB", meaning: "Master Air Waybill", category: "AIR", description: "AWB emitido por la aerolínea", isActive: true },
  { acronym: "HBL", meaning: "House Bill of Lading", category: "SHIPPING", description: "BL emitido por el forwarder", isActive: true },
  { acronym: "MBL", meaning: "Master Bill of Lading", category: "SHIPPING", description: "BL emitido por la naviera", isActive: true },
  { acronym: "TEU", meaning: "Twenty-foot Equivalent Unit", category: "GENERAL", description: "Unidad equivalente a un contenedor de 20 pies", isActive: true },
  { acronym: "FEU", meaning: "Forty-foot Equivalent Unit", category: "GENERAL", description: "Unidad equivalente a un contenedor de 40 pies", isActive: true },
  { acronym: "LCL", meaning: "Less than Container Load", category: "SHIPPING", description: "Carga consolidada (grupaje)", isActive: true },
  { acronym: "FCL", meaning: "Full Container Load", category: "SHIPPING", description: "Contenedor completo", isActive: true },
  { acronym: "BAF", meaning: "Bunker Adjustment Factor", category: "FINANCE", subCategory: "Surcharges", description: "Recargo por fluctuación del precio del combustible", isActive: true },
  { acronym: "CAF", meaning: "Currency Adjustment Factor", category: "FINANCE", subCategory: "Surcharges", description: "Recargo por fluctuación cambiaria", isActive: true },
  { acronym: "VGM", meaning: "Verified Gross Mass", category: "SHIPPING", description: "Masa Bruta Verificada del contenedor", isActive: true },
  { acronym: "POL", meaning: "Port of Loading", category: "SHIPPING", description: "Puerto de carga", isActive: true },
  { acronym: "POD", meaning: "Port of Discharge", category: "SHIPPING", description: "Puerto de descarga", isActive: true },
  { acronym: "ETA", meaning: "Estimated Time of Arrival", category: "GENERAL", description: "Fecha estimada de llegada", isActive: true },
  { acronym: "ETD", meaning: "Estimated Time of Departure", category: "GENERAL", description: "Fecha estimada de salida", isActive: true },
  { acronym: "CFS", meaning: "Container Freight Station", category: "WAREHOUSE", description: "Almacén para consolidación/desconsolidación de LCL", isActive: true },
  { acronym: "CY", meaning: "Container Yard", category: "SHIPPING", description: "Patio de contenedores en el puerto", isActive: true },
  { acronym: "THC", meaning: "Terminal Handling Charge", category: "FINANCE", subCategory: "Surcharges", description: "Cargos por manipulación en la terminal", isActive: true },
  // Testing duplicate Primary Key via Category resolution
  { acronym: "CA", meaning: "Customs Agent", category: "CUSTOMS", description: "Agente de aduanas despachante", isActive: true },
  { acronym: "CA", meaning: "Container Agent", category: "SHIPPING", description: "Agente de contenedores portuario", isActive: true }
];

async function seedAcronyms() {
  console.log("Seeding Dictionary Terms to Emulator...");
  for (const ac of acronyms) {
    try {
      await upsertDictionaryTerm(dc, {
        acronym: ac.acronym,
        meaning: ac.meaning,
        description: ac.description,
        category: ac.category,
        subCategory: (ac as any).subCategory || null,
        region: null,
        moduleScope: null,
        isActive: ac.isActive
      });
      console.log(`✅ Upserted ${ac.acronym} (${ac.category})`);
    } catch (err: any) {
      console.error(`❌ Error upserting ${ac.acronym} (${ac.category}):`, err.message);
    }
  }
}

seedAcronyms().then(() => {
  console.log("Done");
  process.exit(0);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
