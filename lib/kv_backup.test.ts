import { assertEquals } from "$std/assert/assert_equals.ts";
import { exportKv, importKvUpsert, isKvBackupBlob } from "./kv_backup.ts";

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

Deno.test("importKvUpsert merges uploaded data into existing database", async () => {
  const kv = await Deno.openKv(":memory:");

  await kv.set(["old", "value"], "keep-me");

  await importKvUpsert(kv, {
    entries: [
      { key: ["new", "one"], value: 1 },
      { key: ["new", "two"], value: { ok: true } },
    ],
  });

  const oldValue = await kv.get(["old", "value"]);
  const newOne = await kv.get<number>(["new", "one"]);
  const newTwo = await kv.get<{ ok: boolean }>(["new", "two"]);

  assertEquals(oldValue.value, "keep-me");
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
  await importKvUpsert(targetKv, blob);

  const targetBlob = await exportKv(targetKv);

  assertEquals(targetBlob.entries, blob.entries);

  sourceKv.close();
  targetKv.close();
});

Deno.test("exportKv preserves null and deeply nested values", async () => {
  const kv = await Deno.openKv(":memory:");

  const nestedValue = {
    profile: {
      name: "Brian",
      preferences: {
        theme: null,
        flags: [true, false, null],
      },
    },
  };

  await kv.set(["nullable"], null);
  await kv.set(["nested", "object"], nestedValue);

  const blob = await exportKv(kv);

  const nullEntry = blob.entries.find((entry) =>
    JSON.stringify(entry.key) === JSON.stringify(["nullable"])
  );
  const nestedEntry = blob.entries.find((entry) =>
    JSON.stringify(entry.key) === JSON.stringify(["nested", "object"])
  );

  assertEquals(nullEntry?.value, null);
  assertEquals(nestedEntry?.value, nestedValue);

  kv.close();
});

Deno.test("importKvUpsert supports keys with Uint8Array parts", async () => {
  const kv = await Deno.openKv(":memory:");

  const byteKey = new Uint8Array([1, 2, 3]);
  await importKvUpsert(kv, {
    entries: [
      { key: ["bytes", byteKey], value: { ok: true } },
    ],
  });

  const entry = await kv.get<{ ok: boolean }>(["bytes", byteKey]);
  assertEquals(entry.value, { ok: true });

  kv.close();
});

Deno.test("importKvUpsert with empty entries leaves existing data unchanged", async () => {
  const kv = await Deno.openKv(":memory:");

  await kv.set(["one"], 1);
  await kv.set(["two"], 2);

  await importKvUpsert(kv, { entries: [] });

  const blob = await exportKv(kv);
  assertEquals(blob.entries.length, 2);

  kv.close();
});

Deno.test("isKvBackupBlob validates expected shape", () => {
  assertEquals(isKvBackupBlob({ entries: [] }), true);
  assertEquals(
    isKvBackupBlob({
      entries: [{ key: ["users", "u1"], value: undefined }],
    }),
    true,
  );

  assertEquals(isKvBackupBlob(null), false);
  assertEquals(isKvBackupBlob({}), false);
  assertEquals(isKvBackupBlob({ entries: {} }), false);
  assertEquals(isKvBackupBlob({ entries: [{ value: 1 }] }), false);
  assertEquals(isKvBackupBlob({ entries: ["bad-entry"] }), false);
});
