import { assertEquals } from "$std/assert/assert_equals.ts";
import { exportKv, importKvReplace } from "./kv_backup.ts";

Deno.test("exportKv returns all entries", async () => {
  const kv = await Deno.openKv(":memory:");

  await kv.set(["users", "u1"], { name: "Brian" });
  await kv.set(["counter"], 42);

  const blob = await exportKv(kv);

  assertEquals(blob.entries.length, 2);

  const usersEntry = blob.entries.find((entry) =>
    JSON.stringify(entry.key) === JSON.stringify(["users", "u1"])
  );
  const counterEntry = blob.entries.find((entry) =>
    JSON.stringify(entry.key) === JSON.stringify(["counter"])
  );

  assertEquals(usersEntry?.value, { name: "Brian" });
  assertEquals(counterEntry?.value, 42);

  kv.close();
});

Deno.test("importKvReplace clears existing data and imports blob", async () => {
  const kv = await Deno.openKv(":memory:");

  await kv.set(["old", "value"], "remove-me");

  await importKvReplace(kv, {
    entries: [
      { key: ["new", "one"], value: 1 },
      { key: ["new", "two"], value: { ok: true } },
    ],
  });

  const oldValue = await kv.get(["old", "value"]);
  const newOne = await kv.get<number>(["new", "one"]);
  const newTwo = await kv.get<{ ok: boolean }>(["new", "two"]);

  assertEquals(oldValue.value, null);
  assertEquals(newOne.value, 1);
  assertEquals(newTwo.value, { ok: true });

  kv.close();
});

Deno.test("export then import roundtrip into clean database", async () => {
  const sourceKv = await Deno.openKv(":memory:");
  const targetKv = await Deno.openKv(":memory:");

  await sourceKv.set(["attempts", "a1"], { score: 10 });
  await sourceKv.set(["attempts", "a2"], { score: 20 });

  const blob = await exportKv(sourceKv);
  await importKvReplace(targetKv, blob);

  const targetBlob = await exportKv(targetKv);

  assertEquals(targetBlob.entries, blob.entries);

  sourceKv.close();
  targetKv.close();
});
