# Agent guide

Start here. Then read [docs/ROADMAP.md](docs/ROADMAP.md) for the current plan
and the working loop, and [docs/data-model.md](docs/data-model.md) before
touching anything in `lib/*_store.ts` or KV keys. [README.md](README.md) has the
architecture map and environment variables.

## Definition of done

- `deno task verify` passes (fmt check, lint, type check of the whole repo, and
  unit tests). Do not commit with it failing, and do not add lint-ignore
  comments to make it pass without saying why in the PR.
- User-facing changes are covered by an E2E spec in `e2e/tests/` and
  `deno task e2e` passes (it builds, seeds a fresh database, and runs Playwright
  against the production build). Sign in with `loginAs()` from
  `e2e/tests/helpers.ts`, which uses the test-only `/auth/test-login`.
- Visual changes to a page in `e2e/tests/visual.spec.ts` need new baselines,
  generated in CI on Linux (README, "Visual snapshots"). Look at the images
  before committing them; never regenerate to silence an unexplained diff.
- New store logic has unit tests using `Deno.openKv(":memory:")`.
- Docs are updated in the same change: data model changes go in
  `docs/data-model.md`, and completed roadmap items get checked off in
  `docs/ROADMAP.md`.

## Project verification

- Runtime: Deno 2; Fresh 2 with the Vite plugin and Tailwind CSS 4.
- Development: `deno task dev` (port 8000 by default).
- Production: `deno task build`, then `deno task start`. Deployment must build
  assets and serve `_fresh/server.js`, not `main.ts`.
- Tests: `deno task test`. KV tests use in-memory databases. The allowed
  environment variables are Fresh build metadata, not application credentials.
- Full checks: `deno task check`; `deno task verify` runs checks and tests.
- Import npm and JSR packages through the `deno.json` import map using bare
  names (`import { z } from "zod"`). Never use inline `npm:` or `jsr:`
  specifiers; lint rejects unversioned ones.
- `vite.config.ts` externalizes server-only AWS, logging, and Sharp dependencies
  to avoid Fresh's CommonJS bundling incompatibilities. Keep browser
  dependencies bundled. Development uses bare package names; production uses npm
  specifiers.
- Cron jobs register only in production builds; Vite reloads must not register
  duplicate jobs. Callbacks additionally require `STAGE=PROD` to perform work.
- For local smoke checks, use `STAGE=DEV`; do not trigger real email, payment,
  webhook, or production-data operations. Full OAuth and commerce flows require
  separate staging verification.
- Do not run the Deno Deploy CLI (`deno deploy …`) from the project root. It
  installs its own npm packages and rewrites `deno.lock`. Run it from another
  directory, and check `git status` afterwards.

## Deployment

- The test app is linked to GitHub: Deno Deploy builds every push and serves a
  branch preview at `https://test-weewoo-study--<branch>.briansimoni.deno.net`,
  where `<branch>` is the git branch with `/` removed (`feat/x` → `featx`).
  Deploy doesn't always create that alias; every build is also served at
  `https://test-weewoo-study-<build id>.briansimoni.deno.net` (the build ID ends
  the commit's `deploy/briansimoni/test-weewoo-study` status URL), which CI and
  the `verify-preview` skill use. Each branch gets its own KV database, which
  seeds itself from `lib/seed.ts` on startup (`SEED_ON_EMPTY=true` on both
  Deploy apps). Previews therefore show `[Seed]` questions, `seed|…` users and
  the TEST shop catalog (Stripe test mode), never real user data. Sign in there
  with `/auth/test-login`.
- Local test data: `deno task seed`, then run with `KV_PATH=.kv/seed.sqlite3`.
  Never seed the developer's default local database or any production one.
- Merging to `main` deploys test.weewoo.study only. weewoo.study is deployed
  only by the `Deploy production` workflow when `production` moves (the prod app
  isn't linked to GitHub). Do not merge or push to `main` without the human's
  explicit go-ahead, and release to prod only with the `release` skill when the
  human asks for a release. Never push to `production` any other way.
- CI (`.github/workflows/ci.yml`) must be green before merging: `verify`, `e2e`
  (local) and `preview-e2e` (against the branch preview).

## Admin tasks on deployed sites

- Use
  `deno task admin <test|prod|preview-url> <METHOD> api/admin/... [json|@file]`
  (no leading slash: Git Bash rewrites `/api/…` into a Windows path) to read or
  change data through the admin API (product fields, questions, KV export…);
  routes are under `routes/api/admin/`. It authenticates with the tokens in the
  local `.env` (see README). Run it from the main checkout, since worktrees
  don't have `.env`.
- Do the job yourself instead of handing the human console snippets. Changes on
  test.weewoo.study are fine when the task calls for them. Never change
  weewoo.study (the script needs `--confirm-prod`) without the human's explicit
  go-ahead for that specific change, and read the record back afterwards.

## Debugging

- Server debugging uses the `Start And Debug Deno Server` launch configuration.
  Keep its source-map path overrides (and the attach configuration's): Vite
  emits workspace-relative source paths that otherwise resolve to duplicated
  directories such as `routes/routes/shop.tsx`. The inspector waits for
  attachment before startup. Set breakpoints inside handlers and request the
  corresponding route.
