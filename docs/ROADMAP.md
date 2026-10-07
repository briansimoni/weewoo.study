# weewoo.study Roadmap

The attack plan for taking weewoo.study from a working hobby app to a polished,
subscription-based EMT study product. There are no active users yet, so we can
change data models, URLs, and UX freely. Use that window.

Work is done one task at a time by an **AI agent + a human tester**. This file
is the source of truth for what's next: agents read it at the start of a task
and update checkboxes and notes at the end.

---

## How we work (the loop)

Every task follows the same loop:

1. **Pick** the next unchecked task in the current phase. The human confirms or
   reorders.
2. **Clarify.** The agent reads the task, the referenced code, and any linked
   design, then asks only the questions that block it. Answers go into the
   task's notes here.
3. **Branch.** `feat/<short-name>` off `main`.
4. **Build.** Implement with unit tests and, for anything user-facing, an E2E
   test. Run `deno task verify` locally (see Phase 0).
5. **Preview.** Push. Deno Deploy builds a preview at
   `https://test-weewoo-study--<branch>.briansimoni.deno.net`. The agent runs
   E2E and smoke tests against it.
6. **Human test.** The human clicks through the preview, using the "How to test"
   list the agent writes in the PR description.
7. **Ship.** Merge to `main`, which updates test.weewoo.study. Once the human
   approves there, promote to prod (see Phase 0, "Release gate").
8. **Record.** Check the box, add a one-line note with the PR link, and log any
   follow-ups as new tasks.

**Rules for agents**

- Never trigger real email, payments, webhooks, or production-data operations
  while testing. Use `STAGE=DEV`, Stripe test mode, and seeded data.
- Prefer small PRs. A task that grows past about a day of work gets split here
  first.
- UI work starts from an approved design (see Phase 1). Don't freestyle the
  visual design.
- Whenever a schema or data model changes, update the seed data and fixtures in
  the same PR.

**Task card template.** Copy this when adding a task.

```md
- [ ] **Title.** One-sentence outcome.
  - Why: business reason
  - Done when: observable acceptance criteria
  - Test: unit / E2E / manual steps
  - Design: link to the Claude Design file, if UI
  - Notes:
```

---

## Current state (Oct 2026)

| Area      | Today                                                                                                                                                                                                                                 |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stack     | Deno 2, Fresh 2 + Vite, Tailwind 4 + DaisyUI 5, Preact islands, Deno KV                                                                                                                                                               |
| Hosting   | Deno Deploy apps `test-weewoo-study` (test.weewoo.study) and `weewoo-study` (weewoo.study). **Both deploy from `main` at the same time.** Branch previews use an **empty KV**.                                                        |
| CI        | None. The old GitHub Actions deploy workflows were deleted. Deno Deploy builds only; it doesn't run tests.                                                                                                                            |
| Tests     | 83 Deno unit tests (stores, middleware, page data). No E2E or browser tests.                                                                                                                                                          |
| Auth      | OAuth/OIDC via `auth.weewoo.study` (`oauth4webapi`). Login is required for `/emt/practice`.                                                                                                                                           |
| Questions | KV-backed `QuestionStore` with 41 NREMT categories and scopes `emt`, `advanced`, `medic`. There's an OpenAI generation pipeline in `scripts/question_generation_workflow/`, user thumbs-up/down reports, and an admin editor.         |
| Learning  | `AttemptStore` records response time, retry counts, and `retry_interval_hours` (spaced-repetition groundwork). There are streaks, a leaderboard, a basic profile with a Chart.js chart, and free trial questions on the landing page. |
| Shop      | Printful products with Stripe Checkout (one-time payments). Checkout passes **no shipping options**, so shipping is not calculated per order.                                                                                         |
| AI docs   | `AGENTS.md` exists. There's **no `CLAUDE.md`**, so Claude Code doesn't load AGENTS.md automatically. `deno task check` fails on pre-existing script errors.                                                                           |

---

## Phase 0: Foundation (tooling, tests, AI-friendliness)

Everything else depends on this. The goal is that an agent can make a change,
prove it works, and show a human, without anyone hand-holding the environment.

### 0.1 Agent ergonomics

- [x] **Make Claude Code load the project instructions.** `CLAUDE.md` imports
      `@AGENTS.md`; AGENTS.md now links this roadmap and the data model and
      defines "done".
- [x] **Get `deno task check` green.** Fixed all 39 lint problems across the
      repo (18 unversioned `npm:`/`jsr:` imports moved to the import map, plus
      unused variables and `any` types) and the script type errors. Excluded
      `.deno_cache/`. Added `deno task verify` (check + test) and
      `deno task smoke <url>` (`scripts/smoke.ts`). Fixing the lint errors also
      exposed a no-op sort on `/admin/questions/[id]`, which is now fixed.
- [x] **Rewrite the README** for a fresh contributor: overview, quick start,
      tasks, architecture map, deployment. Added `.env.example`.
- [x] **Document KV key layouts** in `docs/data-model.md`. Found that nothing in
      the app writes to the S3 KV-backup bucket (see that doc).
- [x] **Add `.claude/settings.json`** with an allowlist for checks and read-only
      git/gh commands, plus a PostToolUse hook (`.claude/hooks/fmt.ts`) that
      runs `deno fmt` on edited files. It's written in Deno, so it doesn't need
      jq.
- [x] **Add project skills:** `.claude/skills/run-local` (local production build
      and smoke test) and `.claude/skills/verify-preview` (wait for the Deploy
      builds, then smoke-test the preview). The `release` skill moved to 0.4
      because it depends on the release-gate decision. `run-local` and
      `verify-preview` should switch to seeded KV and E2E once 0.2 and 0.3 land.
- [x] **Give agents a Deploy token.** Personal token set as the user env var
      `DENO_DEPLOY_TOKEN` (2026-10-06); consider replacing it with an
      org-scoped, expiring token. Run the Deploy CLI from outside the project
      directory (it rewrites `deno.lock`), e.g.
      `cd ~ && deno run -A jsr:@deno/deploy logs --org briansimoni --app test-weewoo-study`.

### 0.2 Seed data and fixtures

Deno Deploy gives **every git branch its own empty KV database** on both apps
(`<app>--<branch>`), separate from the `production`, `preview` and `local`
databases. So a shared, pre-seeded preview database isn't possible, and previews
have to seed themselves.

- [x] **Add a deterministic seed module** (`lib/seed.ts`) plus `deno task seed`
      (writes `.kv/seed.sqlite3`; run the app with `KV_PATH`). It creates 143
      questions across every category and scope, 5 users from new to expert (282
      attempts, stats, leaderboard, streaks), 6 question reports, and 4 products
      with 9 variants (one inactive). Re-running it is safe, and it refuses
      `STAGE=PROD`. 5 unit tests.
- [x] **Auto-seed empty preview databases.** On startup, with
      `SEED_ON_EMPTY=true` and `STAGE` not `PROD`, an empty question bank is
      seeded (a KV lock stops concurrent isolates) before the first request is
      served. `SEED_ON_EMPTY=true` is set on both Deploy apps for all contexts,
      because the CLI can't scope it to Preview (see `docs/data-model.md`).
- [ ] **Scope `SEED_ON_EMPTY` to Preview (human, optional).** Do it in the Deno
      console, or with `deno deploy env update-contexts` once that works.

### 0.3 E2E testing

- [x] **Set up Playwright.** It runs natively under Deno
      (`npm:@playwright/test@1.63.0`), so no Node fallback is needed. Specs are
      in `e2e/tests/`. `deno task e2e` builds, seeds a fresh `.kv/e2e.sqlite3`,
      serves it on port 8123 and runs the suite. `deno task e2e:remote` with
      `BASE_URL` targets a deployment, and `deno task e2e:install` downloads
      Chromium once per machine. Traces and screenshots go to `.e2e/`.
- [ ] **Let humans sign in on previews (human, Auth0).** Auth0 currently rejects
      preview callbacks ("Callback URL mismatch" for
      `https://test-weewoo-study--<branch>.briansimoni.deno.net/auth/callback`).
      Decided: add `https://*.briansimoni.deno.net/auth/callback` (and the
      matching logout URL) to the **existing** Auth0 application's allowed URLs,
      not a separate app. A user signing in on a preview is created in that
      preview's KV automatically.
- [x] **Add a test login.** `/auth/test-login` signs in as a seed user without
      OAuth, for E2E tests and for humans on previews. It returns 404 unless
      `STAGE` is `DEV` or `TEST`, and it only accepts `seed|…` users that exist
      in that database, so test.weewoo.study's real accounts (STAGE=TEST, never
      seeded) and prod are out of reach. 7 unit tests prove the guards.
- [x] **Write the first E2E specs (9):** trial questions on the landing page;
      leaderboard; 404 page; practice requires login; admin blocked for a
      non-admin; test login refuses non-seed users; answer a question and see
      the streak and profile stats update; profile stats of an experienced user;
      shop → product → cart → checkout returns a `cs_test_` Stripe session
      (Stripe itself is never loaded). Writing them exposed a seed bug (blank
      leaderboard names), fixed in seed version 3.
- [ ] **Add visual snapshots** for key pages at mobile and desktop widths. This
      is deferred until CI exists (0.4), because baselines must be generated on
      the CI OS (Linux) to be stable. It's most useful once the Phase 1 design
      work starts.
- [ ] **Give agents eyes.** Claude in Chrome is already available to agents in
      this setup. Optionally add the Playwright MCP (`.mcp.json`) so agents can
      drive a headless browser against `deno task e2e:serve` without the human's
      browser.

### 0.4 CI and the release gate

- [ ] **Add a GitHub Actions `ci.yml`** for PRs and `main`: `deno task verify`,
      a production build, and E2E against a local server with seeded KV. Upload
      the Playwright report on failure.
- [ ] **Add a post-deploy E2E job** that runs smoke specs against the preview
      URL once Deno Deploy reports the build as successful.
- [ ] **Separate test and prod.** Right now a merge to `main` ships to both.
      Proposal: `test-weewoo-study` keeps deploying `main`, and `weewoo-study`'s
      production branch changes to `production`. Releasing means fast-forwarding
      `production` to a `main` commit the human has approved on
      test.weewoo.study (scripted by the `release` skill). Configure this in the
      Deno Deploy console.
- [ ] **Add a `release` skill** (`.claude/skills/release`) that promotes an
      approved `main` commit to prod and smoke-tests weewoo.study afterwards.
- [ ] **Enable branch protection** on `main` (CI required) once CI is stable.

### 0.5 Commerce environments (Stripe, Printful)

Found 2026-10-06: test.weewoo.study has **no Stripe webhook**, and the only
non-prod one targets `weewoo-study--local` (Deno Deploy's _Local_ context
tunnel). `weewoo-study` keeps separate Stripe keys for Production and for
Preview/Local. `test-weewoo-study` uses one set of values for every context. The
webhook handler submits a **real Printful order** and sends emails on
`checkout.session.completed` in every environment.

- [ ] **Audit Stripe modes (human, partly done).** Verified 2026-10-06: the
      Preview contexts of **both** apps use test-mode keys from the same Stripe
      account as the TEST catalog. Checkout on a seeded preview creates a
      `cs_test_` session. Still to confirm: test.weewoo.study (Production
      context of `test-weewoo-study`) is test mode, weewoo.study is live, and
      which webhook endpoints exist in each Stripe mode.
- [ ] **Guard side effects by stage.** Only `STAGE=PROD` submits real Printful
      orders and customer emails. Elsewhere, run a dry run that logs the
      Printful payload (optionally creating an unconfirmed Printful draft behind
      a flag). Refuse to start if `STAGE` and the Stripe key mode disagree (a
      `sk_live` key outside PROD, or a test key in PROD).
- [ ] **Unit-test the webhook handler** with signed fixture events
      (`stripe.webhooks.generateTestHeaderString`). Make it idempotent (record
      processed event IDs in KV), and stop throwing 500s for missing
      configuration on unrelated event types.
- [ ] **Webhooks as code.** Write `scripts/setup_stripe_webhooks.ts`, an
      idempotent script that creates or updates one endpoint per environment
      (weewoo.study live, test.weewoo.study test) with the event list and prints
      the signing secret to store in Deploy. Parameterize
      `scripts/setup_printful_webhook.ts` the same way (its prod URL is
      currently hard-coded).
- [ ] **Give the test app per-context config** like the prod app: test Stripe
      keys and the test.weewoo.study signing secret in Production, test keys in
      Preview.
- [ ] **Add test-mode catalog data.** Partly done: seeded previews now get the
      TEST catalog (test-mode Stripe IDs, `lib/seed_catalog.json`). Remaining:
      confirm which Stripe mode each Preview key uses. Stripe product IDs stored
      in KV must exist in the matching Stripe mode. Seed (0.2) or sync test-mode
      products so checkout works on test.weewoo.study and previews.
- [ ] **Define local and preview webhook testing.** Use the Stripe CLI
      (`stripe listen --forward-to localhost:8000/api/stripe_webhook`) or the
      Deploy Local tunnel. Previews don't get a Stripe endpoint per branch, so
      they rely on unit tests and the CLI.

**Exit criteria:** an agent can take a task from branch to preview with green CI
and E2E, the human tests on a preview with real-looking data, and prod deploys
only on an explicit release.

---

## Phase 1: Design system and the Claude Design pattern

The goal is a single source of visual truth, so agents implement designs rather
than inventing them. That's essential before the Duolingo-style overhaul.

**The pattern**

1. **Design system in Claude Design.** Create a design-system project at
   claude.ai/design, seeded from the codebase: the DaisyUI theme tokens (colors,
   radii, fonts), plus core components (buttons, cards, the question card, the
   streak badge, nav, modals).
2. **Code is the implementation of that system.** Tokens live in one CSS file
   (`static/styles.css` DaisyUI theme) and components in `components/ui/`. The
   `/design-sync` skill in Claude Code keeps the code component library and the
   Claude Design project in sync incrementally: push a new component up, or pull
   a design change down.
3. **Every UI task starts as a design.** The human (or an agent) builds the
   screen or flow in Claude Design using the design system, iterates, and then
   marks it approved. The task card links the design.
4. **The agent implements against the design** using existing `components/ui`
   pieces, adds new pieces to the design system through `/design-sync` when
   needed, and attaches screenshots (mobile and desktop) to the PR for side-by-
   side comparison.
5. **Visual snapshots** (Phase 0.3) lock the result in.

**Tasks**

- [ ] Audit the current UI: list every page and island, and the ad-hoc styles
      that are repeated.
- [ ] Extract `components/ui/` primitives (Button, Card, Badge, Modal,
      ProgressBar, Stat) and replace the duplicated markup with them.
- [ ] Create the Claude Design design-system project and do the first
      `/design-sync` push.
- [ ] Define the brand direction: a playful EMS identity (mascot? ambulance
      "WeeWoo" character?), sound and motion guidelines, tone of voice. This is
      the human's call.

**Exit criteria:** a design-system project exists, the code primitives match it,
and one real screen has gone through the full design → implement → review loop.

---

## Phase 2: Question base 2.0

Content is the product, and this phase can run alongside the others once the
schema is done.

- [ ] **Extend the question schema:** `difficulty` (1–10, the pipeline already
      estimates it), `status` (`draft | in_review | published |
      retired`),
      `tags`, `references` (protocol or textbook section),
      `explanation_per_choice`, `version`, `author` (`ai | human`), and
      `reviewed_by`. Migrate existing questions and update the seed data.
- [ ] **Make the generation pipeline a repeatable job.** It should be
      idempotent, resumable, and produce `draft` questions with a similarity
      check against the full bank. Decide which model to use; evaluate Claude
      next to the current OpenAI usage.
- [ ] **Add a review queue in admin:** approve, edit, or reject drafts, with
      keyboard shortcuts for speed. Only `published` questions are served.
- [ ] **Use quality signals:** auto-flag questions with high thumbs-down rates,
      "too easy" (>95% correct), or "ambiguous" (choices split evenly), and
      route them back to review.
- [ ] **Hit coverage targets:** at least N questions per category per scope,
      tracked on an admin dashboard. Proposal: 50 per EMT category to start
      (about 2,000 total).
- [ ] **Add new formats** (later): image-based questions, multi-select, and
      scenario chains (a case with three linked questions).

**Risks.** Medical accuracy: a credentialed human must review before a question
is published. Copyright: generated questions must be original and not paraphrase
copyrighted textbook text. Review the `split_book_into_chapters` inputs with
that in mind.

---

## Phase 3: Learning engine and personal analytics

- [ ] **Add mastery modeling:** a per-user, per-category mastery score from
      attempts, weighted by recency and difficulty.
- [ ] **Add spaced repetition:** schedule reviews of missed questions, building
      on `retry_interval_hours`. Practice sessions mix new questions, weak
      categories, and due reviews.
- [ ] **Add an exam readiness score:** an estimated probability of passing the
      NREMT, with a per-category breakdown and "focus next on X".
- [ ] **Build a personal analytics dashboard:** accuracy over time, category
      radar or heatmap, response-time trends, streak calendar, and "questions
      you keep missing".
- [ ] **Add a timed mock exam mode** that mirrors NREMT length and distribution.
- [ ] **Re-evaluate storage.** Analytics aggregations on KV get awkward. Decide
      whether to keep KV with precomputed aggregates or add Postgres (Deno
      Deploy offers managed Postgres) for attempts and analytics.

---

## Phase 4: The fun, addictive experience (Duolingo-style)

Design-led: every item here goes through the Phase 1 pattern.

- [ ] **Learning path:** units per category, with lessons of 5–10 questions and
      a visual path map that unlocks progressively.
- [ ] **XP and daily goals:** XP per answer, a daily goal ring, and level-ups.
- [ ] **Streak 2.0:** streak freezes, milestones, and an at-risk reminder by
      email or push. This builds on `StreakStore`.
- [ ] **Leagues:** weekly leaderboards in tiers, replacing the single global
      leaderboard.
- [ ] **Juice:** answer animations, sound (existing `correct.wav` and
      `incorrect.wav`), haptics on mobile, celebratory screens, and a mascot.
- [ ] **Onboarding:** pick your certification level and exam date, take a
      placement quiz, and get a personalized daily goal.
- [ ] **Notifications:** email digests now, and web push once the PWA (Phase 7)
      lands.
- [ ] **Product analytics** (for us, not the user): funnel and retention
      tracking (for example, PostHog) to measure whether the "addictive" changes
      actually work.

---

## Phase 5: Free trial and subscriptions

- [ ] **Entitlements model:**
      `user.entitlement = { plan, status, trial_ends_at,
      source: "stripe" | "apple" | "google" }`.
      It's provider-agnostic from day one because native apps (Phase 7) will
      need in-app purchases.
- [ ] **Stripe Billing:** monthly and annual prices, Checkout in `subscription`
      mode with `trial_period_days`, the Customer Portal for self-serve changes,
      and webhooks (`customer.subscription.*`, `invoice.*`) that update
      entitlements. Make them idempotent and test them with Stripe CLI fixtures.
- [ ] **Paywall and gating middleware:** decide what's free (proposal: the daily
      trial set plus N questions a day) and what's premium (unlimited practice,
      mock exams, analytics, spaced review). Paywall UI comes from a design.
- [ ] **Trial lifecycle emails:** welcome, trial ending in 2 days, trial ended,
      and payment failed.
- [ ] **Admin:** view a user's entitlement and grant comped access.
- [ ] **Tests:** E2E for subscribing with a Stripe test card, cancelling, and
      gated content.

**Decisions for the human:** pricing, trial length, whether a card is required
up front for the trial, and the free-tier limits.

---

## Phase 6: Shop

- [ ] **Dynamic shipping (good pilot task for the loop).** Get rates from
      Printful's shipping rates API (`POST /shipping/rates`) for the cart items
      and destination. Two options:
  - (a) Collect the destination ZIP/state on the cart page, fetch rates, and
    pass them as `shipping_options` when creating the Checkout Session.
  - (b) Use Stripe Checkout's dynamic shipping-options callback to recalculate
    rates when the customer enters their address inside Checkout. This gives
    better UX but has more moving parts.

  Recommendation: start with (a). Add a mocked Printful client in tests (the
  client already accepts an injectable `fetch`). Then retire
  `scripts/update_shipping_config.ts`.
- [ ] **Tax:** decide on Stripe Tax and confirm nexus obligations.
- [ ] **Order status page** for customers, fed by the existing Printful webhook.
- [ ] **Catalog scalability:** collections and categories, variant images, and
      an admin bulk import from Printful.
- [ ] **Subscriber perks** (later): a discount code for subscribers, connecting
      the shop to Phase 5.

---

## Phase 7: Mobile (long term)

- [ ] **PWA first.** `static/manifest.json` exists; add a service worker,
      offline practice of cached questions, installability, and web push. This
      is cheap and covers most of the need.
- [ ] **API-first discipline starting now:** every feature built in Phases 2–5
      should expose clean JSON endpoints (documented in `openapi.yaml`) so a
      native client can reuse them.
- [ ] **Native app:** Capacitor (wrap the web app) or Expo/React Native (rewrite
      the UI, reuse the API). Decide after the PWA shows real usage. In-app
      purchases are required for digital subscriptions on iOS and Android;
      consider RevenueCat, which maps onto the Phase 5 entitlement model.

---

## Suggested order

1. Phase 0 (all of it). This is non-negotiable groundwork.
2. Phase 6, dynamic shipping: a small, isolated pilot to tune the agent + human
   loop.
3. Phase 1, design system.
4. Phase 2 schema and pipeline. Content generation then runs continuously in the
   background.
5. Phase 3, then 4: engine before polish, but design work for Phase 4 can start
   early.
6. Phase 5 before any marketing push.
7. Phase 7 when there are users asking for it.

## Open decisions

| Decision                                         | Phase | Owner |
| ------------------------------------------------ | ----- | ----- |
| Preview KV strategy (dedicated DB vs. auto-seed) | 0     | Human |
| Prod promotion via a `production` branch         | 0     | Human |
| Brand direction and mascot                       | 1     | Human |
| Question generation model (OpenAI vs. Claude)    | 2     | Both  |
| Medical reviewer for question approval           | 2     | Human |
| KV vs. Postgres for analytics                    | 3     | Both  |
| Pricing, trial length, free-tier limits          | 5     | Human |
| Shipping approach (a) vs. (b)                    | 6     | Both  |
