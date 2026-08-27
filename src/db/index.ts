import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema/index.js";

export const client = createClient({ url: "file:atlas-erp-v2.db" });
export const db = drizzle(client, { schema });
