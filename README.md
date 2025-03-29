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

This project is configured to work with GitHub Codespaces, allowing you to develop in a consistent environment directly in your browser.

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

### notes

cool sounds here:
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
