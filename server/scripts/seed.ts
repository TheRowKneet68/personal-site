/** Loads data.json into Supabase. Run: npm run server:seed */
import { storage } from "../services/storage.js";

const result = await storage.seed();
console.log(`>> seed complete (storage: ${result.mode})`);

if (result.mode === "json") {
  console.log(">> Supabase env not set — nothing to seed. Add SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY to server/.env");
}
