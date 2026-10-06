# Agent guide

Start here. Then read [docs/ROADMAP.md](docs/ROADMAP.md) for the current plan
and the working loop, and [docs/data-model.md](docs/data-model.md) before
touching anything in `lib/*_store.ts` or KV keys. [README.md](README.md) has the
architecture map and environment variables.

## Definition of done

- `deno task verify` passes (fmt check, lint, type check of the whole repo, and
  unit tests). Do not commit with it failing, and do not add lint-ignore
  comments to make it pass without saying why in the PR.
- User-facing changes are smoke-tested against a running production build
  (`deno task build` then `deno task start` with `STAGE=DEV`).
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

- Deno Deploy builds every push via its GitHub integration. Branch previews:
  `https://test-weewoo-study--<branch>.briansimoni.deno.net` (test config) and
  `https://weewoo-study--<branch>.briansimoni.deno.net` (prod config), where
  `<branch>` is the git branch with `/` removed (`feat/x` → `featx`). Each
  branch gets its own KV database, which seeds itself from `lib/seed.ts` on
  startup (`SEED_ON_EMPTY=true` on both Deploy apps). Previews therefore show
  `[Seed]` questions, `seed|…` users and `[Seed]` products, never real data.
- Local test data: `deno task seed`, then run with `KV_PATH=.kv/seed.sqlite3`.
  Never seed the developer's default local database or any production one.
- Merging to `main` deploys test.weewoo.study **and** weewoo.study. Do not merge
  or push to `main` without the human's explicit go-ahead.

## Debugging

- Server debugging uses the `Start And Debug Deno Server` launch configuration.
  Keep its source-map path overrides (and the attach configuration's): Vite
  emits workspace-relative source paths that otherwise resolve to duplicated
  directories such as `routes/routes/shop.tsx`. The inspector waits for
  attachment before startup. Set breakpoints inside handlers and request the
  corresponding route.
