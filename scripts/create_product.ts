import { parse } from "@std/csv";
import Stripe from "stripe";
import "@std/dotenv/load";
import { Category, Product, ProductStore } from "../lib/product_store.ts";
import { dollarsToCents } from "../lib/util.ts";

interface VariantRow {
  variant_id: string;
  printful_product_id: string;
  price: string;
  color: string;
  size: string;
  images: string[];
}

interface BaseProductRow {
  printful_product_id: string;
  product_template_id: string;
  name: string;
  thumbnail_url: string;
  description: string;
  price: string;
  category: Category;
  colors: NonNullable<Product["colors"]>;
  variants: VariantRow[];
}

async function getBaseProducts(): Promise<BaseProductRow[]> {
  try {
    const csvContent = await Deno.readTextFile(
      "./scripts/products/weewoo-products.csv",
    );
    const records = parse(csvContent, {
      skipFirstRow: true,
    });

    return records.map((record) => ({
      printful_product_id: record.printful_product_id,
      product_template_id: record.product_template_id,
      name: record.name,
      thumbnail_url: record.thumbnail_url,
      description: record.description,
      price: record.price,
      category: record.category as Category,
      colors: JSON.parse(record.colors),
      variants: [],
    }));
  } catch (error) {
    console.error("Error processing products:", error);
    Deno.exit(1);
  }
}

async function getVariants(): Promise<VariantRow[]> {
  try {
    const csvContent = await Deno.readTextFile(
      "./scripts/products/weewoo-variants.csv",
    );
    const records = parse(csvContent, {
      skipFirstRow: true,
    });

    const variants: VariantRow[] = [];

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
      });
      const variant = {
        variant_id: record.variant_id,
        printful_product_id: record.printful_product_id,
        price: record.price,
        color: record.color,
        size: record.size,
        images,
      };
      variants.push(variant);
    }
    return variants;
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
    product.variants = variants.filter(
      (v) => v.printful_product_id === product.printful_product_id,
    );

    const productStore = await ProductStore.make();
    await productStore.addProduct({
      printful_id: product.printful_product_id,
      product_template_id: product.product_template_id,
      name: product.name,
      thumbnail_url: product.thumbnail_url,
      description: product.description,
      price: parseFloat(product.price),
      category: product.category,
      colors: product.colors,
      active: false,
    });

    // each variant becomes it's own product with it's own pricing and payment page
    for (const variant of product.variants) {
      // Find the color object from the product's colors array before creating Stripe product
      const colorObject = product.colors.find(
        (c) => c.name.toLowerCase() === variant.color.toLowerCase(),
      );
      if (!colorObject) {
        console.error(
          `Could not find color object for variant ${variant.variant_id} with color ${variant.color}`,
        );
        continue;
      }

      const stripeProduct = await stripeClient.products.create({
        name: `${product.name} ${colorObject.name} ${variant.size}`,
        images: variant.images.slice(0, 8),
        tax_code: "txcd_30011000",
        shippable: true,
      });
      // create the price on the product
      const price = await stripeClient.prices.create({
        product: stripeProduct.id,
        unit_amount: dollarsToCents(variant.price),
        currency: "usd",
        billing_scheme: "per_unit",
      });

      // set default price on the product
      await stripeClient.products.update(stripeProduct.id, {
        default_price: price.id,
      });

      // create payment link
      await stripeClient.paymentLinks.create({
        line_items: [
          {
            price: price.id,
            quantity: 1,
          },
        ],
        shipping_address_collection: {
          allowed_countries: ["US"], // Add more countries as needed
        },
      });

      await productStore.addVariant({
        variant_id: variant.variant_id,
        printful_product_id: product.printful_product_id,
        product_template_id: product.product_template_id,
        price: parseFloat(variant.price),
        color: {
          name: colorObject.name,
          hex: colorObject.hex,
        },
        size: variant.size,
        images: variant.images,
        stripe_product_id: stripeProduct.id,
      });
    }
  }
};

main();
