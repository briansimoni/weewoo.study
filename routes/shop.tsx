import { defineRoute } from "$fresh/server.ts";
import { ProductStore } from "../lib/product_store.ts";
import ProductCard from "../islands/ProductCard.tsx";

export default defineRoute(async (req, ctx) => {
  const productStore = await ProductStore.make();
  const products = (await productStore.listProducts()).filter((p) => p.active);
  return (
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4 mr-10 ml-10 lg:mr-30 lg:ml-30 xl:ml-50 xl:mr-50">
      {products.map((product) => (
        <ProductCard key={product.printful_id} product={product} />
      ))}
    </div>
  );
});
