import { assertEquals } from "@std/assert";
import { migrateQuestions } from "./question_migration.ts";
import { type Question, QuestionStore } from "./question_store.ts";

/** Writes a question as it was stored before 2026-10, without the new fields. */
async function legacy(kv: Deno.Kv, store: QuestionStore, n: number) {
  const q = await store.add({
    question: `Legacy ${n}`,
    choices: ["A", "B"],
    correct_answer: 1,
    explanation: "E",
    category: "Shock",
  });
  const { status: _s, tags: _t, references: _r, version: _v, ...old } = q;
  await kv.set([q.scope, "question_content", q.id], old);
  await kv.set([q.scope, "category_question_content", q.category, q.id], old);
  return q;
}

Deno.test("the migration dry run reports without writing", async () => {
  using kv = await Deno.openKv(":memory:");
  const store = await QuestionStore.make(kv);
  const q = await legacy(kv, store, 1);
  await store.add({
    question: "New",
    choices: ["A", "B"],
    correct_answer: 0,
    explanation: "E",
    category: "Shock",
  });

  const [emt, advanced] = await migrateQuestions(kv, { dryRun: true });
  assertEquals(emt, {
    scope: "emt",
    scanned: 2,
    migrated: 1,
    current: 1,
    unindexed: [],
  });
  assertEquals(advanced.scanned, 0);
  const raw =
    (await kv.get<Partial<Question>>(["emt", "question_content", q.id]))
      .value;
  assertEquals(raw?.status, undefined);
});

Deno.test("the migration writes defaults to both copies, once", async () => {
  using kv = await Deno.openKv(":memory:");
  const store = await QuestionStore.make(kv);
  const q = await legacy(kv, store, 1);

  const [first] = await migrateQuestions(kv, { dryRun: false });
  assertEquals([first.migrated, first.current], [1, 0]);
  for (
    const key of [
      ["emt", "question_content", q.id],
      ["emt", "category_question_content", q.category, q.id],
    ]
  ) {
    const raw = (await kv.get<Question>(key)).value!;
    assertEquals(
      [raw.status, raw.tags, raw.references, raw.version],
      ["published", [], [], 1],
    );
    assertEquals(raw.question, "Legacy 1");
    assertEquals(raw.created_at, q.created_at);
  }
  // Still served, and a second run changes nothing.
  assertEquals((await store.getRandom()).id, q.id);
  const [second] = await migrateQuestions(kv, { dryRun: false });
  assertEquals([second.migrated, second.current], [0, 1]);
});

Deno.test("the migration reports published records missing from the indexes", async () => {
  using kv = await Deno.openKv(":memory:");
  const store = await QuestionStore.make(kv);
  const q = await legacy(kv, store, 1);
  const draft = await store.add({
    question: "Draft",
    choices: ["A", "B"],
    correct_answer: 0,
    explanation: "E",
    category: "Shock",
    status: "draft",
  });
  await kv.delete(["emt", "global_question_map", q.id]);

  const [emt] = await migrateQuestions(kv, { dryRun: true });
  // The draft is unindexed on purpose; the legacy record isn't.
  assertEquals(emt.unindexed, [q.id]);
  assertEquals(emt.unindexed.includes(draft.id), false);
});
