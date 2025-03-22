import { defineRoute } from "$fresh/server.ts";
import { ProductStore } from "../../lib/product_store.ts";
import ProductDetails from "../../islands/ProductDetails.tsx";

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
      <nav className="text-sm mb-8">
        <ol className="list-none p-0 inline-flex">
          <li className="flex items-center">
            <a href="/shop" className="text-primary hover:text-primary-focus">
              Shop
            </a>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mx-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </li>
          <li className="text-gray-500">{product.name}</li>
        </ol>
      </nav>

      <ProductDetails product={product} variants={variants} />
    </div>
  );
});
