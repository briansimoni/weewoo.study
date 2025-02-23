import { getKv } from "./kv.ts";

export interface UserStats {
  streak: {
    days: number;
    start_date?: string;
    last_date?: string;
  };
  questions_answered: number;
  questions_correct: number;
}

export interface User {
  user_id: string;
  display_name: string;
  created_at: string;
  stats: UserStats;
}

export interface LeaderBoardEntry {
  user_id: string;
  display_name: string;
  questions_correct: number;
}

export class UserStore {
  private constructor(private kv: Deno.Kv) {}

  static async make(kv?: Deno.Kv) {
    if (!kv) {
      kv = await getKv();
    }
    return new UserStore(kv);
  }

  async createUser(user: User) {
    // Assign ID and created_at
    user.created_at = new Date().toISOString();
    const result = await this.kv.atomic()
      .check({ key: ["users", user.user_id], versionstamp: null })
      .set(["users", user.user_id], user)
      .commit();

    if (!result.ok) {
      throw new Error("Failed to add user");
    }
    return user as User;
  }

  async getUser(id: string) {
    const user = (await this.kv.get<User>(["users", id])).value;
    return user;
  }

  async updateUser(user: Partial<User> & { user_id: string }) {
    const initialUser = await this.getUser(user.user_id);
    if (!initialUser) {
      throw new Error("User not found");
    }
    const proposedUpdate = { ...initialUser, ...user };

    const oldCorrect = initialUser?.stats?.questions_correct ?? 0;
    const newCorrect = proposedUpdate.stats?.questions_correct ?? 0;

    const txn = this.kv.atomic()
      .mutate({
        type: "set",
        key: ["users", user.user_id],
        value: proposedUpdate,
      });

    // Only delete old entry if it exists
    // and the stats have actually changed
    if (
      oldCorrect >= 0 &&
      initialUser.stats.questions_answered !==
        proposedUpdate.stats.questions_answered
    ) {
      txn.mutate({
        type: "delete",
        key: ["leaderboard", "questions_correct", oldCorrect, user.user_id],
      });
    }

    txn.mutate({
      type: "set",
      key: ["leaderboard", "questions_correct", newCorrect, user.user_id],
      value: {
        user_id: user.user_id,
        display_name: user.display_name,
        questions_correct: newCorrect,
      },
    });

    const result = await txn.commit();
    if (!result.ok) {
      throw new Error("Failed to update leaderboard");
    }
    return proposedUpdate as User;
  }

  // TODO: infinite scroll
  async listLeaderbaord() {
    const entries = [];
    try {
      for await (
        const entry of this.kv.list<LeaderBoardEntry>({
          prefix: ["leaderboard", "questions_correct"],
        }, {
          reverse: true,
          limit: 10,
        })
      ) {
        entries.push(entry);
      }
    } catch (error) {
      console.error("Error listing top streaks:", error);
    }

    return entries.map((entry) => entry.value);
  }

  async listUsers() {
    const entries = [];
    try {
      for await (
        const entry of this.kv.list<User>({
          prefix: ["users"],
        })
      ) {
        entries.push(entry);
      }
    } catch (error) {
      console.error("Error listing users:", error);
    }

    return entries.map((entry) => entry.value);
  }

  async deleteUser(id: string) {
    throw new Error("not implemented");
  }

  closeConnection() {
    this.kv.close();
  }
}
