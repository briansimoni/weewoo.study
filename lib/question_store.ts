import { getKv } from "./kv.ts";

/** Question banks: EMT, advanced (AEMT) and medic (paramedic). */
export const SCOPES = ["emt", "advanced", "medic"] as const;
export type Scope = (typeof SCOPES)[number];

/** A scope from a query parameter or request body; anything else is undefined. */
export function parseScope(value: unknown): Scope | undefined {
  return SCOPES.find((scope) => scope === value);
}

/**
 * Where a question is in its life. Only `published` questions are served:
 * they're the only ones in the random-pick indexes.
 */
export const QUESTION_STATUSES = [
  "draft",
  "in_review",
  "published",
  "retired",
] as const;
export type QuestionStatus = (typeof QUESTION_STATUSES)[number];

export interface Question {
  id: string;
  created_at: string;
  updated_at: string;
  question: string;
  choices: string[];
  correct_answer: number;
  explanation: string;
  category: string;
  scope: Scope;
  status: QuestionStatus;
  /** Who wrote it. Unset for questions that predate the field. */
  author?: "ai" | "human";
  /** 1 (easy) to 10 (hard). */
  difficulty?: number;
  tags: string[];
  /** Protocol or textbook sections that back the answer. */
  references: string[];
  /** Why each choice is right or wrong, in the order of `choices`. */
  explanation_per_choice?: string[];
  /** 1 when created, plus one for every edit. */
  version: number;
  /** Who last reviewed it: `ai:<model>`, or a credential (never a name). */
  reviewed_by?: string;
  reviewed_at?: string;
}

/** What a caller supplies to add a question; the rest gets defaults. */
export type NewQuestion =
  & Pick<
    Question,
    "question" | "choices" | "correct_answer" | "explanation" | "category"
  >
  & Partial<
    Pick<
      Question,
      | "status"
      | "author"
      | "difficulty"
      | "tags"
      | "references"
      | "explanation_per_choice"
      | "reviewed_by"
      | "reviewed_at"
    >
  >;

/** The review fields setStatus can record along with a status change. */
export type QuestionReview = Partial<
  Pick<
    Question,
    | "author"
    | "difficulty"
    | "tags"
    | "references"
    | "explanation_per_choice"
    | "reviewed_by"
    | "reviewed_at"
  >
>;

/** A question as stored before 2026-10, without the fields added then. */
export type StoredQuestion =
  & Omit<Question, "status" | "tags" | "references" | "version">
  & Partial<Pick<Question, "status" | "tags" | "references" | "version">>;

/**
 * A stored question with the fields added in 2026-10 filled in. Records saved
 * before then were all served, so they read as published, version 1.
 * lib/question_migration.ts writes the same defaults to the database.
 */
export function withQuestionDefaults(question: StoredQuestion): Question {
  return {
    ...question,
    status: question.status ?? "published",
    tags: question.tags ?? [],
    references: question.references ?? [],
    version: question.version ?? 1,
  };
}

export interface QuestionReport {
  question_id: string;
  report_id: string;
  thumbs: "up" | "down";
  reason: string;
  reported_at: string;
  user_id?: string;
  resolved_at?: string;
}

/** Reads to check and writes to apply, as part of one atomic operation. */
interface IndexPlan {
  checks: Deno.KvEntryMaybe<unknown>[];
  apply: (tx: Deno.AtomicOperation) => void;
}

/**
 * This class provides thread-safe ways to add, change and delete questions,
 * and to get published questions at random from either the global store or a
 * specific category.
 *
 * Every question has a content record (plus a copy per category, for
 * listing). Published questions are also in two indexes, one global and one
 * per category, each made of:
 * 1. An "array" - the keys are integers, and the values are the question IDs.
 * 2. A "map" - the keys are the question IDs, and the values are the indices in the array.
 * Drafts, questions in review and retired questions stay out of the indexes, so
 * they're never served.
 */
export class QuestionStore {
  private maxRetries = 5;

  constructor(
    private kv: Deno.Kv,
    private scope: Scope = "emt",
  ) {}

  static async make(kv?: Deno.Kv, scope: Scope = "emt") {
    if (!kv) {
      kv = await getKv();
    }
    return new QuestionStore(kv, scope);
  }

  /** Adds a question. It's published (served) unless `status` says otherwise. */
  async add(question: NewQuestion): Promise<Question> {
    const now = new Date().toISOString();
    return await this.insert({
      tags: [],
      references: [],
      ...question,
      id: await this.hashQuestion(question.question),
      scope: this.scope,
      status: question.status ?? "published",
      version: 1,
      created_at: now,
      updated_at: now,
    });
  }

  /** Stores a complete question, indexing it if it's published. */
  private async insert(question: Question): Promise<Question> {
    const { id, category } = question;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      const existing = await this.kv.get([this.scope, "question_content", id]);
      if (existing.value !== null) {
        throw new Error("Question already exists");
      }
      const transaction = this.kv.atomic()
        .check(existing)
        .set([this.scope, "question_content", id], question)
        .set(
          [this.scope, "category_question_content", category, id],
          question,
        );
      if (question.status === "published") {
        const plan = await this.indexAppend(id, category);
        transaction.check(...plan.checks);
        plan.apply(transaction);
      }
      if ((await transaction.commit()).ok) {
        return question;
      }
      await this.backoff(attempt); // retry after contention
    }
    throw new Error("Insert failed after max retries");
  }

  /** Appends a question to the end of the global and category indexes. */
  private async indexAppend(
    questionId: string,
    category: string,
  ): Promise<IndexPlan> {
    const map = await this.kv.get<number>([
      this.scope,
      "global_question_map",
      questionId,
    ]);
    if (map.value !== null) {
      throw new Error("Question is already indexed");
    }
    const globalCount = await this.kv.get<number>([
      this.scope,
      "global_question_count",
    ]);
    const categoryCount = await this.kv.get<number>([
      this.scope,
      "category_question_count",
      category,
    ]);
    const g = globalCount.value ?? 0;
    const c = categoryCount.value ?? 0;
    return {
      checks: [map, globalCount, categoryCount],
      apply: (tx) => {
        tx
          .set([this.scope, "global_question_index", g], questionId)
          .set([this.scope, "global_question_map", questionId], g)
          .set([this.scope, "global_question_count"], g + 1)
          .set(
            [this.scope, "category_question_index", category, c],
            questionId,
          )
          .set(
            [this.scope, "category_question_map", category, questionId],
            c,
          )
          .set([this.scope, "category_question_count", category], c + 1);
      },
    };
  }

  /**
   * Removes a question from the indexes by moving the last entry of each into
   * its slot. Resolves null when the question isn't indexed (not published).
   */
  private async indexRemove(
    questionId: string,
    category: string,
  ): Promise<IndexPlan | null> {
    const globalMap = await this.kv.get<number>([
      this.scope,
      "global_question_map",
      questionId,
    ]);
    const categoryMap = await this.kv.get<number>([
      this.scope,
      "category_question_map",
      category,
      questionId,
    ]);
    if (globalMap.value === null && categoryMap.value === null) return null;
    if (globalMap.value === null || categoryMap.value === null) {
      throw new Error(`Question ${questionId} is only half indexed`);
    }
    const globalIndex = globalMap.value;
    const categoryIndex = categoryMap.value;

    const globalCount = await this.kv.get<number>([
      this.scope,
      "global_question_count",
    ]);
    const globalLastIndex = (globalCount.value ?? 0) - 1;
    const globalLast = await this.kv.get<string>([
      this.scope,
      "global_question_index",
      globalLastIndex,
    ]);
    const categoryCount = await this.kv.get<number>([
      this.scope,
      "category_question_count",
      category,
    ]);
    const categoryLastIndex = (categoryCount.value ?? 0) - 1;
    const categoryLast = await this.kv.get<string>([
      this.scope,
      "category_question_index",
      category,
      categoryLastIndex,
    ]);

    return {
      checks: [
        globalMap,
        categoryMap,
        globalCount,
        globalLast,
        categoryCount,
        categoryLast,
      ],
      apply: (tx) => {
        tx
          .delete([this.scope, "global_question_map", questionId])
          .delete([this.scope, "global_question_index", globalLastIndex])
          .set([this.scope, "global_question_count"], globalLastIndex)
          .delete([this.scope, "category_question_map", category, questionId])
          .delete([
            this.scope,
            "category_question_index",
            category,
            categoryLastIndex,
          ])
          .set(
            [this.scope, "category_question_count", category],
            categoryLastIndex,
          );
        const lastId = globalLast.value;
        if (lastId && lastId !== questionId) {
          tx
            .set([this.scope, "global_question_index", globalIndex], lastId)
            .set([this.scope, "global_question_map", lastId], globalIndex);
        }
        const categoryLastId = categoryLast.value;
        if (categoryLastId && categoryLastId !== questionId) {
          tx
            .set(
              [this.scope, "category_question_index", category, categoryIndex],
              categoryLastId,
            )
            .set(
              [this.scope, "category_question_map", category, categoryLastId],
              categoryIndex,
            );
        }
      },
    };
  }

  /**
   * Deletes a question, taking it out of the indexes if it's published. It
   * does not delete the related question reports.
   */
  async delete(questionId: string): Promise<void> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      const entry = await this.kv.get<StoredQuestion>([
        this.scope,
        "question_content",
        questionId,
      ]);
      if (entry.value === null) {
        throw new Error("Question not found");
      }
      const { category } = entry.value;
      const transaction = this.kv.atomic()
        .check(entry)
        .delete([this.scope, "question_content", questionId])
        .delete([
          this.scope,
          "category_question_content",
          category,
          questionId,
        ]);
      const plan = await this.indexRemove(questionId, category);
      if (plan) {
        transaction.check(...plan.checks);
        plan.apply(transaction);
      }
      if ((await transaction.commit()).ok) {
        return;
      }
      await this.backoff(attempt);
    }
    throw new Error("Delete failed after max retries");
  }

  /**
   * Changes a question's status, and with it whether it's served: publishing
   * adds it to the indexes, any other status takes it out. `review` records
   * review metadata in the same write.
   */
  async setStatus(
    questionId: string,
    status: QuestionStatus,
    review: QuestionReview = {},
  ): Promise<Question> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      const entry = await this.kv.get<StoredQuestion>([
        this.scope,
        "question_content",
        questionId,
      ]);
      if (entry.value === null) {
        throw new Error("Question not found");
      }
      const current = withQuestionDefaults(entry.value);
      const updated: Question = {
        ...current,
        ...review,
        status,
        updated_at: new Date().toISOString(),
      };
      const transaction = this.kv.atomic()
        .check(entry)
        .set([this.scope, "question_content", questionId], updated)
        .set(
          [
            this.scope,
            "category_question_content",
            current.category,
            questionId,
          ],
          updated,
        );
      // The indexes, not the stored status, say whether it's served now.
      const indexed = (await this.kv.get<number>([
        this.scope,
        "global_question_map",
        questionId,
      ])).value !== null;
      const plan = status === "published" && !indexed
        ? await this.indexAppend(questionId, current.category)
        : status !== "published" && indexed
        ? await this.indexRemove(questionId, current.category)
        : null;
      if (plan) {
        transaction.check(...plan.checks);
        plan.apply(transaction);
      }
      if ((await transaction.commit()).ok) {
        return updated;
      }
      await this.backoff(attempt);
    }
    throw new Error("Status change failed after max retries");
  }

  /**
   * Updates an existing question's content. Its status can't change here
   * (use setStatus), and its version goes up by one. If the question text
   * changes enough to generate a new hash/ID, or the category changes, the old
   * question is replaced by one with the new ID and its reports move with it.
   *
   * @param question The question to update with all fields including ID
   * @returns The updated question, which may have a new ID if content changed significantly
   */
  async updateQuestion(question: Question): Promise<Question> {
    const oldQuestion = await this.getQuestionById(question.id);
    const calculatedId = await this.hashQuestion(question.question);
    const updatedQuestion: Question = {
      ...question,
      status: oldQuestion.status,
      version: oldQuestion.version + 1,
      created_at: oldQuestion.created_at,
      updated_at: new Date().toISOString(),
    };

    // Same ID and category: the indexes don't change.
    if (
      calculatedId === question.id &&
      oldQuestion.category === question.category
    ) {
      for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
        const transaction = this.kv.atomic()
          .set([this.scope, "question_content", question.id], updatedQuestion)
          .set([
            this.scope,
            "category_question_content",
            question.category,
            question.id,
          ], updatedQuestion);

        if ((await transaction.commit()).ok) {
          return updatedQuestion;
        }
        await this.backoff(attempt);
      }
      throw new Error("Update failed after max retries");
    }

    // A new ID or category: replace the old question.
    const questionReports = await this.getQuestionReports(question.id);
    await this.delete(question.id);
    const addedQuestion = await this.insert({
      ...updatedQuestion,
      id: calculatedId,
    });

    // Move the reports to the new question ID.
    for (const report of questionReports) {
      await this.kv.delete([
        this.scope,
        "question_reports",
        question.id,
        report.report_id,
      ]);
      await this.kv.set(
        [this.scope, "question_reports", addedQuestion.id, report.report_id],
        { ...report, question_id: addedQuestion.id },
      );
    }
    return addedQuestion;
  }

  async getQuestionById(questionId: string): Promise<Question> {
    const questionResult = await this.kv.get<StoredQuestion>([
      this.scope,
      "question_content",
      questionId,
    ]);
    if (!questionResult.value) {
      throw new Error("Question not found");
    }
    return withQuestionDefaults(questionResult.value);
  }

  /**
   * List all questions, optionally filtered by category
   * @param category Optional category to filter questions by
   * @returns Array of questions, filtered by category if specified
   */
  async listQuestions(category?: string): Promise<Question[]> {
    const questions: Question[] = [];

    if (category) {
      // If a category is provided, use the category content index for optimal performance
      // This uses the category_question_content index directly with a cursor
      const cursor = this.kv.list<StoredQuestion>({
        prefix: [this.scope, "category_question_content", category],
      });

      // Collect all questions for this category using the cursor
      for await (const { value } of cursor) {
        if (value) {
          questions.push(withQuestionDefaults(value));
        }
      }
    } else {
      // If no category is provided, scan all questions
      const cursor = this.kv.list<StoredQuestion>({
        prefix: [this.scope, "question_content"],
      });

      for await (const { value } of cursor) {
        if (value) {
          questions.push(withQuestionDefaults(value));
        }
      }
    }

    return questions;
  }

  /** Random question from any category */
  async getRandom(): Promise<Question> {
    const { value: count } = await this.kv.get<number>([
      this.scope,
      "global_question_count",
    ]);
    if (!count) throw new Error("No questions");

    const randomArray = new Uint32Array(1);
    crypto.getRandomValues(randomArray);
    // Converts to 0-1 range: Divides by the maximum 32-bit unsigned integer value + 1 to get a float between 0 and 1
    const randomFloat = randomArray[0] / (0xFFFFFFFF + 1); // Convert to 0-1 range
    const randomIndex = Math.floor(randomFloat * count);
    const questionIdResult = await this.kv.get<string>([
      this.scope,
      "global_question_index",
      randomIndex,
    ]);
    if (!questionIdResult.value) throw new Error("No questions");

    const question = (await this.kv.get<StoredQuestion>([
      this.scope,
      "question_content",
      questionIdResult.value,
    ])).value;
    if (!question) throw new Error("No questions");

    return withQuestionDefaults(question);
  }

  /** Random question limited to a category */
  async getRandomByCategory(category: string): Promise<Question> {
    const { value: count } = await this.kv.get<number>([
      this.scope,
      "category_question_count",
      category,
    ]);
    if (!count) {
      throw new Error("No questions in category");
    }

    const randomCategoryIndex = Math.floor(Math.random() * count);
    const questionIdResult = await this.kv.get<string>([
      this.scope,
      "category_question_index",
      category,
      randomCategoryIndex,
    ]);
    if (!questionIdResult.value) {
      throw new Error("No questions in category");
    }

    const question = (await this.kv.get<StoredQuestion>([
      this.scope,
      "question_content",
      questionIdResult.value,
    ])).value;
    if (!question) {
      throw new Error("No questions in category");
    }

    return withQuestionDefaults(question);
  }

  /** How many questions are published (served), optionally in a category. */
  async size(category?: string): Promise<number> {
    if (category) {
      return (await this.kv.get<number>([
        this.scope,
        "category_question_count",
        category,
      ])).value ?? 0;
    }
    return (await this.kv.get<number>([this.scope, "global_question_count"]))
      .value ?? 0;
  }

  async reportQuestion(params: {
    question_id: string;
    thumbs: "up" | "down";
    reason: string;
    user_id?: string;
  }) {
    const { question_id, thumbs, reason, user_id } = params;

    // Check if the question exists first
    await this.getQuestionById(question_id);

    const reportedAt = new Date().toISOString();
    const reportId = crypto.randomUUID();

    // Save the report
    await this.kv.set(
      [this.scope, "question_reports", question_id, reportId],
      {
        question_id,
        thumbs,
        reason,
        reported_at: reportedAt,
        user_id,
        report_id: reportId,
      },
    );
  }

  async getReportById({
    questionId,
    reportId,
  }: {
    questionId: string;
    reportId: string;
  }): Promise<QuestionReport> {
    const report = await this.kv.get<QuestionReport>([
      this.scope,
      "question_reports",
      questionId,
      reportId,
    ]);
    if (!report.value) {
      throw new Error("Report not found");
    }
    return report.value;
  }

  async resolveReport({
    questionId,
    reportId,
  }: {
    questionId: string;
    reportId: string;
  }) {
    const report = await this.getReportById({ questionId, reportId });
    await this.kv.set([
      this.scope,
      "question_reports",
      questionId,
      reportId,
    ], {
      ...report,
      resolved_at: new Date().toISOString(),
    });
  }

  /**
   * Retrieves all question reports.
   * Each report includes the question_id, thumbs (up/down), reason, and timestamp.
   */
  async getQuestionReports(question_id?: string): Promise<QuestionReport[]> {
    const reports: QuestionReport[] = [];
    const key = [this.scope, "question_reports"];
    if (question_id) {
      key.push(question_id);
    }
    const iter = this.kv.list<QuestionReport>({ prefix: key });

    for await (const entry of iter) {
      const report = entry.value;
      reports.push(report);
    }

    // Sort reports by reported_at, most recent first
    return reports.sort((a, b) => {
      return new Date(b.reported_at).getTime() -
        new Date(a.reported_at).getTime();
    });
  }

  async deleteQuestionReports(question_id: string): Promise<void> {
    const reports = await this.getQuestionReports(question_id);
    for (const report of reports) {
      await this.kv.delete([
        this.scope,
        "question_reports",
        question_id,
        report.report_id,
      ]);
    }
  }

  // this is a weak attempt at making sure we don't add duplicate questions
  private async hashQuestion(
    question: string,
  ): Promise<string> {
    const data = new TextEncoder().encode(
      question.trim().toLowerCase(),
    );
    const hash = await crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(hash)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  private async backoff(attempt: number) {
    const base = 50; // ms
    const max = 1000;
    const delay = Math.min(Math.random() * base * 2 ** attempt, max);
    await new Promise((r) => setTimeout(r, delay));
  }
}
