import { assertEquals } from "@std/assert";
import { statusChangeSchema } from "./question_review.ts";

Deno.test("status changes default to EMT and an empty review", () => {
  assertEquals(
    statusChangeSchema.parse({ questionId: "q1", status: "retired" }),
    { questionId: "q1", scope: "emt", status: "retired", review: {} },
  );
});

Deno.test("status changes reject unknown statuses and review fields", () => {
  const bad = [
    { questionId: "q1", status: "deleted" },
    { questionId: "", status: "draft" },
    { questionId: "q1", status: "draft", scope: "nurse" },
    { questionId: "q1", status: "draft", review: { difficulty: 11 } },
    { questionId: "q1", status: "draft", review: { difficulty: 2.5 } },
    { questionId: "q1", status: "draft", review: { reviewed_at: "today" } },
    { questionId: "q1", status: "draft", review: { status: "published" } },
    { questionId: "q1", status: "draft", review: { author: "robot" } },
  ];
  for (const body of bad) {
    assertEquals(
      statusChangeSchema.safeParse(body).success,
      false,
      JSON.stringify(body),
    );
  }
});

Deno.test("status changes accept a full AI review", () => {
  const review = {
    difficulty: 6,
    tags: ["cardiac"],
    references: ["NHTSA EMS Education Standards: Cardiology"],
    explanation_per_choice: ["Right", "Wrong", "Wrong", "Wrong"],
    reviewed_by: "ai:claude-sonnet-5-5",
    reviewed_at: "2026-10-12T15:00:00.000Z",
  };
  const parsed = statusChangeSchema.parse({
    questionId: "q1",
    scope: "medic",
    status: "published",
    review,
  });
  assertEquals(parsed.review, review);
});
