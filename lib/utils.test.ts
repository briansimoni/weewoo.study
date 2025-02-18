import dayjs from "npm:dayjs";
import { updateStreak } from "./utils.ts";
import { assertEquals } from "$std/assert/assert_equals.ts";
import { User } from "./user_store.ts";

Deno.test("updateStreak initializes streak if not present", () => {
  const user = {
    stats: {
      streak: {
        start_date: null,
        last_date: null,
        days: 0,
      },
    },
  } as unknown as User;

  const updatedUser = updateStreak(user);

  assertEquals(updatedUser.stats.streak.days, 1);
  assertEquals(
    dayjs(updatedUser.stats.streak.start_date).isSame(dayjs(), "day"),
    true,
  );
  assertEquals(
    dayjs(updatedUser.stats.streak.last_date).isSame(dayjs(), "day"),
    true,
  );
});

Deno.test(
  "updateStreak continues streak if last date was yesterday",
  () => {
    const yesterday = dayjs().subtract(1, "day").toISOString();

    const user = {
      stats: {
        streak: {
          start_date: yesterday,
          last_date: yesterday,
          days: 5,
        },
      },
    } as unknown as User;

    const updatedUser = updateStreak(user);

    assertEquals(updatedUser.stats.streak.days, 6);
    assertEquals(
      dayjs(updatedUser.stats.streak.last_date).isSame(dayjs(), "day"),
      true,
    );
  },
);

Deno.test("updateStreak does not increment streak if last date is today", () => {
  const today = dayjs().toISOString();

  const user = {
    stats: {
      streak: {
        start_date: today,
        last_date: today,
        days: 3,
      },
    },
  } as unknown as User;

  const updatedUser = updateStreak(user);

  assertEquals(updatedUser.stats.streak.days, 3);
  assertEquals(
    dayjs(updatedUser.stats.streak.last_date).isSame(dayjs(), "day"),
    true,
  );
});

Deno.test("updateStreak resets streak if last date is more than one day ago", () => {
  const twoDaysAgo = dayjs().subtract(2, "day").toISOString();

  const user = {
    stats: {
      streak: {
        start_date: twoDaysAgo,
        last_date: twoDaysAgo,
        days: 5,
      },
    },
  } as unknown as User;

  const updatedUser = updateStreak(user);

  assertEquals(updatedUser.stats.streak.days, 1);
  assertEquals(
    dayjs(updatedUser.stats.streak.start_date).isSame(dayjs(), "day"),
    true,
  );
  assertEquals(
    dayjs(updatedUser.stats.streak.last_date).isSame(dayjs(), "day"),
    true,
  );
});
