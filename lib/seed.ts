import { CATEGORIES, type Category } from "./categories.ts";
import { QuestionStore } from "./question_store.ts";
import { type UserStats, UserStore } from "./user_store.ts";
import { type Attempt, AttemptStore } from "./attempt_store.ts";
import type { Streak } from "./streak_store.ts";
import {
  type Product,
  ProductStore,
  type ProductVariant,
} from "./product_store.ts";
import seedCatalog from "./seed_catalog.json" with { type: "json" };

/**
 * Deterministic test data for local development, branch previews, and E2E
 * tests. Questions are synthetic and marked "[Seed]" (the repo is public, so
 * the real question bank stays out of it); users are KV-only `seed|…`
 * accounts, which can't sign in through Auth0; the shop catalog is a copy of
 * the TEST database's (see seedProducts). Never run this against production:
 * see {@link assertSeedAllowed}.
 */

export interface SeedSummary {
  questions: number;
  users: number;
  attempts: number;
  reports: number;
  products: number;
  variants: number;
}

type Scope = "emt" | "advanced" | "medic";

/** Questions per EMT category; advanced and medic get a smaller bank. */
const EMT_QUESTIONS_PER_CATEGORY = 3;
const OTHER_SCOPE_QUESTIONS = 10;

export const SEED_USERS = [
  {
    user_id: "seed|new-user",
    display_name: "Seed New User",
    attempts: 0,
    accuracy: 0,
    streak: 0,
  },
  {
    user_id: "seed|beginner",
    display_name: "Seed Beginner",
    attempts: 12,
    accuracy: 0.5,
    streak: 0,
  },
  {
    user_id: "seed|regular",
    display_name: "Seed Regular",
    attempts: 40,
    accuracy: 0.65,
    streak: 3,
  },
  {
    user_id: "seed|dedicated",
    display_name: "Seed Dedicated",
    attempts: 80,
    accuracy: 0.8,
    streak: 12,
  },
  {
    user_id: "seed|expert",
    display_name: "Seed Expert",
    attempts: 150,
    accuracy: 0.9,
    streak: 45,
  },
] as const;

/** Throws unless the current environment may receive seed data. */
export function assertSeedAllowed(stage = Deno.env.get("STAGE")) {
  if (stage === "PROD") {
    throw new Error("Refusing to seed: STAGE=PROD");
  }
}

/** Small deterministic PRNG (mulberry32) so seed data is identical every run. */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedQuestion(scope: Scope, category: Category, n: number) {
  const correct = n % 4;
  const choices = [0, 1, 2, 3].map((i) =>
    i === correct
      ? `Correct answer for ${scope} #${n}`
      : `Distractor ${i + 1} for ${scope} #${n}`
  );
  return {
    question:
      `[Seed] ${category} (${scope} #${n}): which answer is correct? Pick "Correct answer for ${scope} #${n}".`,
    choices,
    correct_answer: correct,
    explanation:
      `[Seed] Seed questions always mark the "Correct answer" choice as correct.`,
    category,
  };
}

async function seedQuestions(kv: Deno.Kv) {
  const added: Record<Scope, { id: string; category: Category }[]> = {
    emt: [],
    advanced: [],
    medic: [],
  };
  const plan: [Scope, Category, number][] = [];
  let n = 0;
  for (const category of CATEGORIES) {
    for (let i = 0; i < EMT_QUESTIONS_PER_CATEGORY; i++) {
      plan.push(["emt", category, ++n]);
    }
  }
  for (const scope of ["advanced", "medic"] as const) {
    for (let i = 0; i < OTHER_SCOPE_QUESTIONS; i++) {
      plan.push([scope, CATEGORIES[i % CATEGORIES.length], i + 1]);
    }
  }

  const stores = {
    emt: await QuestionStore.make(kv, "emt"),
    advanced: await QuestionStore.make(kv, "advanced"),
    medic: await QuestionStore.make(kv, "medic"),
  };
  let created = 0;
  for (const [scope, category, num] of plan) {
    const data = seedQuestion(scope, category, num);
    try {
      const q = await stores[scope].add(data);
      added[scope].push({ id: q.id, category });
      created++;
    } catch (error) {
      if (
        !(error instanceof Error && error.message.includes("already exists"))
      ) {
        throw error;
      }
      // Re-run: look the existing question up so attempts can reference it.
      const existing = (await stores[scope].listQuestions(category)).find((q) =>
        q.question === data.question
      );
      if (existing) added[scope].push({ id: existing.id, category });
    }
  }
  return { created, emt: added.emt, emtStore: stores.emt };
}

async function seedUsers(
  kv: Deno.Kv,
  questions: { id: string; category: Category }[],
  now: Date,
) {
  const userStore = await UserStore.make(kv);
  const attemptStore = await AttemptStore.make(kv);
  const random = rng(42);
  let users = 0;
  let attempts = 0;

  for (const profile of SEED_USERS) {
    if (await userStore.getUser(profile.user_id)) continue;
    await userStore.createUser({
      user_id: profile.user_id,
      display_name: profile.display_name,
      created_at: "",
      stats: { questions_answered: 0, questions_correct: 0 },
    });
    users++;

    const stats: Required<UserStats> = {
      questions_answered: 0,
      questions_correct: 0,
      categories: {},
    };
    const timesAnswered = new Map<string, number>();
    // Spread attempts over the last 30 days, oldest first.
    const spanMs = 30 * 24 * 60 * 60 * 1000;
    for (let i = 0; i < profile.attempts; i++) {
      const question = questions[Math.floor(random() * questions.length)];
      const isCorrect = random() < profile.accuracy;
      const submitted = new Date(
        now.getTime() - spanMs +
          Math.floor((spanMs * (i + 1)) / (profile.attempts + 1)),
      );
      const responseMs = 4000 + Math.floor(random() * 40000);
      const attemptNumber = (timesAnswered.get(question.id) ?? 0) + 1;
      timesAnswered.set(question.id, attemptNumber);

      const attempt: Attempt = {
        attempt_id: submitted.toISOString(),
        user_id: profile.user_id,
        question_id: question.id,
        category: question.category,
        timestamp_started: new Date(submitted.getTime() - responseMs)
          .toISOString(),
        timestamp_submitted: submitted.toISOString(),
        response_time_ms: responseMs,
        selected_choice_index: isCorrect ? 0 : 1,
        is_correct: isCorrect,
        attempt_number_for_question: attemptNumber,
      };
      await attemptStore.addAttempt(attempt);
      attempts++;

      stats.questions_answered++;
      if (isCorrect) stats.questions_correct++;
      const cat = stats.categories[question.category] ??
        { questions_answered: 0, questions_correct: 0 };
      cat.questions_answered++;
      if (isCorrect) cat.questions_correct++;
      stats.categories[question.category] = cat;
    }

    if (profile.attempts > 0) {
      // One update writes aggregate stats, category stats, and the leaderboard.
      // Pass display_name too: updateUser copies it into the leaderboard entry.
      await userStore.updateUser({
        user_id: profile.user_id,
        display_name: profile.display_name,
        stats,
      });
    }

    if (profile.streak > 0) {
      // StreakStore only advances streaks in real time, so write the record
      // directly (same key and shape as StreakStore).
      const day = 24 * 60 * 60 * 1000;
      const streak: Streak = {
        days: profile.streak,
        start_date: new Date(now.getTime() - (profile.streak - 1) * day)
          .toISOString(),
        last_activity: now.toISOString(),
        expires_on: new Date(now.getTime() + 2 * day).toISOString(),
      };
      await kv.set(["streaks", profile.user_id], streak, { expireIn: 2 * day });
    }
  }
  return { users, attempts };
}

async function seedReports(
  questionStore: QuestionStore,
  questions: { id: string }[],
) {
  if ((await questionStore.getQuestionReports()).length > 0) return 0;
  const reasons = [
    ["down", "The explanation contradicts the answer."],
    ["down", "Two choices look correct."],
    ["up", "Great question!"],
    ["down", "Typo in the question stem."],
    ["down", "Outdated protocol."],
    ["up", "Helpful explanation."],
  ] as const;
  let count = 0;
  for (const [i, [thumbs, reason]] of reasons.entries()) {
    const question = questions[i % 3]; // several reports on the same questions
    await questionStore.reportQuestion({
      question_id: question.id,
      thumbs,
      reason: `[Seed] ${reason}`,
      user_id: SEED_USERS[(i % 4) + 1].user_id,
    });
    count++;
  }
  // Resolve one report so both states exist.
  const [first] = await questionStore.getQuestionReports(questions[0].id);
  if (first) {
    await questionStore.resolveReport({
      questionId: first.question_id,
      reportId: first.report_id,
    });
  }
  return count;
}

/**
 * The shop catalog is a copy of the TEST database's products and variants
 * (regenerate with scripts/export_seed_catalog.ts). Its Stripe product IDs are
 * test-mode products and its Printful IDs are the real store's, so checkout
 * works with Stripe test cards wherever a test-mode STRIPE_API_KEY is set.
 */
async function seedProducts(kv: Deno.Kv) {
  const productStore = await ProductStore.make(kv);
  const catalog = seedCatalog as {
    products: Product[];
    variants: ProductVariant[];
  };
  let products = 0;
  let variants = 0;
  for (const product of catalog.products) {
    if (await productStore.getProduct(product.printful_id)) continue;
    await productStore.addProduct(product);
    products++;
    for (const variant of catalog.variants) {
      if (variant.printful_product_id !== product.printful_id) continue;
      await productStore.addVariant(variant);
      variants++;
    }
  }
  return { products, variants };
}
/**
 * Bump whenever the seed data changes. Databases holding older seed data are
 * wiped and reseeded by {@link ensureSeeded}.
 * 2: the shop catalog comes from the TEST database (lib/seed_catalog.json).
 * 3: leaderboard entries include display names.
 */
export const SEED_VERSION = 3;
const VERSION_KEY = ["seed", "version"];
const LOCK_KEY = ["seed", "lock"];
/** Present in every seeded database, including those seeded before versioning. */
const MARKER_USER = SEED_USERS[SEED_USERS.length - 1].user_id;

/**
 * Seed the given database. Safe to re-run: existing seed records are kept and
 * only missing ones are added.
 */
export async function seed(
  kv: Deno.Kv,
  options: { now?: Date; stage?: string } = {},
): Promise<SeedSummary> {
  assertSeedAllowed(options.stage ?? Deno.env.get("STAGE"));
  const now = options.now ?? new Date();
  const { created, emt, emtStore } = await seedQuestions(kv);
  const { users, attempts } = await seedUsers(kv, emt, now);
  const reports = await seedReports(emtStore, emt);
  const { products, variants } = await seedProducts(kv);
  await kv.set(VERSION_KEY, SEED_VERSION);
  return { questions: created, users, attempts, reports, products, variants };
}

/**
 * Make sure a branch preview database holds current seed data:
 * - empty database (fresh preview): seed it;
 * - database holding seed data from an older {@link SEED_VERSION}: wipe it and
 *   reseed;
 * - anything else (real data, or current seed data): leave it alone.
 *
 * A database counts as seed-owned only if it has the seed version key or the
 * seed marker user, so real databases are never wiped. A KV lock stops
 * concurrent isolates from seeding twice. Returns null when nothing was done.
 */
export async function ensureSeeded(
  kv: Deno.Kv,
  options: { now?: Date; stage?: string } = {},
): Promise<SeedSummary | null> {
  assertSeedAllowed(options.stage ?? Deno.env.get("STAGE"));
  const version = (await kv.get<number>(VERSION_KEY)).value;
  if (version === SEED_VERSION) return null;

  const seedOwned = version !== null ||
    (await kv.get(["users", MARKER_USER])).value !== null;
  const empty = await (await QuestionStore.make(kv, "emt")).size() === 0;
  if (!seedOwned && !empty) return null; // real data: never touch

  const lock = await kv.atomic()
    .check({ key: LOCK_KEY, versionstamp: null })
    .set(LOCK_KEY, new Date().toISOString(), { expireIn: 5 * 60 * 1000 })
    .commit();
  if (!lock.ok) return null; // another isolate is seeding

  try {
    if (seedOwned) await wipe(kv);
    return await seed(kv, options);
  } finally {
    await kv.delete(LOCK_KEY);
  }
}

/** Delete every key except the seed lock. Only called on seed-owned databases. */
async function wipe(kv: Deno.Kv) {
  for await (const entry of kv.list({ prefix: [] })) {
    if (entry.key[0] === LOCK_KEY[0] && entry.key[1] === LOCK_KEY[1]) continue;
    await kv.delete(entry.key);
  }
}
