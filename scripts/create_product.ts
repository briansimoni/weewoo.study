import { parse } from "@std/csv"
import Stripe from "npm:stripe";
import "$std/dotenv/load.ts";
import { ProductStore } from "../lib/product_store.ts";

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
      // Find the color object from the product's colors array before creating Stripe product
      const colorObject = product.colors.find((c: { name: string; hex: string }) => 
        c.name.toLowerCase() === variant.color.toLowerCase()
      );
      if (!colorObject) {
        console.error(`Could not find color object for variant ${variant.variant_id} with color ${variant.color}`);
        continue;
      }

      const stripeProduct = await stripeClient.products.create({
        name: `${product.name} ${colorObject.name} ${variant.size}`,
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
        color: {
          name: colorObject.name,
          hex: colorObject.hex
        },
        size: variant.size,
        images: variant.images,
        stripe_product_id: stripeProduct.id,
        payment_page: paymentLink.url
      })
    }
  }
};

main();