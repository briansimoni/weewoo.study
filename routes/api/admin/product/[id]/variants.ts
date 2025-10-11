import { ProductStore } from "../../../../../lib/product_store.ts";
import { Handlers } from "fresh/compat";

export const handler: Handlers = {
  async GET(ctx) {
    const productId = ctx.params.id;

    try {
      const productStore = await ProductStore.make();
      const variants = await productStore.listProductVariants(productId);

      return new Response(
        JSON.stringify({
          success: true,
          variants,
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error(`Error fetching variants for product ${productId}:`, error);

      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error
            ? error.message
            : "Failed to fetch variants",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
};
