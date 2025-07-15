import { getKv } from "./kv.ts";
import { Category, CategoryStats } from "./categories.ts";

export interface UserStats {
  questions_answered: number;
  questions_correct: number;
  categories?: Partial<Record<Category, CategoryStats>>;
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

  async updateUser(
    user: Partial<User> & { user_id: string },
    categoryId?: string,
    isCorrect?: boolean,
  ) {
    const initialUser = await this.getUser(user.user_id);
    if (!initialUser) {
      throw new Error("User not found");
    }

    // Make a deep copy of initialUser to avoid reference issues with nested objects
    const proposedUpdate = JSON.parse(JSON.stringify(initialUser));

    // Update top-level properties from the user parameter
    for (const [key, value] of Object.entries(user)) {
      if (key !== "stats" && key !== "categories") {
        proposedUpdate[key] = value;
      }
    }

    // Handle stats updates separately to properly merge category stats
    if (user.stats) {
      // Update top-level stats
      proposedUpdate.stats.questions_answered = user.stats.questions_answered ??
        proposedUpdate.stats.questions_answered;
      proposedUpdate.stats.questions_correct = user.stats.questions_correct ??
        proposedUpdate.stats.questions_correct;

      // If user.stats contains categories, merge them
      if (user.stats.categories) {
        proposedUpdate.stats.categories = proposedUpdate.stats.categories || {};
        for (const [catId, catStats] of Object.entries(user.stats.categories)) {
          proposedUpdate.stats.categories[catId] = {
            ...proposedUpdate.stats.categories[catId] ||
              { questions_answered: 0, questions_correct: 0 },
            ...catStats,
          };
        }
      }
    }

    // If categoryId is provided, update the specific category stats
    if (categoryId) {
      // Initialize categories if not exists
      if (!proposedUpdate.stats.categories) {
        proposedUpdate.stats.categories = {};
      }

      // Initialize category if not exists
      if (!proposedUpdate.stats.categories[categoryId]) {
        proposedUpdate.stats.categories[categoryId] = {
          questions_answered: 0,
          questions_correct: 0,
        };
      }

      // Increment questions answered for this category
      proposedUpdate.stats.categories[categoryId].questions_answered++;

      // If the answer was correct, increment correct count
      if (isCorrect) {
        proposedUpdate.stats.categories[categoryId].questions_correct++;
      }
    }

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
          limit: 100,
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
