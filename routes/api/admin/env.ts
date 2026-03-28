import { AppHandlers } from "../../_middleware.ts";

export const handler: AppHandlers = {
  GET(_req, _ctx) {
    const env = Deno.env.toObject();
    return new Response(JSON.stringify(env, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  },
};
