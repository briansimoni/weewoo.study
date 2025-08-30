import { defineRoute } from "$fresh/server.ts";
import { ProductStore } from "../lib/product_store.ts";
import Catalog from "../islands/shop/Catalog.tsx";

export default defineRoute(async () => {
  const productStore = await ProductStore.make();
  const products = (await productStore.listProducts()).filter((p) => p.active);
  return <Catalog products={products} />;
});
