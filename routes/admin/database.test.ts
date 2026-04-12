import { assertEquals, assertRejects } from "@std/assert";
import { buildDownloadResponse, importFromJsonText } from "./database.tsx";

Deno.test("database page download helper returns attachment response", async () => {
  const kv = await Deno.openKv(":memory:");
  await kv.set(["users", "u1"], { display_name: "Brian" });

  const response = await buildDownloadResponse(kv);
  const contentDisposition = response.headers.get("Content-Disposition");
  const body = await response.json();

  assertEquals(response.status, 200);
  assertEquals(response.headers.get("Content-Type"), "application/json");
  assertEquals(contentDisposition?.includes("attachment; filename="), true);
  assertEquals(Array.isArray(body.entries), true);
  assertEquals(body.entries.length, 1);

  kv.close();
});

Deno.test("database page requires upload confirmation checkbox", () => {
  const formData = new FormData();
  formData.set("action", "upload");

  const confirmed = formData.get("confirm_upload") === "on";

  assertEquals(confirmed, false);
});

Deno.test("database page import helper merges data in non-prod stage", async () => {
  const kv = await Deno.openKv(":memory:");
  await kv.set(["old", "entry"], "keep-me");

  const imported = await importFromJsonText(
    kv,
    JSON.stringify({
      entries: [
        { key: ["users", "u1"], value: { display_name: "Brian" } },
        { key: ["counter"], value: 9 },
      ],
    }),
    "DEV",
  );

  const oldEntry = await kv.get(["old", "entry"]);
  const user = await kv.get(["users", "u1"]);
  const counter = await kv.get(["counter"]);

  assertEquals(imported, 2);
  assertEquals(oldEntry.value, "keep-me");
  assertEquals(user.value, { display_name: "Brian" });
  assertEquals(counter.value, 9);

  kv.close();
});

Deno.test("database page import helper throws when stage is PROD", async () => {
  const kv = await Deno.openKv(":memory:");

  await assertRejects(
    () =>
      importFromJsonText(
        kv,
        JSON.stringify({ entries: [{ key: ["counter"], value: 1 }] }),
        "PROD",
      ),
    Error,
    "KV import is blocked",
  );

  kv.close();
});

Deno.test("database page import helper throws when stage is undefined", async () => {
  const kv = await Deno.openKv(":memory:");

  await assertRejects(
    () =>
      importFromJsonText(
        kv,
        JSON.stringify({ entries: [{ key: ["counter"], value: 1 }] }),
        undefined,
      ),
    Error,
    "KV import is blocked",
  );

  kv.close();
});
