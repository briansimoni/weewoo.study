/**
 * Call the admin API (routes/api/admin) from a workstation, for people and
 * agents doing admin tasks on a deployed site.
 *
 *   deno task admin <test|prod|https://preview-url> <METHOD> <[/]api/admin/...> [json|@file.json]
 *   deno task admin test GET /api/admin/product
 *   deno task admin test PUT /api/admin/product/377478087 '{"printful_id":"377478087","thumbnail_url":"https://…"}'
 *
 * Authenticates with `Authorization: Bearer <token>`, read from .env (or the
 * environment): WEEWOO_ADMIN_TOKEN_TEST for test.weewoo.study and branch
 * previews, WEEWOO_ADMIN_TOKEN_PROD for weewoo.study. Each must equal that
 * Deploy app's ADMIN_API_TOKEN. Writes to production also need --confirm-prod.
 */
import { load } from "@std/dotenv";

const TARGETS: Record<string, string> = {
  test: "https://test.weewoo.study",
  prod: "https://weewoo.study",
};

const args = Deno.args.filter((a) => a !== "--confirm-prod");
const confirmProd = args.length !== Deno.args.length;
const [target, method, rawPath, body] = args;
// Git Bash on Windows rewrites a leading "/api/…" into a file path, so the
// slash is optional.
const path = rawPath && "/" + rawPath.replace(/^\//, "");
if (!target || !method || !path?.startsWith("/api/admin/")) {
  console.error(
    "usage: deno task admin <test|prod|https://preview-url> <METHOD> </api/admin/...> [json|@file.json] [--confirm-prod]",
  );
  Deno.exit(2);
}

const base = new URL(TARGETS[target] ?? target);
const isProd = base.host === "weewoo.study" || base.host === "www.weewoo.study";
const tokenName = isProd
  ? "WEEWOO_ADMIN_TOKEN_PROD"
  : "WEEWOO_ADMIN_TOKEN_TEST";
const env = await load().catch(() => ({} as Record<string, string>));
const token = Deno.env.get(tokenName) ?? env[tokenName];
if (!token) {
  console.error(`${tokenName} is not set (add it to .env).`);
  Deno.exit(2);
}
const upper = method.toUpperCase();
if (isProd && upper !== "GET" && !confirmProd) {
  console.error(
    "Refusing to change production without --confirm-prod (and the human's go-ahead).",
  );
  Deno.exit(2);
}

const payload = body?.startsWith("@")
  ? await Deno.readTextFile(body.slice(1))
  : body;
const response = await fetch(new URL(path, base), {
  method: upper,
  headers: {
    authorization: `Bearer ${token}`,
    ...(payload ? { "content-type": "application/json" } : {}),
  },
  body: payload,
  redirect: "manual",
});
const text = await response.text();
console.error(`${upper} ${new URL(path, base)} → ${response.status}`);
try {
  console.log(JSON.stringify(JSON.parse(text), null, 2));
} catch {
  console.log(text);
}
if (!response.ok) Deno.exit(1);
