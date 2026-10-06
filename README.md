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

| Command            | What it does                                                    |
| ------------------ | --------------------------------------------------------------- |
| `deno task dev`    | Vite dev server on port 8000                                    |
| `deno task build`  | Production build into `_fresh/`                                 |
| `deno task start`  | Serve the production build (`_fresh/server.js`)                 |
| `deno task test`   | Unit tests (in-memory KV)                                       |
| `deno task check`  | `deno fmt --check`, `deno lint`, `deno check` on the whole repo |
| `deno task verify` | `check` + `test`: **run this before every commit or PR**        |

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

Deno Deploy builds every push through the GitHub integration (no GitHub
Actions):

| Deno Deploy app     | Production domain | Deploys from |
| ------------------- | ----------------- | ------------ |
| `test-weewoo-study` | test.weewoo.study | `main`       |
| `weewoo-study`      | weewoo.study      | `main`       |

Every branch also gets previews at
`https://<app>--<branch>.briansimoni.deno.net`. Previews use an **empty KV
database**, so data-backed pages (questions, shop) fail there until seeding
exists. See ROADMAP Phase 0.2.

Merging to `main` currently ships to test **and** prod at once. ROADMAP Phase
0.4 separates them.

## Environment variables

This application uses various environment variables for configuration. Create a
`.env` file in the root directory with the following variables:

### Core application

- `CLIENT_ID`: Auth provider client ID used by the login/logout/callback routes.
- `CLIENT_SECRET`: Auth provider client secret used during OAuth callback.
- `DB_URL`: Currently **ignored**. `lib/kv.ts` always calls `Deno.openKv()`
  (local SQLite file, or the Deploy-attached database).
- `STAGE`: Environment identifier. `PROD` enables cron jobs and affects some app
  behavior. Non-`PROD` values skip production-only cron work.
- `LOG_LEVEL`: Optional logger level. Defaults to `debug`.

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
  scripts.
- `STRIPE_SIGNING_SECRET`: Stripe webhook signing secret used by
  `routes/api/stripe_webhook.ts`.
- `PRINTFUL_SECRET`: Printful API token used for product sync and order
  submission.

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
