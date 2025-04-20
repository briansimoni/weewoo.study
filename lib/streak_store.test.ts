import { assertEquals } from "$std/assert/assert_equals.ts";
import { StreakStore } from "./streak_store.ts";
import { assert } from "$std/assert/assert.ts";
import dayjs from "npm:dayjs";

let streakStore: StreakStore;
let kv: Deno.Kv;

async function setup() {
  kv = await Deno.openKv(":memory:");
  streakStore = await StreakStore.make(kv);
}

function teardown() {
  streakStore.closeConnection();
}

Deno.test("update streak will create the object if it doesn't exist", async () => {
  await setup();
  const streak = await streakStore.update("user1");
  assertEquals(streak.days, 1);
  assert(dayjs().isSame(streak.start_date, "day"));
  assert(dayjs().isSame(streak.last_activity, "day"));
  assert(dayjs().add(2, "day").isSame(streak.expires_on, "day"));
  teardown();
});

Deno.test("update streak will increment if 24 hours after last activity", async () => {
  await setup();
  const streakStart = dayjs().subtract(1, "day").subtract(1, "hour");
  await kv.set(["streaks", "user1"], {
    days: 1,
    start_date: streakStart.toISOString(),
    last_activity: streakStart.toISOString(),
    expires_on: streakStart.add(2, "day").toISOString(),
  });
  const streak = await streakStore.update("user1");
  assertEquals(streak.days, 2);
  assertEquals(streak.start_date, streakStart.toISOString());
  assert(dayjs().isSame(streak.last_activity, "day"));
  assert(dayjs().add(2, "day").isSame(streak.expires_on, "day"));
  teardown();
});

Deno.test("update streak will only update last_activity if you're within the first 24 hours", async () => {
  await setup();
  const streakStart = dayjs().subtract(12, "hour");
  await kv.set(["streaks", "user1"], {
    days: 1,
    start_date: streakStart.toISOString(),
    last_activity: streakStart.toISOString(),
    expires_on: streakStart.add(2, "day").toISOString(),
  });
  const { last_activity } = (await streakStore.get("user1"))!;
  const streak = await streakStore.update("user1");
  assertEquals(streak.days, 1);
  assertEquals(streak.start_date, streakStart.toISOString());
  assert(dayjs().isSame(streak.last_activity, "day"));
  // assert that last_activity was updated
  assert(last_activity !== streak.last_activity);
  assert(streakStart.add(2, "day").isSame(streak.expires_on, "day"));
  teardown();
});
