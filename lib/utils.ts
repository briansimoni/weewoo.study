import dayjs from "npm:dayjs";
import { User } from "./user_store.ts";

/**
 * mutates the user's streak accordingly
 * but does not save to the database
 */
export function updateStreak(user: User) {
  // handle the daily streak logic
  if (!user.stats.streak.start_date) {
    user.stats.streak.start_date = dayjs().toISOString();
  }

  // if the last activity was today, no need to update
  if (
    user.stats.streak.last_date &&
    dayjs(user.stats.streak.last_date).date() === dayjs().date()
  ) {
    return user;
  }

  // if the last activity was yesterday continue the streak
  if (
    dayjs(user.stats.streak.last_date).date() ===
      dayjs().subtract(1, "day").date()
  ) {
    user.stats.streak.days += 1;
  } else {
    user.stats.streak.days = 1;
    user.stats.streak.start_date = dayjs().toString();
  }
  user.stats.streak.last_date = dayjs().toString();
  return user;
}
