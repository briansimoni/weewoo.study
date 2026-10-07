# Data model (Deno KV)

All persistent server data lives in a single Deno KV database opened by
`getKv()` in `lib/kv.ts` (a process-wide singleton). It opens `KV_PATH` if set,
otherwise `Deno.openKv()` with no path: locally that is a SQLite file in Deno's
cache, and on Deno Deploy it is the database attached to the app's current
context. Deploy creates **one database per git branch** (`<app>--<branch>`) next
to `production`, `preview` and `local`, so every branch preview starts empty
(see "Seed data").

Stores take an optional `Deno.Kv` in `make()`, so tests pass
`Deno.openKv(":memory:")`. **Only touch KV through the owning store.** Several
stores keep secondary indexes that must be updated in the same atomic operation.

Not in KV: the shopping cart (browser `localStorage`, `lib/cart_store.ts`),
theme and trial preferences (`preferences` cookie, base64 JSON, parsed in
`routes/_middleware.ts`), and the session ID (`app_session` cookie).

## Key reference

`<scope>` is the question scope: `"emt" | "advanced" | "medic"` (default
`"emt"`).

| Key                                                             | Value               | Owner           | Notes                                                                                                                                                                         |
| --------------------------------------------------------------- | ------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `[<scope>, "question_content", questionId]`                     | `Question`          | `QuestionStore` | Primary record. `questionId` is a hash of the question text.                                                                                                                  |
| `[<scope>, "global_question_index", n]`                         | `questionId`        | `QuestionStore` | Dense array `0..count-1` for O(1) random picks.                                                                                                                               |
| `[<scope>, "global_question_map", questionId]`                  | `n`                 | `QuestionStore` | Reverse of the index. Deletes swap the last entry into the hole.                                                                                                              |
| `[<scope>, "global_question_count"]`                            | `number`            | `QuestionStore` |                                                                                                                                                                               |
| `[<scope>, "category_question_index", category, n]`             | `questionId`        | `QuestionStore` | Same array/map scheme per category.                                                                                                                                           |
| `[<scope>, "category_question_map", category, questionId]`      | `n`                 | `QuestionStore` |                                                                                                                                                                               |
| `[<scope>, "category_question_count", category]`                | `number`            | `QuestionStore` |                                                                                                                                                                               |
| `[<scope>, "category_question_content", category, questionId]`  | `Question`          | `QuestionStore` | Denormalized copy for listing by category. Keep in sync with `question_content`.                                                                                              |
| `[<scope>, "question_reports", questionId, reportId]`           | `QuestionReport`    | `QuestionStore` | Thumbs up/down feedback. Moved to the new ID when a question's text changes.                                                                                                  |
| `["users", userId]`                                             | `User`              | `UserStore`     | `userId` is the OIDC subject, e.g. `auth0\|…`. Includes aggregate and category stats.                                                                                         |
| `["leaderboard", "questions_correct", correctCount, userId]`    | `LeaderBoardEntry`  | `UserStore`     | Sorted index, updated atomically with the user. The old entry is deleted on change.                                                                                           |
| `["attempts", "by_attempt_id", userId, attemptId]`              | `Attempt`           | `AttemptStore`  | Every answered question.                                                                                                                                                      |
| `["attempts", "by_question_id", userId, questionId, attemptId]` | `Attempt`           | `AttemptStore`  | Secondary index for per-question history.                                                                                                                                     |
| `["streaks", userId]`                                           | `Streak`            | `StreakStore`   | Purged on read once `expires_on` passes.                                                                                                                                      |
| `["sessions", sessionId]`                                       | `Session`           | `SessionStore`  | `expireIn` 30 days. Holds the OAuth access token and profile fields.                                                                                                          |
| `["products", printfulId]`                                      | `Product`           | `ProductStore`  |                                                                                                                                                                               |
| `["variants", printfulProductId, variantId]`                    | `ProductVariant`    | `ProductStore`  |                                                                                                                                                                               |
| `["stripe_variants", stripeProductId, variantId]`               | `ProductVariant`    | `ProductStore`  | Lookup by Stripe product (used by the webhook).                                                                                                                               |
| `["stripe_events", eventId]`                                    | `StripeEventRecord` | Stripe webhook  | Idempotency for `checkout.session.completed`: `processing` (`expireIn` 10 min) while fulfilling, then `done` (`expireIn` 30 days). Deleted on failure so Stripe's retry runs. |

Types are defined in the owning store module: `Question` and `QuestionReport` in
`lib/question_store.ts`, `User` in `lib/user_store.ts`, `Attempt` in
`lib/attempt_store.ts`, `Streak` in `lib/streak_store.ts`, `Session` in
`lib/session_store.ts`, `Product` and `ProductVariant` in
`lib/product_store.ts`, and `StripeEventRecord` in `lib/stripe_webhook.ts`.

## Admin and backup tooling

- `/admin/debug` and `/admin/database` read and write raw keys. Use them
  carefully.
- `/api/admin/kv/export` and `/api/admin/kv/import` (`lib/kv_backup.ts`) dump
  and restore every key. Import upserts; it does not clear the database first.
- `infra/kv-backup.tf` provisions a versioned S3 bucket
  (`ems-questions-deno-kv-backups`), but no app code writes to it. It was
  presumably the target of Deno Deploy Classic's built-in KV backup. Confirm
  that backups still arrive since the move to the new Deno Deploy.

## Changing the model

- Update the interface, the store, its tests, and this file in the same PR.
- There are no migrations framework or schema versions yet. Write a one-off
  script in `scripts/` and run it against a backup first.
- Update `lib/seed.ts` and its tests too, so seed data keeps matching the model.

## Seed data

`lib/seed.ts` writes deterministic test data through the stores, and refuses to
run when `STAGE=PROD`. What works where:

| Data                                                         | Source                                                     | Works for                                                                                                                            |
| ------------------------------------------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 143 `[Seed]` questions, all categories and scopes            | Synthetic (the repo is public, so the real bank stays out) | Practice, admin, reports                                                                                                             |
| 5 `seed\|…` users with attempts, stats, leaderboard, streaks | Synthetic, KV only                                         | Leaderboard and stats pages. **They can't sign in through Auth0**; E2E uses a test-only login (ROADMAP 0.3).                         |
| 15 products, 217 variants (`lib/seed_catalog.json`)          | Copy of the **TEST** database's catalog                    | Shop pages and Stripe checkout with a test-mode key: the Stripe IDs are test-mode products and the Printful IDs are the real store's |

Regenerate the catalog from a test backup with
`deno run --allow-read --allow-write scripts/export_seed_catalog.ts <TEST-kv-backup.json>`.
Never use a production backup: its Stripe IDs are live-mode products.

Streaks are written directly to `["streaks", userId]`, because `StreakStore`
only advances them in real time. `ensureSeeded` holds a `["seed", "lock"]` key
(5-minute TTL) while seeding, so concurrent isolates don't seed twice. `seed()`
records `["seed", "version"]`. **Bump `SEED_VERSION` whenever seed data
changes**: `ensureSeeded` then wipes and reseeds databases holding older seed
data (identified by that key or the `seed|expert` user). Databases with real
data are never wiped.

- Local: `deno task seed` creates `.kv/seed.sqlite3`; run the app with
  `KV_PATH=.kv/seed.sqlite3`.
- Deploy previews: every branch gets its own KV database (`<app>--<branch>`),
  seeded on startup when `SEED_ON_EMPTY=true`. The flag is set on both apps for
  all contexts (`deno deploy env update-contexts` currently fails with
  MALFORMED_REQUEST, so it could not be scoped to Preview). That is safe:
  production has `STAGE=PROD` (seeding refuses), and test.weewoo.study is not
  empty. Scope it to Preview in the Deno console if preferred.

## Legacy keys

Production and test backups (2026-10) still contain keys no current code reads:
`["emt", "questions", …]` and `["emt", "question_count"]` (an older question
layout) and `["jokes", …]`. They're harmless. Remove them with a one-off script
once a backup has been taken.
