import Stripe from "stripe";
import * as csv from "@std/csv";


const stripe = new Stripe(Deno.env.get("STRIPE_API_KEY")!, {
  apiVersion: "2022-11-15",
});

interface ProductVariant {
  title: string;
  description: string;
  thumbnail_url: string;
  variant_id: string;
  product_template_id: string;
  external_id: string;
  price: string;
}

const createProduct = async (variant: ProductVariant) => {
  const product = await stripe.products.create({
    name: variant.title,
    description: variant.description,
    images: [variant.thumbnail_url],
    metadata: {
      variant_id: variant.variant_id,
      product_template_id: variant.product_template_id,
      external_id: variant.external_id,
    },
    test_mode: true,
  });

  await stripe.prices.create({
    unit_amount: Math.trunc(parseFloat(variant.price) * 100),
    currency: "usd",
    product: product.id,
    metadata: {
      variant_id: variant.variant_id,
      product_template_id: variant.product_template_id,
      external_id: variant.external_id,
    },
    test_mode: true,
  });

  console.log(`Created product ${variant.title} with id ${product.id}`);
};

const main = async () => {
  try {
    const csvContent = await Deno.readTextFile("./scripts/products/weewoo products -variants.csv");
    const records = await parse(csvContent, {
      skipFirstRow: true,
      columns: true,
    });

    for (const record of records) {
      await createProduct(record);
    }
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      console.error("Error: CSV file not found. Please ensure 'weewoo products -variants.csv' exists in the scripts/products directory.");
    } else {
      console.error("Error processing products:", error);
    }
    Deno.exit(1);
  }
};

main();