import { Handlers, PageProps } from "$fresh/server.ts";
import ProductManager from "../../components/ProductManager.tsx";
import { Product, ProductStore } from "../../lib/product_store.ts";
import { PrintfulApiClient } from "../../lib/client/printful.ts";

interface PrintfulProduct {
  id: number;
  external_id: string;
  name: string;
  variants: number;
  synced: number;
  thumbnail_url: string;
}

interface ProductManagerData {
  appProducts: Product[];
  printfulProducts: PrintfulProduct[];
}

export const handler: Handlers<ProductManagerData> = {
  async GET(_req, ctx) {
    try {
      // Fetch products from our database
      const productStore = await ProductStore.make();
      const appProducts = await productStore.listProducts();

      // Fetch products from Printful
      const printfulClient = new PrintfulApiClient();
      const printfulResponse = await printfulClient.listProducts();
      const printfulProducts = printfulResponse.result;

      return ctx.render({ appProducts, printfulProducts });
    } catch (error) {
      console.error("Error fetching products:", error);
      return ctx.render({ appProducts: [], printfulProducts: [] });
    }
  },
};

export default function ProductManagerPage(
  { data }: PageProps<ProductManagerData>,
) {
  const { appProducts, printfulProducts } = data;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Product Manager</h1>
      <ProductManager
        appProducts={appProducts}
        printfulProducts={printfulProducts}
      />
    </div>
  );
}
