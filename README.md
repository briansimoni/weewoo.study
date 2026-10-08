# weewoo.study

EMT exam practice: NREMT-style questions by category, streaks, a leaderboard,
per-user stats, and a Printful-backed swag shop. Live at
[weewoo.study](https://weewoo.study); the test environment is
[test.weewoo.study](https://test.weewoo.study).

- **Plan:** [docs/ROADMAP.md](docs/ROADMAP.md)
- **Data model:** [docs/data-model.md](docs/data-model.md)
- **Agent and verification rules:** [AGENTS.md](AGENTS.md)

## Stack

Deno 2 · Fresh 2 (Vite plugin) · Preact islands · Tailwind CSS 4 + DaisyUI 5 ·
Deno KV · Stripe · Printful · AWS (SES, SQS, S3, CloudWatch) · OIDC login via
`auth.weewoo.study`.

## Quick start

```sh
cp .env.example .env   # or get a .env from the maintainer; see "Environment variables"
deno install
deno task dev          # http://localhost:8000 with hot reload
```

Use `STAGE=DEV` locally. Never point local runs at production credentials,
payments, or email.

## Tasks

| Command                 | What it does                                                    |
| ----------------------- | --------------------------------------------------------------- |
| `deno task dev`         | Vite dev server on port 8000                                    |
| `deno task build`       | Production build into `_fresh/`                                 |
| `deno task start`       | Serve the production build (`_fresh/server.js`)                 |
| `deno task test`        | Unit tests (in-memory KV)                                       |
| `deno task check`       | `deno fmt --check`, `deno lint`, `deno check` on the whole repo |
| `deno task verify`      | `check` + `test`: **run this before every commit or PR**        |
| `deno task seed`        | Seed `.kv/seed.sqlite3` with test data (run with `KV_PATH`)     |
| `deno task smoke <url>` | Read-only smoke test of a running site                          |
| `deno task e2e`         | Build, seed a fresh `.kv/e2e.sqlite3`, run Playwright on :8123  |
| `deno task e2e:remote`  | Playwright against `BASE_URL` (e.g. a branch preview)           |
| `deno task e2e:install` | One-time: download the Chromium build Playwright uses           |

## Architecture

```
routes/            File-system routes (pages + API). _middleware.ts loads the
                   session and preferences into ctx.state for every request.
  emt/             Practice (login required, see emt/_middleware.ts)
  admin/, api/admin/  Admin pages and APIs (admin-only middleware)
  api/             JSON APIs: question, attempt, profile, checkout, webhooks
  auth/            OIDC login, callback, logout
islands/           Interactive Preact components hydrated on the client
components/        Server-rendered components
lib/               Business logic: *_store.ts wrap Deno KV (one store per entity),
                   plus email, logging, cron tasks, the Printful client
scripts/           One-off and admin scripts (products, Stripe, question generation)
infra/             Terraform for the AWS resources
main.ts            App entry: middleware, cron registration (prod builds only)
client.ts          Client entry (global CSS)
vite.config.ts     Vite + Fresh + Tailwind; externalizes server-only deps
```

Request flow: `routes/_middleware.ts` → route handler → `lib/*_store.ts` → KV.
Pages render on the server; only `islands/` ship JavaScript.

## Deployment

The test app (`test-weewoo-study`) is linked to GitHub: Deno Deploy builds every
push, deploys `main` to test.weewoo.study, and builds a preview of every branch.
The prod app (`weewoo-study`) is **not** linked: the `Deploy production`
workflow (`.github/workflows/deploy-production.yml`) deploys it with the Deno
Deploy CLI when the `production` branch moves. Deno Deploy only ever puts an
app's _default_ git branch into production, so a per-app production branch isn't
possible through the GitHub integration.

| Deno Deploy app     | Production domain | Deploys from                      |
| ------------------- | ----------------- | --------------------------------- |
| `test-weewoo-study` | test.weewoo.study | `main`                            |
| `weewoo-study`      | weewoo.study      | `production` (via GitHub Actions) |

The flow is: PR → CI (verify, local E2E, E2E against the branch preview) → merge
to `main` → test on test.weewoo.study → **release**. A release merges `main`
into `production` (`--no-ff`, identical tree). Agents do it with the `release`
skill (`.claude/skills/release`) when you ask. To roll back, use the previous
deployment in the Deno Deploy console.

Every branch also gets a test-app preview at
`https://test-weewoo-study--<branch>.briansimoni.deno.net` (`<branch>` with `/`
removed, e.g. `feat/x` → `featx`). Each branch gets its **own empty KV
database**, which seeds itself with test data (`lib/seed.ts`) on startup because
`SEED_ON_EMPTY=true` is set on both Deploy apps.

### CI secrets

- `DENO_DEPLOY_TOKEN`: Deno Deploy access token used by the `Deploy production`
  workflow (ideally an org-scoped token).
- `STRIPE_TEST_API_KEY`: a Stripe **test-mode** secret key for the shop E2E spec
  in the local CI job. Without it that spec is skipped. A live key makes the run
  fail.

## Environment variables

This application uses various environment variables for configuration. Create a
`.env` file in the root directory with the following variables:

### Core application

- `CLIENT_ID`: Auth provider client ID used by the login/logout/callback routes.
- `CLIENT_SECRET`: Auth provider client secret used during OAuth callback.
- `KV_PATH`: Optional local KV file, e.g. `.kv/seed.sqlite3` from
  `deno task seed`. Unset, `Deno.openKv()` uses Deno's default local database
  (or the Deploy-attached one).
- `SEED_ON_EMPTY`: `true` seeds an empty database at startup (never when
  `STAGE=PROD`). Set on both Deploy apps (all contexts; see data-model.md).
- `STAGE`: Environment identifier. `PROD` enables cron jobs, real Printful
  orders and order emails. Non-`PROD` values skip production-only cron work, and
  the Stripe webhook only logs the order it would place (a dry run).
- `LOG_LEVEL`: Optional logger level. Defaults to `debug`.

### Admin API access from a workstation

- `ADMIN_API_TOKEN` (Deploy apps): lets `/api/admin/*` accept
  `Authorization: Bearer <token>` besides the admin's browser session. Use a
  different random value per app (`openssl rand -hex 32`); unset or shorter than
  32 characters disables token auth. Rotate it by changing the variable.
- `WEEWOO_ADMIN_TOKEN_TEST`, `WEEWOO_ADMIN_TOKEN_PROD` (local `.env` only): the
  test and prod apps' tokens, used by
  `deno task admin <test|prod|preview-url> <METHOD> <path> [json|@file]`
  (`scripts/admin_api.ts`). Branch previews use the test app's token.

### Email and support

- `ADMIN_EMAIL`: Destination for support emails, question report emails, SES/SQS
  notifications, and Stripe order alert emails.
- `SES_FROM_EMAIL`: Sender address for outgoing SES emails.
- `RECAPTCHA_SECRET_KEY`: Required by the support form API to verify reCAPTCHA.

### AWS

- `AWS_ACCESS_KEY_ID`: AWS access key used by SES, SQS, S3, and logging.
- `AWS_SECRET_ACCESS_KEY`: AWS secret access key paired with the access key ID.
- `AWS_REGION`: Optional AWS region. Defaults to `us-east-1`.
- `WEEWOO_OPS_QUEUE_URL`: SQS queue URL used by the cron task that polls
  operational notifications.

### Commerce

- `STRIPE_API_KEY`: Stripe secret API key used by checkout, webhooks, and admin
  scripts. Its mode must match `STAGE`: the app refuses to start with a live key
  (`sk_live_`/`rk_live_`) outside `PROD`, or a test key in `PROD`.
- `STRIPE_SIGNING_SECRET`: Stripe webhook signing secret used by
  `routes/api/stripe_webhook.ts` (logic in `lib/stripe_webhook.ts`). Endpoints
  are managed with `scripts/setup_stripe_webhooks.ts <test|prod>`, which writes
  a new endpoint's secret to `--secret-out <file>`.
- `PRINTFUL_SECRET`: Printful API token used for product sync and order
  submission. Not needed by the webhook outside `PROD` unless
  `PRINTFUL_DRAFT_ORDERS` is set.
- `PRINTFUL_DRAFT_ORDERS`: `true` makes the webhook outside `PROD` submit the
  order to Printful (which holds it as an unconfirmed draft) instead of only
  logging it. No customer or admin emails are sent outside `PROD`. Ignored in
  `PROD`.

### Question generation and content scripts

- `CHAT_GPT_KEY`: OpenAI API key used by the question-generation routes/scripts.
- `OPENAI_API_KEY`: Alternative to `CHAT_GPT_KEY` supported by the workflow
  scripts.
- `S3_BUCKET_NAME`: Optional S3 bucket containing chapter/content assets.
  Defaults to `ems-questions-static-assets`.
- `S3_PREFIX_KEY`: Optional S3 key prefix for chapter/content assets. Defaults
  to `emt-book/`.

### Image migration script

- `S3_IMAGES_BUCKET`: S3 bucket used by `scripts/migrate_images_to_webp.ts`.
- `CLOUDFRONT_URL`: CloudFront domain used by
  `scripts/migrate_images_to_webp.ts` when generating public asset URLs.

### Unused variables

- `DENO_KV_ACCESS_TOKEN` is not currently read anywhere in the repository.
- `COOKIE_SECRET` is not currently used by the app.
- `STRIPE_WEBHOOK_TEMP` is not currently used by the app.

## Notes

Cool sounds here:
https://freesound.org/search/?q=correct&f=grouping_pack%3A%2230761_feedback-correct%22

To run the stripe CLI webhook tests
`stripe listen --forward-to localhost:8000/api/stripe_webhook`

`stripe trigger checkout.session.completed`

## Uploading new products

1. Create the product in printful
2. Download the images and upload them to the cloudfront CDN
3. Update the google sheet
4. Download the csv
5. Upload to Stripe
6. Add to the app database

Steps 5–6 are `scripts/create_product.ts`, which reads
`scripts/products/weewoo-products.csv` and `weewoo-variants.csv` (gitignored).
The products CSV needs a `category` column matching `productCategories` in
`lib/product_store.ts`.

potentially useful for extracting the urls out of s3

```
function getImageUris(str) {
    return Array.from(document.getElementsByClassName("name object latest object-name")).map((el) => {
        if (el.innerHTML.includes(str)) {
            return `https://d3leqxp227sjlw.cloudfront.net/hoodie/${el.innerHTML}`
        }
    }).filter(Boolean).join("|")
}
```

products spreadsheet

https://docs.google.com/spreadsheets/d/1Tzcpc9YNc6sHVZK_6PAjQCBgEfKiQr9mZAZdaG4Nb6I/edit?gid=0#gid=0

.

## Printful API token

Remeber to rotate!

expires May 16, 2027

## NREMT information about the real exam

https://www.nremt.org/Pages/Examinations/EMR-and-EMT-Certification-Examinations
