import dayjs from "dayjs";
import { Attempt } from "../../lib/attempt_store.ts";
import { expect } from "@std/expect/expect";
import { toDataSet } from "./BasicLine.tsx";

Deno.test("P1W", () => {
  // Create attempts for today (all within the same day)
  const attempts: Attempt[] = Array.from({ length: 5 }, (_, i) => {
    const created_at = dayjs().subtract(i, "minute").toISOString();
    const a: Attempt = {
      attempt_id: created_at,
      user_id: "",
      question_id: crypto.randomUUID(),
      category: "EMS Systems",
      timestamp_started: created_at,
      timestamp_submitted: created_at,
      response_time_ms: 100,
      selected_choice_index: 2,
      is_correct: i % 2 === 0,
      attempt_number_for_question: 1,
    };
    return a;
  });

  const dataSet = toDataSet({
    attempts,
    duration: "1W",
  });

  // Generate expected labels for the last 7 days
  const expectedLabels = new Array(7).fill(null).map((_, i) =>
    dayjs().subtract(i, "day").format("MM/DD")
  ).reverse();

  // All attempts should be in the last day (index 6)
  const expectedDataset = new Array(7).fill(0);
  expectedDataset[6] = 5;

  expect(dataSet.labels).toStrictEqual(expectedLabels);
  expect(dataSet.dataset).toStrictEqual(expectedDataset);
});

Deno.test("P1M", () => {
  // Create attempts that fall within the most recent 5-day period
  // The 1M logic creates periods starting from (i+1)*5 days ago
  // So the most recent period starts 5 days ago
  const attempts: Attempt[] = Array.from({ length: 3 }, (_, i) => {
    // Put attempts 3 days ago to ensure they're in the most recent period
    const created_at = dayjs().subtract(3, "day").subtract(i, "hour")
      .toISOString();
    const a: Attempt = {
      attempt_id: created_at,
      user_id: "",
      question_id: crypto.randomUUID(),
      category: "EMS Systems",
      timestamp_started: created_at,
      timestamp_submitted: created_at,
      response_time_ms: 100,
      selected_choice_index: 2,
      is_correct: i % 2 === 0,
      attempt_number_for_question: 1,
    };
    return a;
  });

  const dataSet = toDataSet({
    attempts,
    duration: "1M",
  });

  // Generate expected labels for the 6 five-day periods
  const expectedLabels = new Array(6).fill(null).map((_, i) => {
    return dayjs().subtract((i + 1) * 5, "day").format("MM/DD");
  }).reverse();

  // All attempts should be in the last period (index 5)
  const expectedDataset = new Array(6).fill(0);
  expectedDataset[5] = 3;

  expect(dataSet.labels).toStrictEqual(expectedLabels);
  expect(dataSet.dataset).toStrictEqual(expectedDataset);
});

Deno.test("P1Y", () => {
  // Create attempts that fall within the most recent month period
  // The 1Y logic creates periods starting from i months ago
  // Put all attempts on the 15th of the current month to avoid boundary issues
  const attempts: Attempt[] = Array.from({ length: 10 }, (_, i) => {
    // Set all attempts to the 15th of current month at different minutes
    const created_at = dayjs().date(15).subtract(i, "minute").toISOString();
    const a: Attempt = {
      attempt_id: created_at,
      user_id: "",
      question_id: crypto.randomUUID(),
      category: "EMS Systems",
      timestamp_started: created_at,
      timestamp_submitted: created_at,
      response_time_ms: 100,
      selected_choice_index: 2,
      is_correct: i % 2 === 0,
      attempt_number_for_question: 1,
    };
    return a;
  });

  const dataSet = toDataSet({
    attempts,
    duration: "1Y",
  });

  // Generate expected labels for the last 12 months
  const expectedLabels = new Array(12).fill(null).map((_, i) => {
    return dayjs().subtract(i, "month").format("MM/YY");
  }).reverse();

  // All attempts should be in the current month (last index after reverse)
  const expectedDataset = new Array(12).fill(0);
  expectedDataset[11] = 10;

  expect(dataSet.labels).toStrictEqual(expectedLabels);
  expect(dataSet.dataset).toStrictEqual(expectedDataset);
});

Deno.test("P1M test 2", () => {
  const attempts: Attempt[] = [
    {
      "attempt_id": "2025-09-07T18:35:20.882Z",
      "user_id": "auth0|67b28845f4ba32d0be58bc46",
      "question_id":
        "67caf4308846ae3c4e6a77a9939261f7eaa95c750b6b69a63227dabc2fb1e102",
      "category": "Medical Overview",
      "timestamp_started": "2025-09-07T18:35:19.405Z",
      "timestamp_submitted": "2025-09-07T18:35:20.882Z",
      "is_correct": true,
      "selected_choice_index": 1,
      "attempt_number_for_question": 1,
      "response_time_ms": 1477,
    },
    {
      "attempt_id": "2025-09-13T19:32:04.878Z",
      "user_id": "auth0|67b28845f4ba32d0be58bc46",
      "question_id":
        "eb63a0ea802171ddee409862a2111d6f94107ab8051cc04fe3b743bb84447a73",
      "category": "Abdominal and Genitourinary Injuries",
      "timestamp_started": "2025-09-13T19:32:00.238Z",
      "timestamp_submitted": "2025-09-13T19:32:04.878Z",
      "is_correct": false,
      "selected_choice_index": 0,
      "attempt_number_for_question": 1,
      "response_time_ms": 4640,
    },
    {
      "attempt_id": "2025-09-13T19:32:13.814Z",
      "user_id": "auth0|67b28845f4ba32d0be58bc46",
      "question_id":
        "323d6d20a1a7d4382d7779c1a2f627c7b79175a0002305a7fb4fa97fd2e669d5",
      "category": "Trauma Overview",
      "timestamp_started": "2025-09-13T19:32:05.924Z",
      "timestamp_submitted": "2025-09-13T19:32:13.814Z",
      "is_correct": true,
      "selected_choice_index": 3,
      "attempt_number_for_question": 1,
      "response_time_ms": 7890,
    },
  ];

  const result = toDataSet({
    attempts,
    duration: "1M",
  });
  const total = result.dataset.reduce((prev, curr) => prev += curr, 0);
  expect(total).toBe(3);
});
