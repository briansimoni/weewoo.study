import { Handlers } from "$fresh/server.ts";
import { ProductStore } from "../../../../../lib/product_store.ts";

export const handler: Handlers = {
  /**
   * Toggle the active status of a product
   */
  async POST(req, _ctx) {
    try {
      const url = new URL(req.url);
      const pathParts = url.pathname.split("/");
      const productId = pathParts[pathParts.length - 2]; // ID is the second-to-last part in the path

      if (!productId) {
        return new Response(
          JSON.stringify({ error: "Product ID is required" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Get the product store
      const productStore = await ProductStore.make();

      // Check if product exists
      const product = await productStore.getProduct(productId);
      if (!product) {
        return new Response(JSON.stringify({ error: "Product not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Toggle the active status
      const updatedProduct = {
        ...product,
        active: !product.active,
      };

      // Update the product
      await productStore.addProduct(updatedProduct);

      return new Response(
        JSON.stringify({
          success: true,
          product: updatedProduct,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Error toggling product status:", error);
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : "Unknown error",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
};
