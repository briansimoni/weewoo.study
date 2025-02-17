import * as oauth from "npm:oauth4webapi";
import { AppHandlers } from "../_middleware.ts";
const client_id = Deno.env.get("CLIENT_ID");
const client_secret = Deno.env.get("CLIENT_SECRET");
const redirect_uri = Deno.env.get("REDIRECT_URI");

export const handler: AppHandlers = {
  async GET(_req, ctx) {
    if (!client_id || !client_secret || !redirect_uri) {
      throw new Error("Missing environment variables");
    }
    const issuer = new URL("https://dev-1m7qee3nty5n5ck1.us.auth0.com");
    const response = await oauth.discoveryRequest(issuer);
    const as = await oauth.processDiscoveryResponse(issuer, response);

    const logoutUrl = new URL(as.end_session_endpoint!);

    ctx.state.session = {};

    return new Response(null, {
      status: 302,
      headers: {
        // "Set-Cookie": `session=; Path=/; Max-Age=0`,
        location: logoutUrl.toString(),
      },
    });
  },
};

export default function () {
  return null;
}
