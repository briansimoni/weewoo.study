import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  type NewQuestion,
  type Question,
  QuestionStore,
  withQuestionDefaults,
} from "./question_store.ts";

function newQuestion(n: number, overrides: Partial<NewQuestion> = {}) {
  return {
    question: `Question ${n}`,
    choices: ["A", "B", "C", "D"],
    correct_answer: 0,
    explanation: "Because.",
    category: n % 2 ? "Shock" : "Airway Management",
    ...overrides,
  };
}

/**
 * The indexes are dense (0..count-1), their maps point back at the right
 * slots, and they hold exactly the published questions, globally and per
 * category.
 */
async function assertIndexesMatchPublished(kv: Deno.Kv, scope = "emt") {
  const published = new Map<string, Question>();
  for await (
    const { value } of kv.list<Question>({
      prefix: [scope, "question_content"],
    })
  ) {
    if (value.status === "published") published.set(value.id, value);
  }

  const globalIds: string[] = [];
  for await (
    const { key, value } of kv.list<string>({
      prefix: [scope, "global_question_index"],
    })
  ) {
    assertEquals(key[2], globalIds.length, "global index is dense");
    globalIds.push(value);
    assertEquals(
      (await kv.get<number>([scope, "global_question_map", value])).value,
      key[2],
    );
  }
  assertEquals(
    (await kv.get<number>([scope, "global_question_count"])).value ?? 0,
    globalIds.length,
  );
  assertEquals(new Set(globalIds), new Set(published.keys()));

  const categories = new Set([...published.values()].map((q) => q.category));
  for (const category of categories) {
    const ids: string[] = [];
    for await (
      const { key, value } of kv.list<string>({
        prefix: [scope, "category_question_index", category],
      })
    ) {
      assertEquals(key[3], ids.length, `${category} index is dense`);
      ids.push(value);
    }
    assertEquals(
      new Set(ids),
      new Set(
        [...published.values()].filter((q) => q.category === category).map((
          q,
        ) => q.id),
      ),
    );
    assertEquals(
      (await kv.get<number>([scope, "category_question_count", category]))
        .value,
      ids.length,
    );
  }
}

Deno.test("add stores drafts without serving them", async () => {
  using kv = await Deno.openKv(":memory:");
  const store = await QuestionStore.make(kv);
  const draft = await store.add(newQuestion(1, { status: "draft" }));

  assertEquals(draft.status, "draft");
  assertEquals(draft.version, 1);
  assertEquals(draft.tags, []);
  assertEquals(await store.size(), 0);
  await assertRejects(() => store.getRandom(), Error, "No questions");
  assertEquals((await store.listQuestions()).map((q) => q.id), [draft.id]);
  assertEquals((await store.getQuestionById(draft.id)).status, "draft");
  await assertIndexesMatchPublished(kv);
});

Deno.test("add publishes by default, as before", async () => {
  using kv = await Deno.openKv(":memory:");
  const store = await QuestionStore.make(kv);
  const q = await store.add(newQuestion(1));
  assertEquals(q.status, "published");
  assertEquals((await store.getRandom()).id, q.id);
  await assertRejects(() => store.add(newQuestion(1)), Error, "already exists");
  // A draft with the same text is still a duplicate.
  await assertRejects(
    () => store.add(newQuestion(1, { status: "draft" })),
    Error,
    "already exists",
  );
});

Deno.test("setStatus moves questions in and out of the served indexes", async () => {
  using kv = await Deno.openKv(":memory:");
  const store = await QuestionStore.make(kv);
  const [a, b, c, d] = await Promise.all(
    [1, 2, 3, 4].map((n) => store.add(newQuestion(n))),
  );
  await assertIndexesMatchPublished(kv);

  // Retiring from the middle swaps the last entry into the hole.
  const retired = await store.setStatus(b.id, "retired", {
    reviewed_by: "ai:claude-sonnet-5-5",
    reviewed_at: "2026-10-12T00:00:00.000Z",
  });
  assertEquals(retired.status, "retired");
  assertEquals(retired.reviewed_by, "ai:claude-sonnet-5-5");
  assertEquals(await store.size(), 3);
  await assertIndexesMatchPublished(kv);
  for (let i = 0; i < 30; i++) {
    assert((await store.getRandom()).id !== b.id, "retired is never served");
  }

  await store.setStatus(a.id, "in_review");
  await store.setStatus(d.id, "draft");
  assertEquals(await store.size(), 1);
  await assertIndexesMatchPublished(kv);
  assertEquals((await store.getRandom()).id, c.id);

  // Publishing again, and a no-op status change, keep the indexes right.
  await store.setStatus(b.id, "published");
  await store.setStatus(c.id, "published");
  assertEquals(await store.size(), 2);
  await assertIndexesMatchPublished(kv);

  // The category copy (used for listing) follows the status.
  const listed = await store.listQuestions(a.category);
  assertEquals(listed.find((q) => q.id === a.id)?.status, "in_review");
  await assertRejects(() => store.setStatus("nope", "published"), Error);
});

Deno.test("delete handles published and unpublished questions", async () => {
  using kv = await Deno.openKv(":memory:");
  const store = await QuestionStore.make(kv);
  const a = await store.add(newQuestion(1));
  const b = await store.add(newQuestion(2, { status: "draft" }));
  const c = await store.add(newQuestion(3));

  await store.delete(b.id);
  await assertIndexesMatchPublished(kv);
  await store.delete(a.id);
  await assertIndexesMatchPublished(kv);
  assertEquals((await store.listQuestions()).map((q) => q.id), [c.id]);
  await assertRejects(() => store.delete(a.id), Error, "not found");
});

Deno.test("updateQuestion bumps the version and keeps status and created_at", async () => {
  using kv = await Deno.openKv(":memory:");
  const store = await QuestionStore.make(kv);
  const draft = await store.add(newQuestion(1, { status: "draft" }));

  // Same text: an in-place update. A status in the input is ignored.
  const edited = await store.updateQuestion({
    ...draft,
    explanation: "Better.",
    status: "published",
  });
  assertEquals(edited.id, draft.id);
  assertEquals(edited.version, 2);
  assertEquals(edited.status, "draft");
  assertEquals(await store.size(), 0);

  // New text: a new ID, still a draft, still unserved, same created_at.
  const renamed = await store.updateQuestion({
    ...edited,
    question: "Question 1, reworded",
  });
  assert(renamed.id !== draft.id);
  assertEquals(renamed.version, 3);
  assertEquals(renamed.status, "draft");
  assertEquals(renamed.created_at, draft.created_at);
  await assertIndexesMatchPublished(kv);

  // A published question moved to another category stays served.
  const live = await store.add(newQuestion(2));
  const moved = await store.updateQuestion({ ...live, category: "Shock" });
  assertEquals(moved.status, "published");
  assertEquals((await store.getRandomByCategory("Shock")).id, moved.id);
  await assertIndexesMatchPublished(kv);
});

Deno.test("records from before the schema change read as published", async () => {
  using kv = await Deno.openKv(":memory:");
  const store = await QuestionStore.make(kv);
  const q = await store.add(newQuestion(1));
  // Strip the new fields, as in a record written before 2026-10.
  const { status: _s, tags: _t, references: _r, version: _v, ...legacy } = q;
  await kv.set(["emt", "question_content", q.id], legacy);
  await kv.set(["emt", "category_question_content", q.category, q.id], legacy);

  const read = await store.getQuestionById(q.id);
  assertEquals(read.status, "published");
  assertEquals(read.version, 1);
  assertEquals((await store.listQuestions())[0].references, []);

  // Retiring a legacy record takes it out of the indexes it's in.
  await store.setStatus(q.id, "retired");
  assertEquals(await store.size(), 0);
  await assertIndexesMatchPublished(kv);
});

Deno.test("withQuestionDefaults keeps values that are set", () => {
  const q = withQuestionDefaults({
    id: "x",
    created_at: "",
    updated_at: "",
    question: "Q",
    choices: [],
    correct_answer: 0,
    explanation: "",
    category: "Shock",
    scope: "emt",
    status: "retired",
    tags: ["cardiac"],
    version: 4,
  });
  assertEquals(
    [q.status, q.tags, q.references, q.version],
    ["retired", ["cardiac"], [], 4],
  );
});
