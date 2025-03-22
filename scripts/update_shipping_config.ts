import Stripe from "npm:stripe";
import "$std/dotenv/load.ts";

const main = async () => {
  const stripeKey = Deno.env.get("STRIPE_API_KEY");
  if (!stripeKey) {
    throw new Error("Missing STRIPE_API_KEY environment variable.");
  }

  const stripe = new Stripe(stripeKey);

  // List all active payment links
  const paymentLinks = await stripe.paymentLinks.list({ limit: 100, active: true });
  console.log(`Found ${paymentLinks.data.length} active payment links...`);

  // Archive existing payment links and create new ones with shipping
  for (const link of paymentLinks.data) {
    console.log(`Processing payment link: ${link.url}`);
    
    try {
      // Get the line items from the existing link
      // const lineItems = link.line_items;
      // if (!lineItems) {
      //   console.log(`Skipping link ${link.url} - no line items found`);
      //   continue;
      // }

      // // Filter out any items with missing price IDs
      // const validLineItems = lineItems.data
      //   .filter((item): item is Stripe.LineItem => Boolean(item.price?.id))
      //   .map(item => ({
      //     price: item.price!.id,
      //     quantity: item.quantity || 1
      //   }));

      // if (validLineItems.length === 0) {
      //   console.log(`Skipping link ${link.url} - no valid line items found`);
      //   continue;
      // }

      await stripe.paymentLinks.update(link.id, {
        shipping_address_collection: {
          allowed_countries: ['US']
        },
        custom_text: {
          shipping_address: {
            message: 'Please provide your shipping address for delivery'
          }
        }
      })

    } catch (error) {
      console.error(`× Failed to process payment link ${link.url}:`, error);
    }
  }

  console.log("\nFinished updating all payment links!");
};

main().catch((error) => {
  console.error("Script failed:", error);
  Deno.exit(1);
});
