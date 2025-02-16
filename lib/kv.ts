let kv: Deno.Kv | null = null;

/**
 * singleton for Deno.kv connection
 */
export async function getKv(): Promise<Deno.Kv> {
  if (!kv) {
    if (Deno.env.get("DB_URL")) {
      kv = await Deno.openKv(Deno.env.get("DB_URL")!);
    } else {
      // if not in a Deno deploy environment this supposedly is using SQLite
      kv = await Deno.openKv();
    }
  }
  return kv;
}
