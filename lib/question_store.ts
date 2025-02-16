export interface Question {
  id: string;
  hash: string;
  created_at: string;
  question: string;
  choices: string[];
  correct_answer: string;
  explanation: string;
}

export class QuestionStore {
  constructor(private kv: Deno.Kv) {}

  private async getCount(): Promise<number> {
    const result = await this.kv.get<number>(["emt", "question_count"]);
    return result.value || 0;
  }

  async addQuestion(question: Partial<Question>) {
    // Get the current count or default to 0
    const count = await this.getCount();
    const id = count + 1;
    // Assign ID and created_at
    question.id = String(id);
    question.created_at = new Date().toISOString();
    // Atomic transaction with chained .set() calls
    const transaction = this.kv.atomic()
      .set(["emt", "questions", question.id], question)
      .set(["emt", "question_count"], count + 1);

    const result = await transaction.commit();
    if (!result.ok) {
      throw new Error("Failed to add question");
    }
    return question as Question;
  }

  async getQuestion(id: string) {
    const question =
      (await this.kv.get<Question>(["emt", "questions", id])).value;
    if (!question) {
      throw new Error("No question found");
    }
    return question;
  }

  async getRandomQuestion(): Promise<Question> {
    const count = await this.getCount();
    const randomIndex = Math.floor(Math.random() * count) + 1;
    const question =
      (await this.kv.get<Question>(["emt", "questions", String(randomIndex)]))
        .value;
    if (!question) {
      throw new Error("No question found");
    }
    return question;
  }

  async listQuestions(): Promise<Question[]> {
    const entries = this.kv.list<Question>({ prefix: ["emt", "questions"] });
    const questions: Question[] = [];
    for await (const entry of entries) {
      questions.push(entry.value);
    }
    return questions;
  }

  async deleteQuestion(id: string) {
    await this.kv.delete(["emt", "questions", id]);
  }

  closeConnection() {
    this.kv.close();
  }
}
