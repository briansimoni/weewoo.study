import { AppHandler, AppState } from "../routes/_middleware.ts";
import { testLoginEnabled } from "./test_login.ts";

export const ADMIN_USER_ID = "auth0|67b28845f4ba32d0be58bc46";

/** The seed user that E2E tests and previews use for the admin pages. */
export const SEED_ADMIN_ID = "seed|admin";

/**
 * The real admin, or the seed admin in a test environment. The seed admin
 * needs all of: STAGE DEV or TEST, and a session made by the test login (only
 * seeded databases have the user, and Auth0 never issues `seed|` IDs).
 */
export function isAdmin(
  session: AppState["session"],
  stage = Deno.env.get("STAGE"),
): boolean {
  if (!session) return false;
  if (session.user_id === ADMIN_USER_ID) return true;
  return session.user_id === SEED_ADMIN_ID && session.test_login === true &&
    testLoginEnabled(stage);
}

/** Shorter tokens are ignored, so a placeholder value can't enable token auth. */
export const MIN_ADMIN_API_TOKEN_LENGTH = 32;

export const adminsOnlyMiddleware: AppHandler = (ctx) => {
  if (!isAdmin(ctx.state.session)) {
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
  if (isAdmin(ctx.state.session)) return ctx.next();
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
