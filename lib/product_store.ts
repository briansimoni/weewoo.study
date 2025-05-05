import { getKv } from "./kv.ts";

export interface Product {
  /** id of the product in printful */
  printful_id: string;
  /** this corresponds to the template you made in printful. I can get it from the url in the dashboard
   * https://www.printful.com/dashboard/product-templates/85855720
   */
  product_template_id: string;
  name: string;
  thumbnail_url: string;
  description: string;
  price: number;
  active: boolean;
  colors?: {
    name: string;
    hex: string;
    thumbnail_url: string;
  }[];
}

export interface ProductVariant {
  variant_id: string;
  printful_product_id: string;
  product_template_id: string;
  price: number;
  color: {
    name: string;
    hex: string;
  };
  size: string;
  images: string[];
  stripe_product_id?: string;
}

export class ProductStore {
  private constructor(private kv: Deno.Kv) {}

  static async make(kv?: Deno.Kv) {
    if (!kv) {
      kv = await getKv();
    }
    return new ProductStore(kv);
  }

  async addProduct(product: Product) {
    await this.kv.set(["products", product.printful_id], product);
  }

  async getProduct(printful_id: string): Promise<Product | null> {
    const product = await this.kv.get<Product>(["products", printful_id]);
    return product.value;
  }

  async updateProduct(product: Partial<Product> & { printful_id: string }) {
    const existingProduct = await this.getProduct(product.printful_id);
    if (!existingProduct) {
      throw new Error("Product not found");
    }

    // Update the product
    const updatedProduct = {
      ...existingProduct,
      ...product,
    };
    await this.kv.set(["products", product.printful_id], updatedProduct);

    // If product_template_id has changed, update all associated variants
    if (
      product.product_template_id &&
      product.product_template_id !== existingProduct.product_template_id
    ) {
      // Get all variants for this product
      const variants = await this.listProductVariants(product.printful_id);

      // Update each variant with the new product_template_id
      for (const variant of variants) {
        await this.updateVariant({
          ...variant,
          product_template_id: product.product_template_id,
        });
      }
    }

    return updatedProduct;
  }

  async addVariant(variant: ProductVariant) {
    // Primary index by printful_product_id and variant_id
    const tx = this.kv.atomic();
    tx.set([
      "variants",
      variant.printful_product_id,
      variant.variant_id,
    ], variant);

    // secondary index by stripe_product_id
    if (variant.stripe_product_id) {
      tx.set([
        "stripe_variants",
        variant.stripe_product_id,
        variant.variant_id,
      ], variant);
    }

    await tx.commit();
  }

  async getVariant(
    printful_product_id: string,
    variant_id: string,
  ): Promise<ProductVariant | null> {
    const variant = await this.kv.get<ProductVariant>([
      "variants",
      printful_product_id,
      variant_id,
    ]);
    return variant.value;
  }

  async updateVariant(variant: ProductVariant) {
    const existingVariant = await this.getVariant(
      variant.printful_product_id,
      variant.variant_id,
    );
    if (!existingVariant) {
      throw new Error("Variant not found");
    }
    const tx = this.kv.atomic();

    tx.set([
      "variants",
      variant.printful_product_id,
      variant.variant_id,
    ], { ...existingVariant, ...variant });

    if (variant.stripe_product_id) {
      tx.set([
        "stripe_variants",
        variant.stripe_product_id,
        variant.variant_id,
      ], { ...existingVariant, ...variant });
    }
    await tx.commit();
  }

  async listProducts(): Promise<Product[]> {
    const products: Product[] = [];
    const iter = this.kv.list<Product>({ prefix: ["products"] });
    for await (const entry of iter) {
      products.push(entry.value);
    }
    return products;
  }

  async deleteVariant(
    printful_product_id: string,
    variant_id: string,
    stripe_product_id?: string,
  ) {
    const tx = this.kv.atomic();
    tx.delete(["variants", printful_product_id, variant_id]);
    if (stripe_product_id) {
      tx.delete(["stripe_variants", stripe_product_id, variant_id]);
    }
    await tx.commit();
  }

  async listProductVariants(
    printful_product_id: string,
  ): Promise<ProductVariant[]> {
    const variants: ProductVariant[] = [];
    const iter = this.kv.list<ProductVariant>({
      prefix: ["variants", printful_product_id],
    });
    for await (const entry of iter) {
      variants.push(entry.value);
    }
    return variants;
  }

  /**
   * This will delete a product and all of it's associated variants
   */
  async deleteProduct(printful_id: string) {
    const tx = this.kv.atomic();
    tx.delete(["products", printful_id]);
    const variants = await this.listProductVariants(printful_id);
    for (const variant of variants) {
      tx.delete(["variants", variant.printful_product_id, variant.variant_id]);
      if (variant.stripe_product_id) {
        tx.delete([
          "stripe_variants",
          variant.stripe_product_id,
          variant.variant_id,
        ]);
      }
    }
    await tx.commit();
  }

  /**
   * Get a product variant by its Stripe product ID
   * @param stripe_product_id The Stripe product ID
   * @returns The product variant or null if not found
   */
  async getVariantByStripeProductId(
    stripe_product_id: string,
  ): Promise<ProductVariant | null> {
    // Get the first variant with this stripe_product_id
    const iter = this.kv.list<ProductVariant>({
      prefix: ["stripe_variants", stripe_product_id],
    });

    for await (const entry of iter) {
      return entry.value;
    }

    return null;
  }

  closeConnection() {
    this.kv.close();
  }
}
