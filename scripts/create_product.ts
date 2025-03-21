

import { parse } from "@std/csv"
import Stripe from "npm:stripe";
import "$std/dotenv/load.ts";
import { ProductStore } from "../lib/product_store.ts";
// const stripe = new Stripe(Deno.env.get("STRIPE_API_KEY")!, {
//   apiVersion: "2022-11-15",
// });



// const createProduct = async (variant: ProductVariant) => {
//   const product = await stripe.products.create({
//     name: variant.title,
//     description: variant.description,
//     images: [variant.thumbnail_url],
//     metadata: {
//       variant_id: variant.variant_id,
//       product_template_id: variant.product_template_id,
//       external_id: variant.external_id,
//     },
//     test_mode: true,
//   });

//   await stripe.prices.create({
//     unit_amount: Math.trunc(parseFloat(variant.price) * 100),
//     currency: "usd",
//     product: product.id,
//     metadata: {
//       variant_id: variant.variant_id,
//       product_template_id: variant.product_template_id,
//       external_id: variant.external_id,
//     },
//     test_mode: true,
//   });

//   console.log(`Created product ${variant.title} with id ${product.id}`);
// };


async function getBaseProducts() {
  try {
    const csvContent = await Deno.readTextFile("./scripts/products/weewoo-products.csv");
    const records = parse(csvContent, {
      skipFirstRow: true,
    });

    const products = []
    for (const record of records) {
      const colors = JSON.parse(record.colors)
      const product = {
        ...record,
        colors
      }
      products.push(product)
    }
    return products as any[]
  } catch (error) {
    console.error("Error processing products:", error);
    Deno.exit(1);
  }
}

async function getVariants() {
  try {
    const csvContent = await Deno.readTextFile("./scripts/products/weewoo-variants.csv");
    const records = parse(csvContent, {
      skipFirstRow: true,
    });

    const variants = []

    for (const record of records) {
      // get images sorted by substring contains
      // front should come first
      // then back
      // then left
      // then right
      const images = record.images.split("|").sort((a, b) => {
        if (a.includes("front")) return -1;
        if (b.includes("front")) return 1;
        if (a.includes("back")) return -1;
        if (b.includes("back")) return 1;
        if (a.includes("left")) return -1;
        if (b.includes("left")) return 1;
        if (a.includes("right")) return -1;
        if (b.includes("right")) return 1;
        return 0;
      })
      const variant = {
        ...record,
        images
      }
      variants.push(variant)
    }
    return variants as any[]
  } catch (error) {
    console.error("Error processing variants:", error);
    Deno.exit(1);
  }
}

const main = async () => {
  const products = await getBaseProducts();
  const variants = await getVariants();
  const stripeTestKey = Deno.env.get("STRIPE_API_KEY");
if (!stripeTestKey) {
  throw new Error("Missing STRIPE_API_KEY environment variable.");
}
const stripeClient = new Stripe(stripeTestKey);
  // make the variants a property of products. Group by printful_product_id
  for (const product of products) {
    // we have the completed product!
    product.variants = variants.filter(v => v.printful_product_id === product.printful_product_id)


    const productStore = await ProductStore.make()
    await productStore.addProduct({
      printful_id: product.printful_product_id,
      product_template_id: product.product_template_id,
      name: product.name,
      thumbnail_url: product.thumbnail_url,
      description: product.description,
      price: parseFloat(product.price),
      colors: product.colors
    })

    // each variant becomes it's own product with it's own pricing and payment page
    for (const variant of product.variants) {
      const stripeProduct = await stripeClient.products.create({
        name: `${product.name} ${variant.color} ${variant.size}`,
        images: variant.images.slice(0, 8),
        tax_code: "txcd_30011000"
      })
      // create the price on the product
      const price = await stripeClient.prices.create({
        product: stripeProduct.id,
        unit_amount: Math.trunc(parseFloat(variant.price) * 100),
        currency: "usd",
        billing_scheme: "per_unit",
      })
  
      // set default price on the product
      await stripeClient.products.update(stripeProduct.id, {
        default_price: price.id,
      })
  
      // create payment link
      const paymentLink = await stripeClient.paymentLinks.create({
        line_items: [
          {
            price: price.id,
            quantity: 1,
          },
        ],
      })

      await productStore.addVariant({
        variant_id: variant.variant_id,
        printful_product_id: product.printful_product_id,
        product_template_id: product.product_template_id,
        price: parseFloat(variant.price),
        color: variant.color,
        size: variant.size,
        images: variant.images,
        stripe_product_id: stripeProduct.id,
        payment_page: paymentLink.url
      })
    }
  }

  // currency: string;

  // /**
  //  * Prices defined in each available currency option. Each key must be a three-letter [ISO currency code](https://www.iso.org/iso-4217-currency-codes.html) and a [supported currency](https://stripe.com/docs/currencies).
  //  */
  // currency_options?: {
  //   [key: string]: DefaultPriceData.CurrencyOptions;
  // };

  // /**
  //  * When set, provides configuration for the amount to be adjusted by the customer during Checkout Sessions and Payment Links.
  //  */
  // custom_unit_amount?: DefaultPriceData.CustomUnitAmount;

  // /**
  //  * Set of [key-value pairs](https://stripe.com/docs/api/metadata) that you can attach to an object. This can be useful for storing additional information about the object in a structured format. Individual keys can be unset by posting an empty value to them. All keys can be unset by posting an empty value to `metadata`.
  //  */
  // metadata?: Stripe.MetadataParam;

  // /**
  //  * The recurring components of a price such as `interval` and `interval_count`.
  //  */
  // recurring?: DefaultPriceData.Recurring;

  // /**
  //  * Only required if a [default tax behavior](https://stripe.com/docs/tax/products-prices-tax-categories-tax-behavior#setting-a-default-tax-behavior-(recommended)) was not provided in the Stripe Tax settings. Specifies whether the price is considered inclusive of taxes or exclusive of taxes. One of `inclusive`, `exclusive`, or `unspecified`. Once specified as either `inclusive` or `exclusive`, it cannot be changed.
  //  */
  // tax_behavior?: DefaultPriceData.TaxBehavior;

  // /**
  //  * A positive integer in cents (or local equivalent) (or 0 for a free price) representing how much to charge. One of `unit_amount`, `unit_amount_decimal`, or `custom_unit_amount` is required.
  //  */
  // unit_amount?: number;

  // /**
  //  * Same as `unit_amount`, but accepts a decimal value in cents (or local equivalent) with at most 12 decimal places. Only one of `unit_amount` and `unit_amount_decimal` can be set.
  //  */
  // unit_amount_decimal?: string;
};

main();