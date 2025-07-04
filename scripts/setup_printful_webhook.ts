// This script sets up a Printful webhook for package_shipped events
import { PrintfulApiClient } from "../lib/client/printful.ts";
import { log } from "../lib/logger.ts";
import "$std/dotenv/load.ts";

// URL where Printful will send webhook events
const WEBHOOK_URL = "https://weewoo.study/api/printful_webhook";
// Event type to subscribe to
const EVENT_TYPE = "package_shipped";

/**
 * Main function to set up the Printful webhook
 */
async function setupPrintfulWebhook() {
  try {
    // Initialize the Printful API client
    const printfulClient = new PrintfulApiClient();

    // Check for existing webhooks and delete any that might conflict
    console.log("Checking for existing webhooks...");
    const existingWebhooks = await printfulClient.listWebhooks();

    // Log existing webhooks if any
    if (existingWebhooks.result && existingWebhooks.result.length > 0) {
      console.log(`Found ${existingWebhooks.result.length} existing webhooks:`);

      for (const webhook of existingWebhooks.result) {
        console.log(
          `- ID: ${webhook.id}, URL: ${webhook.url}, Types: ${
            webhook.types.join(", ")
          }`,
        );

        // Delete if it has the same URL (to avoid duplicates)
        if (webhook.url === WEBHOOK_URL) {
          console.log(
            `Deleting existing webhook with ID ${webhook.id} that points to the same URL...`,
          );
          await printfulClient.deleteWebhook(webhook.id);
        }
      }
    } else {
      console.log("No existing webhooks found.");
    }

    // Create the new webhook using the PrintfulApiClient method
    console.log(`Creating new webhook for ${EVENT_TYPE} events...`);
    const result = await printfulClient.createWebhook(WEBHOOK_URL, [
      EVENT_TYPE,
    ]);

    if (result.code !== 200) {
      log.error("Failed to set up Printful webhook:", { result });
      console.error("Failed to set up Printful webhook:", { result });
      Deno.exit(1);
    }

    log.info("Successfully set up Printful webhook:", { result });
    console.log("✅ Successfully set up Printful webhook");
    console.log("URL:", WEBHOOK_URL);
    console.log("Event type:", EVENT_TYPE);
    console.log("Webhook ID:", result.result.id);

    // Return the result
    return result;
  } catch (error) {
    log.error("Error setting up Printful webhook:", { error });
    console.error("Error setting up Printful webhook:", { error });
    Deno.exit(1);
  }
}

// Check if the script is being run directly
if (import.meta.main) {
  await setupPrintfulWebhook();
}
