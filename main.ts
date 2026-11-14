/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />
/// <reference lib="deno.unstable" />;

import "@std/dotenv/load";

import { App, staticFiles, trailingSlashes } from "fresh";
import type { AppState } from "./routes/_middleware.ts";

import { log } from "./lib/logger.ts";
import { getKv, setKv } from "./lib/kv.ts";
import { DynamoKv } from "./lib/dynamo_kv.ts";
import { ensureSeeded } from "./lib/seed.ts";
import { assertStripeKeyMatchesStage } from "./lib/stripe_webhook.ts";

// Fail the deployment rather than take live payments outside PROD (or test
// payments in PROD).
assertStripeKeyMatchesStage(
  Deno.env.get("STAGE"),
  Deno.env.get("STRIPE_API_KEY"),
);

// On AWS the database is a DynamoDB table instead of Deno KV (see
// docs/data-model.md, "Storage backends").
const dynamoTable = Deno.env.get("DYNAMODB_TABLE");
if (dynamoTable) {
  setKv(DynamoKv.make({
    table: dynamoTable,
    endpoint: Deno.env.get("DYNAMODB_ENDPOINT") || undefined,
  }));
  log.info("using DynamoDB", { table: dynamoTable });
}

// Deno Deploy gives every branch preview an empty KV database. With
// SEED_ON_EMPTY=true (set on the Deploy apps), fill it with seed data
// before serving the first request. Never runs when STAGE=PROD.
const seeding = Deno.env.get("SEED_ON_EMPTY") === "true" &&
    Deno.env.get("STAGE") !== "PROD"
  ? getKv()
    .then((kv) => ensureSeeded(kv))
    .then((summary) => {
      if (summary) log.info("seeded empty database", { summary });
    })
    .catch((error) => log.error("seeding failed", { error }))
  : null;

export const app = new App<AppState>()
  .use(staticFiles())
  .use(async (ctx) => {
    if (seeding) await seeding;
    return ctx.next();
  })
  .use(trailingSlashes("never"))
  .fsRoutes();
