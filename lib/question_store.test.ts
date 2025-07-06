// question_store2.test.ts
import {
  assert,
  assertEquals,
  assertRejects,
  assertStrictEquals,
} from "jsr:@std/assert";
import { QuestionStore } from "./question_store.ts";

type QuestionInput = {
  question: string;
  choices: [string, string, string, string];
  correct_answer: number;
  explanation: string;
  category: string;
};

Deno.test("can add question and retreive that same question", async () => {
  const kv = await Deno.openKv(":memory:");
  const store = await QuestionStore.make(kv);

  await store.add({
    question: "What is the capital of Spain?",
    choices: ["Barcelona", "Valencia", "Madrid", "Seville"] as [
      string,
      string,
      string,
      string,
    ],
    correct_answer: 2,
    explanation: "Madrid is the capital of Spain",
    category: "Geography",
  });

  const question = await store.getRandom();
  assert(question);
  assertEquals("What is the capital of Spain?", question.question);
  assertEquals("Madrid is the capital of Spain", question.explanation);
  assertEquals("Geography", question.category);
  assertEquals(2, question.correct_answer);

  kv.close();
});

Deno.test("adding a duplicate question fails", async () => {
  const kv = await Deno.openKv(":memory:");
  const store = await QuestionStore.make(kv);

  const question = {
    question: "What is the capital of Spain?",
    choices: ["Barcelona", "Valencia", "Madrid", "Seville"],
    correct_answer: 2,
    explanation: "Madrid is the capital of Spain",
    category: "Geography",
  };

  await store.add(question);

  // Try adding the same question again - should throw an error
  await assertRejects(
    () => store.add(question),
    Error,
    "Question already exists",
  );

  kv.close();
});

Deno.test("concurrent writes will succeed", async () => {
  const kv = await Deno.openKv(":memory:");
  const store = await QuestionStore.make(kv);

  const questions: QuestionInput[] = [];
  for (let i = 0; i < 30; i++) {
    questions.push({
      question: `Question ${i}`,
      choices: ["a", "b", "c", "d"] as const,
      correct_answer: 0,
      explanation: `This is explanation ${i}`,
      category: "TestCategory",
    });
  }

  // Write all questions concurrently
  await Promise.all(questions.map((q) => store.add(q)));

  // Check that all questions were written
  assertStrictEquals(await store.size(), 30);

  kv.close();
});

Deno.test("adding two different questions to two different categories result in the correct count", async () => {
  const kv = await Deno.openKv(":memory:");
  const store = await QuestionStore.make(kv);

  await store.add({
    question: "Question One",
    choices: ["a", "b", "c", "d"],
    correct_answer: 0,
    explanation: "Explanation One",
    category: "Category1",
  });

  await store.add({
    question: "Question Two",
    choices: ["a", "b", "c", "d"],
    correct_answer: 0,
    explanation: "Explanation Two",
    category: "Category2",
  });

  const categoryCount1 = await store.size("Category1");
  const categoryCount2 = await store.size("Category2");
  const totalCount = await store.size();

  assertStrictEquals(categoryCount1, 1);
  assertStrictEquals(categoryCount2, 1);
  assertStrictEquals(totalCount, 2);

  kv.close();
});

Deno.test("adding two questions and then deleting one of them works", async () => {
  const kv = await Deno.openKv(":memory:");
  const store = await QuestionStore.make(kv);

  await store.add({
    question: "Question One",
    choices: ["a", "b", "c", "d"],
    correct_answer: 0,
    explanation: "Explanation One",
    category: "TestCategory",
  });

  const q2 = await store.add({
    question: "Question Two",
    choices: ["a", "b", "c", "d"],
    correct_answer: 0,
    explanation: "Explanation Two",
    category: "TestCategory",
  });

  // Verify we have 2 questions
  assertStrictEquals(await store.size(), 2);

  await store.delete(q2.id);

  // Verify deleting the same ID again returns false (already deleted)
  try {
    await store.delete(q2.id);
    throw new Error("Delete should have failed");
  } catch (error) {
    assert(error instanceof Error);
    assert(error.message === "Question not found");
  }

  // Verify we have 1 question left
  assertStrictEquals(await store.size(), 1);

  // Verify we can still get the remaining question
  const remaining = await store.getRandomByCategory("TestCategory");
  assert(remaining);
  assert(
    remaining.question === "Question One",
    "Should get the correct remaining question",
  );

  kv.close();
});

Deno.test("adding three questions and then deleting the second question works", async () => {
  const kv = await Deno.openKv(":memory:");
  const store = await QuestionStore.make(kv);

  await store.add({
    question: "Question One",
    choices: ["a", "b", "c", "d"],
    correct_answer: 0,
    explanation: "Explanation One",
    category: "TestCategory",
  });

  const q2 = await store.add({
    question: "Question Two",
    choices: ["a", "b", "c", "d"],
    correct_answer: 0,
    explanation: "Explanation Two",
    category: "TestCategory",
  });

  await store.add({
    question: "Question Three",
    choices: ["a", "b", "c", "d"],
    correct_answer: 0,
    explanation: "Explanation Three",
    category: "TestCategory",
  });

  // Delete Question Two
  await store.delete(q2.id);

  // Verify we have 2 questions left
  assertStrictEquals(await store.size(), 2);

  kv.close();
});

Deno.test("listing questions with and without category filter works", async () => {
  const kv = await Deno.openKv(":memory:");
  const store = await QuestionStore.make(kv);

  // Create questions in different categories
  const questions = [
    {
      question: "What's the capital of France?",
      choices: ["London", "Berlin", "Paris", "Madrid"],
      correct_answer: 2,
      explanation: "Paris is the capital of France",
      category: "Geography",
    },
    {
      question: "What's 2+2?",
      choices: ["1", "3", "4", "5"],
      correct_answer: 2,
      explanation: "2+2=4",
      category: "Math",
    },
    {
      question: "What's the capital of Germany?",
      choices: ["London", "Berlin", "Paris", "Madrid"] as [
        string,
        string,
        string,
        string,
      ],
      correct_answer: 1,
      explanation: "Berlin is the capital of Germany",
      category: "Geography",
    },
  ];

  // Add all questions
  for (const q of questions) {
    await store.add(q);
  }

  // Verify we have 3 questions total
  assertStrictEquals(await store.size(), 3);

  // Test listing all questions
  const allQuestions = await store.listQuestions();
  assertStrictEquals(allQuestions.length, 3, "Should find all 3 questions");

  // Test listing questions by category
  const geoQuestions = await store.listQuestions("Geography");
  assertStrictEquals(
    geoQuestions.length,
    2,
    "Should find 2 geography questions",
  );
  assert(
    geoQuestions.every((q) => q.category === "Geography"),
    "All questions should be Geography category",
  );

  const mathQuestions = await store.listQuestions("Math");
  assertStrictEquals(mathQuestions.length, 1, "Should find 1 math question");
  assert(
    mathQuestions.every((q) => q.category === "Math"),
    "All questions should be Math category",
  );

  // Test with non-existent category
  const nonExistentCategoryQuestions = await store.listQuestions("NonExistent");
  assertStrictEquals(
    nonExistentCategoryQuestions.length,
    0,
    "Should find 0 questions for non-existent category",
  );

  kv.close();
});

Deno.test("getQuestionById retrieves the correct question", async () => {
  const kv = await Deno.openKv(":memory:");
  const store = await QuestionStore.make(kv);

  // Create and add a test question
  const testQuestion = {
    question: "What's the capital of France?",
    choices: ["London", "Berlin", "Paris", "Madrid"],
    correct_answer: 2,
    explanation: "Paris is the capital of France",
    category: "Geography",
  };

  await store.add(testQuestion);

  // Get the ID from a random question (should be our test question)
  const randomQuestion = await store.getRandom();
  const id = randomQuestion.id;

  // Use getQuestionById to retrieve the question
  const retrievedQuestion = await store.getQuestionById(id);

  // Verify it's the correct question
  assertEquals(retrievedQuestion.question, testQuestion.question);
  assertEquals(retrievedQuestion.choices, testQuestion.choices);
  assertEquals(retrievedQuestion.category, testQuestion.category);

  // Test non-existent ID
  try {
    await store.getQuestionById("non-existent-id");
    assert(false, "Should have thrown an error for non-existent question ID");
  } catch (e) {
    assert(e instanceof Error, "Expected Error to be thrown");
    assert(
      e.message.includes("not found"),
      "Error message should mention question not found",
    );
  }

  kv.close();
});

Deno.test("can report issues with questions", async () => {
  const kv = await Deno.openKv(":memory:");
  const store = await QuestionStore.make(kv, "emt");

  // Add a test question
  const q = await store.add({
    question: "What is the recommended dosage of medication X?",
    choices: ["5mg", "10mg", "15mg", "20mg"],
    correct_answer: 1,
    explanation: "10mg is the correct dosage",
    category: "Medications",
  });

  const questionId = q.id;

  // Report a thumbs up for the question
  await store.reportQuestion({
    question_id: questionId,
    thumbs: "up",
    reason: "Great question, well-structured!",
    user_id: "user123",
  });

  // Report a thumbs down for the same question
  await store.reportQuestion({
    question_id: questionId,
    thumbs: "down",
    reason: "The answer is outdated",
  });

  // Try reporting for a question that doesn't exist
  await assertRejects(
    async () => {
      await store.reportQuestion({
        question_id: "non-existent-id",
        thumbs: "down",
        reason: "Bad question",
      });
    },
    Error,
    "Question not found",
  );

  kv.close();
});

Deno.test("can retrieve question reports", async () => {
  const kv = await Deno.openKv(":memory:");
  // Use a different scope to ensure isolation
  const store = await QuestionStore.make(kv, "medic");

  // Add two questions
  const q1 = await store.add({
    question: "What is the primary treatment for condition A?",
    choices: [
      "Treatment X",
      "Treatment Y",
      "Treatment Z",
      "Treatment W",
    ],
    correct_answer: 2,
    explanation: "Treatment Z is correct",
    category: "Treatments",
  });

  const q2 = await store.add({
    question: "Which of these is not a symptom of condition B?",
    choices: ["Symptom 1", "Symptom 2", "Symptom 3", "Symptom 4"] as const,
    correct_answer: 3,
    explanation: "Symptom 4 is not associated with condition B",
    category: "Symptoms",
  });

  // Add reports with different timestamps to test sorting
  // First report (older)
  await store.reportQuestion({
    question_id: q1.id,
    thumbs: "down",
    reason: "Need more context",
    user_id: "user456",
  });

  // Wait a bit to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 10));

  // Second report (newer)
  await store.reportQuestion({
    question_id: q2.id,
    thumbs: "up",
    reason: "Very clear question",
    user_id: "user789",
  });

  // Get all reports
  const reports = await store.getQuestionReports();

  // There should be 2 reports
  assertEquals(reports.length, 2);

  // The reports should be sorted by time, most recent first
  assertEquals(reports[0].question_id, q2.id); // Should be the second question's report
  assertEquals(reports[0].thumbs, "up");
  assertEquals(reports[0].reason, "Very clear question");
  assertEquals(reports[0].user_id, "user789");

  assertEquals(reports[1].question_id, q1.id); // Should be the first question's report
  assertEquals(reports[1].thumbs, "down");
  assertEquals(reports[1].reason, "Need more context");
  assertEquals(reports[1].user_id, "user456");

  kv.close();
});

Deno.test("simple question updates work", async () => {
  const kv = await Deno.openKv(":memory:");
  const store = await QuestionStore.make(kv);

  // Add a test question
  const addedQuestion = await store.add({
    question: "What is the capital of Spain?",
    choices: ["Barcelona", "Valencia", "Madrid", "Seville"],
    correct_answer: 2,
    explanation: "Madrid is the capital of Spain",
    category: "Geography",
  });

  // Verify initial state
  const originalQuestion = await store.getQuestionById(addedQuestion.id);
  assertEquals(originalQuestion.explanation, "Madrid is the capital of Spain");
  assertEquals(originalQuestion.category, "Geography");

  // Make simple updates that shouldn't change the ID
  // - Change explanation (doesn't affect ID)
  // - Change correct_answer (doesn't affect ID)
  const updatedQuestion = await store.updateQuestion({
    ...originalQuestion,
    explanation: "Madrid is the capital and largest city of Spain",
    correct_answer: 2, // Same answer, just to show multiple fields can be updated
  });

  // Verify question was updated without changing the ID
  assertEquals(
    updatedQuestion.id,
    originalQuestion.id,
    "ID should not change for simple updates",
  );
  assertEquals(
    updatedQuestion.explanation,
    "Madrid is the capital and largest city of Spain",
  );
  assertEquals(
    updatedQuestion.question,
    originalQuestion.question,
    "Question text should be unchanged",
  );

  // Verify we can retrieve the updated question
  const retrievedQuestion = await store.getQuestionById(updatedQuestion.id);
  assertEquals(
    retrievedQuestion.explanation,
    "Madrid is the capital and largest city of Spain",
  );
  assertEquals(retrievedQuestion.question, "What is the capital of Spain?");

  kv.close();
});

Deno.test("can get report by ID and resolve reports", async () => {
  const kv = await Deno.openKv(":memory:");
  const store = await QuestionStore.make(kv, "emt");

  // Add a test question
  const q = await store.add({
    question: "What is the appropriate treatment for hypoglycemia?",
    choices: ["Insulin", "Glucose", "Nitroglycerin", "Aspirin"],
    correct_answer: 1,
    explanation: "Glucose is used to treat low blood sugar",
    category: "Treatment",
  });

  // Report an issue with the question
  const reportData = {
    question_id: q.id,
    thumbs: "down" as const,
    reason: "Explanation needs more detail",
    user_id: "tester123",
  };
  
  const reportId = crypto.randomUUID();
  // Mock the random UUID to use our predetermined ID
  const originalRandomUUID = crypto.randomUUID;
  crypto.randomUUID = () => reportId;
  
  await store.reportQuestion(reportData);
  
  // Restore original randomUUID function
  crypto.randomUUID = originalRandomUUID;
  
  // Test getReportById
  const retrievedReport = await store.getReportById({
    questionId: q.id,
    reportId: reportId,
  });
  
  // Verify the retrieved report matches what we submitted
  assertEquals(retrievedReport.question_id, q.id);
  assertEquals(retrievedReport.thumbs, "down");
  assertEquals(retrievedReport.reason, "Explanation needs more detail");
  assertEquals(retrievedReport.user_id, "tester123");
  assertEquals(retrievedReport.report_id, reportId);
  assertEquals(retrievedReport.resolved_at, undefined);
  
  // Test error case for getReportById with non-existent report
  await assertRejects(
    async () => {
      await store.getReportById({
        questionId: q.id,
        reportId: "non-existent-report-id",
      });
    },
    Error,
    "Report not found"
  );
  
  // Test resolveReport
  await store.resolveReport({
    questionId: q.id,
    reportId: reportId,
  });
  
  // Verify the report was resolved
  const resolvedReport = await store.getReportById({
    questionId: q.id,
    reportId: reportId,
  });
  
  // Check the resolved_at field is now set
  assert(resolvedReport.resolved_at !== undefined);
  assert(new Date(resolvedReport.resolved_at) instanceof Date);
  
  // Test error case for resolveReport with non-existent report
  await assertRejects(
    async () => {
      await store.resolveReport({
        questionId: q.id,
        reportId: "non-existent-report-id",
      });
    },
    Error,
    "Report not found"
  );
  
  kv.close();
});

Deno.test("complex question updates work", async () => {
  const kv = await Deno.openKv(":memory:");
  const store = await QuestionStore.make(kv);

  // Add a test question
  const addedQuestion = await store.add({
    question: "What is the capital of Spain?",
    choices: ["Barcelona", "Valencia", "Madrid", "Seville"],
    correct_answer: 2,
    explanation: "Madrid is the capital of Spain",
    category: "Geography",
  });

  const originalId = addedQuestion.id;

  // Make complex updates that will change the ID
  // - Change the question text (affects ID)
  // - Change category (requires reference updates)
  const updatedQuestion = await store.updateQuestion({
    ...addedQuestion,
    question: "What city serves as the capital of Spain?", // Significant change to text
    category: "World Geography", // Category change
  });

  // Verify the ID has changed due to question text changes
  assert(
    updatedQuestion.id !== originalId,
    "ID should change when question text changes significantly",
  );
  assertEquals(
    updatedQuestion.question,
    "What city serves as the capital of Spain?",
  );
  assertEquals(updatedQuestion.category, "World Geography");

  // Verify the old question is gone
  await assertRejects(
    () => store.getQuestionById(originalId),
    Error,
    "Question not found",
    "Old question should be deleted",
  );

  // Verify we can retrieve the question by its new ID
  const retrievedQuestion = await store.getQuestionById(updatedQuestion.id);
  assertEquals(
    retrievedQuestion.question,
    "What city serves as the capital of Spain?",
  );
  assertEquals(retrievedQuestion.category, "World Geography");

  // Verify indexes are updated by checking getRandom() works
  const count = await store.size();
  assertEquals(count, 1, "Should still have exactly one question");

  const randomQuestion = await store.getRandom();
  assertEquals(
    randomQuestion.id,
    updatedQuestion.id,
    "Random question should return updated question",
  );

  kv.close();
});

Deno.test("when the question id changes the report ids also change", async () => {
  const kv = await Deno.openKv(":memory:");
  const store = await QuestionStore.make(kv);

  // Add a test question
  const question = await store.add({
    question: "What is the capital of Spain?",
    choices: ["Barcelona", "Valencia", "Madrid", "Seville"],
    correct_answer: 2,
    explanation: "Madrid is the capital of Spain",
    category: "Geography",
  });

  const originalId = question.id;

  // Add reports for the question
  await store.reportQuestion({
    question_id: originalId,
    thumbs: "down",
    reason: "The question is too easy",
    user_id: "user123",
  });

  await store.reportQuestion({
    question_id: originalId,
    thumbs: "up",
    reason: "Great question!",
    user_id: "user456",
  });

  // Confirm reports exist for the original question ID
  let reports = await store.getQuestionReports();
  const oldQuestionReports = reports.filter((r) =>
    r.question_id === originalId
  );
  assertEquals(oldQuestionReports.length, 2, "Should have 2 reports initially");

  // Update the question with a significant change to cause ID change
  const updatedQuestion = await store.updateQuestion({
    ...question,
    question: "Which city is Spain's capital?", // Different phrasing triggers new hash
  });

  // Verify question ID has changed
  const newId = updatedQuestion.id;
  assert(newId !== originalId, "Question ID should change");

  // Verify no reports exist for the old ID
  reports = await store.getQuestionReports(originalId);
  assertEquals(reports.length, 0, "No reports should be linked to old ID");

  // Verify all reports were migrated to the new ID
  const newReports = await store.getQuestionReports(newId);
  assertEquals(newReports.length, 2, "Both reports should be linked to new ID");

  // Verify the content of migrated reports matches the original reports
  const downReport = newReports.find((r) => r.thumbs === "down");
  const upReport = newReports.find((r) => r.thumbs === "up");

  assert(downReport, "Down report should exist");
  assert(upReport, "Up report should exist");

  assertEquals(downReport.reason, "The question is too easy");
  assertEquals(upReport.reason, "Great question!");
  assertEquals(downReport.user_id, "user123");
  assertEquals(upReport.user_id, "user456");

  kv.close();
});
