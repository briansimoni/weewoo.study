import type { Question } from "./question_store.ts";

/** Questions matching every word of `search`, case-insensitively. */
export function filterQuestions(
  questions: Question[],
  { category, search }: { category?: string; search?: string },
): Question[] {
  const words = (search ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  return questions.filter((q) => {
    if (category && q.category !== category) return false;
    const text = [q.question, q.explanation, q.id, ...q.choices].join(" ")
      .toLowerCase();
    return words.every((word) => text.includes(word));
  });
}
