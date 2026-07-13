import { initializeApp } from "firebase/app";
import { getDataConnect } from "firebase/data-connect";
import { insertDictionaryTerm, connectorConfig } from "../apps/atlas-scm/src/dataconnect-generated/index.cjs.js";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

const app = initializeApp({
  projectId: "gen-lang-client-0393063451", // the project ID used in .firebaserc
  apiKey: "AIzaSyBSyDFKEACruhF9XndvLfuglhDif4ILJ3k",
});

const dc = getDataConnect(app, connectorConfig);

async function seedDictionary() {
  console.log("Seeding Dictionary Terms to Data Connect using Firebase CLI...");
  
  const dataPath = join(process.cwd(), "data", "dictionary-seed.json");
  const data = JSON.parse(readFileSync(dataPath, "utf-8"));

  for (const item of data) {
    try {
      const vars = {
        acronym: item.acronym,
        meaning: item.meaning,
        description: item.description || null,
        category: item.category,
        subCategory: item.subCategory || null,
        region: item.region || null,
        moduleScope: item.moduleScope || null
      };
      
      const varsPath = join(process.cwd(), "data", "temp-vars.json");
      writeFileSync(varsPath, JSON.stringify(vars));
      
      const cmd = `firebase dataconnect:execute dataconnect/atlas_connector/seed.gql InsertDictionaryTerm --variables "@data/temp-vars.json"`;
      execSync(cmd, { stdio: "inherit", env: process.env });
      
      console.log(`✅ Inserted ${item.acronym} (${item.category})`);
    } catch (err: any) {
      console.error(`❌ Error inserting ${item.acronym} (${item.category}):`, err.message);
    }
  }
}

seedDictionary().then(() => {
  console.log("Done");
  process.exit(0);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
