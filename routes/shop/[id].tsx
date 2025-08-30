import { defineRoute } from "$fresh/server.ts";
import { ProductStore } from "../../lib/product_store.ts";
import ProductDetails from "../../islands/shop/ProductDetails.tsx";

const productStore = await ProductStore.make();

export default defineRoute(async (req, ctx) => {
  const id = ctx.params.id;
  const product = await productStore.getProduct(id);
  const variants = await productStore.listProductVariants(id);

  if (!product) {
    return new Response("Product not found", { status: 404 });
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="breadcrumbs text-sm mb-8">
        <ul>
          <li><a href="/shop">Shop</a></li>
          <li>{product.name}</li>
        </ul>
      </div>

      <ProductDetails product={product} variants={variants} />
    </div>
  );
});
