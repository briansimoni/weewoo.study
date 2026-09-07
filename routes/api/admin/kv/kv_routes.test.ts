import { assert, assertEquals, assertRejects } from "@std/assert";
import { assertSpyCalls, spy, stub } from "@std/testing/mock";
import type { Context } from "fresh";
import type { AppState } from "../../../_middleware.ts";
import { exportKvResponse } from "./export.ts";
import { handler as importHandler, importKvResponse } from "./import.ts";

Deno.test("admin kv import handler reads ctx.req and rejects malformed JSON before opening KV", async () => {
  using openKv = stub(Deno, "openKv", () => {
    throw new Error("This handler must not open a database");
  });
  assert(typeof importHandler !== "function");
  assert(importHandler.POST);
  const req = new Request("https://example.test/api/admin/kv/import", {
    method: "POST",
    body: "not JSON",
  });
  using json = spy(req, "json");
  const response = await importHandler.POST({
    req,
    state: {},
  } as Context<AppState>);
  assertSpyCalls(json, 1);
  assert(response instanceof Response);
  assertEquals(response.status, 500);
  assertEquals(await response.json(), { error: "Failed to import KV backup" });
  assertSpyCalls(openKv, 0);
});

Deno.test("admin kv export route response returns entries envelope", async () => {
  const kv = await Deno.openKv(":memory:");

  await kv.set(["sessions", "s1"], { user_id: "u1" });

  const response = await exportKvResponse(kv);
  const body = await response.json();

  assertEquals(response.status, 200);
  assertEquals(Array.isArray(body.entries), true);
  assertEquals(body.entries.length, 1);
  assertEquals(body.entries[0].key, ["sessions", "s1"]);
  assertEquals(body.entries[0].value, { user_id: "u1" });

  kv.close();
});

Deno.test("admin kv import route response merges uploaded data", async () => {
  const kv = await Deno.openKv(":memory:");

  await kv.set(["old", "data"], "keep-me");

  const response = await importKvResponse(kv, {
    entries: [
      { key: ["users", "u1"], value: { display_name: "Brian" } },
      { key: ["counter"], value: 7 },
    ],
  }, "DEV");

  const oldData = await kv.get(["old", "data"]);
  const user = await kv.get(["users", "u1"]);
  const counter = await kv.get(["counter"]);
  const body = await response.json();

  assertEquals(response.status, 200);
  assertEquals(body.ok, true);
  assertEquals(body.imported, 2);
  assertEquals(oldData.value, "keep-me");
  assertEquals(user.value, { display_name: "Brian" });
  assertEquals(counter.value, 7);

  kv.close();
});

Deno.test("admin kv import route response returns 400 on invalid payload", async () => {
  const kv = await Deno.openKv(":memory:");

  const response = await importKvResponse(kv, {
    nope: true,
  }, "DEV");

  const body = await response.json();

  assertEquals(response.status, 400);
  assertEquals(typeof body.error, "string");

  kv.close();
});

Deno.test("admin kv import route throws when stage is PROD", async () => {
  const kv = await Deno.openKv(":memory:");

  await assertRejects(
    () =>
      importKvResponse(kv, {
        entries: [{ key: ["counter"], value: 1 }],
      }, "PROD"),
    Error,
    "KV import is blocked",
  );

  kv.close();
});
