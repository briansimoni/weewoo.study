import { assertEquals } from "$std/assert/assert_equals.ts";
import { assertRejects } from "$std/assert/assert_rejects.ts";
import { exportKvResponse } from "./export.ts";
import { importKvResponse } from "./import.ts";

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

Deno.test("admin kv import route response replaces existing data", async () => {
  const kv = await Deno.openKv(":memory:");

  await kv.set(["old", "data"], "to-delete");

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
  assertEquals(oldData.value, null);
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
