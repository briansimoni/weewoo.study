/**
 * Entry point of the background-job Lambda functions.
 *
 * `deno task build:jobs` compiles this file into the `bootstrap` executable
 * of one zip, which every job function shares. Each function names its job in
 * its handler setting (the `_HANDLER` environment variable):
 *
 * - `weekly-report`: mails the admin the week's reported questions. Invoked
 *   on a schedule in prod; the test function is only invoked by hand.
 * - `ses-events`: mails the admin about each SES delivery event. Invoked by
 *   the `weewoo_ops_listener` SQS queue.
 *
 * The functions and their triggers are in infra/jobs.tf.
 */
import { DynamoKv } from "../lib/dynamo_kv.ts";
import { alertOnSesEvent, sendReport } from "../lib/jobs.ts";
import { setKv } from "../lib/kv.ts";
import { log } from "../lib/logger.ts";
import {
  forEachSqsMessage,
  type Handler,
  serveLambda,
  type SqsEvent,
} from "./runtime.ts";

const JOBS: Record<string, Handler> = {
  "weekly-report": async () => {
    await sendReport();
    return { ok: true };
  },
  "ses-events": (event) =>
    forEachSqsMessage(
      event as SqsEvent,
      alertOnSesEvent,
      (error, messageId) =>
        log.error("SES event failed", { messageId, error: String(error) }),
    ),
};

const job = Deno.env.get("_HANDLER") ?? "";
const handler = JOBS[job];
const api = Deno.env.get("AWS_LAMBDA_RUNTIME_API");
const table = Deno.env.get("DYNAMODB_TABLE");
if (!handler || !api || !table) {
  // Exiting during init makes Lambda report the invocation as failed.
  console.error(
    `cannot start job "${job}": handler must be one of ${
      Object.keys(JOBS).join(", ")
    }, and AWS_LAMBDA_RUNTIME_API and DYNAMODB_TABLE must be set`,
  );
  Deno.exit(1);
}

// There is no Deno KV on Lambda: the stores read the stage's DynamoDB table.
setKv(DynamoKv.make({ table }));

await serveLambda({
  api,
  handler: async (event) => {
    log.info("job started", { job });
    const start = Date.now();
    const result = await handler(event);
    log.info("job finished", { job, duration: Date.now() - start, result });
    return result;
  },
  onError: (error, requestId) =>
    log.error("job failed", { job, requestId, error: String(error) }),
});
