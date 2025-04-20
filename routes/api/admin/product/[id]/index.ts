import { Handlers } from "$fresh/server.ts";
import { ProductStore } from "../../../../../lib/product_store.ts";

export const handler: Handlers = {
  /**
   * Update a product in the local product store
   */
  async PUT(req, ctx) {
    try {
      const productId = ctx.params.id;

      if (!productId) {
        return new Response(
          JSON.stringify({ error: "Product ID is required" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Parse the request body
      const data = await req.json();

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

      // Update the product
      const updatedProduct = await productStore.updateProduct({
        printful_id: productId,
        ...data,
      });

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
      console.error("Error updating product:", error);
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

  /**
   * Delete a product from the local product store
   */
  async DELETE(_req, _ctx) {
    try {
      const productId = _ctx.params.id;

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

      // Delete the product
      await productStore.deleteProduct(productId);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Product ${productId} deleted successfully`,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Error deleting product:", error);
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
