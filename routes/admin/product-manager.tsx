import { page, type PageProps } from "fresh";
import { Handlers } from "fresh/compat";
import { AdminPage } from "../../components/admin/AdminPage.tsx";
import ProductManager from "../../components/ProductManager.tsx";
import type { PrintfulProduct } from "../../lib/client/printful.ts";
import { printfulCatalog } from "../../lib/printful_catalog.ts";
import { Product, ProductStore } from "../../lib/product_store.ts";

interface ProductManagerData {
  appProducts: Product[];
  printfulProducts: PrintfulProduct[];
  /** Why Printful's list is missing, if it is. */
  printfulError?: string;
  /** The name of a product that was just deleted. */
  deleted?: string;
}

export const handler: Handlers<ProductManagerData> = {
  async GET(ctx) {
    const appProducts = await (await ProductStore.make()).listProducts();
    let printfulProducts: PrintfulProduct[] = [];
    let printfulError: string | undefined;
    try {
      printfulProducts = await printfulCatalog().listProducts();
    } catch (error) {
      console.error("Error fetching Printful products:", error);
      printfulError = error instanceof Error ? error.message : String(error);
    }
    const deleted = new URL(ctx.req.url).searchParams.get("deleted") ??
      undefined;
    return page({ appProducts, printfulProducts, printfulError, deleted });
  },
};

export default function ProductManagerPage(
  { data }: PageProps<ProductManagerData>,
) {
  return (
    <AdminPage
      title="Products"
      section="products"
      description="The shop's products, and the Printful products not imported yet."
    >
      <ProductManager {...data} />
    </AdminPage>
  );
}
