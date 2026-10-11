import { assertEquals } from "@std/assert";
import { filterQuestions } from "./question_filter.ts";
import type { Question } from "./question_store.ts";

function question(id: string, overrides: Partial<Question> = {}): Question {
  return {
    id,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    question: `Question ${id}`,
    choices: ["Oxygen", "Aspirin", "Nitroglycerin", "Glucose"],
    correct_answer: 0,
    explanation: "Because.",
    category: "Shock",
    scope: "emt",
    ...overrides,
  };
}

const questions = [
  question("a1", { question: "Chest pain with low blood pressure" }),
  question("b2", { category: "Airway Management", explanation: "Use a BVM" }),
  question("c3", { choices: ["Splint", "Tourniquet", "Ice", "Rest"] }),
];

Deno.test("filterQuestions matches every word in text, choices, explanation or ID", () => {
  const ids = (search: string) =>
    filterQuestions(questions, { search }).map((q) => q.id);
  assertEquals(ids(""), ["a1", "b2", "c3"]);
  assertEquals(ids("chest PRESSURE"), ["a1"]);
  assertEquals(ids("bvm"), ["b2"]);
  assertEquals(ids("tourniquet"), ["c3"]);
  assertEquals(ids("c3"), ["c3"]);
  assertEquals(ids("chest bvm"), []);
});

Deno.test("filterQuestions narrows by category", () => {
  assertEquals(
    filterQuestions(questions, { category: "Airway Management" }).map((q) =>
      q.id
    ),
    ["b2"],
  );
  assertEquals(
    filterQuestions(questions, { category: "Shock", search: "oxygen" }).map((
      q,
    ) => q.id),
    ["a1"],
  );
});
