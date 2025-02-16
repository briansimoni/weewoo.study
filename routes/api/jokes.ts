import { FreshContext, Handlers } from "$fresh/server.ts";
import { getKv } from "../../lib/kv.ts";

const kv = await getKv();

export const handler: Handlers = {
  async GET(_req: Request, ctx: FreshContext) {
    const jokes = (await kv.get<string[]>(["jokes"])).value;
    const r = new Response(
      JSON.stringify({
        jokes,
      }),
    );
    r.headers.set("content-type", "application/json");
    return r;
  },
};
