import { getKv } from "./kv.ts";

interface Product {
    /** id of the product in printful */
    printful_id: string
    /** this correspoonds to the template you made in printful. I can get it from the url in the dashboard
    * https://www.printful.com/dashboard/product-templates/85855720 
    **/
    product_template_id: string
    name: string
    thumbnail_url: string
    description: string
    price: number
    colors: {
        name: string
        hex: string
    }[]
  }

  interface ProductVariant {
    variant_id: string;
    printful_product_id: string;
    product_template_id: string;
    description: string;
    price: number;
    color: string;
    size: string;
    images: string[];
    stripe_product_id: string;
    payment_page: string;
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
    await this.kv.set(["products", product.printful_id], product)
  }

  async addVariant(variant: ProductVariant) {
    await this.kv.set(["variants", variant.printful_product_id, variant.variant_id], variant)
  }

  async listProducts(): Promise<Product[]> {
    const products: Product[] = [];
    const iter = this.kv.list<Product>({ prefix: ["products"] });
    for await (const entry of iter) {
        products.push(entry.value);
    }
    return products;
  }

  async listProductVariants(printful_product_id: string): Promise<ProductVariant[]> {
    const variants: ProductVariant[] = [];
    const iter = this.kv.list<ProductVariant>({ prefix: ["variants", printful_product_id] });
    for await (const entry of iter) {
      variants.push(entry.value);
    }
    return variants;
  }



  closeConnection() {
    this.kv.close();
  }
}
