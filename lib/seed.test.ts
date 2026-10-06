import { assert, assertEquals, assertRejects } from "@std/assert";
import { CATEGORIES } from "./categories.ts";
import { ensureSeeded, seed, SEED_USERS, SEED_VERSION } from "./seed.ts";
import { QuestionStore } from "./question_store.ts";
import { UserStore } from "./user_store.ts";
import { AttemptStore } from "./attempt_store.ts";
import { ProductStore } from "./product_store.ts";
import { StreakStore } from "./streak_store.ts";
import catalog from "./seed_catalog.json" with { type: "json" };

const now = new Date("2026-10-01T12:00:00Z");

Deno.test("seed populates every store with consistent data", async () => {
  const kv = await Deno.openKv(":memory:");
  try {
    const summary = await seed(kv, { now, stage: "DEV" });
    const expectedAttempts = SEED_USERS.reduce((n, u) => n + u.attempts, 0);
    assertEquals(summary, {
      questions: CATEGORIES.length * 3 + 20,
      users: SEED_USERS.length,
      attempts: expectedAttempts,
      reports: 6,
      products: catalog.products.length,
      variants: catalog.variants.length,
    });

    // Question indexes work: counts, random picks, and per-category picks.
    const emt = await QuestionStore.make(kv, "emt");
    assertEquals(await emt.size(), CATEGORIES.length * 3);
    assertEquals(await emt.size(CATEGORIES[0]), 3);
    const random = await emt.getRandom();
    assert(random.question.startsWith("[Seed]"));
    assertEquals(
      random.choices[random.correct_answer].startsWith("Correct answer"),
      true,
    );
    assertEquals(await (await QuestionStore.make(kv, "medic")).size(), 10);

    // User stats match their attempts; leaderboard is ordered.
    const users = await UserStore.make(kv);
    const attempts = await AttemptStore.make(kv);
    for (const profile of SEED_USERS) {
      const user = await users.getUser(profile.user_id);
      assert(user, profile.user_id);
      const list = await attempts.listByUserId(profile.user_id);
      assertEquals(list.length, profile.attempts);
      assertEquals(user.stats.questions_answered, profile.attempts);
      assertEquals(
        user.stats.questions_correct,
        list.filter((a) => a.is_correct).length,
      );
    }
    const board = await users.listLeaderbaord();
    assertEquals(board[0].user_id, "seed|expert");

    // Streaks exist for the profiles that have them.
    const streaks = await StreakStore.make(kv);
    assertEquals((await streaks.get("seed|expert"))?.days, 45);
    assertEquals(await streaks.get("seed|new-user"), null);

    // Reports: several on one question, one resolved.
    const reports = await emt.getQuestionReports();
    assertEquals(reports.length, 6);
    assertEquals(reports.filter((r) => r.resolved_at).length, 1);

    // Products: the TEST catalog, inactive ones included but flagged.
    const productStore = await ProductStore.make(kv);
    const products = await productStore.listProducts();
    assertEquals(products.length, catalog.products.length);
    assertEquals(
      products.filter((p) => p.active).length,
      catalog.products.filter((p) => p.active).length,
    );
    // Every active product is purchasable: it has a variant with a Stripe
    // product ID, findable through the index the Stripe webhook uses.
    for (const product of products.filter((p) => p.active)) {
      const variant = catalog.variants.find((v) =>
        v.printful_product_id === product.printful_id && v.stripe_product_id
      );
      assert(variant, `no purchasable variant for ${product.name}`);
      const found = await productStore.getVariantByStripeProductId(
        variant.stripe_product_id!,
      );
      assertEquals(found?.variant_id, variant.variant_id);
    }
  } finally {
    kv.close();
  }
});

Deno.test("seed is safe to re-run", async () => {
  const kv = await Deno.openKv(":memory:");
  try {
    await seed(kv, { now, stage: "DEV" });
    const again = await seed(kv, { now, stage: "DEV" });
    assertEquals(again, {
      questions: 0,
      users: 0,
      attempts: 0,
      reports: 0,
      products: 0,
      variants: 0,
    });
    const emt = await QuestionStore.make(kv, "emt");
    assertEquals(await emt.size(), CATEGORIES.length * 3);
  } finally {
    kv.close();
  }
});

Deno.test("seed refuses to run in production", async () => {
  const kv = await Deno.openKv(":memory:");
  try {
    await assertRejects(() => seed(kv, { stage: "PROD" }), Error, "PROD");
    await assertRejects(
      () => ensureSeeded(kv, { stage: "PROD" }),
      Error,
      "PROD",
    );
    assertEquals(await (await QuestionStore.make(kv)).size(), 0);
  } finally {
    kv.close();
  }
});

Deno.test("ensureSeeded seeds an empty database only once", async () => {
  const kv = await Deno.openKv(":memory:");
  try {
    const first = await ensureSeeded(kv, { now, stage: "TEST" });
    assert(first);
    assertEquals(first.users, SEED_USERS.length);
    assertEquals(await ensureSeeded(kv, { now, stage: "TEST" }), null);
    assertEquals((await kv.get(["seed", "lock"])).value, null);
  } finally {
    kv.close();
  }
});

Deno.test("ensureSeeded leaves existing data alone", async () => {
  const kv = await Deno.openKv(":memory:");
  try {
    const emt = await QuestionStore.make(kv, "emt");
    await emt.add({
      question: "A real question",
      choices: ["a", "b"],
      correct_answer: 0,
      explanation: "",
      category: CATEGORIES[0],
    });
    assertEquals(await ensureSeeded(kv, { stage: "TEST" }), null);
    assertEquals(await emt.size(), 1);
    assertEquals(await (await UserStore.make(kv)).getUser("seed|expert"), null);
  } finally {
    kv.close();
  }
});

Deno.test("ensureSeeded replaces seed data from an older version", async () => {
  const kv = await Deno.openKv(":memory:");
  try {
    await seed(kv, { now, stage: "TEST" });
    // Simulate an older seed: stale version and a product the current
    // catalog no longer has.
    await kv.set(["seed", "version"], SEED_VERSION - 1);
    const products = await ProductStore.make(kv);
    await products.addProduct(
      {
        ...catalog.products[0],
        printful_id: "seed-stale-product",
      } as Parameters<typeof products.addProduct>[0],
    );

    const summary = await ensureSeeded(kv, { now, stage: "TEST" });
    assert(summary);
    assertEquals(summary.products, catalog.products.length);
    assertEquals(await products.getProduct("seed-stale-product"), null);
    assertEquals((await kv.get(["seed", "version"])).value, SEED_VERSION);
    assertEquals(await ensureSeeded(kv, { now, stage: "TEST" }), null);
  } finally {
    kv.close();
  }
});

Deno.test("ensureSeeded upgrades seed databases created before versioning", async () => {
  const kv = await Deno.openKv(":memory:");
  try {
    await seed(kv, { now, stage: "TEST" });
    await kv.delete(["seed", "version"]); // as seeded by the first release
    const summary = await ensureSeeded(kv, { now, stage: "TEST" });
    assert(summary, "legacy seed database should be reseeded");
    assertEquals((await kv.get(["seed", "version"])).value, SEED_VERSION);
  } finally {
    kv.close();
  }
});
