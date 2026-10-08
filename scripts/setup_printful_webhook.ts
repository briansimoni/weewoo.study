/**
 * Point the Printful store's webhook at one environment (idempotent):
 *
 *   deno run -A scripts/setup_printful_webhook.ts <prod|test> [--replace]
 *
 * Printful's v1 API has ONE webhook URL per store, and test.weewoo.study uses
 * the same store as weewoo.study. Pointing it at test therefore stops shipping
 * emails on prod, so the script refuses to replace a different URL unless
 * --replace is passed. Uses PRINTFUL_SECRET.
 */
import "@std/dotenv/load";
import { PrintfulApiClient } from "../lib/client/printful.ts";

const ENVIRONMENTS = {
  prod: "https://weewoo.study/api/printful_webhook",
  test: "https://test.weewoo.study/api/printful_webhook",
} as const;

/** Events routes/api/printful_webhook.ts acts on. */
const TYPES = ["package_shipped"];

const name = Deno.args[0] ?? "";
if (!(name in ENVIRONMENTS)) {
  console.error("Usage: setup_printful_webhook.ts <prod|test> [--replace]");
  Deno.exit(2);
}
const url = ENVIRONMENTS[name as keyof typeof ENVIRONMENTS];
const replace = Deno.args.includes("--replace");

const printful = new PrintfulApiClient();
const current = await printful.getWebhookConfig();
if (current.code !== 200) {
  console.error("Could not read the webhook configuration:", current);
  Deno.exit(1);
}
const { url: currentUrl, types: currentTypes = [] } = current.result;
console.log(
  `Current: ${currentUrl ?? "(none)"} [${currentTypes.join(", ")}]`,
);

if (currentUrl === url && TYPES.every((t) => currentTypes.includes(t))) {
  console.log("Already up to date.");
  Deno.exit(0);
}
if (currentUrl && currentUrl !== url && !replace) {
  console.error(
    `Refusing to replace ${currentUrl}: Printful allows one webhook URL per ` +
      "store, shared by every environment. Pass --replace to do it anyway.",
  );
  Deno.exit(1);
}

const result = await printful.setWebhookConfig(url, TYPES);
if (result.code !== 200) {
  console.error("Failed to set the webhook configuration:", result);
  Deno.exit(1);
}
console.log(`Set: ${result.result.url} [${result.result.types.join(", ")}]`);
