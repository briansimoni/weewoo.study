/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />
/// <reference lib="deno.unstable" />;

import "$std/dotenv/load.ts";

import { start } from "$fresh/server.ts";
import manifest from "./fresh.gen.ts";
import config from "./fresh.config.ts";

import { CronTime } from "npm:cron-time-generator";
import { pollWeeWooOpsSQSMessages, sendReport } from "./lib/cron_tasks.ts";
import { asyncLocalStorage, log } from "./lib/logger.ts";

function addRequestId<T extends () => Promise<void>>(fn: T) {
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
}

Deno.cron(
  "Poll WeeWoo Ops SQS Messages",
  CronTime.every(5).minutes(),
  () => {
    log.info("Polling WeeWoo Ops SQS Messages");
    addRequestId(pollWeeWooOpsSQSMessages);
  },
);

Deno.cron("Weekly Question Report", CronTime.everySaturdayAt(9), () => {
  addRequestId(sendReport);
});

await start(manifest, config);
