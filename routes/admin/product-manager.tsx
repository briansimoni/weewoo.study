import { page, type PageProps } from "fresh";
import { AdminPage } from "../../components/admin/AdminPage.tsx";
import ProductManager from "../../components/ProductManager.tsx";
import { Product, ProductStore } from "../../lib/product_store.ts";
import { PrintfulApiClient } from "../../lib/client/printful.ts";
import { Handlers } from "fresh/compat";

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
  async GET() {
    try {
      // Fetch products from our database
      const productStore = await ProductStore.make();
      const appProducts = await productStore.listProducts();

      // Fetch products from Printful
      const printfulClient = new PrintfulApiClient();
      const printfulResponse = await printfulClient.listProducts();
      const printfulProducts = printfulResponse.result;

      return page({ appProducts, printfulProducts });
    } catch (error) {
      console.error("Error fetching products:", error);
      return page({ appProducts: [], printfulProducts: [] });
    }
  },
};

export default function ProductManagerPage(
  { data }: PageProps<ProductManagerData>,
) {
  const { appProducts, printfulProducts } = data;

  return (
    <AdminPage
      title="Products"
      section="products"
      description="Printful products and the ones imported into the shop."
    >
      <ProductManager
        appProducts={appProducts}
        printfulProducts={printfulProducts}
      />
    </AdminPage>
  );
}
