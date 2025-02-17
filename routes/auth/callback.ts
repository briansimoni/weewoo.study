import * as oauth from "npm:oauth4webapi";
import { code_verifier } from "../../lib/temp.ts";
import { AppHandlers } from "../_middleware.ts";

const client_id = Deno.env.get("CLIENT_ID");
const client_secret = Deno.env.get("CLIENT_SECRET");
const redirect_uri = Deno.env.get("REDIRECT_URI");

export const handler: AppHandlers = {
  async GET(req, ctx) {
    if (!client_id || !client_secret || !redirect_uri) {
      throw new Error("Missing environment variables");
    }

    // https://dev-1m7qee3nty5n5ck1.us.auth0.com/.well-known/openid-configuration
    const issuer = new URL("https://dev-1m7qee3nty5n5ck1.us.auth0.com");
    const discoverResponse = await oauth.discoveryRequest(issuer);
    const as = await oauth.processDiscoveryResponse(issuer, discoverResponse);

    const client: oauth.Client = {
      client_id,
      client_secret,
    };

    const currentUrl: URL = new URL(req.url);
    const params = oauth.validateAuthResponse(as, client, currentUrl);
    const clientAuth = oauth.ClientSecretPost(client_secret);

    const response = await oauth.authorizationCodeGrantRequest(
      as,
      client,
      clientAuth,
      params,
      redirect_uri,
      code_verifier,
    );

    const result = await oauth.processAuthorizationCodeResponse(
      as,
      client,
      response,
      {
        requireIdToken: true,
      },
    );

    const { access_token } = result;
    const claims = oauth.getValidatedIdTokenClaims(result)!;
    const { sub } = claims;

    const r = await oauth.userInfoRequest(as, client, access_token);

    const res = await oauth.processUserInfoResponse(
      as,
      client,
      sub,
      r,
    );

    ctx.state.session = {
      access_token,
      user_id: sub,
      ...claims,
      ...res,
    };

    return new Response(null, {
      status: 302,
      headers: {
        Location: "/",
      },
    });
  },
};

export default function () {
  return null;
}
