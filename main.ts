/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />
/// <reference lib="deno.unstable" />;

import "@std/dotenv/load";

import { App, staticFiles, trailingSlashes } from "fresh";
import type { AppState } from "./routes/_middleware.ts";

import { CronTime } from "cron-time-generator";
import { pollWeeWooOpsSQSMessages, sendReport } from "./lib/cron_tasks.ts";
import { asyncLocalStorage, log } from "./lib/logger.ts";
import { getKv } from "./lib/kv.ts";
import { seedIfEmpty } from "./lib/seed.ts";

/**
 * Wrap a cron job in a request ID and logging context
 */
function prepare<T extends () => Promise<void>>(fn: T) {
  return () => {
    return asyncLocalStorage.run(crypto.randomUUID(), async () => {
      if (Deno.env.get("STAGE") !== "PROD") {
        log.info("skipping cron because env is not prod");
        return;
      }
      const start = Date.now();
      log.info("cron job started");
      await fn();
      log.info("cron job finished", {
        duration: Date.now() - start,
      });
    });
  };
}

if (import.meta.env.PROD) {
  Deno.cron(
    "Poll WeeWoo Ops SQS Messages",
    CronTime.every(15).minutes(),
    prepare(pollWeeWooOpsSQSMessages),
  );

  Deno.cron(
    "Weekly Question Report",
    CronTime.everySaturdayAt(9),
    prepare(sendReport),
  );
}

// Deno Deploy gives every branch preview an empty KV database. With
// SEED_ON_EMPTY=true (set on the Deploy apps), fill it with seed data
// before serving the first request. Never runs when STAGE=PROD.
const seeding = Deno.env.get("SEED_ON_EMPTY") === "true" &&
    Deno.env.get("STAGE") !== "PROD"
  ? getKv()
    .then((kv) => seedIfEmpty(kv))
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
