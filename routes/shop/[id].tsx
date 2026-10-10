import { ProductStore } from "../../lib/product_store.ts";
import ProductDetails from "../../islands/shop/ProductDetails.tsx";
import { defineRoute } from "fresh/compat";
import { Page } from "../../components/ui/Page.tsx";

export default defineRoute(async (ctx) => {
  const productStore = await ProductStore.make();
  const id = ctx.params.id;
  const product = await productStore.getProduct(id);
  if (!product) {
    return new Response("Product not found", { status: 404 });
  }
  const variants = await productStore.listProductVariants(id);

  return (
    <Page title={product.name} width="wide">
      <div className="breadcrumbs text-sm mb-8">
        <ul>
          <li>
            <a href="/shop">Shop</a>
          </li>
          <li>{product.name}</li>
        </ul>
      </div>

      <ProductDetails product={product} variants={variants} />
    </Page>
  );
});
