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
| Hosting   | Deno Deploy apps `test-weewoo-study` (test.weewoo.study, deploys from `main`) and `weewoo-study` (weewoo.study, deployed only by releasing to the `production` branch). Branch previews seed their own KV.                            |
| CI        | GitHub Actions: `verify`, `e2e` and `preview-e2e` are required on PRs to `main`; `Deploy production` runs on `production`.                                                                                                            |
| Tests     | 126 Deno unit tests (stores, middleware, page data, both webhooks) and 9 Playwright E2E specs.                                                                                                                                        |
| Auth      | OAuth/OIDC via `auth.weewoo.study` (`oauth4webapi`). Login is required for `/emt/practice`.                                                                                                                                           |
| Questions | KV-backed `QuestionStore` with 41 NREMT categories and scopes `emt`, `advanced`, `medic`. There's an OpenAI generation pipeline in `scripts/question_generation_workflow/`, user thumbs-up/down reports, and an admin editor.         |
| Learning  | `AttemptStore` records response time, retry counts, and `retry_interval_hours` (spaced-repetition groundwork). There are streaks, a leaderboard, a basic profile with a Chart.js chart, and free trial questions on the landing page. |
| Shop      | Printful products with Stripe Checkout (one-time payments). Checkout passes **no shipping options**, so shipping is not calculated per order.                                                                                         |
| AI docs   | `CLAUDE.md` imports `AGENTS.md`; project skills for running locally, verifying previews and releasing. `deno task verify` is green.                                                                                                   |

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
- [x] **Add visual snapshots.** `e2e/tests/visual.spec.ts` covers 10 pages
      (landing, about, leaderboard, shop, product, cart, support, 404, profile,
      practice) at 390px and 1280px. Linux-only baselines are generated by the
      "Update visual snapshots" workflow (PR label `update-snapshots`); see
      README "Visual snapshots". A separate CI run matched all 20 on the first
      try.
- [ ] **Fix UI bugs the snapshots show.** (1) ~~The profile page overflows on
      mobile: the page is 413px wide at a 390px viewport (the streak stat), and
      the profile image shows its alt text~~: fixed by the Phase 1 primitives
      (2026-10-10). ~~(2) The shop shows a broken image for products with no
      `thumbnail_url`~~: done 2026-10-08, the seed catalog thumbnails are
      CloudFront images (the TEST database still needs the same fix through
      `deno task admin`). A fallback image for missing thumbnails would still
      help. Good first tasks for the Phase 1 design work. Deferred (2026-10-10):
      the profile page is being redesigned in Phase 1.
- [ ] **Give agents eyes.** Claude in Chrome is already available to agents in
      this setup. Optionally add the Playwright MCP (`.mcp.json`) so agents can
      drive a headless browser against `deno task e2e:serve` without the human's
      browser.

### 0.4 CI and the release gate

- [x] **Add GitHub Actions CI** (`.github/workflows/ci.yml`) on PRs and `main`:
      `verify` (fmt, lint, type check, unit tests), `e2e` (production build,
      fresh seeded database, Playwright; artifacts on failure). Passed first
      time on PR #5.
- [x] **Add preview E2E.** The `preview-e2e` job waits for Deno Deploy's
      test-app build of the PR branch, then runs the smoke test and the full E2E
      suite against the self-seeding preview. It's part of `ci.yml` rather than
      a separate `status`-triggered workflow, so its result shows on the PR.
- [x] **Add the `STRIPE_TEST_API_KEY` secret (human).** Added 2026-10-07. It
      holds a Stripe test-mode key so the local `e2e` job runs the shop spec.
- [x] **Separate test and prod.** Done 2026-10-07: `weewoo-study` is
      disconnected from GitHub, and two releases (`4bd2d60`, `3c327be`) went out
      through the workflow. Deno Deploy only ever puts an app's _default_ git
      branch into production; there's no per-app production branch. So the prod
      app `weewoo-study` is deployed by the `Deploy production` workflow
      (`deno deploy --prod` via the CLI, run outside the repo so it never writes
      `deno.lock`) when the `production` branch moves. The branch was created at
      `e0f819e`, prod's commit at the time. CLI builds were verified with
      preview deploys to `weewoo-study`. **Human steps, in order:** (1) add the
      `DENO_DEPLOY_TOKEN` repo secret (ideally an org-scoped token); (2) merge
      PR #5; (3) in the Deno console, disconnect `weewoo-study` from GitHub; (4)
      ask for a first release to prove the flow.
- [x] **Add a `release` skill** (`.claude/skills/release`). It merges `main`
      into `production` with `--no-ff` (a new commit with a tree identical to
      `main`, which triggers the deploy workflow), in a temporary worktree,
      after checking CI and test.weewoo.study and asking the human. Then it
      watches the deploy workflow and confirms the prod deployment is routed.
- [x] **Enable branch protection** on `main` (2026-10-07): PRs required, with
      the `verify`, `e2e` and `preview-e2e` checks required; admins can bypass.
- [ ] **Mind the Deno Deploy build quota.** The plan allows **15 deployments per
      hour**; past that, builds fail with "You have exceeded the deployment
      limit" (seen 2026-10-07: test.weewoo.study missed a `main` build, and an
      earlier preview never built). Disconnecting the prod app halves the builds
      per push. If it keeps biting: batch pushes, or upgrade the plan. A missed
      `main` build can be redone from the Deno console ("Deploy Default Branch")
      once the hour passes.

### 0.5 Commerce environments (Stripe, Printful)

Found 2026-10-06: test.weewoo.study has **no Stripe webhook**, and the only
non-prod one targets `weewoo-study--local` (Deno Deploy's _Local_ context
tunnel). `weewoo-study` keeps separate Stripe keys for Production and for
Preview/Local. `test-weewoo-study` uses one set of values for every context. The
webhook handler submits a **real Printful order** and sends emails on
`checkout.session.completed` in every environment. (Since PR #8, only PROD
places orders and sends emails; see below.)

Found 2026-10-07: the app's winston logs never reached the Deno Deploy console
(winston wrote to `console._stdout`, which Deploy doesn't collect); they only
went to CloudWatch (`/weewoo-study/test`, `/weewoo-study/production`, region
us-east-1). Fixed with `forceConsole: true` in `lib/logger.ts`.

- [x] **Audit Stripe modes.** The Preview contexts of **both** apps use
      test-mode keys from the same Stripe account as the TEST catalog
      (2026-10-06). Confirmed 2026-10-07 by the startup key check (PR #8):
      test.weewoo.study runs a test key (and a checkout there made a `cs_test_`
      session) and weewoo.study a live key. Test-mode endpoints:
      test.weewoo.study (`we_1UO2c…`) and the `weewoo-study--local` tunnel
      (`we_1R2yOg…`). Live-mode endpoints weren't listed (that needs a live
      key); weewoo.study's was set up by hand.
- [x] **Guard side effects by stage.** Only `STAGE=PROD` submits Printful orders
      and sends customer and admin emails. Elsewhere the webhook logs the
      Printful payload (a dry run), or with `PRINTFUL_DRAFT_ORDERS=true` submits
      an unconfirmed Printful draft without emails. `main.ts` refuses to start
      when `STAGE` and the `STRIPE_API_KEY` mode disagree (a live key outside
      PROD, or a test key in PROD).
- [x] **Unit-test the webhook handler.** The logic moved to
      `lib/stripe_webhook.ts` with injected dependencies (signature check,
      Stripe checkout calls, KV, Printful fetch, email, logger); 16 tests use
      fakes, so they never import the Stripe SDK (it reads AI-agent env vars on
      import, which the test allowlist doesn't permit). It's idempotent
      (`["stripe_events", eventId]` in KV), returns 400 for bad signatures, 200
      for unrelated event types whatever the Stripe/Printful config, and 500
      (releasing the event for Stripe's retry) when fulfillment fails.
- [x] **Webhooks as code.**
      `scripts/setup_stripe_webhooks.ts <test|prod>
      [--secret-out <file>] [--recreate]`
      creates or updates the Stripe endpoint for one environment, refusing a key
      of the wrong mode, and writes a new endpoint's signing secret to a file.
      Ran `test` on 2026-10-07: created `we_1UO2cVIkTHoHiwfEA83cMLun` for
      test.weewoo.study (until then the only test-mode endpoint was the Local
      tunnel, so test.weewoo.study never received webhooks); its secret is set
      on `test-weewoo-study`. `prod` hasn't been run: weewoo.study's live
      endpoint exists by hand.
      `scripts/setup_printful_webhook.ts <prod|test> [--replace]` now uses the
      v1 API's single per-store webhook config (the client's list/delete-by-ID
      methods didn't match the API). Printful allows one URL per store and
      test.weewoo.study shares prod's store, so only prod gets Printful
      webhooks.
- [x] **Give the test app per-context config.** Not needed as planned: the test
      app's single set of values is all test mode (test Stripe keys and
      test.weewoo.study's signing secret), which is right for every context.
      Previews also get that secret but never receive webhooks.
- [x] **Add test-mode catalog data.** Seeded previews get the TEST catalog
      (test-mode Stripe IDs, `lib/seed_catalog.json`), and test.weewoo.study's
      own catalog checks out in test mode (verified with a purchase,
      2026-10-07).
- [x] **Define local and preview webhook testing.** README "Testing webhooks":
      unit tests for both handlers; test.weewoo.study's real endpoint, plus
      `scripts/resend_stripe_event.ts <cs_test_… | evt_…>` to replay a test
      checkout without buying again; the Stripe CLI locally; previews rely on
      unit tests. Printful webhooks reach prod only.
- [x] **Printful webhook trusts only Printful.** Found during the close-out: the
      unsigned `package_shipped` handler emailed the recipient and tracking link
      from the request body, so anyone who guessed an order ID could send a
      weewoo.study "your order shipped" email with any link to any address. Now
      (`lib/printful_webhook.ts`, 10 tests) it re-reads the order from Printful
      and uses only that copy's recipient and shipment, accepts only a
      `YYYY-MM-DD` delivery date from the payload, and emails only in PROD.
- [x] **Rotate `PRINTFUL_SECRET`.** The token in `.env` was rejected by
      Printful. Rotated 2026-10-07 in `.env` and on both Deploy apps. The token
      must be limited to the **weewoo.study store only**: an all-stores token
      makes Printful require a `store_id` the client doesn't send (product and
      webhook calls fail, and orders could land in the wrong store). Checked:
      the products, orders and webhooks calls all return 200.

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

- [x] Audit the current UI: list every page and island, and the ad-hoc styles
      that are repeated. Done 2026-10-10 in [docs/ui-audit.md](ui-audit.md): no
      design tokens yet (DaisyUI defaults), 34 raw palette classes that break
      dark mode, the stat block and admin header copied by hand, 38 browser
      `alert()`s, no shared page shell. It adds Alert/Toast, Avatar,
      Page/PageHeader and FeatureCard to the primitive list, and found bugs, all
      fixed since: the cart showed the Printful ID as the product name, desktop
      nav had no Practice link, and most pages had no `<title>`.
- [x] Extract `components/ui/` primitives (Button, Card, Badge, Modal,
      ProgressBar, Stat) and replace the duplicated markup with them. Done
      2026-10-10 in three PRs (#17, #18, and the page-shell PR):
      `Button`/`LinkButton`, `Card`, `Stat`/`StatGrid`, `Avatar`, `Alert`,
      `Modal` (native `<dialog>`), toasts (`showToast()` +
      `islands/Toaster.tsx`), `Page` (tab title, standard widths, heading),
      `Badge`/`CountBadge` and `ProgressBar`, plus `components/UserStats.tsx`.
      Every public page now renders in `Page` and has a `<title>`; the navbar is
      built from one link list, has Practice on desktop and no longer wraps.
      Fixed on the way: profile overflow and broken image, dark mode on the user
      page, practice screen and error page, `alert()`s outside the admin product
      page.
- [ ] **Finish moving to the primitives.** ~~Admin pages still use raw DaisyUI
      markup (header band copied into 6 pages, badges, tables)~~: every admin
      page renders in `components/admin/AdminPage.tsx` (section tabs, heading),
      and the questions and reports pages were reworked (2026-10-11, PR #25):
      working scope tabs and filters, search, resolve from the reports list,
      scope passed to the admin question APIs. Tests and previews reach the
      admin pages as the seed admin (`seed|admin`, test login only). ~~The admin
      product page has 28 `alert()`s in 1,776 lines~~: split into
      `components/admin/product/` (summary, colors, variants, JSON editor) with
      toasts and confirm dialogs, no full-page reloads, and a seed-catalog
      Printful stub (`lib/printful_catalog.ts`) so CI can test it (2026-10-11,
      PR #26). Still open: the users and database page bodies are unchanged.
      `/admin/debug` (raw KV edits, sessions with OAuth access tokens) was
      removed (2026-10-12): `/admin/database` and the admin API cover it. ~~The
      landing page's 6 feature cards and promo cards are hand-copied~~: done
      with the landing redesign below (`FeatureCard`).
- [x] **Redesign the landing page** (the first screen through the full design →
      implement → review loop). Done 2026-10-11 in PR #23; design approved on
      the [landing canvas](https://claude.ai/artifact/4rcpjQgA7pKJfyU7ej62hr).
      The joke content stays (the human's call: it's a conversation starter);
      only the presentation changed. The trial questions moved into the hero
      with a "n / 5 answered" bar; the stats became a Night Shift monitor
      (`components/landing/VitalsMonitor.tsx`) and the celebrity clips a
      play/pause island (`islands/AudioClip.tsx`); new `FeatureCard` primitive
      (added to `.design-sync/entry.ts`, not yet pushed to Claude Design); lime
      closing band and a footer. Follow-ups: the navbar still shows "WeeWoo🚑"
      rather than the beacon mark (it's on every page, so it's a separate change
      with the mark artwork); the question card inside the trial is the shared
      practice card, restyling it (lettered choices, inline feedback) belongs to
      the practice screen's design.
- [x] Create the Claude Design design-system project and do the first
      `/design-sync` push. Done 2026-10-10: project
      [weewoo.study](https://claude.ai/design/p/158f915d-3eee-4812-9214-1f225e3f3481)
      with 11 components (Button, LinkButton, Card, Stat, StatGrid, Avatar,
      Alert, Badge, CountBadge, ProgressBar, Modal), the Night/Day Shift CSS,
      fonts and a conventions header for the design agent; every preview
      authored and graded. The app is Preact, so `.design-sync/build-pkg.mjs`
      compiles `components/ui` against React for the sync (see
      `.design-sync/NOTES.md`). Page and the Toaster stay out (Fresh/signals).
- [x] Define the brand direction: a playful EMS identity (mascot? ambulance
      "WeeWoo" character?), sound and motion guidelines, tone of voice. This is
      the human's call. Decided 2026-10-10 from three options on the
      [brand canvas](https://claude.ai/artifact/EdsnXrmLF5qBGm4ydpKDnJ): **Night
      Shift**. Dark-first (navy, hi-vis lime `#D4F25A`, monitor teal, flare
      orange), with a **Day Shift** light variant behind the toggle where lime
      is a fill only and text uses olive `#4F6B00`. Space Grotesk display, IBM
      Plex Sans body, IBM Plex Mono for data. No mascot: a beacon-and- heartbeat
      mark. Voice: dry EMS humor ("Clean call."). Implemented as the DaisyUI
      themes `nightshift` (default) and `dayshift` in `static/styles.css`. Still
      open: sound and motion guidelines, the mark as real artwork (logo,
      favicon, app icon), and the mark in the navbar. (The landing page's joke
      stats and celebrity section stay, decided 2026-10-11.)

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
      `reviewed_by`. Migrate existing questions and update the seed data. Code
      done in PR #29 (2026-10-12): only published questions are indexed and
      served, `setStatus` moves them in and out, admin shows and changes status.
      Decided: existing questions become `published` with `author` unset (some
      are AI-generated, some hand-written); migrate rather than fill on read.
      Still to do: run the migration on test, then prod.
- [ ] **AI first-pass review of the question bank (Claude Sonnet).** A script
      (`scripts/review_questions.ts`, Message Batches API, structured output)
      asks `claude-sonnet-5-5` for a verdict per question (`pass`, `minor_fix`,
      `major_issue`, `wrong_answer`, with reasons), a difficulty, tags,
      `explanation_per_choice`, suggested references, and suggested rewrites. A
      `review-questions` skill is the playbook around it: export read-only, run,
      summarize, apply after approval.
  - Order (decided 2026-10-12): calibrate on 2–3 questions the human reviews
    first; then run the whole prod bank. `wrong_answer` and `major_issue`
    questions move to `in_review` (out of practice) without per-question
    approval; passes get their metadata and `reviewed_by: ai:claude-sonnet-5-5`.
    Suggested rewrites are never applied automatically; they wait for the review
    queue.
  - Cost: about $5 per 500 questions at batch prices (Sonnet 5.5: $2/$10 per
    MTok, halved by batching). Needs an Anthropic API key in the local `.env`.
  - The same reviewer later checks every generated draft before the review
    queue.
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
- [ ] **Make the review process visible to learners.** Show users how each
      question was made and checked, so AI-generated content earns trust.
  - Why: it sets us apart from Pocket Prep. Generated questions will meet
    skepticism, and showing the review process answers it.
  - Done when: each question (after answering) shows its `references`, a
    "Reviewed by <credential>" badge from `reviewed_by`, and a last-reviewed
    date; a public "How we write questions" page explains the pipeline, the
    human review, and how reports feed back in.
  - Test: E2E that an answered seed question shows its references and review
    badge; the page renders in visual snapshots.
  - Design: needs a design (badge and references on the answer screen).
  - Notes: depends on the schema fields above and on the "Medical reviewer"
    decision. Show credentials, not personal details, unless the reviewer
    agrees.
- [ ] **Tell reporters when their report improved a question.** When an admin
      resolves a report by editing or retiring the question, the person who
      filed it hears about it.
  - Why: users who see their reports fixed keep reporting, which raises question
    quality for free.
  - Done when: resolving a report in admin can record what changed (a short,
    user-facing note); the reporter sees "Your report on '<question>' was fixed:
    <note>. Thanks!" on their next visit (an in-app inbox or banner), and it
    shows on their profile as a count ("You've improved N questions"). Reports
    resolved as "no change" can send a short explanation or nothing (decide).
  - Test: unit tests for the store (resolution note, unread notifications per
    user); E2E: a seed user's report is resolved in admin, and that user sees
    the notice once.
  - Notes: `QuestionReport` already has `user_id` and `resolved_at`; add
    `resolution` (`fixed | retired | no_change`) and `resolution_note`, plus a
    per-user notifications key (update `docs/data-model.md`). Reports move to
    the new ID when question text changes, so the link back to the reporter
    survives edits. Email and push come later with Phase 4 "Notifications".
- [ ] **Patient-call scenarios.** Multi-step cases that play out like a call:
      "Dispatch: 54-year-old male, chest pain" → scene size-up → primary
      assessment → history → interventions → transport decision, where each
      choice changes the patient's state and what comes next.
  - Why: it matches how the job and the NREMT's clinical-judgment questions
    actually work, it fits the Night Shift brand, and Pocket Prep's
    single-question format can't do it.
  - Done when: a scenario model (a graph of steps, choices, patient-state
    changes and debrief notes) exists; an admin can author or import scenarios
    and they go through the same review queue; a player runs a scenario start to
    finish and gets a debrief scoring each decision, with the critical fails
    (for example, skipping scene safety) called out.
  - Test: unit tests for the scenario engine (state transitions, scoring); E2E
    playing one seed scenario through both a good and a critical-fail path.
  - Design: needs a design (the call screen, vitals/patient-state panel,
    debrief).
  - Notes: start with about 10 hand-reviewed EMT scenarios before considering AI
    generation; medical review matters even more here. Scenario attempts should
    feed mastery (Phase 3). Supersedes "scenario chains" below.
- [ ] **Add new formats** (later): image-based questions and multi-select.

**Risks.** Medical accuracy: for now an AI review (Claude Sonnet) is the gate,
recorded honestly as `reviewed_by: ai:<model>`; human medical review comes later
(see the "Medical reviewer" decision). Until a credentialed human reviews a
question, learners don't see a "Reviewed by" badge for it, and AI-suggested
`references` count as unverified. Changed 2026-10-12, by the human's decision.
Copyright: generated questions must be original and not paraphrase copyrighted
textbook text. Review the `split_book_into_chapters` inputs with that in mind.

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
- [ ] **Simulate the NREMT exam (adaptive mock exam).** A mock exam that behaves
      like the real computer-adaptive test: difficulty moves with the learner's
      answers, the exam stops early once the result is clear, and it follows the
      real category distribution and time limit.
  - Why: "Will I pass?" is the question learners pay to answer, and fixed-length
    mock exams from generic prep apps don't feel like the real exam. This is our
    strongest differentiator.
  - Done when: a learner takes a timed, adaptive exam that ends within the real
    item range when a pass/fail decision is reached (or the time or item limit
    runs out); the results screen shows the outcome, an ability estimate against
    the passing standard, a per-category breakdown, and a plain explanation of
    why it stopped where it did; past mock exams are listed on the profile and
    feed the readiness score.
  - Test: unit tests for item selection, ability estimation, and stopping rules
    (simulated strong, weak, and borderline test-takers); E2E running a short
    seeded exam to the results screen.
  - Design: needs a design (exam mode and results screen); exam mode should feel
    stark and test-like, unlike regular practice.
  - Notes: check the NREMT's current published rules (item range, time limit,
    category weights, unscored pilot items) when building, because they change.
    Needs `difficulty` from Phase 2, and the AI estimates should be recalibrated
    from real attempt data (an IRT-style item calibration) before we claim pass
    predictions; until then, label the result an estimate. Start with a
    fixed-length timed mode if calibration data is thin. Mock exams are premium
    in the Phase 5 proposal.
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

- [x] **Dynamic shipping (good pilot task for the loop).** Checkout charges
      Printful's `STANDARD` rate for the cart (`POST /shipping/rates`), free
      from a $50 subtotal, on the Stripe-hosted page (`lib/shipping.ts`). We
      first chose Stripe's dynamic shipping callback (b), but it needs the
      embedded form (`ui_mode: "form"`), and Apple Pay/Google Pay bypass it.
      Quoting showed Printful's US rates depend only on the items (identical for
      CA, NY, TX, FL, AK and HI, 2026-10-10), so the checkout quotes a fixed US
      address up front and wallets keep working. The cart shows the quote
      (`/api/shipping_quote`). The webhook logs a warning if Printful's order
      charges a different shipping cost than the session's
      `printful_shipping_cents` metadata, which would mean rates now vary by
      address. Without `PRINTFUL_SECRET` (CI), non-PROD stages use a stub rate.
      `scripts/update_shipping_config.ts` is retired. Standard only: the
      carbon-offset option (+$0.09–0.27) isn't offered.
- [ ] **Tax:** decide on Stripe Tax and confirm nexus obligations.
- [ ] **Order status page** for customers, fed by the existing Printful webhook.
- [ ] **Catalog scalability:** collections and categories, variant images, and
      an admin bulk import from Printful.
- [ ] **Subscriber perks** (later): a discount code for subscribers, connecting
      the shop to Phase 5.
- [ ] **"I passed!" reward.** A learner who reports passing the NREMT gets a
      celebration screen and a one-time shop discount.
  - Why: passing is the happiest moment in a learner's journey; turning it into
    merch they wear (and a shareable "I passed" moment) is word of mouth no prep
    app can copy.
  - Done when: a signed-in user can mark "I passed" (level and date) from the
    profile; they see a celebration screen with a share card and a single-use
    Stripe promotion code (one per user, per certification level) that works in
    checkout; the pass is recorded on the user and visible in admin; optionally
    a "Certified" badge on the profile and leaderboard.
  - Test: unit tests that a user gets exactly one code per level; E2E marking a
    seed user as passed and applying the code at checkout in Stripe test mode.
  - Design: needs a design (celebration screen, share card); a natural place for
    the mascot.
  - Notes: decide on verification (honor system vs. a check against the NREMT's
    public certification lookup) and the discount size. Pass reports are also
    our best outcome data for calibrating the readiness score and the adaptive
    mock exam (Phase 3), so ask for the exam date and attempt number. Featuring
    "Merch for the newly certified" in the shop pairs well with it.

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
| ~~Brand direction and mascot~~ Night Shift       | 1     | Human |
| Question generation model (OpenAI vs. Claude)    | 2     | Both  |
| Medical reviewer for question approval           | 2     | Human |
| KV vs. Postgres for analytics                    | 3     | Both  |
| Pricing, trial length, free-tier limits          | 5     | Human |
| ~~Shipping approach (a) vs. (b)~~ quote up front | 6     | Both  |
| "I passed" verification and discount size        | 6     | Human |

**Parked:** instructor and class accounts (B2B: assigned sets, cohort
dashboards, class leagues). Not now (decided 2026-10-11); revisit once there are
paying individual users.
