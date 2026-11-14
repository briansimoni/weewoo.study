/**
 * A minimal AWS Lambda custom runtime (the `provided.al2023` runtime).
 *
 * Lambda starts the `bootstrap` executable from the function's zip, which is
 * lambda/main.ts compiled by `deno task build:jobs`. The executable asks the
 * Lambda Runtime API for the next event, runs the handler, posts the result
 * and repeats until Lambda freezes or stops the process.
 * https://docs.aws.amazon.com/lambda/latest/dg/runtimes-api.html
 */
export type Handler = (event: unknown) => Promise<unknown>;

export interface RuntimeOptions {
  /** `AWS_LAMBDA_RUNTIME_API`: host and port of the Runtime API. */
  api: string;
  handler: Handler;
  fetch?: typeof fetch;
  /** Tests: stop after this many invocations instead of looping forever. */
  maxInvocations?: number;
  onError?: (error: unknown, requestId: string) => void;
}

export async function serveLambda(options: RuntimeOptions): Promise<void> {
  const request = options.fetch ?? fetch;
  const base = `http://${options.api}/2018-06-01/runtime`;

  for (let n = 0; n < (options.maxInvocations ?? Infinity); n++) {
    // Long poll: returns when there is an event for this function.
    const next = await request(`${base}/invocation/next`);
    const requestId = next.headers.get("lambda-runtime-aws-request-id");
    if (!next.ok || !requestId) {
      await next.body?.cancel();
      throw new Error(`Runtime API returned ${next.status} for the next event`);
    }
    const event: unknown = await next.json();

    let reply: Response;
    try {
      const result = await options.handler(event);
      reply = await request(`${base}/invocation/${requestId}/response`, {
        method: "POST",
        body: JSON.stringify(result ?? null),
      });
    } catch (error) {
      options.onError?.(error, requestId);
      const failure = error instanceof Error ? error : new Error(String(error));
      reply = await request(`${base}/invocation/${requestId}/error`, {
        method: "POST",
        headers: { "Lambda-Runtime-Function-Error-Type": "Unhandled" },
        body: JSON.stringify({
          errorMessage: failure.message,
          errorType: failure.name,
          stackTrace: failure.stack?.split("\n") ?? [],
        }),
      });
    }
    await reply.body?.cancel();
  }
}

/** The part of an SQS event the handlers use. */
export interface SqsEvent {
  Records: { messageId: string; body: string }[];
}

export interface SqsBatchResponse {
  batchItemFailures: { itemIdentifier: string }[];
}

/**
 * Run `handle` for every message of an SQS event. Failed messages are
 * reported back by ID (the event source mapping has
 * `ReportBatchItemFailures`), so only those are retried and the others are
 * deleted from the queue.
 */
export async function forEachSqsMessage(
  event: SqsEvent,
  handle: (body: string) => Promise<void>,
  onError?: (error: unknown, messageId: string) => void,
): Promise<SqsBatchResponse> {
  const batchItemFailures: { itemIdentifier: string }[] = [];
  for (const record of event.Records ?? []) {
    try {
      await handle(record.body);
    } catch (error) {
      onError?.(error, record.messageId);
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }
  return { batchItemFailures };
}
