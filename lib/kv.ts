let kv: Deno.Kv | null = null;

export async function getKv(): Promise<Deno.Kv> {
  if (!kv) {
    if (Deno.env.get("DB_URL")) {
      kv = await Deno.openKv(Deno.env.get("DB_URL")!);
    } else {
      kv = await Deno.openKv();
    }
  }
  return kv;
}
