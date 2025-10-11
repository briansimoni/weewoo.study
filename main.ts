import "$std/dotenv/load.ts";

import { App, staticFiles } from "fresh";

import { CronTime } from "cron-time-generator";
import { pollWeeWooOpsSQSMessages, sendReport } from "./lib/cron_tasks.ts";
import { asyncLocalStorage, log } from "./lib/logger.ts";

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

// Only register cron jobs in production
if (Deno.env.get("STAGE") === "PROD") {
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
  
  log.info("Cron jobs registered for production environment");
} else {
  log.info("Skipping cron job registration - not in production environment");
}

// Create and start the Fresh app
export const app = new App()
  // Add static file serving middleware
  .use(staticFiles())
  // Enable file-system based routing
  .fsRoutes();
