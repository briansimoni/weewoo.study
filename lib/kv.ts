import type { Db } from "./db.ts";

let kv: Db | null = null;

/**
 * Singleton database connection. On AWS, `main.ts` installs a DynamoDB table
 * with `setKv()` at startup (when `DYNAMODB_TABLE` is set). Otherwise this
 * opens Deno KV: `KV_PATH` points local runs at a specific SQLite file (e.g.
 * the seeded `.kv/seed.sqlite3`), and unset, `Deno.openKv()` uses Deno's
 * default local database.
 *
 * Keep this module free of server-only imports: islands reach it through the
 * stores, so whatever it imports ends up in the browser bundle.
 */
export async function getKv(): Promise<Db> {
  if (!kv) {
    kv = await Deno.openKv(Deno.env.get("KV_PATH") || undefined);
  }
  return kv;
}

/**
 * Make getKv() return the given database: the DynamoDB table at startup, or
 * in tests an in-memory one so route handlers never touch a real database.
 * Pass null to reset.
 */
export function setKv(next: Db | null) {
  kv = next;
}
