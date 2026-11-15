import { assertEquals } from "@std/assert";
import {
  clientIp,
  type HttpApiEvent,
  httpApiHandler,
  toRequest,
  toResult,
} from "./http.ts";

function event(overrides: Partial<HttpApiEvent> = {}): HttpApiEvent {
  return {
    rawPath: "/shop",
    rawQueryString: "",
    headers: {
      host: "abc123.execute-api.us-east-1.amazonaws.com",
      "x-forwarded-host": "test.weewoo.study",
      "x-forwarded-for": "203.0.113.9, 10.0.0.1",
    },
    requestContext: { http: { method: "GET", sourceIp: "10.0.0.1" } },
    ...overrides,
  };
}

Deno.test("toRequest uses the viewer's host, path and query", () => {
  const request = toRequest(event({ rawQueryString: "a=1&b=two" }));
  assertEquals(request.url, "https://test.weewoo.study/shop?a=1&b=two");
  assertEquals(request.method, "GET");
  assertEquals(request.headers.get("host"), "test.weewoo.study");
});

Deno.test("toRequest falls back to the Host header without a forwarded host", () => {
  const request = toRequest(event({ headers: { host: "api.example.com" } }));
  assertEquals(request.url, "https://api.example.com/shop");
});

Deno.test("toRequest joins cookies and drops the origin secret", () => {
  const request = toRequest(event({
    cookies: ["session=abc", "theme=dark"],
    headers: { host: "h", "x-origin-secret": "s3cret" },
  }));
  assertEquals(request.headers.get("cookie"), "session=abc; theme=dark");
  assertEquals(request.headers.get("x-origin-secret"), null);
});

Deno.test("toRequest decodes text and base64 bodies", async () => {
  const post = { http: { method: "POST" } };
  const text = toRequest(event({ requestContext: post, body: "a=1" }));
  assertEquals(await text.text(), "a=1");

  const binary = toRequest(event({
    requestContext: post,
    body: btoa("\u0000ÿ\u0010"),
    isBase64Encoded: true,
  }));
  assertEquals(
    [...new Uint8Array(await binary.arrayBuffer())],
    [0, 255, 16],
  );
});

Deno.test("clientIp is the first forwarded address, then the source IP", () => {
  assertEquals(clientIp(event()), "203.0.113.9");
  assertEquals(clientIp(event({ headers: {} })), "10.0.0.1");
});

Deno.test("toResult base64-encodes the body and separates cookies", async () => {
  const headers = new Headers({ "content-type": "image/png" });
  headers.append("set-cookie", "a=1; Path=/");
  headers.append("set-cookie", "b=2; Path=/");
  const bytes = new Uint8Array(100_000).map((_, i) => i % 256);
  const result = await toResult(new Response(bytes, { status: 201, headers }));

  assertEquals(result.statusCode, 201);
  assertEquals(result.headers, { "content-type": "image/png" });
  assertEquals(result.cookies, ["a=1; Path=/", "b=2; Path=/"]);
  assertEquals(result.isBase64Encoded, true);
  const decoded = Uint8Array.from(atob(result.body), (c) => c.charCodeAt(0));
  assertEquals(decoded, bytes);
});

Deno.test("httpApiHandler passes the viewer's address and returns the response", async () => {
  let seen: { url: string; ip: string } | undefined;
  const handler = httpApiHandler((request, info) => {
    seen = { url: request.url, ip: info.remoteAddr.hostname };
    return new Response("hello", { status: 200 });
  });
  const result = await handler(event());
  assertEquals(seen, {
    url: "https://test.weewoo.study/shop",
    ip: "203.0.113.9",
  });
  assertEquals([result.statusCode, atob(result.body)], [200, "hello"]);
});

Deno.test("httpApiHandler refuses requests without the origin secret", async () => {
  let called = false;
  const handler = httpApiHandler(() => {
    called = true;
    return new Response("ok");
  }, { originSecret: "s3cret" });

  const refused: Record<string, string>[] = [{}, {
    "x-origin-secret": "wrong",
  }];
  for (const headers of refused) {
    const result = await handler(event({ headers }));
    assertEquals(result.statusCode, 403);
  }
  assertEquals(called, false);

  const ok = await handler(event({ headers: { "x-origin-secret": "s3cret" } }));
  assertEquals(ok.statusCode, 200);
  assertEquals(called, true);
});
