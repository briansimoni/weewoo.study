/**
 * Seed a local KV database with deterministic test data (lib/seed.ts).
 *
 *   deno task seed                 # seeds .kv/seed.sqlite3
 *   deno task seed path/to/db.sqlite3
 *
 * Then run the app against it with KV_PATH=.kv/seed.sqlite3. Your default
 * local database is never touched unless you pass its path explicitly.
 */
import { seed } from "../lib/seed.ts";

const path = Deno.args[0] ?? ".kv/seed.sqlite3";
const dir = path.replace(/[\\/][^\\/]*$/, "");
if (dir !== path) await Deno.mkdir(dir, { recursive: true });

const kv = await Deno.openKv(path);
try {
  const summary = await seed(kv);
  console.log(`Seeded ${path}:`, summary);
  console.log(`Run the app against it with KV_PATH=${path}`);
} finally {
  kv.close();
}
