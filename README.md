# Fresh project

Your new Fresh project is ready to go. You can follow the Fresh "Getting
Started" guide here: https://fresh.deno.dev/docs/getting-started

### Usage

Make sure to install Deno: https://deno.land/manual/getting_started/installation

Then start the project:

```
deno task start
```

This will watch the project directory and restart as necessary.

### GitHub Codespaces

This project is configured to work with GitHub Codespaces, allowing you to
develop in a consistent environment directly in your browser.

To use GitHub Codespaces:

1. Navigate to your GitHub repository
2. Click the "Code" button
3. Select the "Codespaces" tab
4. Click "Create codespace on main"

Once the codespace is created, it will automatically:

- Install Deno and other dependencies
- Set up VS Code with the necessary extensions
- Forward port 8000 for local development

To start the development server in Codespaces:

```
deno task start
```

### Environment Variables

This application uses various environment variables for configuration. Create a
`.env` file in the root directory with the following variables:

#### Core application

- `CLIENT_ID`: Auth provider client ID used by the login/logout/callback routes.
- `CLIENT_SECRET`: Auth provider client secret used during OAuth callback.
- `DB_URL`: Optional Deno KV database URL. If omitted locally, the app falls
  back to local SQLite-backed `Deno.openKv()`.
- `STAGE`: Environment identifier. `PROD` enables cron jobs and affects some app
  behavior. Non-`PROD` values skip production-only cron work.
- `LOG_LEVEL`: Optional logger level. Defaults to `debug`.

#### Email and support

- `ADMIN_EMAIL`: Destination for support emails, question report emails, SES/SQS
  notifications, and Stripe order alert emails.
- `SES_FROM_EMAIL`: Sender address for outgoing SES emails.
- `RECAPTCHA_SECRET_KEY`: Required by the support form API to verify reCAPTCHA.

#### AWS

- `AWS_ACCESS_KEY_ID`: AWS access key used by SES, SQS, S3, and logging.
- `AWS_SECRET_ACCESS_KEY`: AWS secret access key paired with the access key ID.
- `AWS_REGION`: Optional AWS region. Defaults to `us-east-1`.
- `WEEWOO_OPS_QUEUE_URL`: SQS queue URL used by the cron task that polls
  operational notifications.

#### Commerce

- `STRIPE_API_KEY`: Stripe secret API key used by checkout, webhooks, and admin
  scripts.
- `STRIPE_SIGNING_SECRET`: Stripe webhook signing secret used by
  `routes/api/stripe_webhook.ts`.
- `PRINTFUL_SECRET`: Printful API token used for product sync and order
  submission.

#### Question generation and content scripts

- `CHAT_GPT_KEY`: OpenAI API key used by the question-generation routes/scripts.
- `OPENAI_API_KEY`: Alternative to `CHAT_GPT_KEY` supported by the workflow
  scripts.
- `S3_BUCKET_NAME`: Optional S3 bucket containing chapter/content assets.
  Defaults to `ems-questions-static-assets`.
- `S3_PREFIX_KEY`: Optional S3 key prefix for chapter/content assets. Defaults
  to `emt-book/`.

#### Image migration script

- `S3_IMAGES_BUCKET`: S3 bucket used by `scripts/migrate_images_to_webp.ts`.
- `CLOUDFRONT_URL`: CloudFront domain used by
  `scripts/migrate_images_to_webp.ts` when generating public asset URLs.

#### Notes

- `DENO_KV_ACCESS_TOKEN` is not currently read anywhere in the repository.
- `COOKIE_SECRET` is not currently used by the app.
- `STRIPE_WEBHOOK_TEMP` is not currently used by the app.

### Notes

Cool sounds here:
https://freesound.org/search/?q=correct&f=grouping_pack%3A%2230761_feedback-correct%22

To run the stripe CLI webhook tests
`stripe listen --forward-to localhost:8000/api/stripe_webhook`

`stripe trigger checkout.session.completed`

### Uploading new products

1. Create the product in printful
2. Download the images and upload them to the cloudfront CDN
3. Update the google sheet
4. Download the csv
5. Upload to Stripe
6. Add to the app database

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

### Printful API token

Remeber to rotate!

expires May 16, 2027

### NREMT information about the real exam

https://www.nremt.org/Pages/Examinations/EMR-and-EMT-Certification-Examinations
