import { AppHandler } from "../routes/_middleware.ts";

const ADMIN_USER_ID = "auth0|67b28845f4ba32d0be58bc46";

/** Shorter tokens are ignored, so a placeholder value can't enable token auth. */
export const MIN_ADMIN_API_TOKEN_LENGTH = 32;

export const adminsOnlyMiddleware: AppHandler = (ctx) => {
  if (ctx.state.session?.user_id !== ADMIN_USER_ID) {
    return new Response("Unauthorized", { status: 401 });
  }
  return ctx.next();
};

/**
 * Admin API access for the admin's browser session or for scripts and agents
 * on the developer's workstation, which send
 * `Authorization: Bearer <ADMIN_API_TOKEN>` (see scripts/admin_api.ts). Token
 * auth is off unless the app has an ADMIN_API_TOKEN of at least
 * {@link MIN_ADMIN_API_TOKEN_LENGTH} characters.
 */
export const adminApiMiddleware: AppHandler = async (ctx) => {
  if (ctx.state.session?.user_id === ADMIN_USER_ID) return ctx.next();
  if (await hasAdminApiToken(ctx.req, Deno.env.get("ADMIN_API_TOKEN"))) {
    return ctx.next();
  }
  return new Response("Unauthorized", { status: 401 });
};

export async function hasAdminApiToken(
  req: Request,
  expected: string | undefined,
): Promise<boolean> {
  if (!expected || expected.length < MIN_ADMIN_API_TOKEN_LENGTH) return false;
  const match = /^Bearer (\S+)$/.exec(req.headers.get("authorization") ?? "");
  if (!match) return false;
  // Compare fixed-length digests in constant time.
  const [given, wanted] = await Promise.all(
    [match[1], expected].map(async (value) =>
      new Uint8Array(
        await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(value),
        ),
      )
    ),
  );
  let difference = 0;
  for (let i = 0; i < given.length; i++) difference |= given[i] ^ wanted[i];
  return difference === 0;
}
