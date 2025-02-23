// questions_crud_test.ts
import {
  assertArrayIncludes,
  assertEquals,
  assertNotEquals,
  assertRejects,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { Question, QuestionStore } from "./question_store.ts";
import { assertExists } from "$std/assert/assert_exists.ts";

let questionStore: QuestionStore;
let kv: Deno.Kv;

async function setup() {
  kv = await Deno.openKv(":memory:");
  questionStore = await QuestionStore.make(kv);
}

function teardown() {
  questionStore.closeConnection();
}

// Sample question for tests
const sampleQuestion: Partial<Question> = {
  question: "What is the normal respiratory rate for an adult?",
  choices: ["6-12", "12-20", "20-30", "30-40"],
  correct_answer: "12-20",
  explanation: "Normal adult respiratory rate is 12-20 breaths per minute.",
};

Deno.test("Add a question", async () => {
  await setup();

  const q = await questionStore.addQuestion(sampleQuestion);
  const question = await questionStore.getQuestion(q.id);

  assertEquals(question?.question, sampleQuestion.question);
  assertEquals(question?.correct_answer, sampleQuestion.correct_answer);
  assertEquals(question?.choices, sampleQuestion.choices);
  assertExists(question.hash);
  teardown();
});

Deno.test("Get a random question", async () => {
  await setup();

  await questionStore.addQuestion(sampleQuestion);
  const randomQuestion = await questionStore.getRandomQuestion();

  assertEquals(randomQuestion.question, sampleQuestion.question);
  assertEquals(randomQuestion.correct_answer, sampleQuestion.correct_answer);
  teardown();
});

Deno.test("List questions", async () => {
  await setup();

  await questionStore.addQuestion(sampleQuestion);
  await questionStore.addQuestion({
    ...sampleQuestion,
    question: "What is the normal heart rate for an adult?",
  });

  const questions = await questionStore.listQuestions();
  const questionTexts = questions.map((q) => q.question);

  assertArrayIncludes(questionTexts, [
    sampleQuestion.question!,
    "What is the normal heart rate for an adult?",
  ]);
  teardown();
});

Deno.test("Delete a question", async () => {
  await setup();

  await questionStore.addQuestion(sampleQuestion);
  const questionBefore = (await kv.get<Question>(["emt", "questions", "1"]))
    .value;
  assertNotEquals(questionBefore, null);

  await questionStore.deleteQuestion("1");
  const questionAfter = (await kv.get<Question>(["emt", "questions", "1"]))
    .value;

  const count = await questionStore.getCount();
  assertEquals(questionAfter, null);
  assertEquals(count, 0);
  teardown();
});

Deno.test("Get random question throws error if none exist", async () => {
  await setup();

  await assertRejects(
    async () => {
      await questionStore.getRandomQuestion();
    },
    Error,
    "No question found",
  );
  teardown();
});
