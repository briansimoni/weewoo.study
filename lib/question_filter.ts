import type { Question, QuestionStatus } from "./question_store.ts";

/**
 * Questions in the category and status (when given) matching every word of
 * `search`, case-insensitively.
 */
export function filterQuestions(
  questions: Question[],
  { category, search, status }: {
    category?: string;
    search?: string;
    status?: QuestionStatus;
  },
): Question[] {
  const words = (search ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  return questions.filter((q) => {
    if (category && q.category !== category) return false;
    if (status && q.status !== status) return false;
    const text = [q.question, q.explanation, q.id, ...q.choices].join(" ")
      .toLowerCase();
    return words.every((word) => text.includes(word));
  });
}
