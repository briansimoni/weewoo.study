import { FreshContext } from "$fresh/server.ts";
import * as oauth from "npm:oauth4webapi";
import { code_verifier } from "../../lib/temp.ts";
import { AppHandlers } from "../_middleware.ts";
const client_id = Deno.env.get("CLIENT_ID");
const client_secret = Deno.env.get("CLIENT_SECRET");
const redirect_uri = Deno.env.get("REDIRECT_URI");

export const handler: AppHandlers = {
  async GET(_req, _ctx) {
    if (!client_id || !client_secret || !redirect_uri) {
      throw new Error("Missing environment variables");
    }
    const issuer = new URL("https://dev-1m7qee3nty5n5ck1.us.auth0.com");
    const response = await oauth.discoveryRequest(issuer);
    const as = await oauth.processDiscoveryResponse(issuer, response);
    const code_challenge = await oauth.calculatePKCECodeChallenge(
      code_verifier,
    );

    const authorizationUrl = new URL(as.authorization_endpoint!);
    authorizationUrl.searchParams.set("client_id", client_id);
    authorizationUrl.searchParams.set("redirect_uri", redirect_uri);
    authorizationUrl.searchParams.set("response_type", "code");
    authorizationUrl.searchParams.set("scope", "openid profile");
    authorizationUrl.searchParams.set("code_challenge", code_challenge);
    authorizationUrl.searchParams.set("code_challenge_method", "S256");

    return new Response(null, {
      status: 302,
      headers: {
        location: authorizationUrl.toString(),
      },
    });
  },
};

export default function () {
  return null;
}
