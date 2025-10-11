import * as oauth from "oauth4webapi";
import { AppHandlers } from "../_middleware.ts";
const client_id = Deno.env.get("CLIENT_ID");

export const handler: AppHandlers = {
  async GET(_ctx) {
    const req = ctx.req;

    if (!client_id) {
      throw new Error("Missing environment variables");
    }
    const issuer = new URL("https://auth.weewoo.study");
    const response = await oauth.discoveryRequest(issuer);
    const as = await oauth.processDiscoveryResponse(issuer, response);

    const post_logout_redirect_uri = `${
      new URL(req.url).origin
    }/auth/logged-out`;
    const logoutUrl = new URL(as.end_session_endpoint!);
    logoutUrl.searchParams.set(
      "post_logout_redirect_uri",
      post_logout_redirect_uri,
    );
    logoutUrl.searchParams.set("client_id", client_id);

    return new Response(null, {
      status: 302,
      headers: {
        location: logoutUrl.toString(),
      },
    });
  },
};

export default function () {
  return null;
}
