let kv: Deno.Kv | null = null;

/**
 * Singleton Deno KV connection. `KV_PATH` points local runs at a specific
 * SQLite file (e.g. the seeded `.kv/seed.sqlite3`); unset, `Deno.openKv()`
 * uses Deno's default local database or the Deploy-attached one.
 */
export async function getKv(): Promise<Deno.Kv> {
  if (!kv) {
    kv = await Deno.openKv(Deno.env.get("KV_PATH") || undefined);
  }
  return kv;
}
