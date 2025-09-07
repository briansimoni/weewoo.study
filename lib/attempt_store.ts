import dayjs from "dayjs";
import { Category } from "./categories.ts";
import { getKv } from "./kv.ts";
import durationPlugin from "dayjs/plugin/duration.js";

dayjs.extend(durationPlugin);

export interface Attempt {
  attempt_id: string;
  user_id: string;
  question_id: string;
  category: Category;
  timestamp_started: string;
  timestamp_submitted: string;
  response_time_ms: number;
  selected_choice_index: number;
  is_correct: boolean;
  attempt_number_for_question: number;
  reviewed_explanation_ms?: number;
  retry_interval_hours?: number;
}

export class AttemptStore {
  private constructor(private kv: Deno.Kv) {}

  static async make(kv?: Deno.Kv) {
    if (!kv) {
      kv = await getKv();
    }
    return new AttemptStore(kv);
  }

  async addAttempt(attempt: Attempt) {
    const { user_id, question_id, attempt_id } = attempt;
    if (isNaN(new Date(attempt_id).getTime())) {
      throw new Error("attempt id must be a valid iso date string");
    }
    const tx = this.kv.atomic();
    tx.set(["attempts", "by_attempt_id", user_id, attempt_id], attempt);
    tx.set(
      ["attempts", "by_question_id", user_id, question_id, attempt_id],
      attempt,
    );
    await tx.commit();
  }

  async listByUserId(user_id: string) {
    const attempts: Attempt[] = [];
    const iter = this.kv.list<Attempt>({
      prefix: ["attempts", "by_attempt_id", user_id],
    });
    for await (const entry of iter) {
      attempts.push(entry.value);
    }
    return attempts;
  }

  async listWithLookbackWindow(
    params: { user_id: string; duration?: ReturnType<typeof dayjs.duration> },
  ) {
    const { user_id } = params;
    const duration = params.duration || dayjs.duration(30, "days");

    const iter = this.kv.list<Attempt>({
      start: [
        "attempts",
        "by_attempt_id",
        user_id,
        dayjs().subtract(duration).toISOString(),
      ],
      prefix: ["attempts", "by_attempt_id", user_id],
    });
    const attempts: Attempt[] = [];
    for await (const entry of iter) {
      attempts.push(entry.value);
    }
    return attempts;
  }

  async listByQuestionId({
    user_id,
    question_id,
  }: {
    user_id: string;
    question_id: string;
  }) {
    const attempts: Attempt[] = [];
    const iter = this.kv.list<Attempt>({
      prefix: ["attempts", "by_question_id", user_id, question_id],
    });
    for await (const entry of iter) {
      attempts.push(entry.value);
    }
    return attempts;
  }

  async getAttempt(
    { user_id, attempt_id }: { user_id: string; attempt_id: string },
  ): Promise<Attempt> {
    const result = await this.kv.get<Attempt>([
      "attempts",
      "by_attempt_id",
      user_id,
      attempt_id,
    ]);
    if (!result.value) {
      throw new Error("attempt not found");
    }
    return result.value;
  }

  async deleteAttempt(
    { user_id, attempt_id, question_id }: {
      user_id: string;
      attempt_id: string;
      question_id: string;
    },
  ) {
    const tx = this.kv.atomic();
    tx.delete(["attempts", "by_attempt_id", user_id, attempt_id]);
    tx.delete(["attempts", "by_question_id", user_id, question_id, attempt_id]);
    await tx.commit();
  }

  closeConnection() {
    this.kv.close();
  }
}
