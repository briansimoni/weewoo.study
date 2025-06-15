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

#### Database Configuration

- `DENO_KV_ACCESS_TOKEN`: Access token for Deno KV database.
- `DB_URL`: URL for connecting to the Deno KV database (different URLs for test
  and production).

#### Authentication

- `CLIENT_ID`: Auth0 client ID for authentication.
- `CLIENT_SECRET`: Auth0 client secret for authentication.
- `COOKIE_SECRET`: Secret key used to sign cookies for session management.

#### AWS Configuration

- `AWS_ACCESS_KEY_ID`: AWS access key for various AWS services.
- `AWS_SECRET_ACCESS_KEY`: AWS secret access key paired with the access key ID.
- `AWS_REGION`: AWS region for services (defaults to "us-east-1" if not
  specified).
- `SES_FROM_EMAIL`: Email address used as the sender for AWS SES emails.
- `ADMIN_EMAIL`: Email address where support form submissions are sent.

#### S3 Storage

- `S3_BUCKET_NAME`: S3 bucket name for storing static assets (defaults to
  "ems-questions-static-assets").
- `S3_PREFIX_KEY`: Key prefix for S3 assets (defaults to "emt-book/").

#### Payment Processing

- `STRIPE_API_KEY`: API key for Stripe payment processing (different keys for
  test/prod).
- `STRIPE_SIGNING_SECRET`: Secret used to verify Stripe webhook signatures.
- `STRIPE_WEBHOOK_TEMP`: Temporary Stripe webhook key for testing.

#### External Services

- `PRINTFUL_SECRET`: API key for Printful service (print-on-demand provider).
- `CHAT_GPT_KEY`: OpenAI API key used for question generation.

#### Application Settings

- `STAGE`: Environment identifier (TEST, PROD) - determines various behaviors
  across the app.

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
