import dayjs from "dayjs";
import { AttemptStore } from "./attempt_store.ts";
import { expect } from "@std/expect";

Deno.test("can add attempt and retrieve that same attempt", async () => {
  const kv = await Deno.openKv(":memory:");
  const store = await AttemptStore.make(kv);

  const startTime = dayjs().subtract(1, "minute");
  const endTime = dayjs();
  const responseTimeMs = endTime.diff(startTime);

  const attempt = {
    attempt_id: dayjs().toISOString(),
    user_id: crypto.randomUUID(),
    question_id: crypto.randomUUID(),
    category: "EMS Systems",
    timestamp_started: startTime.toISOString(),
    timestamp_submitted: endTime.toISOString(),
    response_time_ms: responseTimeMs,
    selected_choice_index: 1,
    is_correct: false,
    attempt_number_for_question: 0,
  } as const;

  await store.addAttempt(attempt);
  const retrievedAttempt = await store.getAttempt({
    user_id: attempt.user_id,
    attempt_id: attempt.attempt_id,
  });

  expect(retrievedAttempt).toMatchObject(attempt);

  kv.close();
});

Deno.test("can list out all of the attempts for a user", async () => {
  const kv = await Deno.openKv(":memory:");
  const store = await AttemptStore.make(kv);

  const user_id = crypto.randomUUID();
  const startTime = dayjs().subtract(1, "minute");
  const endTime = dayjs();
  const attempts = new Array(10).fill(0).map((_, i) => ({
    attempt_id: dayjs().add(Math.round(Math.random() * 1000), "seconds")
      .toISOString(),
    user_id: user_id,
    question_id: crypto.randomUUID(),
    category: "EMS Systems",
    timestamp_started: startTime.toISOString(),
    timestamp_submitted: endTime.toISOString(),
    response_time_ms: 123456,
    selected_choice_index: 1,
    is_correct: false,
    attempt_number_for_question: i + 1,
  } as const));

  await Promise.all(attempts.map((attempt) => {
    return store.addAttempt(attempt);
  }));

  const retrievedAttempts = await store.listByUserId(user_id);

  expect(retrievedAttempts).toHaveLength(10);
  for (const attempt of retrievedAttempts) {
    expect(attempt).toMatchObject({
      user_id,
      category: "EMS Systems",
      attempt_id: expect.any(String),
    });
  }

  store.closeConnection();
});

Deno.test("can list all of the attempts for a particular question", async () => {
  const kv = await Deno.openKv(":memory:");
  const store = await AttemptStore.make(kv);

  const user_id = crypto.randomUUID();
  const question_id = crypto.randomUUID();
  const startTime = dayjs().subtract(1, "minute");
  const endTime = dayjs();

  const attempts = new Array(5).fill(0).map((_, i) => ({
    attempt_id: dayjs().add(Math.round(Math.random() * 1000), "seconds")
      .toISOString(),
    user_id: user_id,
    question_id: question_id,
    category: "EMS Systems",
    timestamp_started: startTime.toISOString(),
    timestamp_submitted: endTime.toISOString(),
    response_time_ms: 123456 + i * 1000, // Vary response time slightly
    selected_choice_index: i % 4, // Vary selected choices
    is_correct: i % 2 === 0, // Alternate correct/incorrect
    attempt_number_for_question: i + 1,
  } as const));

  // Add all attempts to the store
  await Promise.all(attempts.map((attempt) => {
    return store.addAttempt(attempt);
  }));

  // Retrieve attempts for this specific question
  const retrievedAttempts = await store.listByQuestionId({
    user_id,
    question_id,
  });

  expect(retrievedAttempts).toHaveLength(5);
  for (const attempt of retrievedAttempts) {
    expect(attempt).toMatchObject({
      user_id,
      question_id,
      category: "EMS Systems",
      attempt_id: expect.any(String),
    });
  }

  store.closeConnection();
});

Deno.test("should be able to delete questions", async () => {
  const kv = await Deno.openKv(":memory:");
  const store = await AttemptStore.make(kv);

  const user_id = crypto.randomUUID();
  const question_id = crypto.randomUUID();
  const attempt_id = dayjs().toISOString();
  const startTime = dayjs().subtract(1, "minute");
  const endTime = dayjs();

  const attempt = {
    attempt_id,
    user_id,
    question_id,
    category: "EMS Systems",
    timestamp_started: startTime.toISOString(),
    timestamp_submitted: endTime.toISOString(),
    response_time_ms: endTime.diff(startTime),
    selected_choice_index: 2,
    is_correct: true,
    attempt_number_for_question: 1,
  } as const;

  // Add the attempt
  await store.addAttempt(attempt);

  // Verify it exists
  const retrievedAttempt = await store.getAttempt({ user_id, attempt_id });
  expect(retrievedAttempt).toMatchObject(attempt);

  // Delete the attempt
  await store.deleteAttempt({ user_id, attempt_id, question_id });

  // Verify it's been deleted by trying to retrieve it
  await expect(store.getAttempt({ user_id, attempt_id })).rejects.toThrow(
    "attempt not found",
  );

  // Also verify it's not in the user's attempt list
  const userAttempts = await store.listByUserId(user_id);
  expect(userAttempts).toHaveLength(0);

  // And verify it's not in the question's attempt list
  const questionAttempts = await store.listByQuestionId({
    user_id,
    question_id,
  });
  expect(questionAttempts).toHaveLength(0);

  store.closeConnection();
});

Deno.test("should be able to list only the attempts in the past 30 days", async () => {
  const kv = await Deno.openKv(":memory:");
  const store = await AttemptStore.make(kv);

  const user_id = crypto.randomUUID();
  const question_id = crypto.randomUUID();
  const startTime = dayjs().subtract(1, "minute");
  const endTime = dayjs();

  const defaultAttempt = {
    user_id,
    question_id,
    category: "EMS Systems",
    timestamp_started: startTime.toISOString(),
    timestamp_submitted: endTime.toISOString(),
    response_time_ms: endTime.diff(startTime),
    selected_choice_index: 2,
    is_correct: true,
    attempt_number_for_question: 1,
  } as const;

  const old = {
    ...defaultAttempt,
    attempt_id: dayjs().subtract(40, "days").toISOString(),
  };

  const lessOld = {
    ...defaultAttempt,
    attempt_id: dayjs().subtract(15, "days").toISOString(),
  };

  // Add the attempt
  await Promise.all([
    store.addAttempt(old),
    store.addAttempt(lessOld),
  ]);

  const attempts = await store.listWithLookbackWindow({
    user_id: defaultAttempt.user_id,
  });
  expect(attempts).toHaveLength(1);
  expect(attempts[0].attempt_id).toEqual(lessOld.attempt_id);

  store.closeConnection();
});
