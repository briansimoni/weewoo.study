import { assertEquals } from "@std/assert";
import { apiErrorMessage, request } from "./admin_product_api.ts";

function respond(status: number, body?: unknown): typeof fetch {
  return () =>
    Promise.resolve(
      new Response(body === undefined ? "not json" : JSON.stringify(body), {
        status,
      }),
    );
}

Deno.test("apiErrorMessage joins zod details onto the error", () => {
  assertEquals(
    apiErrorMessage({
      error: "Validation failed",
      details: [{ field: "price", message: "Expected number" }, "Plain"],
    }, "fallback"),
    "Validation failed: price: Expected number; Plain",
  );
  assertEquals(apiErrorMessage({ error: "Nope" }, "fallback"), "Nope");
  assertEquals(apiErrorMessage(undefined, "fallback"), "fallback");
  assertEquals(apiErrorMessage({ error: "" }, "fallback"), "fallback");
});

Deno.test("request returns the body on success", async () => {
  const result = await request(
    "/x",
    { method: "GET" },
    "Failed",
    respond(200, { success: true, product: { name: "Mug" } }),
  );
  assertEquals(result, {
    ok: true,
    data: { success: true, product: { name: "Mug" } },
  });
});

Deno.test("request turns error statuses, success:false and network errors into messages", async () => {
  assertEquals(
    await request(
      "/x",
      { method: "GET" },
      "Failed",
      respond(404, {
        error: "Product not found",
      }),
    ),
    { ok: false, error: "Product not found" },
  );
  assertEquals(
    await request(
      "/x",
      { method: "GET" },
      "Failed",
      respond(200, {
        success: false,
        error: "Stripe said no",
      }),
    ),
    { ok: false, error: "Stripe said no" },
  );
  assertEquals(
    await request("/x", { method: "GET" }, "Failed", respond(502)),
    { ok: false, error: "Failed (HTTP 502)" },
  );
  assertEquals(
    await request(
      "/x",
      { method: "GET" },
      "Failed",
      () => Promise.reject(new TypeError("offline")),
    ),
    { ok: false, error: "Failed: offline" },
  );
});

Deno.test("request sends JSON bodies with a content type", async () => {
  let seen: Request | undefined;
  await request(
    "http://example.test/x",
    { method: "PUT", body: JSON.stringify({ a: 1 }) },
    "Failed",
    (input, init) => {
      seen = new Request(input, init);
      return Promise.resolve(new Response("{}"));
    },
  );
  assertEquals(seen?.headers.get("content-type"), "application/json");
  assertEquals(await seen?.json(), { a: 1 });
});
