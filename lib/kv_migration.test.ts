import { assertEquals } from "@std/assert";
import { migrateBackup, planEntry } from "./kv_migration.ts";

const NOW = Date.parse("2026-11-11T12:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;

Deno.test("planEntry copies ordinary entries unchanged", () => {
  assertEquals(planEntry(["users", "u1"], {}, NOW), { action: "copy" });
  assertEquals(planEntry(["emt", "question_content", "q1"], {}, NOW), {
    action: "copy",
  });
});

Deno.test("planEntry skips legacy keys", () => {
  for (
    const key of [["jokes", "j1"], ["emt", "questions", "q1"], [
      "emt",
      "question_count",
    ]]
  ) {
    assertEquals(planEntry(key, 1, NOW), { action: "skip", reason: "legacy" });
  }
});

Deno.test("planEntry gives sessions a fresh 30 days", () => {
  assertEquals(planEntry(["sessions", "s1"], {}, NOW), {
    action: "copy",
    options: { expireIn: 30 * DAY_MS },
  });
});

Deno.test("planEntry expires streaks at expires_on and drops dead ones", () => {
  assertEquals(
    planEntry(["streaks", "u1"], { expires_on: "2026-11-12T12:00:00Z" }, NOW),
    { action: "copy", options: { expireIn: DAY_MS } },
  );
  assertEquals(
    planEntry(["streaks", "u1"], { expires_on: "2026-11-10T12:00:00Z" }, NOW),
    { action: "skip", reason: "expired streak" },
  );
  assertEquals(planEntry(["streaks", "u1"], {}, NOW), {
    action: "skip",
    reason: "expired streak",
  });
});

Deno.test("planEntry keeps finished Stripe events only", () => {
  assertEquals(planEntry(["stripe_events", "e1"], { status: "done" }, NOW), {
    action: "copy",
    options: { expireIn: 30 * DAY_MS },
  });
  assertEquals(
    planEntry(["stripe_events", "e1"], { status: "processing" }, NOW),
    { action: "skip", reason: "unfinished Stripe event" },
  );
});

Deno.test("migrateBackup writes the planned entries and counts them", async () => {
  using kv = await Deno.openKv(":memory:");
  const summary = await migrateBackup(kv, {
    entries: [
      { key: ["users", "u1"], value: { name: "one" } },
      { key: ["users", "u2"], value: { name: "two" } },
      { key: ["emt", "global_question_index", 0], value: "q1" },
      { key: ["jokes", "j1"], value: "old" },
      { key: ["streaks", "u1"], value: { expires_on: "2020-01-01" } },
    ],
  }, { now: NOW, concurrency: 2 });

  assertEquals(summary, {
    copied: { users: 2, emt: 1 },
    skipped: { legacy: 1, "expired streak": 1 },
  });
  assertEquals((await kv.get(["users", "u2"])).value, { name: "two" });
  assertEquals((await kv.get(["emt", "global_question_index", 0])).value, "q1");
  assertEquals((await kv.get(["jokes", "j1"])).value, null);
});
