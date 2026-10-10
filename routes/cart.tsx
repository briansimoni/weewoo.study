import { defineRoute } from "fresh/compat";
import CartPageIsland from "../islands/CartPageIsland.tsx";
import { Page } from "../components/ui/Page.tsx";
import { ProductStore } from "../lib/product_store.ts";

export default defineRoute(async () => {
  // The cart lives in the browser; product names come from the catalog.
  const products = await (await ProductStore.make()).listProducts();
  const productNames = Object.fromEntries(
    products.map((product) => [product.printful_id, product.name]),
  );
  return (
    <Page title="Shopping Cart" heading="Shopping Cart">
      <CartPageIsland productNames={productNames} />
    </Page>
  );
});
