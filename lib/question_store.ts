import { getKv } from "./kv.ts";

export interface Question {
  id: string;
  created_at: string;
  updated_at: string;
  question: string;
  choices: string[];
  correct_answer: number;
  explanation: string;
  category: string;
  scope: "emt" | "advanced" | "medic";
}

export interface QuestionReport {
  question_id: string;
  report_id: string;
  thumbs: "up" | "down";
  reason: string;
  reported_at: string;
  user_id?: string;
}

/**
 * This class provides thread-safe ways to both add and delete questions.
 * It also provides a way to get questions at random from either the global
 * store or a specific category.
 *
 * It works by using two data structures to keep track of where the questions are.
 * 1. An "array" - the keys are integers, and the values are the question IDs.
 * 2. A "map" - the keys are the question IDs, and the values are the indices in the array.
 */
export class QuestionStore {
  private maxRetries = 5;

  constructor(
    private kv: Deno.Kv,
    private scope: "emt" | "advanced" | "medic" = "emt",
  ) {}

  static async make(kv?: Deno.Kv, scope: "emt" | "advanced" | "medic" = "emt") {
    if (!kv) {
      kv = await getKv();
    }
    return new QuestionStore(kv, scope);
  }

  async add(
    question: Omit<Question, "id" | "created_at" | "updated_at" | "scope">,
  ): Promise<Question> {
    const questionId = await this.hashQuestion(question.question);
    const category = question.category;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      /* lookups */
      const globalQuestionMapping = await this.kv.get([
        this.scope,
        "global_question_map",
        questionId,
      ]);
      if (globalQuestionMapping.value !== null) {
        throw new Error("Question already exists");
      }

      const globalQuestionCountResult = await this.kv.get<number>([
        this.scope,
        "global_question_count",
      ]);
      const globalQuestionCount = globalQuestionCountResult.value ?? 0;

      const categoryQuestionCountResult = await this.kv.get<number>([
        this.scope,
        "category_question_count",
        category,
      ]);
      const categoryQuestionCount = categoryQuestionCountResult.value ?? 0;

      const questionToInsert = {
        ...question,
        id: questionId,
        scope: this.scope,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const transaction = this.kv.atomic()
        /* ensure nothing changed meanwhile */
        .check(globalQuestionMapping)
        .check(globalQuestionCountResult)
        .check(categoryQuestionCountResult)
        /* store question body */
        .set([this.scope, "question_content", questionId], questionToInsert)
        /* --- global index updates --- */
        .set(
          [this.scope, "global_question_index", globalQuestionCount],
          questionId,
        )
        .set(
          [this.scope, "global_question_map", questionId],
          globalQuestionCount,
        )
        .set([this.scope, "global_question_count"], globalQuestionCount + 1)
        /* --- category index updates --- */
        .set(
          [
            this.scope,
            "category_question_index",
            category,
            categoryQuestionCount,
          ],
          questionId,
        )
        .set(
          [this.scope, "category_question_map", category, questionId],
          categoryQuestionCount,
        )
        .set(
          [this.scope, "category_question_content", category, questionId],
          questionToInsert,
        )
        .set(
          [this.scope, "category_question_count", category],
          categoryQuestionCount + 1,
        );

      if ((await transaction.commit()).ok) {
        return questionToInsert;
      }
      await this.backoff(attempt); // retry after contention
    }
    throw new Error("Insert failed after max retries");
  }

  /**
   * The way delete works is by first finding the index that the question exists at
   * and then swapping it with the question at the last index. Then we update the map
   * by deleting the question that we wanted to delete, and then updating the index
   * of the question that we swapped with. The total question count is then decremented.
   */
  async delete(questionId: string): Promise<void> {
    const questionResult = await this.kv.get<Question>([
      this.scope,
      "question_content",
      questionId,
    ]);
    if (questionResult.value === null) {
      throw new Error("Question not found");
    }
    const category = questionResult.value.category;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      /* lookups we must keep consistent */
      const globalIndexMapping = await this.kv.get<number>([
        this.scope,
        "global_question_map",
        questionId,
      ]);
      const globalIndex = globalIndexMapping.value;
      if (globalIndex === null) {
        throw new Error("Question not found");
      }

      const globalCountResult = await this.kv.get<number>([
        this.scope,
        "global_question_count",
      ]);
      const globalCount = globalCountResult.value ?? 0;
      const globalLastIndex = globalCount - 1;
      const globalLastIdResult = await this.kv.get<string>([
        this.scope,
        "global_question_index",
        globalLastIndex,
      ]);
      const globalLastId = globalLastIdResult.value;

      const categoryIndexMapping = await this.kv.get<number>([
        this.scope,
        "category_question_map",
        category,
        questionId,
      ]);
      const categoryIndex = categoryIndexMapping.value;
      if (categoryIndex === null) {
        throw new Error("Question not found");
      }
      const categoryCountResult = await this.kv.get<number>([
        this.scope,
        "category_question_count",
        category,
      ]);
      const categoryCount = categoryCountResult.value ?? 0;
      const categoryLastIndex = categoryCount - 1;
      const categoryLastIdResult = await this.kv.get<string>([
        this.scope,
        "category_question_index",
        category,
        categoryLastIndex,
      ]);
      const categoryLastId = categoryLastIdResult.value;

      const transaction = this.kv.atomic()
        .check(globalIndexMapping)
        .check(globalCountResult)
        .check(globalLastIdResult)
        .check(categoryIndexMapping)
        .check(categoryCountResult)
        .check(categoryLastIdResult)
        /* ---------- global swap-delete ---------- */
        .delete([this.scope, "global_question_map", questionId])
        .delete([this.scope, "global_question_index", globalLastIndex])
        .set([this.scope, "global_question_count"], globalLastIndex);

      if (globalLastId && globalLastId !== questionId) {
        transaction.set(
          [this.scope, "global_question_index", globalIndex],
          globalLastId,
        )
          .set([this.scope, "global_question_map", globalLastId], globalIndex);
      }

      /* ---------- category swap-delete ---------- */
      transaction.delete([
        this.scope,
        "category_question_map",
        category,
        questionId,
      ]);
      transaction.delete([
        this.scope,
        "category_question_index",
        category,
        categoryLastIndex,
      ]);
      transaction.set(
        [this.scope, "category_question_count", category],
        categoryLastIndex,
      );

      if (categoryLastId && categoryLastId !== questionId) {
        transaction.set(
          [this.scope, "category_question_index", category, categoryIndex],
          categoryLastId,
        )
          .set(
            [this.scope, "category_question_map", category, categoryLastId],
            categoryIndex,
          );
      }

      transaction.delete([this.scope, "question_content", questionId]);
      transaction.delete([
        this.scope,
        "category_question_content",
        category,
        questionId,
      ]);

      if ((await transaction.commit()).ok) {
        return;
      }
      await this.backoff(attempt);
    }
    throw new Error("Delete failed after max retries");
  }

  /**
   * Updates an existing question. If the question text changes significantly enough to
   * generate a new hash/ID, this method will handle removing the old question and adding
   * the new one with all references updated properly.
   *
   * @param question The question to update with all fields including ID
   * @returns The updated question, which may have a new ID if content changed significantly
   */
  async updateQuestion(question: Question): Promise<Question> {
    // First, verify the question exists
    const oldQuestion = await this.getQuestionById(question.id);

    const oldCategory = oldQuestion.category;
    const newCategory = question.category;

    // Calculate what the ID should be based on the new question text
    const calculatedId = await this.hashQuestion(question.question);

    // If the question text hasn't changed enough to affect the ID, we can do a simple update
    if (calculatedId === question.id && oldCategory === newCategory) {
      // The ID is the same, so we just need to update the content
      const updatedQuestion = {
        ...question,
        updated_at: new Date().toISOString(),
      };

      for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
        const transaction = this.kv.atomic()
          .set([this.scope, "question_content", question.id], updatedQuestion)
          .set([
            this.scope,
            "category_question_content",
            newCategory,
            question.id,
          ], updatedQuestion);

        if ((await transaction.commit()).ok) {
          return updatedQuestion;
        }
        await this.backoff(attempt);
      }
      throw new Error("Update failed after max retries");
    }

    // The hash/ID has changed or the category changed, so we need to do a more complex update
    // This requires deleting the old question and adding a new one
    const newQuestion = {
      ...question,
      id: calculatedId, // Use the new calculated ID
      updated_at: new Date().toISOString(),
    };

    // Start a transaction for the complex case
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const questionReports = await this.getQuestionReports(question.id);

        // Delete the old question
        await this.delete(question.id);

        // Now add the new question with the new ID/hash
        // We have to modify this to work with our add method which expects certain fields to be omitted
        const {
          id: _id,
          created_at: _created_at,
          updated_at: _updated_at,
          scope: _scope,
          ...addableQuestion
        } = newQuestion;
        const addedQuestion = await this.add(addableQuestion);

        // Update all reports to reference the new question ID
        if (questionReports.length > 0) {
          // Process each report entry

          for (const report of questionReports) {
            await this.kv.delete([
              this.scope,
              "question_reports",
              question.id,
              report.report_id,
            ]);

            // Create a new report with the updated question_id but preserving all other data
            await this.kv.set(
              [
                this.scope,
                "question_reports",
                addedQuestion.id,
                report.report_id,
              ],
              { ...report, question_id: addedQuestion.id },
            );
          }
        }

        return addedQuestion;
      } catch (error: unknown) {
        if (attempt >= this.maxRetries) {
          const errorMessage = error instanceof Error
            ? error.message
            : String(error);
          throw new Error(`Complex update failed: ${errorMessage}`);
        }
        await this.backoff(attempt);
      }
    }

    throw new Error("Update failed after max retries");
  }

  async getQuestionById(questionId: string): Promise<Question> {
    const questionResult = await this.kv.get<Question>([
      this.scope,
      "question_content",
      questionId,
    ]);
    if (!questionResult.value) {
      throw new Error("Question not found");
    }
    return questionResult.value;
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
      const cursor = this.kv.list<Question>({
        prefix: [this.scope, "category_question_content", category],
      });

      // Collect all questions for this category using the cursor
      for await (const { value } of cursor) {
        if (value) {
          questions.push(value);
        }
      }
    } else {
      // If no category is provided, scan all questions
      const cursor = this.kv.list<Question>({
        prefix: [this.scope, "question_content"],
      });

      for await (const { value } of cursor) {
        if (value) {
          questions.push(value);
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

    const randomIndex = Math.floor(Math.random() * count);
    const questionIdResult = await this.kv.get<string>([
      this.scope,
      "global_question_index",
      randomIndex,
    ]);
    if (!questionIdResult.value) throw new Error("No questions");

    const question = (await this.kv.get<Question>([
      this.scope,
      "question_content",
      questionIdResult.value,
    ])).value;
    if (!question) throw new Error("No questions");

    return question;
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

    const question = (await this.kv.get<Question>([
      this.scope,
      "question_content",
      questionIdResult.value,
    ])).value;
    if (!question) {
      throw new Error("No questions in category");
    }

    return question;
  }

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
