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

// Set up a cron job that runs every 30 seconds
import { CronTime } from "npm:cron-time-generator";
import { sendReport } from "./lib/cron_tasks.ts";

Deno.cron("Weekly Question Report", CronTime.everyMinute(), () => {
  // sendReport();
  console.log("Weekly Question Report sent");
});

await start(manifest, config);
