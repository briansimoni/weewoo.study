import dayjs from "npm:dayjs";
import { getKv } from "./kv.ts";

export type Streak = {
  days: number;
  start_date: string;
  last_activity: string;
  expires_on: string;
};

export class StreakStore {
  private constructor(private kv: Deno.Kv) {}

  static async make(kv?: Deno.Kv) {
    if (!kv) {
      kv = await getKv();
    }
    return new StreakStore(kv);
  }

  /**
   * get will get the streak object and it will also purge it from the database if it's expired.
   * Deno kv's expireIn seems sus. Plus the documentation says that it's not guaranteed to get
   * removed from the database the moment it expires.
   */
  async get(user_id: string) {
    const streak = (await this.kv.get<Streak>(["streaks", user_id])).value;
    if (streak && dayjs().isAfter(dayjs(streak.expires_on))) {
      await this.delete(user_id);
    }
    return streak;
  }

  // handles basically all of the logic for updating the streak
  // creates the object if it isn't there and increments the streak if updated
  // during a certain time frame. Otherwise it will be a noop and return current streak
  async update(user_id: string) {
    const streak = await this.get(user_id);
    // create if it doesn't exist
    if (!streak) {
      const newStreak: Streak = {
        days: 1,
        start_date: dayjs().toISOString(),
        last_activity: dayjs().toISOString(),
        expires_on: dayjs().add(2, "day").toISOString(),
      };
      const result = await this.kv.set(["streaks", user_id], newStreak, {
        expireIn: 2 * 24 * 60 * 60 * 1000, // database will TTL this object in 2 days
      });
      if (!result.ok) {
        throw new Error("Failed to update streak");
      }
      return newStreak;
    }

    const now = dayjs();
    // it has been more than 1 day and because the streak exists it hasn't expired
    if (now.isAfter(dayjs(streak.expires_on).subtract(1, "day"))) {
      const updatedStreak: Streak = {
        days: streak.days + 1,
        start_date: streak.start_date,
        last_activity: now.toISOString(),
        expires_on: dayjs().add(2, "day").toISOString(),
      };

      const result = await this.kv.set(["streaks", user_id], updatedStreak, {
        expireIn: 2 * 24 * 60 * 60 * 1000, // database will TTL this object in 2 days
      });
      if (!result.ok) {
        throw new Error("Failed to update streak");
      }
      return updatedStreak;
    }

    // no-op. return current streak
    return streak;
  }

  async delete(user_id: string) {
    await this.kv.delete(["streaks", user_id]);
  }

  closeConnection() {
    this.kv.close();
  }
}
