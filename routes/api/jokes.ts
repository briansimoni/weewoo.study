import { FreshContext, Handlers } from "$fresh/server.ts";

const kv = await Deno.openKv(
  "https://api.deno.com/databases/b445b136-1d4f-4549-9aa3-1a1d5429b24e/connect"
);

export const handler: Handlers = {
  async GET(_req: Request, ctx: FreshContext) {
    const jokes = (await kv.get<string[]>(["jokes"])).value;
    const r = new Response(
      JSON.stringify({
        jokes,
      })
    );
    r.headers.set("content-type", "application/json");
    return r;
  },
};
