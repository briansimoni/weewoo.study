import { assertEquals, assertRejects } from "@std/assert";
import { forEachSqsMessage, serveLambda } from "./runtime.ts";

interface Call {
  url: string;
  method: string;
  body: unknown;
  errorType: string | null;
}

/** A fake Runtime API that hands out the given events in order. */
function fakeRuntimeApi(events: unknown[]) {
  const calls: Call[] = [];
  let next = 0;
  const fakeFetch = ((input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/invocation/next")) {
      const id = `req-${next + 1}`;
      return Promise.resolve(
        new Response(JSON.stringify(events[next++]), {
          headers: { "lambda-runtime-aws-request-id": id },
        }),
      );
    }
    calls.push({
      url,
      method: init?.method ?? "GET",
      body: JSON.parse(String(init?.body)),
      errorType: new Headers(init?.headers).get(
        "Lambda-Runtime-Function-Error-Type",
      ),
    });
    return Promise.resolve(new Response(null, { status: 202 }));
  }) as typeof fetch;
  return { calls, fakeFetch };
}

Deno.test("serveLambda posts each handler result for its request ID", async () => {
  const { calls, fakeFetch } = fakeRuntimeApi([{ n: 1 }, { n: 2 }]);
  await serveLambda({
    api: "127.0.0.1:9001",
    fetch: fakeFetch,
    maxInvocations: 2,
    handler: (event) =>
      Promise.resolve({ doubled: (event as { n: number }).n * 2 }),
  });
  assertEquals(calls.map((c) => [c.url, c.method, c.body]), [
    [
      "http://127.0.0.1:9001/2018-06-01/runtime/invocation/req-1/response",
      "POST",
      { doubled: 2 },
    ],
    [
      "http://127.0.0.1:9001/2018-06-01/runtime/invocation/req-2/response",
      "POST",
      { doubled: 4 },
    ],
  ]);
});

Deno.test("serveLambda reports a thrown error and keeps serving", async () => {
  const { calls, fakeFetch } = fakeRuntimeApi([{ fail: true }, {
    fail: false,
  }]);
  const seen: string[] = [];
  await serveLambda({
    api: "api",
    fetch: fakeFetch,
    maxInvocations: 2,
    onError: (_error, requestId) => seen.push(requestId),
    handler: (event) => {
      if ((event as { fail: boolean }).fail) throw new TypeError("boom");
      return Promise.resolve(undefined);
    },
  });
  assertEquals(
    calls[0].url,
    "http://api/2018-06-01/runtime/invocation/req-1/error",
  );
  assertEquals(calls[0].errorType, "Unhandled");
  const error = calls[0].body as { errorMessage: string; errorType: string };
  assertEquals([error.errorMessage, error.errorType], ["boom", "TypeError"]);
  assertEquals(seen, ["req-1"]);
  // A handler that returns nothing still answers, with JSON null.
  assertEquals(
    calls[1].url,
    "http://api/2018-06-01/runtime/invocation/req-2/response",
  );
  assertEquals(calls[1].body, null);
});

Deno.test("serveLambda stops when the Runtime API fails", async () => {
  const failing =
    (() =>
      Promise.resolve(new Response("nope", { status: 500 }))) as typeof fetch;
  await assertRejects(
    () =>
      serveLambda({
        api: "api",
        fetch: failing,
        handler: () => Promise.resolve(),
      }),
    Error,
    "Runtime API returned 500",
  );
});

Deno.test("forEachSqsMessage reports only the messages that failed", async () => {
  const handled: string[] = [];
  const result = await forEachSqsMessage(
    {
      Records: [
        { messageId: "a", body: "ok-1" },
        { messageId: "b", body: "bad" },
        { messageId: "c", body: "ok-2" },
      ],
    },
    (body) => {
      if (body === "bad") throw new Error("nope");
      handled.push(body);
      return Promise.resolve();
    },
  );
  assertEquals(handled, ["ok-1", "ok-2"]);
  assertEquals(result, { batchItemFailures: [{ itemIdentifier: "b" }] });
});
